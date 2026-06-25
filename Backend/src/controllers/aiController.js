const ai = require('../config/aiConfig');
const { YoutubeTranscript } = require('youtube-transcript');
const StudyMaterial = require('../models/StudyMaterial.model');
const Parser = require('rss-parser');
const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/rdf+xml, application/atom+xml, text/xml;q=0.9, */*;q=0.8'
    },
    timeout: 7000 // 7-second cutoff barrier to prevent loop freeze
});

// HELPER FUNCTION: Splits large transcripts into manageable chunks
const chunkText = (text, maxLength = 25000) => {
    const chunks = [];
    let currentIndex = 0;
    while (currentIndex < text.length) {
        chunks.push(text.substring(currentIndex, currentIndex + maxLength));
        currentIndex += maxLength;
    }
    return chunks;
};

// Extracts clean 11-character video ID from any YouTube URL format
const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const getSavedDatesBySubject = async (req, res) => {
    const { userId, subject } = req.params;
    try {
        // Find all records for this user and subject, select only createdAt dates
        const history = await StudyMaterial.find({ userId, subject }).select('createdAt').sort({ createdAt: -1 });
        
        // Format dates to simple YYYY-MM-DD strings and remove duplicates
        const uniqueDates = [...new Set(history.map(item => item.createdAt.toISOString().split('T')[0]))];
        
        res.status(200).json({ success: true, dates: uniqueDates });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch history dates timeline layer." });
    }
};

const generateStudyMaterial = async (req, res) => {
    const { videoUrl, userId, subject } = req.body;

    if (!videoUrl || !userId) {
        return res.status(400).json({ error: "Both Video URL and User ID are required." });
    }

    try {
        console.log("⏳ Fetching transcript from YouTube...");
        console.log("⏳ Normalizing YouTube Link Structure...");
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            return res.status(400).json({ error: "Provided string is not a valid YouTube URL pattern." });
        }

        console.log(`⏳ Fetching transcript for normalized Video ID: ${videoId}`);
        const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);
        const fullTranscriptText = transcriptArray.map(t => t.text).join(' ');

        console.log(`📝 Total Transcript Length: ${fullTranscriptText.length} characters.`);

        // 1. CHUNKING: Break long transcript into manageable pieces
        const textChunks = chunkText(fullTranscriptText);
        console.log(`📦 Scaled Video detected! Split into ${textChunks.length} parallel logical chunks.`);

        let combinedNotes = "";
        let allQuizzes = [];
        let allFlashcards = []; 
        let detectedGsTag = "GS-General";

        // Initialize the Gemini model constructor
        const modelInstance = ai.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { 
                responseMimeType: "application/json",
                // Strict production settings to minimize throttle drops
                temperature: 0.2, 
                topP: 0.95
            }
        });

        // 2. PROCESSING LOOP: Iterating over each chunk sequentially
        for (let i = 0; i < textChunks.length; i++) {
            console.log(`🧠 Processing Part (${i + 1}/${textChunks.length})...`);
            if (i > 0) {
                console.log(`⏳ Cooldown active... Sleeping for 4 seconds to reset Gemini RPM rate-limits...`);
                await new Promise(resolve => setTimeout(resolve, 4000));
            }

          const systemPrompt = `
                You are an elite UPSC Professor. Analyze this specific segment (Part ${i + 1} of ${textChunks.length}) of a long lecture transcript.
                Extract detailed historical facts, core concepts, and analytical insights.
                
                Generate a clean JSON strictly matching this blueprint layout:
                {
                    "gsPaperTag": "Strictly classify which UPSC Mains paper this entire segment maps to. Format should be precisely like '[GS-1: History/Geography]' or '[GS-2: Polity/IR]' or '[GS-3: Economy/Science/Env]' or '[GS-4: Ethics]'. Pick the most accurate one.",
                    "notesSegment": "Detailed Markdown notes for this segment only. Include core sub-headings and detailed analytical insights.",
                    "segmentQuizzes": [
                        {
                            "question": "Analytical UPSC Prelims standard MCQ question based on this segment text",
                            "options": ["Option A", "Option B", "Option C", "Option D"],
                            "correct_answer": "The exact correct option string",
                            "explanation": "Deep conceptual explanation."
                        }
                    ],
                    "segmentFlashcards": [
                        {
                            "front": "A crisp, direct high-yield question or terminology pointer for 2-minute quick revision.",
                            "back": "A concise 1 or 2 sentence absolute core factual answer or definition."
                        }
                    ]
                }
                Generate exactly 1 or 2 high-quality MCQs and exactly 2 or 3 highly critical flashcards for this segment. Return ONLY raw, clean JSON.
                
                CRITICAL SAFETY FORMATTING RULES:
                1. Inside string values, DO NOT use unescaped double quotes (\\"). If you need to quote a term, strictly use single quotes (') instead.
                2. DO NOT use markdown bold indicators like double asterisks (**) anywhere inside the text properties.
                3. Do not include control characters, stray backslashes, or unescaped newlines inside the JSON string properties.
            `;

            // Dynamic Retry Loop Framework to handle Google 503 / 429 Throttle Spikes
            let result;
            let retries = 5; // Maximum attempts
            while (retries > 0) {
                try {
                    result = await modelInstance.generateContent(`${systemPrompt}\n\n[Transcript Segment Part ${i + 1}]:\n\n${textChunks[i]}`);
                    break; // Request successful, exit retry loop
                } catch (apiError) {
                    if (apiError.message.includes("503") || apiError.message.includes("high demand")) {
                        console.warn(`⚠️ Gemini API heavily loaded (503). Retrying chunk ${i + 1} in 3 seconds... (${retries} retries left)`);
                        retries--;
                        await new Promise(resolve => setTimeout(resolve, 5000)); // Delay hook
                    } else {
                        throw apiError; // Throw structural error if it's not a service traffic spike
                    }
                }
            }

            if (!result) {
                throw new Error("Google Gemini API server failed to respond after multiple high-demand retries.");
            }
            
            const response = await result.response;
            
            
            let rawText = response.text();
            
            // Clean markdown block wrappers if leaked by the model
            rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

            let segmentData;
            try {
                segmentData = JSON.parse(rawText);
            } catch (parseError) {
                console.warn("⚠️ Initial JSON Parse failed, executing structural sanitization algorithms...");
                try {
                    // Escape multi-line breaks violating JSON standards inside raw values
                    let sanitizedText = rawText.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
                    
                    // Escape stray unescaped internal quotes without corrupting structural layout properties
                    sanitizedText = sanitizedText.replace(/(?<!\\)"/g, '\\"');
                    sanitizedText = sanitizedText.replace(/\\"\s*:\s*\\"/g, '":"')
                                                 .replace(/\\"\s*:\s*\[/g, '":[')
                                                 .replace(/\]\s*,\s*\\"/g, '],"')
                                                 .replace(/\{\s*\\"/g, '{"')
                                                 .replace(/\\"\s*\}/g, '"}')
                                                 .replace(/\\"\s*,\s*\\"/g, '","');

                    segmentData = JSON.parse(sanitizedText);
                } catch (deepError) {
                    console.error("🚨 String corrupted completely. Deploying clean structural fallback schema container.");
                    segmentData = {
                        notesSegment: rawText.substring(0, 2000) + "... [Truncated due to JSON structural constraints]",
                        segmentQuizzes: []
                    };
                }
            }

            // Merge dynamic validated outputs
            if (segmentData && segmentData.notesSegment) {
                combinedNotes += `\n\n## Section Part ${i + 1}\n` + segmentData.notesSegment;
            }
            if (segmentData && segmentData.segmentQuizzes && segmentData.segmentQuizzes.length > 0) {
                allQuizzes = [...allQuizzes, ...segmentData.segmentQuizzes];
            }
            if (segmentData && segmentData.gsPaperTag) {
                detectedGsTag = segmentData.gsPaperTag;
            }
            if (segmentData && segmentData.segmentFlashcards && segmentData.segmentFlashcards.length > 0) {
                allFlashcards = [...allFlashcards, ...segmentData.segmentFlashcards];
            }
        }

        console.log("💾 Pipeline merging absolute! Saving Master Compilation into MongoDB...");

        // Limit maximum quiz array size to a clean bundle of 8 questions
        // Limit maximum quiz array size to a clean bundle of 8 questions
       // Limit max sizes for pristine quality execution
        const finalQuizBundle = allQuizzes.slice(0, 8);
        const finalFlashcardBundle = allFlashcards.slice(0, 5); 

        // 3. PIPELINE LOCK: Auto-saving entire consolidated payload
        const savedMaterial = new StudyMaterial({
            userId: userId,
            videoUrl: videoUrl,
            subject: subject || 'Current Affairs',
            generatedNotes: combinedNotes,
            sessionQuizzes: finalQuizBundle,
            gsPaperTag: detectedGsTag,
            flashcards: finalFlashcardBundle
        });

        await savedMaterial.save();

        res.status(200).json({
            success: true,
            message: `Processed a massive ${textChunks.length}-part lecture successfully! Saved to DB.`,
            materialId: savedMaterial._id,
            data: {
                notes: combinedNotes,
                quizzes: finalQuizBundle,
                gsPaperTag: detectedGsTag,
                flashcards: finalFlashcardBundle
            }
        });

    } catch (error) {
        console.error("❌ Scaled Architecture Failure:", error.message);
        res.status(500).json({
            error: "Failed to process long-duration video transcript orchestration.",
            details: error.message
        });
    }
};

// Fetch historical saved materials from MongoDB based on User ID and Subject
const getSavedMaterialsBySubject = async (req, res) => {
    const { userId, subject } = req.params;
    const { date } = req.query; // Get date from query params (?date=2026-06-22)

    if (!userId || !subject) {
        return res.status(400).json({ error: "Missing required parameters." });
    }

    try {
        let query = { userId, subject };
        
        if (date) {
            // Match records within that specific day window
            const startOfDay = new Date(`${date}T00:00:00.000Z`);
            const endOfDay = new Date(`${date}T23:59:59.999Z`);
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }

        const materials = await StudyMaterial.findOne(query).sort({ createdAt: -1 });

        if (!materials) {
            return res.status(200).json({ success: true, data: { notes: "", quizzes: [] } });
        }

       res.status(200).json({
            success: true,
            data: { 
                notes: materials.generatedNotes, 
                quizzes: materials.sessionQuizzes,
                gsPaperTag: materials.gsPaperTag || "GS-General",
                flashcards: materials.flashcards || []
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch historical workspace layer." });
    }
};

// BONUS FEATURE: Real-time Dynamic UPSC News Scraper Aggregator Engine
const getDailyUPSCNewsFeed = async (req, res) => {
    // 1. Dynamic Query Pools to force fresh results on every single refresh trigger
    const queryPools = [
        'UPSC+OR+IAS+OR+Polity+OR+Constitution',
        'Indian+Economy+OR+RBI+OR+GDP+OR+Inflation',
        'Defence+OR+ISRO+OR+Missile+OR+Technology',
        'Foreign+Policy+OR+Bilateral+OR+Summit+OR+Treaty',
        'Supreme+Court+OR+Verdict+OR+Government+Bill'
    ];

    // Pick a random query subset from the pool on every API hit
    const randomQuery = queryPools[Math.floor(Math.random() * queryPools.length)];
    console.log(`🕸️ Scraper Radar deployed with active dynamic pivot query: ${randomQuery}`);

    // Enforcing strict when:1d parameter with changing dynamic search strings
    const feedUrls = [
        `https://news.google.com/rss/search?q=${randomQuery}+site:hindustantimes.com+when:1d&hl=en-IN&gl=IN&ceid=IN:en`,
        `https://news.google.com/rss/search?q=${randomQuery}+site:timesofindia.indiatimes.com+when:1d&hl=en-IN&gl=IN&ceid=IN:en`,
        `https://news.google.com/rss/search?q=${randomQuery}+site:dnaindia.com+when:1d&hl=en-IN&gl=IN&ceid=IN:en`
    ];

    // Broadened fallback validation keywords
    const upscKeywords = [
        'upsc', 'ias', 'ips', 'govt', 'government', 'polity', 'court', 'supreme', 'rbi', 
        'economy', 'gdp', 'inflation', 'trade', 'china', 'us', 'defence', 'missile', 
        'summit', 'treaty', 'policy', 'minister', 'modi', 'bill', 'act', 'election', 'india'
    ];

    try {
        let scapedArticles = [];

        for (const url of feedUrls) {
            try {
                const feed = await parser.parseURL(url);
                
                feed.items.forEach(item => {
                    const titleLower = item.title?.toLowerCase() || "";
                    const snippetLower = item.contentSnippet?.toLowerCase() || "";
                    
                    const isRelevant = upscKeywords.some(keyword => 
                        titleLower.includes(keyword) || snippetLower.includes(keyword)
                    );

                    if (isRelevant) {
                        const cleanTitle = item.title ? item.title.split(" - ")[0] : "UPSC Structural Update";

                        let finalSource = "UPSC Radar";
                        if (url.includes("hindustantimes")) finalSource = "Hindustan Times";
                        else if (url.includes("timesofindia")) finalSource = "Times of India";
                        else if (url.includes("dnaindia")) finalSource = "DNA India";

                        scapedArticles.push({
                            title: cleanTitle,
                            link: item.link,
                            source: finalSource,
                            pubDate: item.pubDate ? new Date(item.pubDate).toLocaleDateString() : new Date().toLocaleDateString(),
                            snippet: item.contentSnippet ? item.contentSnippet.substring(0, 180) + "..." : "UPSC relative context captured inside the live dynamic streaming radar module layer."
                        });
                    }
                });
            } catch (feedError) {
                console.log(`Skipped transient server response link.`);
            }
        }

        // Sort by recent logs first and slice fresh set
        const dailyBulletins = scapedArticles
            .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 12);

        res.status(200).json({
            success: true,
            count: dailyBulletins.length,
            articles: dailyBulletins
        });

    } catch (error) {
        console.error("News Scraper Failure:", error.message);
        res.status(500).json({ error: "Failed to scrape daily current affairs layer." });
    }
};

module.exports = { generateStudyMaterial, getSavedMaterialsBySubject, getSavedDatesBySubject, getDailyUPSCNewsFeed };