const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: GEMINI_API_KEY missing in .env file");
    process.exit(1);
}

// Initialization bina kisi curly braces {} ke hona chahiye, direct variable pass karo
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = ai;