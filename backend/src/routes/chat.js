const express = require('express');
const { protect } = require('../middleware/auth');
const { askQuestion, getChatHistory } = require('../controllers/chatController');

const router = express.Router();

router.use(protect);

router.post('/', askQuestion);
router.get('/history', getChatHistory);

module.exports = router;
