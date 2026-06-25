const express = require('express');
const router = express.Router();
const { 
    generateStudyMaterial, 
    getSavedMaterialsBySubject, 
    getSavedDatesBySubject, 
    getDailyUPSCNewsFeed 
} = require('../controllers/aiController');

// 1. POST Route: Fresh link synthesis execution
router.post('/generate-material', generateStudyMaterial);

// 2. GET Route: Timeline dates fetch (CRITICAL: Isko hamesha data fetcher ke UPAR rakhna)
router.get('/history-dates/:userId/:subject', getSavedDatesBySubject);

// 3. GET Route: Dynamic data fetch (Specific date validation)
router.get('/history/:userId/:subject', getSavedMaterialsBySubject);

router.get('/scrape-news', getDailyUPSCNewsFeed)

module.exports = router;