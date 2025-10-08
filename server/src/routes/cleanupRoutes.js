const express = require('express');
const router = express.Router();
const invitationModel = require('../models/invitationModel');
const logger = require('../logger');

// Cleanup endpoint that can be called by cron jobs or schedulers
router.post('/expired-invitations', async (req, res) => {
    try {
        const { daysOld = 30 } = req.body;
        
        // Clean up expired invitations first
        const expiredResult = await invitationModel.cleanupExpiredInvitations();
        
        // Remove old expired invitations
        const cleanupResult = await invitationModel.removeOldExpiredInvitations(daysOld);
        
        logger.info(`Cleanup completed: ${expiredResult.expiredCount} newly expired, ${cleanupResult.deletedCount} old expired removed`);
        
        res.status(200).json({
            status: 'success',
            message: 'Cleanup completed successfully',
            data: {
                newlyExpired: expiredResult.expiredCount,
                oldExpiredRemoved: cleanupResult.deletedCount
            }
        });
    } catch (error) {
        logger.error('Error during invitation cleanup:', error);
        res.status(500).json({
            status: 'error',
            message: 'Cleanup failed',
            error: error.message
        });
    }
});

// Manual trigger for testing - marks all expired invitations
router.post('/mark-expired', async (req, res) => {
    try {
        const result = await invitationModel.cleanupExpiredInvitations();
        
        logger.info(`Manual expiration cleanup: ${result.expiredCount} invitations marked as expired`);
        
        res.status(200).json({
            status: 'success',
            message: 'Expired invitations marked successfully',
            data: {
                expiredCount: result.expiredCount,
                expiredInvitations: result.expiredInvitations.map(inv => ({
                    id: inv.id,
                    circleName: inv.circle?.name,
                    inviteeName: inv.invitee?.username || inv.email,
                    expiresAt: inv.expires_at
                }))
            }
        });
    } catch (error) {
        logger.error('Error during manual expiration cleanup:', error);
        res.status(500).json({
            status: 'error',
            message: 'Manual cleanup failed',
            error: error.message
        });
    }
});

module.exports = router;