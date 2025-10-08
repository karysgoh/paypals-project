#!/usr/bin/env node

/**
 * Cleanup Script for Expired Invitations
 * 
 * This script can be run as a cron job to automatically clean up expired invitations.
 * Usage:
 *   node cleanup.js [days_old]
 * 
 * Examples:
 *   node cleanup.js          # Removes expired invitations older than 30 days (default)
 *   node cleanup.js 7        # Removes expired invitations older than 7 days
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupExpiredInvitations(daysOld = 30) {
    try {
        console.log(`Starting cleanup of expired invitations older than ${daysOld} days...`);
        
        // First, mark any pending invitations that have expired as 'expired'
        const expiredInvitations = await prisma.invitation.findMany({
            where: {
                status: 'pending',
                expires_at: { lt: new Date() }
            },
            include: {
                invitee: { select: { id: true, username: true } },
                circle: { select: { id: true, name: true } }
            }
        });

        if (expiredInvitations.length > 0) {
            console.log(`Found ${expiredInvitations.length} newly expired invitations to mark...`);
            
            await prisma.invitation.updateMany({
                where: {
                    id: { in: expiredInvitations.map(inv => inv.id) }
                },
                data: { status: 'expired' }
            });

            // Create audit logs for newly expired invitations
            for (const invitation of expiredInvitations) {
                await prisma.auditLog.create({
                    data: {
                        performed_by: null, // System action
                        action_type: 'expire_invitation',
                        target_entity: 'circle',
                        target_id: invitation.circle_id,
                        description: `Invitation to ${invitation.invitee?.username || invitation.email || 'user'} expired (cleanup)`
                    }
                });
            }
            
            console.log(`✓ Marked ${expiredInvitations.length} invitations as expired`);
        }

        // Remove old expired invitations
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        
        const oldExpiredInvitations = await prisma.invitation.findMany({
            where: {
                status: 'expired',
                expires_at: { lt: cutoffDate }
            },
            select: { id: true, circle: { select: { name: true } } }
        });

        if (oldExpiredInvitations.length > 0) {
            console.log(`Found ${oldExpiredInvitations.length} old expired invitations to remove...`);
            
            const deletedInvitations = await prisma.invitation.deleteMany({
                where: {
                    status: 'expired',
                    expires_at: { lt: cutoffDate }
                }
            });
            
            console.log(`✓ Removed ${deletedInvitations.count} old expired invitations`);
        } else {
            console.log('No old expired invitations found to remove');
        }

        console.log('Cleanup completed successfully!');
        
        return {
            newlyExpired: expiredInvitations.length,
            oldExpiredRemoved: oldExpiredInvitations.length
        };
        
    } catch (error) {
        console.error('Error during cleanup:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    const daysOld = parseInt(process.argv[2]) || 30;
    
    cleanupExpiredInvitations(daysOld)
        .then(result => {
            console.log(`\nSummary:`);
            console.log(`- Newly expired: ${result.newlyExpired}`);
            console.log(`- Old expired removed: ${result.oldExpiredRemoved}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('Cleanup failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanupExpiredInvitations };