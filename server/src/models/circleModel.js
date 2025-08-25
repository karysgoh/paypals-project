const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    createNewCircle: async (data) => {
        try {
            // Validate type if provided
            const allowedTypes = Prisma.CircleTypeEnum ? Object.values(Prisma.CircleTypeEnum) : [];
            if (data.type && !allowedTypes.includes(data.type)) {
                throw new Error('Invalid circle type');
            }

            const result = await prisma.$transaction(async (tx) => {
                const newCircle = await tx.circle.create({
                    data: {
                        name: data.name,
                        type: data.type || 'friends',
                        created_at: new Date(),
                        updated_at: new Date(),
                    }
                });

                // Add the creator as a member with admin role
                const circleMember = await tx.circleMember.create({
                    data: {
                        circle_id: newCircle.id,
                        user_id: data.created_by,
                        role: 'admin',
                        joined_at: new Date(),
                        status: 'active'
                    }
                });

                await tx.auditLog.create({
                    data: {
                        performed_by: data.created_by,
                        action_type: 'create',
                        target_entity: 'circle', 
                    }
                })

                return {
                    circle: newCircle,
                    membership: circleMember
                };
            });

            return result;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                // Likely invalid enum value
                throw new Error('Invalid circle type');
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

    updateCircle: async (circleId, data) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1) Check circle existence first
                const existing = await tx.circle.findUnique({ where: { id: circleId } });
                if (!existing) {
                    throw new Error('Circle not found');
                }

                // Validate type if provided
                const allowedTypes = Prisma.CircleTypeEnum ? Object.values(Prisma.CircleTypeEnum) : [];
                if (data.type && !allowedTypes.includes(data.type)) {
                    throw new Error('Invalid circle type');
                }

                // 2) Verify membership
                const membership = await tx.circleMember.findFirst({
                    where: {
                        circle_id: circleId,
                        user_id: data.userId,
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
                        user_id: data.userId,
                        role: 'admin'
                    }
                });
        
                if (!isAdmin) {
                    throw new Error('Access denied: Not an admin member of this circle');
                }

                // 4) Update
                const updateData = {
                    updated_at: new Date()
                };
                if (typeof data.name !== 'undefined') updateData.name = data.name;
                if (typeof data.description !== 'undefined') updateData.description = data.description;
                if (typeof data.type !== 'undefined') updateData.type = data.type;

                const updatedCircle = await tx.circle.update({
                    where: { id: circleId },
                    data: updateData
                });

                await tx.auditLog.create({
                    data: {
                        performed_by: data.userId,
                        action_type: 'update',
                        target_entity: 'circle', 
                    }
                })

                return updatedCircle; 
            });

            return result;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // Record to update not found
                throw new Error('Circle not found');
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new Error('Invalid circle type');
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

                // 4) Delete
                const deletedCircle = await tx.circle.delete({
                    where: { 
                        id: circleId
                    }
                })

                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'delete',
                        target_entity: 'circle', 
                    }
                })

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
    }
};