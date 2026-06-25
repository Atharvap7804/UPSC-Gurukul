const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:{ type: String, required: true ,},
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  selectedSubjects:{
    type: [String],
    default: ['Current Affairs']
  },

  // Dynamic Analysis Metrics Matrix for Mentor AI assessment loop
    progressMetrics: {
        totalQuizzesTaken: { type: Number, default: 0 },
        subjectAccuracy: {
            Polity: { type: Number, default: 0 },
            History: { type: Number, default: 0 },
            Geography: { type: Number, default: 0 },
            Economics: { type: Number, default: 0 },
            CurrentAffairs: { type: Number, default: 0 }
        },
        weakTopics: [String],
        strongTopics: [String]
    },
    
    createdAt: { type: Date, default: Date.now }
})

const User = mongoose.model('User', userSchema);

module.exports = User;