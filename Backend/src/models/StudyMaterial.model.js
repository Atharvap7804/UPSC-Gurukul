const mongoose = require('mongoose');

const StudyMaterialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoUrl: { type: String, required: true },
  subject:{type: String, required: true,default: 'Current Affairs'},

  // AI Synthesized Content Storage Block
    generatedNotes: { type: String, required: true },
    gsPaperTag: { type: String, default: "GS-General" },
    
    // 🃏 OPTION 2 FIELD: Quick Revision Flashcards Array Container
    flashcards: [{
        front: { type: String, required: true }, // The Core Question Pointers
        back: { type: String, required: true }   // The Hidden Core Answer
    }],

    sessionQuizzes: [{
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correct_answer: { type: String, required: true },
        explanation: { type: String, required: true }
    }],
    isAttempted: { type: Boolean, default: false },
    userScore: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now }
})

const StudyMaterial = mongoose.model('StudyMaterial', StudyMaterialSchema);

module.exports = StudyMaterial;