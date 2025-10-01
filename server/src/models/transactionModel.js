const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const googleMapsService = require('../utils/googleMapsService');
const { sendExternalTransactionInvite } = require('../utils/emailService');

module.exports = {
    createTransaction: async (circleId, data) => {
        try {
            let locationData = {};
            
            // If place_id provided, fetch full details
            if (data.place_id) {
                const placeDetails = await googleMapsService.getPlaceDetails(data.place_id);
                locationData = {
                    location_name: placeDetails.name,
                    location_lat: placeDetails.geometry.location.lat,
                    location_lng: placeDetails.geometry.location.lng,
                    place_id: placeDetails.place_id,
                    formatted_address: placeDetails.formatted_address
                };
            }
            // If coordinates provided, reverse geocode
            else if (data.location_lat && data.location_lng) {
                const geocodeResult = await googleMapsService.reverseGeocode(
                    data.location_lat, 
                    data.location_lng
                );
                locationData = {
                    location_lat: parseFloat(data.location_lat),
                    location_lng: parseFloat(data.location_lng),
                    formatted_address: geocodeResult.formatted_address
                };
            }

            const result = await prisma.$transaction(async (tx) => {
                const circle = await tx.circle.findUnique({
                    where: { id: circleId },
                    include: { members: true }
                });

                if (!circle) {
                    throw new Error('Circle not found');
                }

                const isMember = circle.members.some(m => m.user_id === data.created_by);
                if (!isMember) {
                    throw new Error('Access denied: User is not a member of the circle');
                }

                // Calculate GST and service charge amounts if rates are provided
                let calculatedData = { ...data };
                if (data.gst_rate || data.service_charge_rate) {
                    // If we have rates, calculate the base amount and individual charges
                    const gstRate = parseFloat(data.gst_rate) || 0;
                    const serviceChargeRate = parseFloat(data.service_charge_rate) || 0;
                    
                    if (data.base_amount) {
                        // If base amount is provided, calculate total from base + charges
                        const baseAmount = parseFloat(data.base_amount);
                        const gstAmount = baseAmount * gstRate;
                        const serviceChargeAmount = baseAmount * serviceChargeRate;
                        const totalAmount = baseAmount + gstAmount + serviceChargeAmount;
                        
                        calculatedData = {
                            ...data,
                            base_amount: baseAmount,
                            gst_amount: gstAmount,
                            service_charge_amount: serviceChargeAmount,
                            total_amount: totalAmount
                        };
                    } else {
                        // If total amount is provided, work backwards to find base amount
                        const totalAmount = parseFloat(data.total_amount);
                        const baseAmount = totalAmount / (1 + gstRate + serviceChargeRate);
                        const gstAmount = baseAmount * gstRate;
                        const serviceChargeAmount = baseAmount * serviceChargeRate;
                        
                        calculatedData = {
                            ...data,
                            base_amount: baseAmount,
                            gst_amount: gstAmount,
                            service_charge_amount: serviceChargeAmount
                        };
                    }
                }

                // Create the transaction
                const transaction = await tx.transaction.create({
                    data: {
                        name: calculatedData.name,
                        description: calculatedData.description,
                        category: calculatedData.category || 'other',
                        total_amount: calculatedData.total_amount,
                        base_amount: calculatedData.base_amount,
                        gst_rate: calculatedData.gst_rate,
                        service_charge_rate: calculatedData.service_charge_rate,
                        gst_amount: calculatedData.gst_amount,
                        service_charge_amount: calculatedData.service_charge_amount,
                        circle_id: circleId,
                        created_by: calculatedData.created_by,
                        ...locationData
                    }
                });

                if (!Array.isArray(data.participants) || data.participants.length === 0) {
                    throw new Error('At least one participant is required');
                }

                let finalParticipants = [...data.participants];
                if (!finalParticipants.some(p => p.user_id === data.created_by)) {
                    // Calculate creator's amount owed based on total and other participants
                    const otherParticipantsTotal = finalParticipants.reduce((sum, p) => sum + p.amount_owed, 0);
                    const creatorAmountOwed = data.total_amount - otherParticipantsTotal;
        
                    if (creatorAmountOwed < 0) {
                        throw new Error(`Total amount (${data.total_amount}) is less than sum of participant amounts (${otherParticipantsTotal}). Please adjust amounts.`);
                    }
                    
                    // Auto-add creator to participants with calculated amount owed
                    finalParticipants.push({
                        user_id: data.created_by,
                        amount_owed: creatorAmountOwed,
                        payment_status: creatorAmountOwed > 0 ? 'pending' : 'paid'
                    });
                    
                    // Log auto-addition of creator
                    await tx.auditLog.create({
                        data: {
                            performed_by: data.created_by,
                            action_type: 'auto_add_creator',
                            target_entity: 'transaction',
                            target_id: null,
                            description: `Creator automatically added to participants with amount owed: ${creatorAmountOwed} for transaction in circle ${circleId}`
                        }
                    });
                } else {
                    // Creator is already in participants, validate total amounts
                    const totalParticipantAmounts = finalParticipants.reduce((sum, p) => sum + p.amount_owed, 0);
                    if (Math.abs(totalParticipantAmounts - data.total_amount) > 0.01) { 
                        throw new Error(`Total amount (${data.total_amount}) does not match sum of participant amounts (${totalParticipantAmounts}). Please ensure amounts add up correctly.`);
                    }
                }

                // Separate internal and external participants
                let internalParticipants = [];
                let externalParticipants = [];
                
                for (const participant of finalParticipants) {
                    if (participant.user_id) {
                        internalParticipants.push(participant);
                    } else if (participant.external_email) {
                        // Generate access token for external participant
                        const crypto = require('crypto');
                        const accessToken = crypto.randomBytes(32).toString('hex');
                        const expiresAt = new Date();
                        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration
                        
                        externalParticipants.push({
                            ...participant,
                            access_token: accessToken,
                            access_token_expires: expiresAt,
                            is_external: true
                        });
                    } else {
                        throw new Error('Each participant must have either user_id or external_email');
                    }
                }

                // Validate that all internal participants are members of the circle
                if (internalParticipants.length > 0) {
                    const participantIds = internalParticipants.map(p => p.user_id);
                    const circleMemberIds = circle.members.map(m => m.user_id);
                    
                    const invalidParticipants = participantIds.filter(id => !circleMemberIds.includes(id));
                    if (invalidParticipants.length > 0) {
                        // Log security violation attempt
                        await tx.auditLog.create({
                            data: {
                                performed_by: data.created_by,
                                action_type: 'security_violation',
                                target_entity: 'transaction',
                                target_id: null, 
                                description: `Attempted to add non-circle members [${invalidParticipants.join(', ')}] to transaction in circle ${circleId}`
                            }
                        });
                        
                        const invalidUserIds = invalidParticipants.join(', ');
                        throw new Error(`Participants with IDs [${invalidUserIds}] are not members of this circle`);
                    }
                }

                // Create transaction members for internal participants
                const internalParticipantsData = internalParticipants.map(p => ({
                    transaction_id: transaction.id,
                    user_id: p.user_id,
                    amount_owed: p.amount_owed,
                    payment_status: p.payment_status || 'pending',
                    is_external: false
                }));

                // Create transaction members for external participants
                const externalParticipantsData = externalParticipants.map(p => ({
                    transaction_id: transaction.id,
                    user_id: null,
                    external_email: p.external_email,
                    external_name: p.external_name || p.external_email.split('@')[0],
                    amount_owed: p.amount_owed,
                    payment_status: p.payment_status || 'pending',
                    access_token: p.access_token,
                    access_token_expires: p.access_token_expires,
                    is_external: true
                }));

                // Insert all participants
                if (internalParticipantsData.length > 0) {
                    await tx.transactionMember.createMany({
                        data: internalParticipantsData
                    });
                }

                if (externalParticipantsData.length > 0) {
                    await tx.transactionMember.createMany({
                        data: externalParticipantsData
                    });
                    
                    // Send email invites to external participants
                    const transactionWithDetails = await tx.transaction.findUnique({
                        where: { id: transaction.id },
                        include: {
                            creator: { select: { username: true, email: true } },
                            circle: { select: { name: true } }
                        }
                    });
                    
                    // Send emails in parallel (don't await to avoid blocking)
                    externalParticipantsData.forEach(participant => {
                        const emailData = {
                            name: transactionWithDetails.name,
                            description: transactionWithDetails.description,
                            category: transactionWithDetails.category,
                            locationName: transactionWithDetails.location_name,
                            userAmount: participant.amount_owed.toString(),
                            totalAmount: transactionWithDetails.total_amount.toString(),
                            creatorName: transactionWithDetails.creator.username,
                            circleName: transactionWithDetails.circle.name
                        };
                        
                        sendExternalTransactionInvite(
                            participant.external_email,
                            participant.external_name,
                            emailData,
                            participant.access_token
                        ).catch(error => {
                            console.error(`Failed to send email to ${participant.external_email}:`, error);
                            // Log but don't fail the transaction
                        });
                    });
                }

                await tx.auditLog.create({
                    data: {
                        performed_by: data.created_by,
                        action_type: 'create',
                        target_entity: 'transaction',
                        target_id: transaction.id,
                        description: `Transaction "${data.name}" created in circle`
                    }
                });

                const transactionWithMembers = await tx.transaction.findUnique({
                    where: { id: transaction.id },
                    include: { members: true }
                });

                return transactionWithMembers;
            });

            return result;
        } catch (error) {
            console.error('Error creating transaction with location and participants:', error);
            throw error;
        }
    },

    updateTransaction: async (transactionId, userId, data) => {
        try {
            let locationData = {};
            
            // Handle location updates
            if (data.place_id) {
                const placeDetails = await googleMapsService.getPlaceDetails(data.place_id);
                locationData = {
                    location_name: placeDetails.name,
                    location_lat: placeDetails.geometry.location.lat,
                    location_lng: placeDetails.geometry.location.lng,
                    place_id: placeDetails.place_id,
                    formatted_address: placeDetails.formatted_address
                };
            } else if (data.location_lat && data.location_lng) {
                const geocodeResult = await googleMapsService.reverseGeocode(
                    data.location_lat, 
                    data.location_lng
                );
                locationData = {
                    location_lat: parseFloat(data.location_lat),
                    location_lng: parseFloat(data.location_lng),
                    formatted_address: geocodeResult.formatted_address
                };
            }

            const result = await prisma.$transaction(async (tx) => {
                // Get existing transaction with members
                const existingTransaction = await tx.transaction.findUnique({
                    where: { id: transactionId },
                    include: { 
                        members: true,
                        circle: { include: { members: true } }
                    }
                });

                if (!existingTransaction) {
                    throw new Error('Transaction not found');
                }

                // Check if user is creator or circle admin
                const isCreator = existingTransaction.created_by === userId;
                const isCircleAdmin = existingTransaction.circle.members.some(
                    m => m.user_id === userId && m.role === 'admin'
                );

                if (!isCreator && !isCircleAdmin) {
                    throw new Error('Access denied: Only transaction creator or circle admin can update');
                }

                // Prepare update data
                const updateData = {
                    ...(data.name && { name: data.name }),
                    ...(data.description !== undefined && { description: data.description }),
                    ...(data.category && { category: data.category }),
                    ...(data.total_amount && { total_amount: data.total_amount }),
                    ...locationData,
                    updated_at: new Date()
                };

                // Update transaction basic info
                const updatedTransaction = await tx.transaction.update({
                    where: { id: transactionId },
                    data: updateData
                });

                // Handle participants update if provided
                if (data.participants && Array.isArray(data.participants)) {
                    // Validate all participants are circle members
                    const participantIds = data.participants.map(p => p.user_id);
                    const circleMemberIds = existingTransaction.circle.members.map(m => m.user_id);
                    
                    const invalidParticipants = participantIds.filter(id => !circleMemberIds.includes(id));
                    if (invalidParticipants.length > 0) {
                        throw new Error(`Participants with IDs [${invalidParticipants.join(', ')}] are not members of this circle`);
                    }

                    // Delete existing participants
                    await tx.transactionMember.deleteMany({
                        where: { transaction_id: transactionId }
                    });

                    // Handle creator inclusion logic (same as create)
                    let finalParticipants = [...data.participants];
                    const totalAmount = data.total_amount || existingTransaction.total_amount;

                    if (!finalParticipants.some(p => p.user_id === existingTransaction.created_by)) {
                        const otherParticipantsTotal = finalParticipants.reduce((sum, p) => sum + p.amount_owed, 0);
                        const creatorAmountOwed = totalAmount - otherParticipantsTotal;
            
                        if (creatorAmountOwed < 0) {
                            throw new Error(`Total amount (${totalAmount}) is less than sum of participant amounts (${otherParticipantsTotal})`);
                        }
                        
                        finalParticipants.push({
                            user_id: existingTransaction.created_by,
                            amount_owed: creatorAmountOwed,
                            payment_status: creatorAmountOwed > 0 ? 'pending' : 'paid'
                        });
                    } else {
                        const totalParticipantAmounts = finalParticipants.reduce((sum, p) => sum + p.amount_owed, 0);
                        if (Math.abs(totalParticipantAmounts - totalAmount) > 0.01) { 
                            throw new Error(`Total amount (${totalAmount}) does not match sum of participant amounts (${totalParticipantAmounts})`);
                        }
                    }

                    // Create new participants
                    const participantsData = finalParticipants.map(p => ({
                        transaction_id: transactionId,
                        user_id: p.user_id,
                        amount_owed: p.amount_owed,
                        payment_status: p.payment_status || 'pending'
                    }));

                    await tx.transactionMember.createMany({
                        data: participantsData
                    });
                }

                // Log the update
                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'update',
                        target_entity: 'transaction',
                        target_id: transactionId,
                        description: `Transaction "${updatedTransaction.name}" updated`
                    }
                });

                return await tx.transaction.findUnique({
                    where: { id: transactionId },
                    include: { members: true }
                });
            });

            return result;
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    },

    deleteTransaction: async (transactionId, userId) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const transaction = await tx.transaction.findUnique({
                    where: { id: transactionId },
                    include: { 
                        circle: { include: { members: true } },
                        members: true
                    }
                });

                if (!transaction) {
                    throw new Error('Transaction not found');
                }

                // Check if user is creator or circle admin
                const isCreator = transaction.created_by === userId;
                const isCircleAdmin = transaction.circle.members.some(
                    m => m.user_id === userId && m.role === 'admin'
                );

                if (!isCreator && !isCircleAdmin) {
                    throw new Error('Access denied: Only transaction creator or circle admin can delete');
                }

                // Check if any payments have been made
                const paidParticipants = transaction.members.filter(m => m.payment_status === 'paid');
                if (paidParticipants.length > 0) {
                    throw new Error('Cannot delete transaction with paid participants. Please settle outstanding amounts first.');
                }

                // Delete participants first (foreign key constraint)
                await tx.transactionMember.deleteMany({
                    where: { transaction_id: transactionId }
                });

                // Delete the transaction
                await tx.transaction.delete({
                    where: { id: transactionId }
                });

                // Log the deletion
                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'delete',
                        target_entity: 'transaction',
                        target_id: transactionId,
                        description: `Transaction "${transaction.name}" deleted`
                    }
                });

                return { success: true, message: 'Transaction deleted successfully' };
            });

            return result;
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    },

    getCircleTransactions: async (circleId, userId, options = {}) => {
        try {
            const {
                page = 1,
                limit = 20,
                sortBy = 'created_at',
                sortOrder = 'desc',
                category,
                status,
                userOnly = false,
                dateFrom,
                dateTo,
                minAmount,
                maxAmount,
                search
            } = options;

            // Verify user is circle member
            const circle = await prisma.circle.findUnique({
                where: { id: circleId },
                include: { members: { where: { user_id: userId } } }
            });

            if (!circle || circle.members.length === 0) {
                throw new Error('Access denied: User is not a member of this circle');
            }

            const skip = (page - 1) * limit;
            
            // Build where clause
            let whereClause = { circle_id: circleId };

            // Filter by user's transactions only
            if (userOnly) {
                whereClause.members = {
                    some: { user_id: userId }
                };
            }

            // Category filter
            if (category) {
                whereClause.category = category;
            }

            // Date range filters
            if (dateFrom || dateTo) {
                whereClause.created_at = {};
                if (dateFrom) whereClause.created_at.gte = new Date(dateFrom);
                if (dateTo) whereClause.created_at.lte = new Date(dateTo);
            }

            // Amount range filters
            if (minAmount !== undefined || maxAmount !== undefined) {
                whereClause.total_amount = {};
                if (minAmount !== undefined) whereClause.total_amount.gte = parseFloat(minAmount);
                if (maxAmount !== undefined) whereClause.total_amount.lte = parseFloat(maxAmount);
            }

            // Search filter
            if (search) {
                whereClause.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { location_name: { contains: search, mode: 'insensitive' } }
                ];
            }

            // Payment status filter
            if (status) {
                if (status === 'fully_paid') {
                    whereClause.members = {
                        every: { payment_status: 'paid' }
                    };
                } else if (status === 'pending') {
                    whereClause.members = {
                        some: { payment_status: 'pending' }
                    };
                } else if (status === 'user_pending' && userOnly) {
                    whereClause.members = {
                        some: { 
                            user_id: userId,
                            payment_status: 'pending'
                        }
                    };
                } else if (status === 'user_paid' && userOnly) {
                    whereClause.members = {
                        some: { 
                            user_id: userId,
                            payment_status: 'paid'
                        }
                    };
                }
            }

            // Get transactions with count
            const [transactions, totalCount] = await Promise.all([
                prisma.transaction.findMany({
                    where: whereClause,
                    include: {
                        members: {
                            include: {
                                user: {
                                    select: { id: true, username: true, email: true }
                                }
                            }
                        },
                        creator: {
                            select: { id: true, username: true, email: true }
                        }
                    },
                    orderBy: { [sortBy]: sortOrder },
                    skip,
                    take: limit
                }),
                prisma.transaction.count({ where: whereClause })
            ]);

            // Calculate user-specific data for each transaction
            const enrichedTransactions = transactions.map(transaction => {
                const userParticipation = transaction.members.find(m => m.user_id === userId);
                const totalPaid = transaction.members.filter(m => m.payment_status === 'paid').length;
                const totalParticipants = transaction.members.length;
                
                return {
                    ...transaction,
                    user_amount_owed: userParticipation?.amount_owed || 0,
                    user_payment_status: userParticipation?.payment_status || null,
                    is_user_participant: !!userParticipation,
                    payment_progress: {
                        paid_count: totalPaid,
                        total_count: totalParticipants,
                        percentage: Math.round((totalPaid / totalParticipants) * 100)
                    }
                };
            });

            return {
                transactions: enrichedTransactions,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    pages: Math.ceil(totalCount / limit),
                    hasNext: page < Math.ceil(totalCount / limit),
                    hasPrev: page > 1
                }
            };

        } catch (error) {
            console.error('Error fetching circle transactions:', error);
            throw error;
        }
    },

    getTransactionById: async (transactionId, userId) => {
        try {
            const transaction = await prisma.transaction.findUnique({
                where: { id: transactionId },
                include: {
                    members: {
                        include: {
                            user: {
                                select: { id: true, username: true, email: true }
                            }
                        }
                    },
                    creator: {
                        select: { id: true, username: true, email: true }
                    },
                    circle: {
                        include: { 
                            members: { 
                                where: { user_id: userId },
                                select: { user_id: true, role: true }
                            } 
                        }
                    }
                }
            });

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            // Verify user is circle member
            if (transaction.circle.members.length === 0) {
                throw new Error('Access denied: User is not a member of this circle');
            }

            // Enrich with user-specific data
            const userParticipation = transaction.members.find(m => m.user_id === userId);
            const totalPaid = transaction.members.filter(m => m.payment_status === 'paid').length;
            const totalParticipants = transaction.members.length;

            return {
                ...transaction,
                user_amount_owed: userParticipation?.amount_owed || 0,
                user_payment_status: userParticipation?.payment_status || null,
                is_user_participant: !!userParticipation,
                can_edit: transaction.created_by === userId || transaction.circle.members[0].role === 'admin',
                payment_progress: {
                    paid_count: totalPaid,
                    total_count: totalParticipants,
                    percentage: Math.round((totalPaid / totalParticipants) * 100)
                }
            };

        } catch (error) {
            console.error('Error fetching transaction by ID:', error);
            throw error;
        }
    },

    updatePaymentStatus: async (transactionId, userId, paymentStatus) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // Verify user is participant in this transaction
                const participant = await tx.transactionMember.findFirst({
                    where: {
                        transaction_id: transactionId,
                        user_id: userId
                    },
                    include: {
                        transaction: {
                            include: { circle: { include: { members: true } } }
                        }
                    }
                });

                if (!participant) {
                    throw new Error('Access denied: User is not a participant in this transaction');
                }

                // Validate payment status
                if (!['pending', 'paid'].includes(paymentStatus)) {
                    throw new Error('Invalid payment status. Must be "pending" or "paid"');
                }

                // Update payment status
                await tx.transactionMember.update({
                    where: {
                        transaction_id_user_id: {
                            transaction_id: transactionId,
                            user_id: userId
                        }
                    },
                    data: {
                        payment_status: paymentStatus
                    }
                });

                // Log the status change
                await tx.auditLog.create({
                    data: {
                        performed_by: userId,
                        action_type: 'payment_status_update',
                        target_entity: 'transaction_participant',
                        target_id: transactionId,
                        description: `Payment status changed to "${paymentStatus}" for transaction "${participant.transaction.name}"`
                    }
                });

                return { success: true, message: `Payment status updated to ${paymentStatus}` };
            });

            return result;
        } catch (error) {
            console.error('Error updating payment status:', error);
            throw error;
        }
    }, 

    getUserTransactions: async (userId) => {
        try {
            const userTransactions = await prisma.transaction.findMany({
                where: {
                    OR: [
                        { members: { some: { user_id: userId } } },
                        { created_by: userId }
                    ]
                },
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true
                                }
                            }
                        }
                    },
                    creator: {
                        select: {
                            id: true,
                            username: true,
                            email: true
                        }
                    },
                    circle: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if(!userTransactions || userTransactions.length === 0){
                throw new Error('No transactions found for this user');
            }

            // Transform the data to include user-specific information
            const transformedTransactions = userTransactions.map(transaction => {
                const userMember = transaction.members.find(m => m.user_id === userId); // Find current user's membership info
                return {
                    ...transaction,
                    user_amount_owed: userMember ? userMember.amount_owed : 0,
                    user_payment_status: userMember ? userMember.payment_status : 'pending'
                };
            });

            return transformedTransactions;
        } catch (error) {
            console.error('Error fetching user transactions:', error);
            throw error;
        }
    },

    // New functions for external participant support
    getTransactionByAccessToken: async (accessToken) => {
        try {
            const transactionMember = await prisma.transactionMember.findFirst({
                where: {
                    access_token: accessToken,
                    access_token_expires: {
                        gte: new Date() // Token not expired
                    },
                    is_external: true
                },
                include: {
                    transaction: {
                        include: {
                            creator: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true
                                }
                            },
                            circle: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            },
                            members: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            username: true,
                                            email: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!transactionMember) {
                throw new Error('Invalid or expired access token');
            }

            return {
                transaction: transactionMember.transaction,
                external_participant: {
                    email: transactionMember.external_email,
                    name: transactionMember.external_name,
                    amount_owed: transactionMember.amount_owed,
                    payment_status: transactionMember.payment_status,
                    access_token: transactionMember.access_token
                }
            };
        } catch (error) {
            console.error('Error fetching transaction by access token:', error);
            throw error;
        }
    },

    updateExternalParticipantPaymentStatus: async (accessToken, paymentStatus, paymentMethod = null, externalPaymentId = null) => {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // Verify the access token and get transaction member
                const transactionMember = await tx.transactionMember.findFirst({
                    where: {
                        access_token: accessToken,
                        access_token_expires: {
                            gte: new Date()
                        },
                        is_external: true
                    },
                    include: {
                        transaction: true
                    }
                });

                if (!transactionMember) {
                    throw new Error('Invalid or expired access token');
                }

                // Validate payment status
                const validStatuses = ['unpaid', 'paid', 'pending', 'failed'];
                if (!validStatuses.includes(paymentStatus)) {
                    throw new Error(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}`);
                }

                // Update payment status
                const updatedMember = await tx.transactionMember.update({
                    where: {
                        id: transactionMember.id
                    },
                    data: {
                        payment_status: paymentStatus,
                        payment_method: paymentMethod,
                        external_payment_id: externalPaymentId,
                        paid_at: paymentStatus === 'paid' ? new Date() : null
                    }
                });

                // Log the status change (use a system user ID or null for external updates)
                await tx.auditLog.create({
                    data: {
                        performed_by: 1, // System user or use null
                        action_type: 'external_payment_status_update',
                        target_entity: 'transaction_participant',
                        target_id: transactionMember.transaction_id,
                        description: `External participant ${transactionMember.external_email} updated payment status to "${paymentStatus}" for transaction "${transactionMember.transaction.name}"`
                    }
                });

                return { 
                    success: true, 
                    message: `Payment status updated to ${paymentStatus}`,
                    participant: updatedMember
                };
            });

            return result;
        } catch (error) {
            console.error('Error updating external participant payment status:', error);
            throw error;
        }
    },

    getExternalParticipantsByTransaction: async (transactionId) => {
        try {
            const externalParticipants = await prisma.transactionMember.findMany({
                where: {
                    transaction_id: transactionId,
                    is_external: true
                },
                select: {
                    external_email: true,
                    external_name: true,
                    amount_owed: true,
                    payment_status: true,
                    access_token: true
                }
            });

            return externalParticipants;
        } catch (error) {
            console.error('Error fetching external participants:', error);
            throw error;
        }
    },

    // Utility functions for GST and service charge calculations
    calculateBillSplit: (baseAmount, participants, gstRate = 0, serviceChargeRate = 0) => {
        const numParticipants = participants.length;
        
        // Calculate charges
        const gstAmount = baseAmount * gstRate;
        const serviceChargeAmount = baseAmount * serviceChargeRate;
        const totalCharges = gstAmount + serviceChargeAmount;
        const totalAmount = baseAmount + totalCharges;
        
        // Split base amount equally
        const basePerPerson = baseAmount / numParticipants;
        
        // Split charges equally
        const chargesPerPerson = totalCharges / numParticipants;
        const totalPerPerson = basePerPerson + chargesPerPerson;
        
        // Handle rounding - add remainder to first participant
        const roundedAmounts = participants.map((participant, index) => {
            let amount = Math.round(totalPerPerson * 100) / 100;
            
            // Add any remainder to the first participant to ensure total adds up
            if (index === 0) {
                const totalCalculated = amount * numParticipants;
                const remainder = Math.round((totalAmount - totalCalculated) * 100) / 100;
                amount += remainder;
            }
            
            return {
                ...participant,
                amount_owed: amount,
                base_amount_share: Math.round(basePerPerson * 100) / 100,
                gst_share: Math.round((gstAmount / numParticipants) * 100) / 100,
                service_charge_share: Math.round((serviceChargeAmount / numParticipants) * 100) / 100
            };
        });
        
        return {
            participants: roundedAmounts,
            breakdown: {
                base_amount: baseAmount,
                gst_rate: gstRate,
                service_charge_rate: serviceChargeRate,
                gst_amount: gstAmount,
                service_charge_amount: serviceChargeAmount,
                total_amount: totalAmount
            }
        };
    },

    calculateCustomSplit: (baseAmount, participantShares, gstRate = 0, serviceChargeRate = 0) => {
        // participantShares should be an array like [{ user_id: 1, share_percentage: 0.5 }, ...]
        const totalShares = participantShares.reduce((sum, p) => sum + p.share_percentage, 0);
        
        if (Math.abs(totalShares - 1.0) > 0.001) {
            throw new Error('Share percentages must add up to 100%');
        }
        
        // Calculate charges
        const gstAmount = baseAmount * gstRate;
        const serviceChargeAmount = baseAmount * serviceChargeRate;
        const totalCharges = gstAmount + serviceChargeAmount;
        const totalAmount = baseAmount + totalCharges;
        
        const participants = participantShares.map(participant => {
            const baseShare = baseAmount * participant.share_percentage;
            const chargesShare = totalCharges * participant.share_percentage;
            const totalShare = baseShare + chargesShare;
            
            return {
                ...participant,
                amount_owed: Math.round(totalShare * 100) / 100,
                base_amount_share: Math.round(baseShare * 100) / 100,
                gst_share: Math.round((gstAmount * participant.share_percentage) * 100) / 100,
                service_charge_share: Math.round((serviceChargeAmount * participant.share_percentage) * 100) / 100
            };
        });
        
        return {
            participants,
            breakdown: {
                base_amount: baseAmount,
                gst_rate: gstRate,
                service_charge_rate: serviceChargeRate,
                gst_amount: gstAmount,
                service_charge_amount: serviceChargeAmount,
                total_amount: totalAmount
            }
        };
    }
};
