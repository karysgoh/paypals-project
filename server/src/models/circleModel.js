const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendCircleInvitationEmail } = require('../utils/emailService');

module.exports = {
    createNewCircle: async (data) => {
        try {
            // Normalize and validate type if provided
            const normalizedType = typeof data.type === 'string' ? data.type.toLowerCase() : 'friends';
            const enumObj = Prisma && Prisma.CircleTypeEnum ? Prisma.CircleTypeEnum : null;
            const allowedTypes = enumObj ? Object.values(enumObj) : null;
            if (allowedTypes && !allowedTypes.includes(normalizedType)) {
                throw new Error('Invalid circle type');
            }

            const result = await prisma.$transaction(async (tx) => {
                const newCircle = await tx.circle.create({
                    data: {
                        name: data.name,
                        type: normalizedType,
                    }
                });

                // Add the creator as a member with admin role
                const circleMember = await tx.circleMember.create({
                    data: {
                        circle_id: newCircle.id,
                        user_id: data.created_by,
                        role: 'admin',
                        status: 'active'
                    }
                });

                await tx.auditLog.create({
                    data: {
                        performed_by: data.created_by,
                        action_type: 'create',
                        target_entity: 'circle', 
                    }
                });

                return {
                    circle: newCircle,
                    membership: circleMember
                };
            });

            return result;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new Error('Invalid circle type');
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2009') {
                throw new Error('Invalid circle type');
            }
            if (typeof error?.message === 'string' && error.message.toLowerCase().includes('invalid circle type')) {
                throw error;
            }
            console.error('Error creating circle:', error);
            throw new Error('Failed to create circle');
        }
    },

    getUserCircles: async (userId) => {
        try {
            const circles = await prisma.circleMember.findMany({
                where: {
                    user_id: userId,
                    status: 'active'
                },
                include: {
                    circle: {
                        include: {
                            _count: {
                                select: { members: true }
                            }
                        }
                    }
                }
            });

            return circles.map(member => ({
                ...member.circle,
                memberCount: member.circle._count.members,
                userRole: member.role
            }));
        } catch (error) {
            console.error('Error fetching user circles:', error);
            throw new Error('Failed to fetch circles');
        }
    },

    getCircleById: async (circleId, userId) => {
        try {
            // 1) Check circle existence first
            const circleExists = await prisma.circle.findUnique({ where: { id: circleId } });
            if (!circleExists) {
                throw new Error('Circle not found');
            }

            // 2) Then verify membership
            const membership = await prisma.circleMember.findFirst({
                where: {
                    circle_id: circleId,
                    user_id: userId,
                    status: 'active'
                }
            });

            if (!membership) {
                throw new Error('Access denied: Not a member of this circle');
            }

            // 3) Return full circle details
            const circle = await prisma.circle.findUnique({
                where: { id: circleId },
                include: {
                    members: {
                        where: { status: 'active' },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    status: true
                                }
                            }
                        }
                    }
                }
            });

            return circle;
        } catch (error) {
            console.error('Error fetching circle:', error);
            throw error;
        }
    }, 

    updateCircle: async (circleId, data, userId) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1) Check circle existence first
                const existing = await tx.circle.findUnique({ where: { id: circleId } });
                if (!existing) {
                    throw new Error('Circle not found');
                }

                // 2) Verify membership
                const membership = await tx.circleMember.findFirst({
                    where: {
                        circle_id: circleId,
                        user_id: userId,
                        status: 'active'
                    }
                });
        
                if (!membership) {
                    throw new Error('Access denied: Not a member of this circle');
                }
        
                // 3) Verify admin
                const isAdmin = await tx.circleMember.findFirst({
                    where: {
                        circle_id: circleId,
                        user_id: userId,
                        role: 'admin'
                    }
                });
        
                if (!isAdmin) {
                    throw new Error('Access denied: Not an admin member of this circle');
                }

                // 4) Validate type if provided
                let normalizedType;
                if (typeof data.type === 'string') {
                    normalizedType = data.type.toLowerCase();
                    const enumObj = Prisma && Prisma.CircleTypeEnum ? Prisma.CircleTypeEnum : null;
                    const allowedTypes = enumObj ? Object.values(enumObj) : null;
                    if (allowedTypes && !allowedTypes.includes(normalizedType)) {
                        throw new Error('Invalid circle type');
                    }
                }

                // 5) Update
                const updateData = {};
                if (typeof data.name !== 'undefined') updateData.name = data.name;
                if (typeof normalizedType !== 'undefined') updateData.type = normalizedType;

                const updatedCircle = await tx.circle.update({
                    where: { id: circleId },
                    data: updateData
                });

                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'update',
                        target_entity: 'circle', 
                    }
                });

                return updatedCircle; 
            });

            return result;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error('Circle not found');
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new Error('Invalid circle type');
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2009') {
                throw new Error('Invalid circle type');
            }
            if (typeof error?.message === 'string' && error.message.toLowerCase().includes('invalid circle type')) {
                throw error;
            }
            console.error('Error updating circle:', error);
            throw error;
        }
    }, 
    
    deleteCircle: async (circleId, userId) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1) Check circle existence first
                const existing = await tx.circle.findUnique({ where: { id: circleId } });
                if (!existing) {
                    throw new Error('Circle not found');
                }

                // 2) Verify membership
                const membership = await tx.circleMember.findFirst({
                    where: {
                        circle_id: circleId,
                        user_id: userId,
                        status: 'active'
                    }
                });
        
                if (!membership) {
                    throw new Error('Access denied: Not a member of this circle');
                }
        
                // 3) Verify admin
                const isAdmin = await tx.circleMember.findFirst({
                    where: {
                        circle_id: circleId,
                        user_id: userId,
                        role: 'admin'
                    }
                });
        
                if (!isAdmin) {
                    throw new Error('Access denied: Not an admin member of this circle');
                }

                // 4) Check for outstanding balances before deletion
                const pendingTransactions = await tx.transactionParticipant.count({
                    where: {
                        transaction: {
                            circle_id: circleId
                        },
                        payment_status: 'unpaid'
                    }
                });

                if (pendingTransactions > 0) {
                    throw new Error('Cannot delete circle with outstanding balances. Please settle all transactions first.');
                }

                // 5) Create audit log before deletion
                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'delete',
                        target_entity: 'circle', 
                    }
                });

                // 6) Delete circle (cascade will handle related records)
                const deletedCircle = await tx.circle.delete({
                    where: { 
                        id: circleId
                    }
                });

                return deletedCircle; 
            });

            return result;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // Record to delete not found
                throw new Error('Circle not found');
            }
            console.error('Error deleting circle:', error); 
            throw error; 
        }
    },

    leaveCircle: async (circleId, userId) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1) Check if circle exists
                const circle = await tx.circle.findUnique({ where: { id: circleId } });
                if (!circle) {
                    throw new Error('Circle not found');
                }

                // 2) Check if user is a member
                const membership = await tx.circleMember.findFirst({
                    where: {
                        circle_id: circleId,
                        user_id: userId,
                        status: 'active'
                    }
                });

                if (!membership) {
                    throw error; 
                }

                // 3) Check if user has outstanding balances
                const unpaidTransactions = await tx.transactionParticipant.count({
                    where: {
                        user_id: userId,
                        transaction: {
                            circle_id: circleId
                        },
                        payment_status: 'unpaid'
                    }
                });

                if (unpaidTransactions > 0) {
                    throw new Error('Cannot leave circle with outstanding balances. Please settle all transactions first.');
                }

                // 4) If user is admin, check if there are other admins
                if (membership.role === 'admin') {
                    const adminCount = await tx.circleMember.count({
                        where: {
                            circle_id: circleId,
                            role: 'admin',
                            status: 'active'
                        }
                    });

                    if (adminCount === 1) {
                        throw new Error('Cannot leave circle as the only admin. Please promote another member to admin first.');
                    }
                }

                // 5) Update member status to removed
                await tx.circleMember.update({
                    where: {
                        circle_id_user_id: {
                            circle_id: circleId,
                            user_id: userId
                        }
                    },
                    data: { status: 'removed' }
                });

                // 6) Create audit log
                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'leave',
                        target_entity: 'circle',
                    }
                });

                return { success: true };
            });

            return result;
        } catch (error) {
            console.error('Error leaving circle:', error);
            throw error;
        }
    }, 

    removeMemberFromCircle: async (circleId, memberId, userId) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1) Check if circle exists
                const circle = await tx.circle.findUnique({ where: { id: circleId } });
                if (!circle) {
                    throw new Error('Circle not found');
                }

                // 2) Check if requester is a member
                const requesterMembership = await tx.circleMember.findFirst({
                    where: {
                        circle_id: circleId,
                        user_id: userId,
                        status: 'active'
                    }
                });

                if (!requesterMembership) {
                    throw new Error('Access denied: Not a member of this circle');
                }

                // 3) Check if requester is an admin
                if (requesterMembership.role !== 'admin') {
                    throw new Error('Access denied: Not an admin member of this circle');
                }

                // 4) Check if target member exists and is active
                const targetMembership = await tx.circleMember.findFirst({
                    where: {
                        circle_id: circleId,
                        user_id: memberId,
                        status: 'active'
                    }
                });

                if (!targetMembership) {
                    throw new Error('Member not found in this circle');
                }

                // 5) Check if target member has outstanding balances
                const unpaidTransactions = await tx.transactionParticipant.count({
                    where: {
                        user_id: memberId,
                        transaction: {
                            circle_id: circleId
                        },
                        payment_status: 'unpaid'
                    }
                });

                if (unpaidTransactions > 0) {
                    throw new Error('Cannot remove member with outstanding balances. Please settle all transactions first.');
                }

                // 6) If target is admin, check if there are other admins
                if (targetMembership.role === 'admin') {
                    const adminCount = await tx.circleMember.count({
                        where: {
                            circle_id: circleId,
                            role: 'admin',
                            status: 'active'
                        }
                    });

                    if (adminCount === 1) {
                        throw new Error('Cannot remove the only admin member. Please promote another member to admin first.');
                    }
                }

                // 7) Update target member status to removed
                await tx.circleMember.update({
                    where: {
                        circle_id_user_id: {
                            circle_id: circleId,
                            user_id: memberId
                        }
                    },
                    data: { status: 'removed' }
                });

               // 8) Create audit log
                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'remove_member',
                        target_entity: 'circle',
                    }
                });
                return { success: true };
            });
            return result;
        } catch (error) {
            console.error('Error removing member from circle:', error);
            throw error;
        }  
    }, 

    updateMemberRole: async (circleId, memberId, newRole, userId) => {
        try {
            // Ensure newRole is part of the CircleMemberRole enum
            if (
                !Prisma ||
                !Prisma.CircleMemberRole ||
                !Object.values(Prisma.CircleMemberRole).includes(newRole)
            ) {
                throw new Error('Invalid circle member role');
            }

            const result = await prisma.$transaction(async (tx) => {
                // 1) Check if circle exists
                const circle = await tx.circle.findUnique({ where: { id: circleId } });
                if (!circle) {
                    throw new Error('Circle not found');
                }

                // 2) Check if requester is a member
                const requesterMembership = await tx.circleMember.findFirst({
                    where: {
                        circle_id: circleId,
                        user_id: userId,
                        status: 'active'
                    }
                });

                if (!requesterMembership) {
                    throw new Error('Access denied: Not a member of this circle');
                }

                // 3) Check if requester is an admin
                if (requesterMembership.role !== 'admin') {
                    throw new Error('Access denied: Not an admin member of this circle');
                }

                // 4) Check if target member exists and is active
                const targetMembership = await tx.circleMember.findFirst({
                    where: {
                        circle_id: circleId,
                        user_id: memberId,
                        status: 'active'
                    }
                });

                if (!targetMembership) {
                    throw new Error('Member not found in this circle');
                }

                // 5) If demoting self from admin, ensure at least one other admin exists
                if (memberId === userId && targetMembership.role === 'admin' && newRole !== 'admin') {
                    const adminCount = await tx.circleMember.count({
                        where: {
                            circle_id: circleId,
                            role: 'admin',
                            status: 'active'
                        }
                    });

                    if (adminCount === 1) {
                        throw new Error('Cannot demote yourself as the only admin. Please promote another member to admin first.');
                    }
                }

                // 6) Update member role
                await tx.circleMember.update({
                    where: {
                        circle_id_user_id: {
                            circle_id: circleId,
                            user_id: memberId
                        }
                    },
                    data: { role: newRole }
                });

                // 7) Create audit log
                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'update_member_role',
                        target_entity: 'circle',
                    }
                });
                return { success: true };
            });
            return result;
        } catch (error) {
            console.error('Error updating member role:', error);
            throw error;
        }
    }
};