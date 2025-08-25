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
        role_name: res.locals.role_name
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
        role_name: res.locals.role_name
      }
    });
  }
);

router.get('/verify-email/:token', userController.verifyEmail);
router.post('/resend-verification', userController.resendVerificationEmail);

// Debug route to check if tokens exist
router.get('/debug/tokens/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const tokens = await prisma.emailVerificationToken.findMany({
      where: { email: email },
      include: { user: true }
    });
    
    res.json({ tokens });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', jwtMiddleware.verifyAccessToken, (req, res) => {
  const user = {
    user_id: req.user.user_id,
    username: req.user.username,
    role_id: req.user.role_id,
    role_name: req.user.role_name
  };
  res.status(200).json(user);
});

// [POST] Logout route to clear the cookie
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

// [POST] Refresh token route
router.post("/refresh", jwtMiddleware.refreshTokenHandler);


const circleRoutes = require('../routes/circleRoutes.js'); 
router.use('/circle', circleRoutes); 

//////////////////////////////////////////////////////
// EXPORT ROUTER
//////////////////////////////////////////////////////
router.use(sanitizeResponse);
module.exports = router;