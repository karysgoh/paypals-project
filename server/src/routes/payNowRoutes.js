/**
 * PayNow Routes
 * 
 * API endpoints for PayNow payment functionality:
 * - Generate QR codes for transactions
 * - Confirm payments made via PayNow
 * - Manage user PayNow settings
 */

const express = require('express');
const payNowController = require('../controllers/payNowController');
const { sanitizeRequest, sanitizeResponse } = require('../middlewares/sanitizers');

const router = express.Router();

// Apply sanitization middleware
router.use(sanitizeRequest);

// PayNow QR generation and payment routes
router.get('/:transactionId/qr', payNowController.generateQR);
router.post('/:transactionId/confirm', payNowController.confirmPayment);

// PayNow settings management
router.get('/settings', payNowController.getPayNowSettings);
router.patch('/settings', payNowController.updatePayNowSettings);

router.use(sanitizeResponse);
module.exports = router;