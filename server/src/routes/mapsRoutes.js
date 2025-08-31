const express = require('express');
const mapsController = require('../controllers/mapsController');
const router = express.Router();

router.get('/search', mapsController.searchNearby);

module.exports = router;
