const transactionModel = require('../models/transactionModel');
const logger = require("../logger.js");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { update } = require('lodash');

const mapTransactionError = (error) => {
	const message = (error && error.message) ? error.message : String(error);
	if (message.includes('Access denied')) return { status: 403, message };
	if (message.toLowerCase().includes('circle not found')) return { status: 404, message: 'Circle not found' };
    if (message.toLowerCase().includes('user is not a member of the circle')) return { status: 400, message: 'User is not a member of the circle'};
	if (message.toLowerCase().includes('transaction not found')) return { status: 404, message: 'Transaction not found' };
	if (message.toLowerCase().includes('at least one participant is required')) return { status: 400, message: 'At least one participant is required in this transaction'}; 
	if (message.toLowerCase().includes('participants with ids')) return { status: 400, message: message };
	if (message.toLowerCase().includes('total amount') && message.toLowerCase().includes('does not match')) return { status: 400, message: message };
	if (message.toLowerCase().includes('total amount') && message.toLowerCase().includes('less than sum')) return { status: 400, message: message };
	if (message.toLowerCase().includes('transaction creator must be included')) return { status: 400, message: message };
    if (message.toLowerCase().includes('cannot delete transaction with paid participants')) return { status: 400, message: message };
    if (message.toLowerCase().includes('only transaction creator or circle admin can')) return { status: 403, message: message };
    if (message.toLowerCase().includes('invalid payment status')) return { status: 400, message: message };
    if (message.toLowerCase().includes('no transactions found for this user')) return { status: 404, message: message };
	return { status: 500, message: 'Internal server error' };
};

const formatTransactionResponse = (transaction) => ({
    id: transaction.id,
    name: transaction.name,
    description: transaction.description,
    category: transaction.category,
    total_amount: transaction.total_amount,
    circle_id: transaction.circle_id,
    created_by: transaction.created_by,
    location_name: transaction.location_name,
    location_lat: transaction.location_lat,
    location_lng: transaction.location_lng,
    place_id: transaction.place_id,
    formatted_address: transaction.formatted_address,
    created_at: transaction.created_at,
    updated_at: transaction.updated_at,
    user_amount_owed: transaction.user_amount_owed,
    user_payment_status: transaction.user_payment_status,
    is_user_participant: transaction.is_user_participant,
    can_edit: transaction.can_edit,
    payment_progress: transaction.payment_progress,
    members: transaction.members?.map(member => ({
        user_id: member.user_id,
        amount_owed: member.amount_owed,
        payment_status: member.payment_status,
        user: member.user ? {
            id: member.user.id,
            username: member.user.username,
            email: member.user.email
        } : undefined
    })),
    creator: transaction.creator ? {
        id: transaction.creator.id,
        username: transaction.creator.username,
        email: transaction.creator.email
    } : undefined
});

module.exports = {
    createTransaction: catchAsync(async (req, res, next) => {
        try {
            const { circleId } = req.params;
            const transactionData = {
                ...req.body,
                created_by: res.locals.user_id
            };

            if (!transactionData.name || !transactionData.total_amount || !transactionData.participants) {
                return next(new AppError('Transaction name, total amount, and participants are required', 400));
            }

            if (transactionData.total_amount <= 0) {
                return next(new AppError('Total amount must be greater than 0', 400));
            }

            if (!Array.isArray(transactionData.participants) || transactionData.participants.length === 0) {
                return next(new AppError('At least one participant is required', 400));
            }

            for (const participant of transactionData.participants) {
                if (!participant.user_id || participant.amount_owed === undefined || participant.amount_owed < 0) {
                    return next(new AppError('Each participant must have a valid user_id and non-negative amount_owed', 400));
                }
            }

            const circleIdNum = parseInt(circleId, 10);

            const transaction = await transactionModel.createTransaction(circleIdNum, transactionData);

            logger.info('Transaction created successfully', { 
                transactionId: transaction.id, 
                circleId: circleIdNum 
            });

            res.status(201).json({
                status: 'success',
                message: 'Transaction created successfully',
                data: {
                    transaction: formatTransactionResponse(transaction)
                }
            });

        } catch (error) {
            logger.error(`Error creating transaction: ${error}`);
			const mapped = mapTransactionError(error);
			return next(new AppError(mapped.message, mapped.status));
        }
    }),

    updateTransaction: catchAsync(async (req, res, next) => {
        try {
            const { transactionId } = req.params;
            const userId = res.locals.user_id;
            const updateData = req.body;

            // Validate transaction ID
            const transactionIdNum = parseInt(transactionId, 10);
            if (isNaN(transactionIdNum)) {
                return next(new AppError('Invalid transaction ID', 400));
            }

            // Validate amounts if provided
            if (updateData.total_amount !== undefined && updateData.total_amount <= 0) {
                return next(new AppError('Total amount must be greater than 0', 400));
            }

            // Validate participants if provided
            if (updateData.participants) {
                if (!Array.isArray(updateData.participants) || updateData.participants.length === 0) {
                    return next(new AppError('At least one participant is required', 400));
                }

                for (const participant of updateData.participants) {
                    if (!participant.user_id || participant.amount_owed === undefined || participant.amount_owed < 0) {
                        return next(new AppError('Each participant must have a valid user_id and non-negative amount_owed', 400));
                    }
                }
            }

            const transaction = await transactionModel.updateTransaction(transactionIdNum, userId, updateData);

            logger.info('Transaction updated successfully', { 
                transactionId: transactionIdNum 
            });

            res.status(200).json({
                status: 'success',
                message: 'Transaction updated successfully',
                data: {
                    transaction: formatTransactionResponse(transaction)
                }
            });

        } catch (error) {
            logger.error(`Error updating transaction: ${error}`);
            const mapped = mapTransactionError(error);
            return next(new AppError(mapped.message, mapped.status));
        }
    }),

    deleteTransaction: catchAsync(async (req, res, next) => {
        try {
            const { transactionId } = req.params;
            const userId = res.locals.user_id;

            const transactionIdNum = parseInt(transactionId, 10);

            const result = await transactionModel.deleteTransaction(transactionIdNum, userId);

            logger.info('Transaction deleted successfully', { 
                transactionId: transactionIdNum 
            });

            res.status(200).json({
                status: 'success',
                message: result.message
            });

        } catch (error) {
            logger.error(`Error deleting transaction: ${error}`);
            const mapped = mapTransactionError(error);
            return next(new AppError(mapped.message, mapped.status));
        }
    }),

    getCircleTransactions: catchAsync(async (req, res, next) => {
        try {
            const { circleId } = req.params;
            const userId = res.locals.user_id;

            // Validate circle ID
            const circleIdNum = parseInt(circleId, 10);
            if (isNaN(circleIdNum)) {
                return next(new AppError('Invalid circle ID', 400));
            }

            const options = {
                page: parseInt(req.query.page, 10) || 1,
                limit: Math.min(parseInt(req.query.limit, 10) || 20, 100), 
                sortBy: req.query.sortBy || 'created_at',
                sortOrder: req.query.sortOrder || 'desc',
                category: req.query.category,
                status: req.query.status,
                userOnly: req.query.userOnly === 'true',
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo,
                minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : undefined,
                maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount) : undefined,
                search: req.query.search
            };

            // Validate pagination
            if (options.page < 1) {
                return next(new AppError('Page must be greater than 0', 400));
            }

            if (options.limit < 1) {
                return next(new AppError('Limit must be greater than 0', 400));
            }

            // Validate sort order
            if (!['asc', 'desc'].includes(options.sortOrder)) {
                return next(new AppError('Sort order must be "asc" or "desc"', 400));
            }

            // Validate amount ranges
            if (options.minAmount !== undefined && options.minAmount < 0) {
                return next(new AppError('Minimum amount must be non-negative', 400));
            }

            if (options.maxAmount !== undefined && options.maxAmount < 0) {
                return next(new AppError('Maximum amount must be non-negative', 400));
            }

            if (options.minAmount !== undefined && options.maxAmount !== undefined && options.minAmount > options.maxAmount) {
                return next(new AppError('Minimum amount cannot be greater than maximum amount', 400));
            }

            const result = await transactionModel.getCircleTransactions(circleIdNum, userId, options);

            logger.info('Transactions retrieved successfully', { 
                circleId: circleIdNum,
                transactionCount: result.transactions.length,
                totalCount: result.pagination.total
            });

            res.status(200).json({
                status: 'success',
                message: 'Transactions retrieved successfully',
                data: {
                    transactions: result.transactions.map(formatTransactionResponse),
                    pagination: result.pagination
                }
            });

        } catch (error) {
            logger.error(`Error getting circle transactions: ${error}`);
            const mapped = mapTransactionError(error);
            return next(new AppError(mapped.message, mapped.status));
        }
    }),

    getTransactionById: catchAsync(async (req, res, next) => {
        try {
            const { transactionId } = req.params;
            const userId = res.locals.user_id;

            const transactionIdNum = parseInt(transactionId, 10);

            const transaction = await transactionModel.getTransactionById(transactionIdNum, userId);

            logger.info('Transaction retrieved successfully', { 
                transactionId: transactionIdNum 
            });

            res.status(200).json({
                status: 'success',
                message: 'Transaction retrieved successfully',
                data: {
                    transaction: formatTransactionResponse(transaction)
                }
            });

        } catch (error) {
            logger.error(`Error getting transaction by ID: ${error}`);
            const mapped = mapTransactionError(error);
            return next(new AppError(mapped.message, mapped.status));
        }
    }),

    updatePaymentStatus: catchAsync(async (req, res, next) => {
        try {
            const { transactionId } = req.params;
            const userId = res.locals.user_id;
            const { payment_status } = req.body;

            const transactionIdNum = parseInt(transactionId, 10);

            // Validate payment status
            if (!payment_status) {
                return next(new AppError('Payment status is required', 400));
            }

            if (!['pending', 'paid'].includes(payment_status)) {
                return next(new AppError('Payment status must be "pending" or "paid"', 400));
            }

            logger.info('Transaction: updatePaymentStatus called', { 
                transactionId: transactionIdNum, 
                userId,
                paymentStatus: payment_status
            });

            const result = await transactionModel.updatePaymentStatus(transactionIdNum, userId, payment_status);

            logger.info('Payment status updated successfully', { 
                transactionId: transactionIdNum,
                paymentStatus: payment_status
            });

            res.status(200).json({
                status: 'success',
                message: result.message
            });

        } catch (error) {
            logger.error(`Error updating payment status: ${error}`);
            const mapped = mapTransactionError(error);
            return next(new AppError(mapped.message, mapped.status));
        }
    }),

    getUserTransactionSummary: catchAsync(async (req, res, next) => {
        try {
            const { circleId } = req.params;
            const userId = res.locals.user_id;

            const circleIdNum = parseInt(circleId, 10);

            logger.info('Transaction: getUserTransactionSummary called', { 
                circleId: circleIdNum, 
                userId 
            });

            // Get user's transactions with summary data
            const result = await transactionModel.getCircleTransactions(circleIdNum, userId, { 
                userOnly: true, 
                limit: 1000 // Get all user transactions for summary
            });

            // Calculate summary statistics
            const transactions = result.transactions;
            const summary = {
                total_transactions: transactions.length,
                total_amount_owed: transactions.reduce((sum, t) => sum + (t.user_amount_owed || 0), 0),
                pending_amount: transactions.filter(t => t.user_payment_status === 'pending')
                                             .reduce((sum, t) => sum + (t.user_amount_owed || 0), 0),
                paid_amount: transactions.filter(t => t.user_payment_status === 'paid')
                                        .reduce((sum, t) => sum + (t.user_amount_owed || 0), 0),
                pending_count: transactions.filter(t => t.user_payment_status === 'pending').length,
                paid_count: transactions.filter(t => t.user_payment_status === 'paid').length,
                categories: {}
            };

            // Calculate category breakdown
            transactions.forEach(t => {
                const category = t.category || 'other';
                if (!summary.categories[category]) {
                    summary.categories[category] = {
                        count: 0,
                        total_amount: 0,
                        user_amount_owed: 0
                    };
                }
                summary.categories[category].count++;
                summary.categories[category].total_amount += t.total_amount;
                summary.categories[category].user_amount_owed += t.user_amount_owed || 0;
            });

            logger.info('Transaction summary retrieved successfully', { 
                circleId: circleIdNum,
                totalTransactions: summary.total_transactions
            });

            res.status(200).json({
                status: 'success',
                message: 'Transaction summary retrieved successfully',
                data: {
                    summary,
                    recent_transactions: transactions.slice(0, 5).map(formatTransactionResponse)
                }
            });

        } catch (error) {
            logger.error(`Error getting user transaction summary: ${error}`);
            const mapped = mapTransactionError(error);
            return next(new AppError(mapped.message, mapped.status));
        }
    }), 

    getUserTransactions: catchAsync(async (req, res, next) => {
        const userId = res.locals.user_id;

        try {
            const result = await transactionModel.getUserTransactions(userId);

            logger.info('User transactions retrieved successfully');

            res.status(200).json({
                status: 'success',
                data: {
                    transactions: result
                }
            });
        } catch (error) {
            logger.error(`Error getting user transactions: ${error}`);
            const mapped = mapTransactionError(error);
            return next(new AppError(mapped.message, mapped.status));
        }
    })
};