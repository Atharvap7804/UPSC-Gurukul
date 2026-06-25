const User = require('../models/User.model');

const handleUserRegistration = async (req, res) => {
    const { name, email, password, selectedSubjects } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required." });
    }
    try{
        const existingUser= await User.findOne({ email });
        if(existingUser){
            return res.status(400).json({ error: "Email already registered." });
        }
        let finalSubjects = ['Current Affairs'];
        if (selectedSubjects && Array.isArray(selectedSubjects)) {
            // Faltu duplicates hatane ke liye Set use karenge aur Current Affairs merge karenge
            finalSubjects = [...new Set([...finalSubjects, ...selectedSubjects])];
        }

        const newUser = new User({
            name,
            email,
            password, // Real project mein yahan bcrypt.hash() laga lena bhai, safety first!
            selectedSubjects: finalSubjects
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: "User onboarded to UPSC Gurukul successfully!",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                selectedSubjects: newUser.selectedSubjects
            }
        });
    } catch (error) {
        console.error("Error occurred while registering user:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
  }

const getUserMetrics = async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: "User profile boundaries not found." });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error("❌ Metrics Fetching Failure:", error.message);
        res.status(500).json({ error: "Failed to fetch user assessment tracks." });
    }
};

module.exports = { handleUserRegistration, getUserMetrics };