const express = require('express');
const { addCheshta, getCheshtaForMonth, deleteCheshta, getCheshtaStatus } = require('../controllers/cheshtaController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/add', addCheshta);
router.get('/status', getCheshtaStatus); // Important: Keep before /:id
router.get('/', getCheshtaForMonth);
router.delete('/:id', deleteCheshta);

module.exports = router;

