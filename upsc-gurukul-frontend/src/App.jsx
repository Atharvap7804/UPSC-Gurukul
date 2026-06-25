import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';

function App() {
  // --- Core States ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [userContext, setUserContext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [newsFeed, setNewsFeed] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [activeRightPanel, setActiveRightPanel] = useState('test'); // 'test' or 'flashcards'
const [flippedCardIndex, setFlippedCardIndex] = useState(null); // Tracks which card is flipped

  // --- Dynamic Tab Control & Rendering Layouts ---
  const [activeTab, setActiveTab] = useState('Current Affairs');
  const [videoUrl, setVideoUrl] = useState('');
  const [processingVideo, setProcessingVideo] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);

  // --- Quiz Evaluator States ---
  const [userAnswers, setUserAnswers] = useState({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  const upscSubjects = [
    { id: 'Polity', label: 'Indian Polity & Constitution' },
    { id: 'History', label: 'History (Ancient, Medieval, Modern)' },
    { id: 'Geography', label: 'Geography & Environment' },
    { id: 'Economics', label: 'Indian Economics' },
    { id: 'IR', label: 'International Relations' },
  ];

  // 🔄 LOOP 1: Session Hydration Check
  useEffect(() => {
    const cachedUser = localStorage.getItem('upsc_gurukul_user');
    if (cachedUser) {
      setUserContext(JSON.parse(cachedUser));
      setIsOnboarded(true);
    }
  }, []);

  // 🔄 LOOP 2: AUTOMATIC HISTORY FETCH (Whenever Tab Changes!)
  // 🔄 AUTOMATIC TIMELINE & DATA HYDRATION LAYER
  useEffect(() => {
    if (!isOnboarded || !userContext) return;

    const fetchTimelineAndData = async () => {
      try {
        // Step A: Fetch all unique dates for the active tab/subject
        const datesResponse = await axios.get(`http://localhost:5000/api/ai/history-dates/${userContext.id}/${activeTab}`);
        if (datesResponse.data.success) {
          setAvailableDates(datesResponse.data.dates);

          // Default selection to the latest date available, if any
          const latestDate = datesResponse.data.dates[0] || '';
          setSelectedDate(latestDate);

          // Step B: Fetch data for that specific latest date
          const dataResponse = await axios.get(`http://localhost:5000/api/ai/history/${userContext.id}/${activeTab}?date=${latestDate}`);
          if (dataResponse.data.success) {
            setGeneratedData(dataResponse.data.data);
          }
        }
      } catch (error) {
        console.log("No previous timeline layers found.");
      }
    };

    fetchTimelineAndData();
  }, [activeTab, isOnboarded, userContext]);

  // 🔄 Triggered when user manually changes the Date Dropdown
  const handleDateChange = async (dateVal) => {
    setSelectedDate(dateVal);
    if (!dateVal) {
      setGeneratedData(null);
      return;
    }
    try {
      const response = await axios.get(`http://localhost:5000/api/ai/history/${userContext.id}/${activeTab}?date=${dateVal}`);
      if (response.data.success) {
        setGeneratedData(response.data.data);
      }
    } catch (err) {
      console.log("Error loading target date frame.");
    }
  };

  const handleSubjectChange = (subjectId) => {
    if (selectedSubjects.includes(subjectId)) {
      setSelectedSubjects(selectedSubjects.filter(sub => sub !== subjectId));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectId]);
    }
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/user/onboard', {
        name,
        email,
        password,
        selectedSubjects
      });
      if (response.data.success) {
        localStorage.setItem('upsc_gurukul_user', JSON.stringify(response.data.user));
        setUserContext(response.data.user);
        setIsOnboarded(true);
      }
    } catch (error) {
      alert(error.response?.data?.error || "Registration Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/user/onboard', {
        name: name || "Atharva Pawar",
        email,
        password,
        selectedSubjects
      });
    } catch (error) {
      if (error.response?.data?.error?.includes("already registered")) {
        const mockExistUser = {
          id: "6a37684bae564c13ed63ad28",
          name: "Atharva Pawar",
          email: email,
          selectedSubjects: ['Current Affairs', 'Polity', 'History', 'Geography', 'Economics', 'IR']
        };
        localStorage.setItem('upsc_gurukul_user', JSON.stringify(mockExistUser));
        setUserContext(mockExistUser);
        setIsOnboarded(true);
      } else {
        alert(error.response?.data?.error || "Login Error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('upsc_gurukul_user');
    setUserContext(null);
    setIsOnboarded(false);
    setGeneratedData(null);
  };

  const handleProcessVideo = async (e) => {
    e.preventDefault();
    if (!videoUrl) return;
    setProcessingVideo(true);
    setGeneratedData(null);
    setShowQuizResults(false);
    setUserAnswers({});

    try {
      const response = await axios.post('http://localhost:5000/api/ai/generate-material', {
        videoUrl: videoUrl,
        userId: userContext.id,
        subject: activeTab
      });

      if (response.data.success) {
        setGeneratedData(response.data.data);
        setVideoUrl('');
      }
    } catch (error) {
      setProcessingVideo(false);
      alert(error.response?.data?.details || "Failed to process chunks.");
    } finally {
      setProcessingVideo(false);
    }
  };

  const fetchScrapedUPSCNews = async () => {
    setLoadingNews(true);
    try {
      const response = await axios.get('http://localhost:5000/api/ai/scrape-news');
      if (response.data.success) {
        setNewsFeed(response.data.articles);
      }
    } catch (error) {
      console.log("Failed to crawl streaming current affairs data matrix.");
    } finally {
      setLoadingNews(false);
    }
  };

  const handleOptionSelect = (quizIndex, selectedOption) => {
    setUserAnswers({ ...userAnswers, [quizIndex]: selectedOption });
  };

  // 1️⃣ AUTH VIEW
  if (!isOnboarded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 max-w-xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              UPSC Gurukul Command Center
            </h1>
          </div>
          {isNewUser ? (
            <form onSubmit={handleOnboardingSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Aspirant Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 text-sm" placeholder="Enter full name" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 text-sm" placeholder="name@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Access Password</label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 text-sm" placeholder="••••••••" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Focus Electives</label>
                <div className="mt-2 bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2.5">
                  <div className="flex items-center justify-between opacity-60">
                    <span className="text-sm font-medium text-slate-300">⚡ Current Affairs & Editorials Core</span>
                    <span className="text-xs bg-slate-800 text-amber-400 px-2 py-0.5 rounded uppercase font-bold tracking-widest">Compulsory</span>
                  </div>
                  <hr className="border-slate-800" />
                  {upscSubjects.map((sub) => (
                    <label key={sub.id} className="flex items-center space-x-3 cursor-pointer group">
                      <input type="checkbox" checked={selectedSubjects.includes(sub.id)} onChange={() => handleSubjectChange(sub.id)} className="w-4 h-4 rounded border-slate-800 text-amber-500 bg-slate-900" />
                      <span className="text-sm text-slate-400 group-hover:text-slate-200 transition">{sub.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold py-3 rounded-lg text-sm">Initialize Dashboard 🚀</button>
              <p className="text-center text-xs text-slate-500 mt-4">Already have an account? <button type="button" onClick={() => setIsNewUser(false)} className="text-amber-500 font-semibold hover:underline">Login Here</button></p>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Registered Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 text-sm" placeholder="atharvapawar53@gmail.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 text-sm" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold py-3 rounded-lg text-sm">Access Workspace🔐</button>
              <p className="text-center text-xs text-slate-500 mt-4">New to Gurukul? <button type="button" onClick={() => setIsNewUser(true)} className="text-amber-500 font-semibold hover:underline">Create Account</button></p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 2️⃣ DASHBOARD WORKSPACE VIEW
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 relative">

      {/* 🧠 DYNAMIC AI PROCESSING SPINNER OVERLAY */}
      {processingVideo && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping"></div>
              <div className="w-16 h-16 rounded-full border-4 border-t-amber-500 border-r-transparent border-b-amber-500 border-l-transparent animate-spin"></div>
            </div>
            <div>
              <h3 className="text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                Generating UPSC Study Assets...
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                AI is analyzing the content and generating structured notes, quizzes, and flashcards. This may take a few moments depending on the lecture length and complexity.
              </p>
            </div>
            <div className="bg-slate-950 border border-slate-800 py-1.5 px-3 rounded text-[10px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">
              Please do not refresh or close the window during this process.
            </div>
          </div>
        </div>
      )}
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between">
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">UPSC GURUKUL</h2>
            <p className="text-xs text-slate-500 font-medium">Aspirant Terminal</p>
          </div>
          <nav className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-2 px-3">Active Syllabus Tree</p>
            {userContext?.selectedSubjects.map((subject) => (
              <button
                key={subject}
                onClick={() => setActiveTab(subject)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition duration-200 ${activeTab === subject
                  ? 'bg-gradient-to-r from-amber-500/10 to-transparent text-amber-400 border-l-2 border-amber-500'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
              >
                {subject === 'Current Affairs' ? '📰 ' : '📚 '} {subject}
              </button>

            ))}
            <button
              onClick={() => { setActiveTab('Live Bulletin'); fetchScrapedUPSCNews(); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition duration-200 mt-4 border border-dashed ${activeTab === 'Live Bulletin'
                ? 'bg-gradient-to-r from-orange-500/20 to-transparent text-orange-400 border-orange-500'
                : 'text-slate-400 border-slate-800 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
            >
              📰 Live UPSC Feed
            </button>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 truncate">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-slate-950 uppercase text-sm">{userContext?.name ? userContext.name[0] : 'U'}</div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-300 truncate">{userContext?.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{userContext?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-rose-400 transition p-1 text-xs">🚪</button>
        </div>
      </div>

      {/* CONTENT ROOM */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* HEADER TRACKING ROW */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100">{activeTab}</h1>
            {/* 📅 CALENDAR HISTORICAL LAYER SELECTION TOOL */}
            {availableDates.length > 0 && (
              <div className="mt-4 flex items-center space-x-2 bg-slate-900 border border-slate-800 py-1.5 px-3 rounded-lg w-fit">
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">📅 Sessions:</span>
                <select
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {availableDates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs font-mono text-slate-400">
            Session ID: <span className="text-amber-400 font-bold">{userContext?.id?.substring(0, 8)}...</span>
          </div>
        </div>

        {/* 📰 RENDER SCREEN INTERFACE 1: LIVE UPSC BULLETIN SCRAPER RADAR */}
        {activeTab === 'Live Bulletin' ? (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center shadow-md">
              <p className="text-xs text-slate-400 leading-relaxed">
                Real-time active web crawling logs extracted from <span className="text-amber-400 font-bold">Hindustan Times, TOI, and DNA National Portals</span> parsed against the core UPSC syllabus requirements.
              </p>
              <button 
                onClick={fetchScrapedUPSCNews} disabled={loadingNews}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded text-xs transition border border-slate-700 whitespace-nowrap"
              >
                {loadingNews ? "Crawling Links... 🕸️" : "Refresh Radar 🔄"}
              </button>
            </div>

            {loadingNews ? (
              <div className="text-center py-20 bg-slate-900/20 border border-slate-800 rounded-xl animate-pulse text-sm text-slate-500">
                Deploying backend crawler spiders to scrape live national news aggregates... Please hold tight.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {newsFeed.length > 0 ? (
                  newsFeed.map((article, index) => (
                    <div key={index} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition duration-150">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] bg-slate-950 text-amber-400 border border-slate-800 font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded">
                            📌 {article.source}
                          </span>
                          <span className="text-[14px] text-slate-500 font-mono">{article.pubDate}</span>
                        </div>
                        <h3 className="text-md font-bold text-slate-100 leading-snug hover:text-amber-400 transition cursor-pointer">
                          <a href={article.link} target="_blank" rel="noopener noreferrer">{article.title}</a>
                        </h3>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed text-justify">
                          {article.snippet}
                        </p>
                      </div>
                      <a 
                        href={article.link} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] font-bold text-orange-400 hover:text-orange-300 transition flex items-center gap-1 w-fit"
                      >
                        Read Original Full Article Coverage ↗️
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-20 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-sm text-slate-500">
                    No active updates logged in the current loop frame matching the current tracking tags. Click Refresh above.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* 📚 RENDER SCREEN INTERFACE 2: STANDARD LECTURE SYNTHESIS SYSTEM */
          <>
            {/* INPUT FORM FIELD ZONE */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 shadow-md">
              <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-3">Feed {activeTab} Lecture Link</h3>
              <form onSubmit={handleProcessVideo} className="flex gap-4">
                <input 
                  type="url" required value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} disabled={processingVideo} 
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500" 
                  placeholder={`Paste relevant YouTube video URL for ${activeTab}...`}
                />
                <button type="submit" disabled={processingVideo} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-3 rounded-lg text-sm disabled:opacity-40">
                  {processingVideo ? "AI Analyzing... 🧠" : "Process Video 🚀"}
                </button>
              </form>
            </div>

            {/* SYNTESIZED CORE NOTES & QUIZ SECTION */}
            {generatedData ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* STUDY NOTES PANEL BLOCK */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl h-[650px] flex flex-col scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950">
                  <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
                    <h4 className="font-bold text-amber-400 text-sm uppercase tracking-wider">📝 Synthesized Core Notes</h4>
                    
                    <button
                      onClick={() => {
                        const notesContent = document.getElementById('printable-notes-area');
                        if (!notesContent) return;
                        const printWindow = window.open('', '_blank', 'width=900,height=800');
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>${activeTab} UPSC Notes</title>
                              <style>
                                body { font-family: -apple-system, system-ui, sans-serif; line-height: 1.6; color: #1e293b; padding: 40px; }
                                h2 { color: #ea580c; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 30px; }
                                h3 { color: #334155; margin-top: 20px; }
                                p { text-align: justify; }
                                @page { size: auto; margin: 20mm; }
                              </style>
                            </head>
                            <body>
                              ${notesContent.innerHTML}
                              <script>window.onload = function() { window.print(); window.close(); };</script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition"
                    >
                      📥 Download PDF
                    </button>
                  </div>

                  <div
                    id="printable-notes-area"
                    style={{ backgroundColor: '#1e293b' }}
                    className="flex-1 overflow-y-auto font-sans text-sm text-slate-300 leading-relaxed p-4 rounded-lg select-text max-w-none"
                  >
                    <ReactMarkdown
                      components={{
                        h2: ({ node, ...props }) => <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mt-6 mb-3 border-b border-slate-800 pb-1" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-slate-200 mt-4 mb-2" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-3 text-slate-300 text-justify" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1.5 text-slate-400" {...props} />,
                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                      }}
                    >
                      {generatedData.notes}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* AI EVALUATION PRACTICE TEST */}
                {/* AI EVALUATION PRACTICE TEST - UPGRADED MULTI-VIEW INTERFACE */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl h-[650px] flex flex-col ">
                  {/* Header Tabs Navigation controllers */}
                  <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center ">
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => setActiveRightPanel('test')}
                        className={`text-xs font-bold uppercase tracking-wider pb-1 transition ${activeRightPanel === 'test' ? 'text-orange-400 border-b-2 border-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        ✍️ Practice Test
                      </button>
                      <button 
                        onClick={() => { setActiveRightPanel('flashcards'); setFlippedCardIndex(null); }}
                        className={`text-xs font-bold uppercase tracking-wider pb-1 transition ${activeRightPanel === 'flashcards' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        🃏 Revision Flashcards
                      </button>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">UPSC Standard</span>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2">
                    {activeRightPanel === 'test' ? (
                      /* VIEW A: PRACTICE MCQ TESTS SYSTEM */
                      <div className="space-y-6">
                        {generatedData?.quizzes?.map((quiz, qIndex) => (
                          <div key={qIndex} className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3">
                            <p className="text-sm font-semibold text-slate-200"><span className="text-amber-500 font-mono">Q{qIndex + 1}.</span> {quiz.question}</p>
                            <div className="grid grid-cols-1 gap-2.5 mt-3">
                              {quiz.options?.map((option, oIndex) => {
                                const isSelected = userAnswers[qIndex] === option;
                                let optionStyle = "border-slate-800 bg-slate-900/40 text-slate-300";
                                if (showQuizResults) {
                                  if (option === quiz.correct_answer) optionStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-medium";
                                  else if (isSelected) optionStyle = "border-rose-500 bg-rose-500/10 text-rose-400";
                                } else if (isSelected) optionStyle = "border-amber-500 bg-amber-500/10 text-amber-400 font-medium";
                                return <button key={oIndex} disabled={showQuizResults} onClick={() => handleOptionSelect(qIndex, option)} className={`w-full text-left px-4 py-2.5 border rounded-lg text-xs transition ${optionStyle}`}>{option}</button>;
                              })}
                            </div>
                            {showQuizResults && <div className="mt-4 p-3 bg-slate-900/80 border border-slate-800 rounded-md text-xs text-slate-400"><span className="text-emerald-400 font-bold block mb-1">🎯 Explanation:</span>{quiz.explanation}</div>}
                          </div>
                        ))}
                        {!showQuizResults && generatedData?.quizzes?.length > 0 && <button onClick={() => setShowQuizResults(true)} className="mt-4 w-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-extrabold py-3 rounded-lg text-sm">Submit Performance Report 🏁</button>}
                      </div>
                    ) : (
                      /* VIEW B: REVISION FLASHCARDS */
                      <div className="space-y-4 py-2">
                        {generatedData?.flashcards && generatedData.flashcards.length > 0 ? (
                          generatedData.flashcards.map((card, index) => {
                            const isFlipped = flippedCardIndex === index;
                            return (
                              <div 
                                key={index}
                                onClick={() => setFlippedCardIndex(isFlipped ? null : index)}
                                className={`border rounded-xl p-5 min-h-[110px] flex flex-col justify-center cursor-pointer transition-all duration-300 select-none ${
                                  isFlipped 
                                    ? 'bg-gradient-to-br from-amber-950/40 to-slate-900 border-amber-500/40 shadow-md shadow-amber-500/5' 
                                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                {isFlipped ? (
                                  <div className="animate-fadeIn">
                                    <span className="text-[12px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono">💡 Core Crux:</span>
                                    <p className="text-md text-slate-300 mt-2 text-justify leading-relaxed">{card.back}</p>
                                  </div>
                                ) : (
                                  <div className="animate-fadeIn">
                                    <span className="text-[12px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono">❓ Pointer Key {index + 1}:</span>
                                    <p className="text-lg font-bold text-slate-100 mt-2 leading-snug">{card.front}</p>
                                    <p className="text-[14px] text-slate-500 mt-1 italic">Click to view answer crux 🔄</p>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-20 text-xs text-slate-600 border border-dashed border-slate-800 rounded-xl">
                            No active revision flashcards mapped to this data segment layer yet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-500 text-sm">No material loaded in this module workspace. Paste a link above to start learning.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;