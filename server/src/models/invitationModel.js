const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendCircleInvitationEmail } = require('../utils/emailService');

module.exports = {
    sendInvitation: async (circleId, data) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1) Validate circle exists
                const circle = await tx.circle.findUnique({ where: { id: circleId } });
                if (!circle) {
                    throw new Error('Circle not found');
                }

                // Early self-invite guard
                if (data.inviteeId !== null && data.inviteeId === data.inviterId) {
                    throw new Error('You cannot invite yourself to a circle');
                }

                // 2) Verify inviter membership and admin
                const isMember = await tx.circleMember.findFirst({
                    where: { circle_id: circleId, user_id: data.inviterId, status: 'active' }
                });
                if (!isMember) {
                    throw new Error('Access denied: Not a member of this circle');
                }
                const isAdmin = await tx.circleMember.findFirst({
                    where: { circle_id: circleId, user_id: data.inviterId, role: 'admin' }
                });
                if (!isAdmin) {
                    throw new Error('Access denied: Not an admin member of this circle');
                }

                // 3) Check if user is already a member
                if (data.inviteeId !== null) {
                    const existingMember = await tx.circleMember.findFirst({
                        where: {
                            circle_id: circleId,
                            user_id: data.inviteeId,
                            status: { in: ['active', 'pending'] }
                        }
                    });
                    if (existingMember) {
                        throw new Error('User is already a member or has a pending invitation');
                    }
                }

                // 4) Check for existing pending invitation (prefer invitee_id when provided)
                const existingInvitation = await tx.invitation.findFirst({
                    where: {
                        circle_id: circleId,
                        ...(data.inviteeId !== null ? { invitee_id: data.inviteeId } : (data.email ? { email: data.email } : {})),
                        status: 'pending',
                        expires_at: { gt: new Date() }
                    }
                });
                if (existingInvitation) {
                    throw new Error('A pending invitation already exists for this user');
                }

                // 5) Resolve invitee and create invitation
                let invitation;
                if (data.inviteeId !== null) {
                    const invitee = await tx.user.findUnique({ where: { id: data.inviteeId } });
                    if (!invitee) {
                        throw new Error('Invitee user not found');
                    }

                    invitation = await tx.invitation.create({
                        data: {
                            circle_id: circleId,
                            inviter_id: data.inviterId,
                            invitee_id: invitee.id,
                            status: 'pending',
                            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        }
                    });
                } else {
                    if (!data.email) {
                        throw new Error('Email is required when invitee ID is not provided');
                    }

                    await sendCircleInvitationEmail(data.email, data.inviterUsername, circle.name);

                    invitation = await tx.invitation.create({
                        data: {
                            circle_id: circleId,
                            inviter_id: data.inviterId,
                            invitee_id: null,
                            email: data.email,
                            status: 'pending',
                            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        }
                    });
                }

                await tx.auditLog.create({
                    data: {
                        performed_by: data.inviterId,
                        action_type: 'invite',
                        target_entity: 'circle',
                        target_id: circleId,
                        description: `Invitation sent to ${data.inviteeId ? 'user' : 'email'}`
                    }
                });

                return invitation;
            });

            return result;
        } catch (error) {
            throw error;
        }
    },

    acceptInvitation: async (invitationId, userId) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1) Find and validate invitation
                const invitation = await tx.invitation.findUnique({
                    where: { id: invitationId },
                    include: { circle: true }
                });

                if (!invitation) {
                    throw new Error('Invitation not found');
                }
                if (invitation.status !== 'pending') {
                    throw new Error('Invitation is no longer valid');
                }
                if (invitation.expires_at < new Date()) {
                    throw new Error('Invitation has expired');
                }
                if (invitation.invitee_id && invitation.invitee_id !== userId) {
                    throw new Error('Access denied: This invitation is not for you');
                }

                // 2) Check if user is already a member
                const existingMember = await tx.circleMember.findFirst({
                    where: {
                        circle_id: invitation.circle_id,
                        user_id: userId,
                        status: { in: ['active', 'pending'] }
                    }
                });
                if (existingMember) {
                    throw new Error('You are already a member of this circle');
                }

                // 3) Add user to circle
                // Use createMany with skipDuplicates to avoid unique constraint errors in concurrent scenarios.
                // createMany does not return the created record, so fetch it after.
                // createMany expects an array for `data`
                console.debug(`acceptInvitation: attempting upsert circleMember for circle=${invitation.circle_id} user=${userId}`);
                // upsert will either create the member or update existing one and return the record
                let newMember;
                try {
                    newMember = await tx.circleMember.upsert({
                        where: { circle_id_user_id: { circle_id: invitation.circle_id, user_id: userId } },
                        update: { status: 'active', role: 'member' },
                        create: {
                            circle_id: invitation.circle_id,
                            user_id: userId,
                            role: 'member',
                            status: 'active'
                        }
                    });
                    console.debug('acceptInvitation: upsert result:', newMember);
                } catch (upsertErr) {
                    console.error('acceptInvitation: upsert error:', upsertErr);
                    // Fallback diagnostics: try to read any existing record
                    try {
                        const found = await tx.circleMember.findMany({
                            where: { circle_id: invitation.circle_id, user_id: userId }
                        });
                        console.error('acceptInvitation: findMany returned (fallback):', found);
                        const count = await tx.circleMember.count({ where: { circle_id: invitation.circle_id, user_id: userId } });
                        console.error('acceptInvitation: count returned (fallback):', count);
                    } catch (innerErr) {
                        console.error('acceptInvitation: error while performing fallback diagnostics:', innerErr);
                    }
                    throw new Error('Failed to add user to circle');
                }

                // 4) Update invitation status
                await tx.invitation.update({
                    where: { id: invitationId },
                    data: { 
                        status: 'accepted',
                        invitee_id: userId 
                    }
                });

                // 5) Create audit log
                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'join',
                        target_entity: 'circle',
                        target_id: invitation.circle_id,
                        description: 'User joined circle via invitation'
                    }
                });

                return {
                    member: newMember,
                    circle: invitation.circle
                };
            });

            return result;
        } catch (error) {
            throw error;
        }
    },

    rejectInvitation: async (invitationId, userId) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1) Find and validate invitation
                const invitation = await tx.invitation.findUnique({
                    where: { id: invitationId }
                });

                if (!invitation) {
                    throw new Error('Invitation not found');
                }
                if (invitation.status !== 'pending') {
                    throw new Error('Invitation is no longer valid');
                }
                if (invitation.invitee_id && invitation.invitee_id !== userId) {
                    throw new Error('Access denied: This invitation is not for you');
                }

                // 2) Update invitation status
                const updatedInvitation = await tx.invitation.update({
                    where: { id: invitationId },
                    data: { 
                        status: 'rejected',
                        invitee_id: userId 
                    }
                });

                // 3) Create audit log
                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'reject_invitation',
                        target_entity: 'circle',
                        target_id: invitation.circle_id,
                        description: 'User rejected circle invitation'
                    }
                });

                return updatedInvitation;
            });

            return result;
        } catch (error) {
            throw error;
        }
    }, 

    readUserInvitations: async (userId, { page = 1, limit = 10, status, sortBy = 'created_at', sortOrder = 'desc' } = {}) => {
        try {
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
            const skip = (pageNum - 1) * limitNum;

            const where = {
                invitee_id: userId,
                ...(status ? { status } : {})
            };

            let orderBy = {};
            switch (sortBy) {
                case 'status':
                    orderBy = { status: sortOrder };
                    break;
                case 'expires_at':
                    orderBy = { expires_at: sortOrder };
                    break;
                default:
                    orderBy = { created_at: sortOrder };
            }

            const [total, invitations] = await Promise.all([
                prisma.invitation.count({ where }),
                prisma.invitation.findMany({
                    where,
                    include: {
                        circle: { select: { id: true, name: true, type: true } },
                        inviter: { select: { id: true, username: true } },
                    },
                    orderBy,
                    skip,
                    take: limitNum,
                })
            ]);

            const totalPages = Math.ceil(total / limitNum);
            return {
                invitations,
                total,
                totalPages,
                currentPage: pageNum,
                pageSize: limitNum
            };
        } catch (error) {
            throw error;
        }
    },

    deleteInvitation: async (invitationId, userId) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1) Find and validate invitation
                const invitation = await tx.invitation.findUnique({
                    where: { id: invitationId }
                });

                if (!invitation) {
                    throw new Error('Invitation not found');
                }
                if (invitation.inviter_id !== userId) {
                    throw new Error('Access denied: You are not the inviter');
                }
                if (invitation.status !== 'pending') {
                    throw new Error('Only pending invitations can be deleted');
                }

                // 2) Delete invitation
                const deletedInvitation = await tx.invitation.delete({
                    where: { id: invitationId }
                });

                // 3) Create audit log
                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'delete_invitation',
                        target_entity: 'circle',
                        target_id: invitation.circle_id,
                        description: 'Invitation deleted by inviter'
                    }
                });

                return deletedInvitation;
            });

            return result;
        } catch (error) {
            console.error('Error deleting invitation:', error);
            throw error;
        }
    }
};
