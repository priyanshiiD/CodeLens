const express = require('express');
const { protect } = require('../middleware/auth');
const { addRepo, getRepos, getRepoStatus } = require('../controllers/repoController');

const router = express.Router();

router.use(protect);

router.post('/', addRepo);
router.get('/', getRepos);
router.get('/status', getRepoStatus);

module.exports = router;
