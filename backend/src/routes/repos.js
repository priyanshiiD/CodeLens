const express = require('express');
const { protect } = require('../middleware/auth');
const { addRepo, getRepos, getRepoStatus, deleteRepo, reindexRepo } = require('../controllers/repoController');

const router = express.Router();

router.use(protect);

router.post('/', addRepo);
router.get('/', getRepos);
router.get('/status', getRepoStatus);
router.delete('/', deleteRepo);
router.post('/reindex', reindexRepo);

module.exports = router;
