//////////////////////////////////////////////////////
// REQUIRED MODULES
//////////////////////////////////////////////////////
const express = require('express');

//////////////////////////////////////////////////////
// IMPORT CONTROLLERS
//////////////////////////////////////////////////////
const jwtMiddleware = require('../middlewares/jwtMiddleware.js');
const invitationController = require('../controllers/invitationController.js');

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
    '/:circleId/',
    jwtMiddleware.verifyAccessToken,
    invitationController.send
);

router.post(
    '/:invitationId/accept',
    jwtMiddleware.verifyAccessToken,
    invitationController.accept
);

router.post(
    '/:invitationId/reject',
    jwtMiddleware.verifyAccessToken,
    invitationController.reject
);

router.get(
    '/my',
    jwtMiddleware.verifyAccessToken,
    invitationController.readMy
);

router.get(
    '/circle/:circleId',
    jwtMiddleware.verifyAccessToken,
    invitationController.readCircleInvitations
);

router.delete(
    '/:invitationId',
    jwtMiddleware.verifyAccessToken,
    invitationController.delete
);

//////////////////////////////////////////////////////
// EXPORT ROUTER
//////////////////////////////////////////////////////
router.use(sanitizeResponse);
module.exports = router;
