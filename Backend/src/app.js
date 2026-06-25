const express = require('express');
const cors = require('cors');
require('dotenv').config();

const aiRoutes = require('./routes/aiRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Standard middleware stack configuration
app.use(cors());
app.use(express.json()); // Essential to parse incoming json schemas in req.body

// Route Registration API mounting points
app.use('/api/ai', aiRoutes);
app.use('/api/user', userRoutes);


// Basic check route to verify server health boundaries
app.get('/health', (req, res) => {
    res.status(200).json({ status: "UP", message: "UPSC AI Engine online and active." });
});



module.exports = app;