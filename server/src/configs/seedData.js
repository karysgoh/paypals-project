const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");

async function initializeData() {
  try {
    console.log("Starting PayPal-like application data initialization...");

    // --- 1. Initialize Roles ---
    const rolesToCreate = [
      {
        role_name: "user",
        description: "Basic user role with standard permissions"
      },
      {
        role_name: "admin",
        description: "Administrator role with management permissions"
      }
    ];

    const createdRoles = {};
    for (const roleData of rolesToCreate) {
      let role = await prisma.role.findUnique({
        where: { role_name: roleData.role_name },
      });
      if (!role) {
        role = await prisma.role.create({
          data: {
            role_name: roleData.role_name,
            description: roleData.description,
          },
        });
        console.log(`Role '${role.role_name}' created.`);
      } else {
        console.log(`Role '${role.role_name}' already exists, skipping.`);
      }
      createdRoles[roleData.role_name] = role;
    }

    // --- 2. Create Users ---
    const usersToCreate = [
      {
        username: "john_doe",
        email: "john.doe@example.com",
        password: "Password123!",
        phone_number: "+1-555-0101",
        role_id: createdRoles.user.id,
        email_verified: true
      },
      {
        username: "jane_smith",
        email: "jane.smith@example.com",
        password: "Password123!",
        phone_number: "+1-555-0102",
        role_id: createdRoles.user.id,
        email_verified: true
      },
      {
        username: "mike_wilson",
        email: "mike.wilson@example.com",
        password: "Password123!",
        phone_number: "+1-555-0103",
        role_id: createdRoles.user.id,
        email_verified: true
      },
      {
        username: "sarah_jones",
        email: "sarah.jones@example.com",
        password: "Password123!",
        phone_number: "+1-555-0104",
        role_id: createdRoles.user.id,
        email_verified: true
      },
      {
        username: "david_brown",
        email: "david.brown@example.com",
        password: "Password123!",
        phone_number: "+1-555-0105",
        role_id: createdRoles.user.id,
        email_verified: true
      },
      {
        username: "admin_user",
        email: "admin@paypals.com",
        password: "Admin123!",
        phone_number: "+1-555-0001",
        role_id: createdRoles.admin.id,
        email_verified: true
      }
    ];

    const createdUsers = {};
    for (const userData of usersToCreate) {
      let user = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      if (!user) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        user = await prisma.user.create({
          data: {
            username: userData.username,
            password: hashedPassword,
            email: userData.email,
            phone_number: userData.phone_number,
            role_id: userData.role_id,
            email_verified: userData.email_verified,
            status: 'active'
          },
        });
        console.log(`User '${user.username}' created.`);
      } else {
        console.log(`User '${user.username}' already exists, skipping.`);
      }
      createdUsers[userData.username] = user;
    }

    // --- 3. Create Circles ---
    const circlesToCreate = [
      {
        name: "Roommates 2024",
        type: "roommates"
      },
      {
        name: "Weekend Trip",
        type: "travel"
      },
      {
        name: "Project Alpha",
        type: "project"
      },
      {
        name: "Family Expenses",
        type: "family"
      },
      {
        name: "Work Team",
        type: "colleagues"
      }
    ];

    const createdCircles = {};
    for (const circleData of circlesToCreate) {
      let circle = await prisma.circle.findFirst({
        where: { name: circleData.name },
      });
      if (!circle) {
        circle = await prisma.circle.create({
          data: {
            name: circleData.name,
            type: circleData.type
          },
        });
        console.log(`Circle '${circle.name}' created.`);
      } else {
        console.log(`Circle '${circle.name}' already exists, skipping.`);
      }
      createdCircles[circleData.name] = circle;
    }

    // --- 4. Create Circle Members ---
    const circleMembersToCreate = [
      // Roommates 2024
      {
        circle_id: createdCircles["Roommates 2024"].id,
        user_id: createdUsers["john_doe"].id,
        role: "admin",
        status: "active"
      },
      {
        circle_id: createdCircles["Roommates 2024"].id,
        user_id: createdUsers["jane_smith"].id,
        role: "member",
        status: "active"
      },
      {
        circle_id: createdCircles["Roommates 2024"].id,
        user_id: createdUsers["mike_wilson"].id,
        role: "member",
        status: "active"
      },

      // Weekend Trip
      {
        circle_id: createdCircles["Weekend Trip"].id,
        user_id: createdUsers["john_doe"].id,
        role: "admin",
        status: "active"
      },
      {
        circle_id: createdCircles["Weekend Trip"].id,
        user_id: createdUsers["sarah_jones"].id,
        role: "member",
        status: "active"
      },
      {
        circle_id: createdCircles["Weekend Trip"].id,
        user_id: createdUsers["david_brown"].id,
        role: "member",
        status: "active"
      },

      // Project Alpha
      {
        circle_id: createdCircles["Project Alpha"].id,
        user_id: createdUsers["jane_smith"].id,
        role: "admin",
        status: "active"
      },
      {
        circle_id: createdCircles["Project Alpha"].id,
        user_id: createdUsers["mike_wilson"].id,
        role: "member",
        status: "active"
      },

      // Family Expenses
      {
        circle_id: createdCircles["Family Expenses"].id,
        user_id: createdUsers["sarah_jones"].id,
        role: "admin",
        status: "active"
      },
      {
        circle_id: createdCircles["Family Expenses"].id,
        user_id: createdUsers["david_brown"].id,
        role: "member",
        status: "active"
      },

      // Work Team
      {
        circle_id: createdCircles["Work Team"].id,
        user_id: createdUsers["admin_user"].id,
        role: "admin",
        status: "active"
      },
      {
        circle_id: createdCircles["Work Team"].id,
        user_id: createdUsers["john_doe"].id,
        role: "member",
        status: "active"
      },
      {
        circle_id: createdCircles["Work Team"].id,
        user_id: createdUsers["jane_smith"].id,
        role: "member",
        status: "active"
      }
    ];

    for (const memberData of circleMembersToCreate) {
      const existingMember = await prisma.circleMember.findFirst({
        where: {
          circle_id: memberData.circle_id,
          user_id: memberData.user_id
        },
      });
      if (!existingMember) {
        await prisma.circleMember.create({
          data: memberData,
        });
        console.log(`Circle member added: User ${memberData.user_id} to Circle ${memberData.circle_id}`);
      } else {
        console.log(`Circle member already exists, skipping.`);
      }
    }

    // --- 5. Create Transactions ---
    const transactionsToCreate = [
      {
        name: "Rent Payment",
        description: "Monthly rent for apartment",
        category: "rent",
        total_amount: 2400.00,
        circle_id: createdCircles["Roommates 2024"].id,
        created_by: createdUsers["john_doe"].id,
        location_name: "123 Main St Apartment",
        location_lat: 40.7128,
        location_lng: -74.0060
      },
      {
        name: "Grocery Shopping",
        description: "Weekly groceries for roommates",
        category: "groceries",
        total_amount: 150.00,
        circle_id: createdCircles["Roommates 2024"].id,
        created_by: createdUsers["jane_smith"].id,
        location_name: "Local Supermarket",
        location_lat: 40.7129,
        location_lng: -74.0061
      },
      {
        name: "Gas for Trip",
        description: "Fuel for weekend road trip",
        category: "transportation",
        total_amount: 85.50,
        circle_id: createdCircles["Weekend Trip"].id,
        created_by: createdUsers["john_doe"].id,
        location_name: "Shell Gas Station",
        location_lat: 40.7130,
        location_lng: -74.0062
      },
      {
        name: "Project Software License",
        description: "Annual software license for project",
        category: "other",
        total_amount: 299.99,
        circle_id: createdCircles["Project Alpha"].id,
        created_by: createdUsers["jane_smith"].id
      },
      {
        name: "Family Dinner",
        description: "Restaurant dinner with family",
        category: "food",
        total_amount: 120.00,
        circle_id: createdCircles["Family Expenses"].id,
        created_by: createdUsers["sarah_jones"].id,
        location_name: "Family Restaurant",
        location_lat: 40.7131,
        location_lng: -74.0063
      }
    ];

    const createdTransactions = {};
    for (const transactionData of transactionsToCreate) {
      let transaction = await prisma.transaction.findFirst({
        where: {
          name: transactionData.name,
          circle_id: transactionData.circle_id
        },
      });
      if (!transaction) {
        transaction = await prisma.transaction.create({
          data: {
            name: transactionData.name,
            description: transactionData.description,
            category: transactionData.category,
            total_amount: transactionData.total_amount,
            circle_id: transactionData.circle_id,
            created_by: transactionData.created_by,
            location_name: transactionData.location_name,
            location_lat: transactionData.location_lat,
            location_lng: transactionData.location_lng
          },
        });
        console.log(`Transaction '${transaction.name}' created.`);
      } else {
        console.log(`Transaction '${transaction.name}' already exists, skipping.`);
      }
      createdTransactions[transactionData.name] = transaction;
    }

    // --- 6. Create Transaction Members (Participants) ---
    const transactionMembersToCreate = [
      // Rent Payment - Split equally between 3 roommates
      {
        transaction_id: createdTransactions["Rent Payment"].id,
        user_id: createdUsers["john_doe"].id,
        amount_owed: 800.00,
        payment_status: "paid"
      },
      {
        transaction_id: createdTransactions["Rent Payment"].id,
        user_id: createdUsers["jane_smith"].id,
        amount_owed: 800.00,
        payment_status: "pending"
      },
      {
        transaction_id: createdTransactions["Rent Payment"].id,
        user_id: createdUsers["mike_wilson"].id,
        amount_owed: 800.00,
        payment_status: "pending"
      },

      // Grocery Shopping - Split by usage
      {
        transaction_id: createdTransactions["Grocery Shopping"].id,
        user_id: createdUsers["jane_smith"].id,
        amount_owed: 0.00,
        payment_status: "paid"
      },
      {
        transaction_id: createdTransactions["Grocery Shopping"].id,
        user_id: createdUsers["john_doe"].id,
        amount_owed: 75.00,
        payment_status: "pending"
      },
      {
        transaction_id: createdTransactions["Grocery Shopping"].id,
        user_id: createdUsers["mike_wilson"].id,
        amount_owed: 75.00,
        payment_status: "pending"
      },

      // Gas for Trip - Split equally
      {
        transaction_id: createdTransactions["Gas for Trip"].id,
        user_id: createdUsers["john_doe"].id,
        amount_owed: 0.00,
        payment_status: "paid"
      },
      {
        transaction_id: createdTransactions["Gas for Trip"].id,
        user_id: createdUsers["sarah_jones"].id,
        amount_owed: 42.75,
        payment_status: "pending"
      },
      {
        transaction_id: createdTransactions["Gas for Trip"].id,
        user_id: createdUsers["david_brown"].id,
        amount_owed: 42.75,
        payment_status: "pending"
      },

      // Project Software License - Split equally
      {
        transaction_id: createdTransactions["Project Software License"].id,
        user_id: createdUsers["jane_smith"].id,
        amount_owed: 0.00,
        payment_status: "paid"
      },
      {
        transaction_id: createdTransactions["Project Software License"].id,
        user_id: createdUsers["mike_wilson"].id,
        amount_owed: 149.99,
        payment_status: "pending"
      },

      // Family Dinner - Split equally
      {
        transaction_id: createdTransactions["Family Dinner"].id,
        user_id: createdUsers["sarah_jones"].id,
        amount_owed: 0.00,
        payment_status: "paid"
      },
      {
        transaction_id: createdTransactions["Family Dinner"].id,
        user_id: createdUsers["david_brown"].id,
        amount_owed: 60.00,
        payment_status: "pending"
      }
    ];

    for (const memberData of transactionMembersToCreate) {
      const existingMember = await prisma.transactionMember.findFirst({
        where: {
          transaction_id: memberData.transaction_id,
          user_id: memberData.user_id
        },
      });
      if (!existingMember) {
        await prisma.transactionMember.create({
          data: memberData,
        });
        console.log(`Transaction member added: User ${memberData.user_id} to Transaction ${memberData.transaction_id}`);
      } else {
        console.log(`Transaction member already exists, skipping.`);
      }
    }

    // --- 7. Create Sample Invitations ---
    const invitationsToCreate = [
      {
        circle_id: createdCircles["Work Team"].id,
        inviter_id: createdUsers["admin_user"].id,
        email: "newemployee@company.com",
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      {
        circle_id: createdCircles["Weekend Trip"].id,
        inviter_id: createdUsers["john_doe"].id,
        invitee_id: createdUsers["mike_wilson"].id,
        status: "accepted",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const invitationData of invitationsToCreate) {
      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          circle_id: invitationData.circle_id,
          inviter_id: invitationData.inviter_id,
          ...(invitationData.invitee_id ? { invitee_id: invitationData.invitee_id } : { email: invitationData.email })
        },
      });
      if (!existingInvitation) {
        await prisma.invitation.create({
          data: invitationData,
        });
        console.log(`Invitation created for circle ${invitationData.circle_id}`);
      } else {
        console.log(`Invitation already exists, skipping.`);
      }
    }

    // --- 8. Create Sample Notifications ---
    const notificationsToCreate = [
      {
        user_id: createdUsers["jane_smith"].id,
        type: "payment_due",
        title: "Payment Due",
        message: "You owe $75.00 for Grocery Shopping in Roommates 2024",
        related_transaction_id: createdTransactions["Grocery Shopping"].id,
        related_circle_id: createdCircles["Roommates 2024"].id,
        notification_channel: "in_app"
      },
      {
        user_id: createdUsers["mike_wilson"].id,
        type: "payment_due",
        title: "Payment Due",
        message: "You owe $800.00 for Rent Payment in Roommates 2024",
        related_transaction_id: createdTransactions["Rent Payment"].id,
        related_circle_id: createdCircles["Roommates 2024"].id,
        notification_channel: "in_app"
      },
      {
        user_id: createdUsers["john_doe"].id,
        type: "circle_invitation",
        title: "Circle Invitation",
        message: "You've been invited to join Work Team circle",
        related_circle_id: createdCircles["Work Team"].id,
        notification_channel: "email"
      }
    ];

    for (const notificationData of notificationsToCreate) {
      const existingNotification = await prisma.notification.findFirst({
        where: {
          user_id: notificationData.user_id,
          type: notificationData.type,
          related_transaction_id: notificationData.related_transaction_id || null,
          related_circle_id: notificationData.related_circle_id || null
        },
      });
      if (!existingNotification) {
        await prisma.notification.create({
          data: notificationData,
        });
        console.log(`Notification created for user ${notificationData.user_id}`);
      } else {
        console.log(`Notification already exists, skipping.`);
      }
    }

    // --- 9. Create Sample Audit Logs ---
    const auditLogsToCreate = [
      {
        performed_by: createdUsers["john_doe"].id,
        action_type: "create",
        target_entity: "transaction",
        target_id: createdTransactions["Rent Payment"].id,
        description: "Created rent payment transaction"
      },
      {
        performed_by: createdUsers["jane_smith"].id,
        action_type: "create",
        target_entity: "transaction",
        target_id: createdTransactions["Grocery Shopping"].id,
        description: "Created grocery shopping transaction"
      },
      {
        performed_by: createdUsers["admin_user"].id,
        action_type: "invite",
        target_entity: "circle",
        target_id: createdCircles["Work Team"].id,
        description: "Sent invitation to new employee"
      }
    ];

    for (const auditLogData of auditLogsToCreate) {
      const existingAuditLog = await prisma.auditLog.findFirst({
        where: {
          performed_by: auditLogData.performed_by,
          action_type: auditLogData.action_type,
          target_entity: auditLogData.target_entity,
          target_id: auditLogData.target_id
        },
      });
      if (!existingAuditLog) {
        await prisma.auditLog.create({
          data: auditLogData,
        });
        console.log(`Audit log created for action ${auditLogData.action_type}`);
      } else {
        console.log(`Audit log already exists, skipping.`);
      }
    }

    console.log(`📊 Created ${Object.keys(createdUsers).length} users`);
    console.log(`👥 Created ${Object.keys(createdCircles).length} circles`);
    console.log(`💰 Created ${Object.keys(createdTransactions).length} transactions`);
    console.log(`📧 Created ${invitationsToCreate.length} invitations`);
    console.log(`🔔 Created ${notificationsToCreate.length} notifications`);
    console.log(`📝 Created ${auditLogsToCreate.length} audit logs`);

  } catch (error) {
    console.error("❌ Error initializing data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
(async () => {
  console.log("🚀 Starting PayPal-like application data initialization...");
  await initializeData();
  console.log("🎉 Data initialization complete!");
})();