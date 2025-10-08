//////////////////////////////////////////////////////
// REQUIRED MODULES
//////////////////////////////////////////////////////
const express = require('express');

//////////////////////////////////////////////////////
// IMPORT CONTROLLERS
//////////////////////////////////////////////////////
const transactionController = require('../controllers/transactionController.js');

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
    '/:circleId',
    transactionController.createTransaction
);

router.put(
    '/:transactionId',
    transactionController.updateTransaction
); 

router.delete(
    '/:transactionId',
    transactionController.deleteTransaction
); 

router.get(
    '/circle/:circleId',
    transactionController.getCircleTransactions
);

router.get(
    '/user',
    transactionController.getUserTransactions
);

router.get(
    '/user/summary',
    transactionController.getUserTransactionSummary
)

router.patch(
    '/:transactionId/status',
    transactionController.updatePaymentStatus
);

router.patch(
    '/bulk/status',
    transactionController.bulkUpdatePaymentStatus
);

router.post(
    '/reminder/:userId',
    transactionController.sendPaymentReminder
);

router.get(
    '/:transactionId',
    transactionController.getTransactionById
);

//////////////////////////////////////////////////////
// EXPORT ROUTER
//////////////////////////////////////////////////////
router.use(sanitizeResponse);
module.exports = router;
