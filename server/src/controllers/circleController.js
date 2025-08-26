const circleModel = require('../models/circleModel');
const logger = require("../logger.js");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { parse } = require('path');

const mapCircleError = (error) => {
	const message = (error && error.message) ? error.message : String(error);
	if (message.includes('Access denied')) return { status: 403, message };
	if (message.toLowerCase().includes('invalid circle type')) return { status: 400, message: 'Invalid circle type' };
	if (message.toLowerCase().includes('cannot delete circle with outstanding balances')) return { status: 400, message };
	if (message.toLowerCase().includes('circle not found')) return { status: 404, message: 'Circle not found' };
	if (message.toLowerCase().includes('not found')) return { status: 404, message };
	if (message.toLowerCase().includes('invalid circle member role')) return { status: 400, message: 'Invalid circle member role' };
	return { status: 500, message: 'Internal server error' };
};

module.exports = {
	createCircle: catchAsync(async (req, res, next) => {
		const { name, type } = req.body; 
		const created_by = res.locals.user_id; 

		const data = {
			name: name, 
            type: type,
			created_by: created_by
		}

		try{
			const result = await circleModel.createNewCircle(data); 

			if(!result){
				logger.warn("Failed to create circle"); 
				return next(new AppError("Failed to create circle", 500)); 
			}

			logger.info(`Circle created successfully: ${result.circle.id}`); 
			res.status(201).json({
				status: "success", 
				message: "Circle created successfully", 
				data: result.circle
			})
		} catch(error){
			logger.error(`Error creating circle: ${error}`); 
			const mapped = mapCircleError(error);
			return next(new AppError(mapped.message, mapped.status)); 
		}
	}), 

	getUserCircles: catchAsync(async (req, res, next) => {
		const userId = res.locals.user_id; 

		try{ 
			const result = await circleModel.getUserCircles(userId); 
			logger.info(`Circles fetched successfully for user: ${userId}`); 
			res.status(200).json({
				status: "success", 
				message: "Circles fetched successfully",
				data: result || []
			})
		} catch(error){
			logger.error(`Error fetching circles: ${error}`); 
			const mapped = mapCircleError(error);
			return next(new AppError(mapped.message, mapped.status)); 
		}
	}), 

	getCircleById: catchAsync(async (req, res, next) => {
		const { circleId } = req.params; 
		const userId = res.locals.user_id; 
		const circleIdNum = parseInt(circleId, 10);

		if (Number.isNaN(circleIdNum)) {
			return next(new AppError('Invalid circle ID', 400));
		}

		try{
			const result = await circleModel.getCircleById(circleIdNum, userId); 

			if(!result){
				logger.warn("Circle not found"); 
				return next(new AppError("Circle not found", 404)); 
			}

			logger.info(`Circle details fetched successfully for circle: ${circleId}`); 
			res.status(200).json({
				status: "success", 
				message: "Circle details fetched successfully", 
				data: result
			})
		} catch(error){
			logger.error(`Error fetching circle by ID: ${error}`); 
			const mapped = mapCircleError(error);
			return next(new AppError(mapped.message, mapped.status)); 
		}
	}), 

	updateCircle: catchAsync(async (req, res, next) => {
		const { circleId } = req.params; 
		const { name, type } = req.body; 
		const userId = res.locals.user_id; 
		const circleIdNum = parseInt(circleId, 10);

		if (Number.isNaN(circleIdNum)) {
			return next(new AppError('Invalid circle ID', 400));
		}

		const data = {
			name: name, 
			type: type
		}; 

		try{
			const result = await circleModel.updateCircle(circleIdNum, data, userId); 

			if(!result){
				logger.warn("Circle not found"); 
				return next(new AppError("Circle not found", 404)); 
			}

			logger.info("Circle updated successfully"); 
			res.status(200).json({
				status: "success", 
				message: "Circle updated successfully", 
				data: result
			})
		} catch(error){
			logger.error(`Error updating circle: ${error}`); 
			const mapped = mapCircleError(error);
			return next(new AppError(mapped.message, mapped.status)); 
		}
	}), 

	deleteCircle: catchAsync(async (req, res, next) => {
		const { circleId } = req.params; 
		const userId = res.locals.user_id; 
		const circleIdNum = parseInt(circleId, 10);

		if (Number.isNaN(circleIdNum)) {
			return next(new AppError('Invalid circle ID', 400));
		}

		try{
			const result = await circleModel.deleteCircle(circleIdNum, userId); 

			if(!result){
				logger.warn("Circle not found");
				return next(new AppError("Circle not found", 404));
			}

			logger.info(`Circle deleted successfully: ${circleId}`);
			res.status(200).json({
				status: "success",
				message: "Circle deleted successfully"
			});
		} catch(error){
			logger.error(`Error deleting circle: ${error}`);
			const mapped = mapCircleError(error);
			return next(new AppError(mapped.message, mapped.status));
		}
	}),

	leaveCircle: catchAsync(async (req, res, next) => {
		const { circleId } = req.params;
		const userId = res.locals.user_id;
		const circleIdNum = parseInt(circleId, 10);

		if (Number.isNaN(circleIdNum)) {
			return next(new AppError('Invalid circle ID', 400));
		}

		try {
			const result = await circleModel.leaveCircle(circleIdNum, userId);
			logger.info(`User ${userId} left circle ${circleIdNum}`);
			res.status(200).json({
				status: 'success',
				message: 'Left circle successfully',
				data: result
			});
		} catch (error) {
			logger.error(`Error leaving circle: ${error}`);
			const mapped = mapCircleError(error);
			return next(new AppError(mapped.message, mapped.status));
		}
	}), 

	removeMemberFromCircle: catchAsync(async (req, res, next) => {
		const { circleId, memberId } = req.params; 
		const userId = res.locals.user_id; 
		const circleIdNum = parseInt(circleId, 10); 
		const memberIdNum = parseInt(memberId, 10);
		if (Number.isNaN(circleIdNum)) {
			return next(new AppError('Invalid circle ID', 400));
		}
		if (Number.isNaN(memberIdNum)) {
			return next(new AppError('Invalid member ID', 400));
		}
		if (memberIdNum === userId) {
			return next(new AppError('You cannot remove yourself from the circle. Use the leave circle option instead.', 400));
		}

		try{
			const result = await circleModel.removeMemberFromCircle(circleIdNum, memberIdNum, userId); 

			if(!result){
				logger.warn("Circle or member not found"); 
				return next(new AppError("Circle or member not found", 404)); 
			}

			logger.info(`Member ${memberId} removed from circle ${circleId} by user ${userId}`); 
			res.status(200).json({
				status: "success", 
				message: "Member removed from circle successfully", 
				data: result
			})
		} catch(error){
			logger.error(`Error removing member from circle: ${error}`); 
			const mapped = mapCircleError(error);
			return next(new AppError(mapped.message, mapped.status)); 
		}
	}), 

	updateMemberRole: catchAsync(async (req, res, next) => {
		const { circleId, memberId } = req.params;
		const { role } = req.body;
		const userId = res.locals.user_id;
		const circleIdNum = parseInt(circleId, 10);
		const memberIdNum = parseInt(memberId, 10);

		if (Number.isNaN(circleIdNum)) {
			return next(new AppError('Invalid circle ID', 400));
		}
		if (Number.isNaN(memberIdNum)) {
			return next(new AppError('Invalid member ID', 400));
		}
		if (!role) {
			return next(new AppError('Role is required', 400));
		}

		try {
			const result = await circleModel.updateMemberRole(circleIdNum, memberIdNum, role, userId);

			if (!result) {
				logger.warn("Circle or member not found");
				return next(new AppError("Circle or member not found", 404));
			}

			logger.info(`Member ${memberId} role updated to ${role} in circle ${circleId} by user ${userId}`);
			res.status(200).json({
				status: "success",
				message: "Member role updated successfully",
				data: result
			});
		} catch (error) {
			logger.error(`Error updating member role: ${error}`);
			const mapped = mapCircleError(error);
			return next(new AppError(mapped.message, mapped.status));
		}
	})
}