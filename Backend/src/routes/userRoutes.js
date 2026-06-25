const express = require('express');
const router = express.Router();
const { handleUserRegistration, getUserMetrics } = require('../controllers/userController');

// Post route to register user with subjects preference
router.post('/onboard', handleUserRegistration);

// Get route to fetch metrics for custom bot assessment
router.get('/metrics/:userId', getUserMetrics);

module.exports = router;