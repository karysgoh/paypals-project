const invitationModel = require('../models/invitationModel');
const logger = require("../logger.js");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const mapInvitationError = (error) => {
	const message = (error && error.message) ? error.message : String(error);
	if (message.includes('Access denied')) return { status: 403, message };
	if (message.toLowerCase().includes('circle not found')) return { status: 404, message: 'Circle not found' };
	if (message.toLowerCase().includes('invitation not found')) return { status: 404, message: 'Invitation not found' };
	if (message.toLowerCase().includes('user is already a member')) return { status: 400, message };
	if (message.toLowerCase().includes('pending invitation')) return { status: 400, message };
	if (message.toLowerCase().includes('not for you')) return { status: 403, message };
	if (message.toLowerCase().includes('no longer valid')) return { status: 400, message };
	if (message.toLowerCase().includes('expired')) return { status: 400, message };
	if (message.toLowerCase().includes('only pending invitations can be deleted')) return { status: 400, message };
	return { status: 500, message: 'Internal server error' };
};

module.exports = {
	send: catchAsync(async (req, res, next) => {
		const { circleId } = req.params;
		const { inviteeId, email } = req.body;
		const inviterId = res.locals.user_id;
		const inviterUsername = res.locals.username;

		if (!inviteeId && !email) {
			return next(new AppError('inviteeId or email is required', 400));
		}

		const circleIdNum = parseInt(circleId, 10);
		const inviteeIdNum = parseInt(inviteeId, 10);
		
		if (Number.isNaN(circleIdNum)) {
			return next(new AppError('Invalid circle ID', 400));
		}

		try {
			const invitation = await invitationModel.sendInvitation(circleIdNum, {
				inviterId,
				inviterUsername,
				inviteeIdNum,
				email
			});
			logger.info(`Invitation created for circle ${circleIdNum}`);
			res.status(201).json({ status: 'success', message: 'Invitation sent', data: invitation });
		} catch (error) {
			logger.error(`Error sending invitation: ${error}`);
			const mapped = mapInvitationError(error);
			return next(new AppError(mapped.message, mapped.status));
		}
	}),

	accept: catchAsync(async (req, res, next) => {
		const { invitationId } = req.params;
		const userId = res.locals.user_id;
		const idNum = parseInt(invitationId, 10);
		if (Number.isNaN(idNum)) {
			return next(new AppError('Invalid invitation ID', 400));
		}
		try {
			const result = await invitationModel.acceptInvitation(idNum, userId);
			logger.info(`Invitation ${idNum} accepted by user ${userId}`);
			res.status(200).json({ status: 'success', message: 'Invitation accepted', data: result });
		} catch (error) {
			logger.error(`Error accepting invitation: ${error}`);
			const mapped = mapInvitationError(error);
			return next(new AppError(mapped.message, mapped.status));
		}
	}),

	reject: catchAsync(async (req, res, next) => {
		const { invitationId } = req.params;
		const userId = res.locals.user_id;
		const idNum = parseInt(invitationId, 10);
		if (Number.isNaN(idNum)) {
			return next(new AppError('Invalid invitation ID', 400));
		}
		try {
			const result = await invitationModel.rejectInvitation(idNum, userId);
			logger.info(`Invitation ${idNum} rejected by user ${userId}`);
			res.status(200).json({ status: 'success', message: 'Invitation rejected', data: result });
		} catch (error) {
			logger.error(`Error rejecting invitation: ${error}`);
			const mapped = mapInvitationError(error);
			return next(new AppError(mapped.message, mapped.status));
		}
	}),

	readMy: catchAsync(async (req, res, next) => {
		const userId = res.locals.user_id;
		const { page, limit, status, sortBy, sortOrder } = req.query;
		try {
			const result = await invitationModel.readUserInvitations(userId, { page, limit, status, sortBy, sortOrder });
			res.status(200).json({ status: 'success', data: result });
		} catch (error) {
			logger.error(`Error reading invitations: ${error}`);
			const mapped = mapInvitationError(error);
			return next(new AppError(mapped.message, mapped.status));
		}
	}),

	delete: catchAsync(async (req, res, next) => {
		const { invitationId } = req.params;
		const userId = res.locals.user_id;
		const idNum = parseInt(invitationId, 10);

		try {
			const result = await invitationModel.deleteInvitation(idNum, userId);
			logger.info(`Invitation ${idNum} deleted by user ${userId}`);
			res.status(200).json({ status: 'success', message: 'Invitation deleted', data: result });
		} catch (error) {
			logger.error(`Error deleting invitation: ${error}`);
			const mapped = mapInvitationError(error);
			return next(new AppError(mapped.message, mapped.status));
		}
	})
};
