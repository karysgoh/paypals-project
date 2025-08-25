//////////////////////////////////////////////////////
// REQUIRED MODULES
//////////////////////////////////////////////////////
const express = require('express');

//////////////////////////////////////////////////////
// IMPORT CONTROLLERS
//////////////////////////////////////////////////////
const jwtMiddleware = require('../middlewares/jwtMiddleware.js');
const circleController = require('../controllers/circleController.js');

//////////////////////////////////////////////////////
// IMPORT MIDDLEWARES FOR INPUT VALIDATION
//////////////////////////////////////////////////////
const { sanitizeRequest, sanitizeResponse } = require('../middlewares/sanitizers.js');

//////////////////////////////////////////////////////
// CREATE ROUTER
//////////////////////////////////////////////////////
const router = express.Router();
router.use(sanitizeRequest); 

//////////////////////////////////////////////////////
// DEFINE ROUTES
//////////////////////////////////////////////////////
router.post(
    '/', 
    jwtMiddleware.verifyAccessToken, 
    circleController.createCircle
); 

router.get(
    '/user',
    jwtMiddleware.verifyAccessToken,
    circleController.getUserCircles
); 

router.get(
    '/:circleId', 
    jwtMiddleware.verifyAccessToken, 
    circleController.getCircleById
); 

router.put(
    '/:circleId', 
    jwtMiddleware.verifyAccessToken, 
    circleController.updateCircle
); 

router.delete(
    '/:circleId',
    jwtMiddleware.verifyAccessToken, 
    circleController.deleteCircle
);

//////////////////////////////////////////////////////
// EXPORT ROUTER
//////////////////////////////////////////////////////
router.use(sanitizeResponse);
module.exports = router;