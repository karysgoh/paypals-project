//////////////////////////////////////////////////////
// REQUIRED MODULES
//////////////////////////////////////////////////////
const express = require('express');

//////////////////////////////////////////////////////
// IMPORT CONTROLLERS
//////////////////////////////////////////////////////
const bcryptMiddleware = require('../middlewares/bcryptMiddleware.js');
const jwtMiddleware = require('../middlewares/jwtMiddleware.js');
const userController = require('../controllers/userController.js');
const roleMiddleware = require('../middlewares/roleMiddleware.js');

//////////////////////////////////////////////////////
// IMPORT MIDDLEWARES FOR INPUT VALIDATION
//////////////////////////////////////////////////////
const {
  validate, 
  userValidationRules
} = require('../middlewares/validators.js');

const { sanitizeRequest, sanitizeResponse } = require('../middlewares/sanitizers.js');

//////////////////////////////////////////////////////
// CREATE ROUTER
//////////////////////////////////////////////////////
const router = express.Router();
router.use(sanitizeRequest);

//////////////////////////////////////////////////////
// DEFINE ROUTES
//////////////////////////////////////////////////////
// [POST] User login 
router.post(
  "/login",
  userController.login,
  bcryptMiddleware.comparePassword,
  jwtMiddleware.generateTokens,
  (req, res) => {
    res.status(200).json({
      message: "Login successful",
      user: {
        user_id: res.locals.user_id,
        username: res.locals.username,
        role_id: res.locals.role_id,
        role_name: res.locals.role_name, 
        email_verified: res.locals.email_verified
      }
    });
  }
);

// [POST] User register
router.post(
  "/register",
  userValidationRules(), 
  validate,
  userController.checkUsernameExist,
  userController.checkEmailExist,
  bcryptMiddleware.hashPassword,
  userController.register,
  jwtMiddleware.generateTokens,
  (req, res) => {
    res.status(201).json({
      message: "Registration successful",
      user: {
        user_id: res.locals.user_id,
        username: res.locals.username,
        role_id: res.locals.role_id,
        role_name: res.locals.role_name, 
        email_verified: res.locals.email_verified
      }
    });
  }
);

router.get('/verify-email/:token', userController.verifyEmail);
router.post('/resend-verification', userController.resendVerificationEmail);

// Debug route to check if tokens exist

router.get('/me', jwtMiddleware.verifyAccessToken, (req, res) => {
  const user = {
    user_id: req.user.user_id,
    username: req.user.username,
    role_id: req.user.role_id,
    role_name: req.user.role_name,
    email_verified: req.user.email_verified
  };
  res.status(200).json(user);
});

// [GET] Search users by username
router.get('/users/search', jwtMiddleware.verifyAccessToken, userController.searchUsers);

// [POST] Check if email belongs to a registered user
router.post('/users/check-email', jwtMiddleware.verifyAccessToken, userController.findUserByEmail);

router.post("/logout", (req, res) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  });

  res.status(200).json({ message: "Logged out successfully" });
});

const circleRoutes = require('../routes/circleRoutes.js'); 
router.use('/circles', circleRoutes); 

const invitationRoutes = require('../routes/invitationRoutes.js');
router.use('/invitations', invitationRoutes);

const cleanupRoutes = require('../routes/cleanupRoutes.js');
router.use('/cleanup', cleanupRoutes);

const transactionRoutes = require('../routes/transactionRoutes.js');
const transactionController = require('../controllers/transactionController.js');

// External transaction routes (NO AUTH REQUIRED)
router.get('/transactions/external/:token', transactionController.getExternalTransaction);
router.patch('/transactions/external/:token/payment', transactionController.updateExternalPaymentStatus);

// Regular transaction routes (AUTH REQUIRED)
router.use('/transactions', jwtMiddleware.verifyAccessToken, transactionRoutes);

// PayNow routes (AUTH REQUIRED)
const payNowRoutes = require('../routes/payNowRoutes.js');
router.use('/paynow', jwtMiddleware.verifyAccessToken, payNowRoutes);

const mapsRoutes = require('../routes/mapsRoutes.js');
router.use('/maps', mapsRoutes);

const notificationRoutes = require('../routes/notificationRoutes.js');
router.use('/notifications', notificationRoutes);

//////////////////////////////////////////////////////
// EXPORT ROUTER
//////////////////////////////////////////////////////
router.use(sanitizeResponse);
module.exports = router;