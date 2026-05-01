const express = require('express');
const router = express.Router();

// Simple test route to verify the router works
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Communication routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;