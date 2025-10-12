const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    selectByUsernameAndPassword: async (data) => {
        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: data.username,
                },
                select: {
                    id: true,           
                    username: true,
                    password: true,     
                    email: true,
                    email_verified: true,
                    status: true,       
                    role: {             
                        select: {
                            id: true,         
                            role_name: true   
                        }
                    }
                },
            });
            return user;
        } catch (error) {
            throw error;
        }
    },

    createNewUser: async (data) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        username: data.username,
                        password: data.password,    
                        email: data.email,          
                        email_verified: false,
                        role_id: data.role_id || 1, 
                        status: 'active'           
                    },
                    select: {
                        id: true,           
                        username: true,
                        email: true,
                        email_verified: true,
                        status: true,       
                        role: {             
                            select: {
                                id: true,         
                                role_name: true   
                            },
                        },
                    },
                });

                // Create audit log for user creation
                await tx.auditLog.create({
                    data: {
                        performed_by: newUser.id, 
                        action_type: 'create',
                        target_entity: 'user',
                        target_id: newUser.id,
                        description: `User "${newUser.username}" created with email ${newUser.email}`
                    }
                });
                
                return newUser;
            });

            return result;
        } catch (error) {
            throw error;
        }
    },

    readLoggedInUser: async (data) => {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: data.user_id,  
                },
                select: {
                    id: true,           
                    username: true,
                    email: true,       
                    status: true,       
                    role_id: true, 
                    email_verified: true    
                },
            });
            return user;
        } catch (error) {
            throw error;
        }
    },

    getUserCircles: async (userId) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(userId, 10) },
                select: {
                    circleMembers: {
                        select: {
                            circle: {
                                select: {
                                    id: true,
                                    name: true,
                                    type: true,
                                    created_at: true
                                }
                            },
                            role: true,
                            status: true,
                            joined_at: true
                        }
                    }
                }
            });

            if (!user) {
                throw new Error(`User with ID ${userId} not found.`);
            }

            return user.circleMembers.map(member => ({
                ...member.circle,
                member_role: member.role,
                member_status: member.status,
                joined_at: member.joined_at
            }));
        } catch (error) {
            throw error;
        }
    },

    getUserTransactionSummary: async (userId) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(userId, 10) },
                select: {
                    transactionMembers: {
                        select: {
                            amount_owed: true,
                            payment_status: true,
                            transaction: {
                                select: {
                                    id: true,
                                    name: true,
                                    total_amount: true,
                                    created_at: true,
                                    circle: {
                                        select: {
                                            id: true,
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!user) {
                throw new Error(`User with ID ${userId} not found.`);
            }

            return user.transactionMembers;
        } catch (error) {
            throw error;
        }
    },

    updateUserStatus: async (userId, status) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const user = await tx.user.update({
                    where: { id: parseInt(userId, 10) },
                    data: { status: status },
                    select: {
                        id: true,
                        username: true,
                        status: true
                    }
                });

                // Create audit log for status update
                await tx.auditLog.create({
                    data: {
                        performed_by: userId, // Assuming the user is updating their own status
                        action_type: 'update_status',
                        target_entity: 'user',
                        target_id: userId,
                        description: `User "${user.username}" status updated to ${status}`
                    }
                });

                return user;
            });
        } catch (error) {
            throw error;
        }
    },
    
    // Email verification functions
    createEmailVerificationToken: async (data) => {
        try {
            const token = await prisma.emailVerificationToken.create({
                data: {
                    email: data.email,
                    token: data.token,
                    expires_at: data.expires_at,
                    user_id: data.user_id,
                    used: false
                }
            });
            return token;
        } catch (error) {
            throw error;
        }
    },

    findEmailVerificationToken: async (token) => {
        try {
            const tokenRecord = await prisma.emailVerificationToken.findFirst({
                where: { token: token },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true
                        }
                    }
                }
            });
            return tokenRecord;
        } catch (error) {
            throw error;
        }
    },

    markTokenAsUsed: async (token) => {
        try {
            const updatedToken = await prisma.emailVerificationToken.update({
                where: { token: token },
                data: { used: true }
            });
            return updatedToken;
        } catch (error) {
            throw error;
        }
    },

    deleteOldVerificationTokens: async (email) => {
        try {
            await prisma.emailVerificationToken.deleteMany({
                where: { email: email }
            });
        } catch (error) {
            throw error;
        }
    },

    findUserByEmail: async (email) => {
        try {
            const user = await prisma.user.findUnique({
                where: { email: email },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    status: true
                }
            });
            return user;
        } catch (error) {
            throw error;
        }
    },

    updateUserEmailVerification: async (userId, isVerified) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const user = await tx.user.update({
                    where: { id: parseInt(userId, 10) },
                    data: { 
                        email_verified: isVerified 
                    },
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        email_verified: true,
                        status: true
                    }
                });

                // Create audit log for email verification update
                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'verify_email',
                        target_entity: 'user',
                        target_id: userId,
                        description: `User "${user.username}" email verification ${isVerified ? 'completed' : 'reset'}`
                    }
                });

                return user;
            });
        } catch (error) {
            throw error;
        }
    },

    findUsersByUsername: async (searchQuery, limit = 10) => {
        try {
            const users = await prisma.user.findMany({
                where: {
                    username: {
                        contains: searchQuery,
                        mode: 'insensitive'
                    },
                    status: 'active', // Only return active users
                    email_verified: true // Only return verified users
                },
                select: {
                    id: true,
                    username: true,
                    email: true
                },
                take: parseInt(limit, 10),
                orderBy: {
                    username: 'asc'
                }
            });
            
            return users;
        } catch (error) {
            console.error('Error in findUsersByUsername:', error);
            throw error;
        }
    },

    updatePaymentMethods: async (userId, paymentData) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // First, get the current user data
                const currentUser = await tx.user.findUnique({
                    where: { id: userId },
                    select: {
                        id: true,
                        username: true,
                        paynow_phone: true,
                        paynow_enabled: true
                    }
                });

                if (!currentUser) {
                    throw new Error('User not found');
                }

                // Update the payment methods
                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: {
                        paynow_phone: paymentData.paynow_phone || null,
                        paynow_enabled: paymentData.paynow_enabled || false
                    },
                    select: {
                        id: true,
                        username: true,
                        paynow_phone: true,
                        paynow_enabled: true
                    }
                });

                // Create audit log for payment method update
                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'update',
                        target_entity: 'user',
                        target_id: userId,
                        description: `User "${currentUser.username}" updated payment methods - PayNow enabled: ${paymentData.paynow_enabled || false}`
                    }
                });

                return updatedUser;
            });

            return result;
        } catch (error) {
            console.error('Error in updatePaymentMethods:', error);
            throw error;
        }
    },

    getPaymentMethods: async (userId) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    username: true,
                    paynow_phone: true,
                    paynow_enabled: true
                }
            });

            if (!user) {
                throw new Error('User not found');
            }

            return user;
        } catch (error) {
            console.error('Error in getPaymentMethods:', error);
            throw error;
        }
    }
};