const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'player360-api',
    time: new Date().toISOString()
  });
});

module.exports = router;