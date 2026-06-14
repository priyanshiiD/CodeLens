const express = require('express');
const { protect } = require('../middleware/auth');
const { addRepo, getRepos, getRepoStatus, deleteRepo } = require('../controllers/repoController');

const router = express.Router();

router.use(protect);

router.post('/', addRepo);
router.get('/', getRepos);
router.get('/status', getRepoStatus);
router.delete('/', deleteRepo);

module.exports = router;
