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
            const newUser = await prisma.user.create({
                data: {
                    username: data.username,
                    password: data.password,    
                    email: data.email,          
                    email_verified: false,
                    role_id: data.role_id || null, 
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
            
            return newUser;
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
                    transactionParticipants: {
                        select: {
                            amount_owed: true,
                            payment_status: true,
                            transaction: {
                                select: {
                                    id: true,
                                    name: true,
                                    circle: {
                                        select: {
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

            return user.transactionParticipants;
        } catch (error) {
            throw error;
        }
    },

    updateUserStatus: async (userId, status) => {
        try {
            const user = await prisma.user.update({
                where: { id: parseInt(userId, 10) },
                data: { status: status },
                select: {
                    id: true,
                    username: true,
                    status: true
                }
            });
            return user;
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
            const user = await prisma.user.update({
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
            return user;
        } catch (error) {
            throw error;
        }
    }
};