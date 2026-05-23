import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 500 }
      );
    }

    const results: any[] = [];

    // 1. Create test users
    const users = [
      { email: 'user1@test.com', name: 'John Doe', plan: 'free' },
      { email: 'user2@test.com', name: 'Jane Smith', plan: 'pro' },
      { email: 'user3@test.com', name: 'Bob Johnson', plan: 'power' },
      { email: 'user4@test.com', name: 'Alice Brown', plan: 'pro' },
      { email: 'user5@test.com', name: 'Charlie Wilson', plan: 'free' },
    ];

    const userIds: string[] = [];
    for (const user of users) {
      const docRef = await db.collection('users').add({
        email: user.email,
        name: user.name,
        plan: user.plan,
        createdAt: Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000, // Random time in last 90 days
      });
      userIds.push(docRef.id);
    }

    results.push({
      type: 'users',
      count: users.length,
      message: `Created ${users.length} test users`,
    });

    // 2. Create subscriptions for each user
    for (let i = 0; i < userIds.length; i++) {
      const plans: any = {
        free: 0,
        pro: 499,
        power: 999,
      };
      const plan = users[i].plan;
      const price = plans[plan];

      await db.collection('subscriptions').doc(userIds[i]).set({
        plan: plan,
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        price: price,
        renewalDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        startedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      });
    }

    results.push({
      type: 'subscriptions',
      count: userIds.length,
      message: `Created ${userIds.length} subscriptions`,
    });

    // 3. Create sample interview sessions
    for (let i = 0; i < 10; i++) {
      const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
      await db.collection('interview_sessions').add({
        userId: randomUserId,
        company: ['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta'][Math.floor(Math.random() * 5)],
        role: ['Frontend', 'Backend', 'Full Stack', 'DevOps', 'Data'][Math.floor(Math.random() * 5)],
        mode: Math.random() > 0.5 ? 'voice' : 'screen',
        startedAt: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
        endedAt: Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000,
        status: 'completed',
      });
    }

    results.push({
      type: 'interview_sessions',
      count: 10,
      message: 'Created 10 sample interview sessions',
    });

    // 4. Create sample messages
    for (let i = 0; i < 20; i++) {
      await db.collection('interview_messages').add({
        sessionId: `session_${i}`,
        userId: userIds[i % userIds.length],
        question: `Sample question ${i + 1}: ${['Explain React hooks', 'What is async/await?', 'Design a system', 'Optimize this code', 'SQL vs NoSQL'][i % 5]}`,
        answer: `This is a sample answer for question ${i + 1}. In a real scenario, this would be the AI-generated response to the user's question about technical concepts.`,
        confidence: Math.floor(Math.random() * 100) + 50,
        createdAt: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      });
    }

    results.push({
      type: 'interview_messages',
      count: 20,
      message: 'Created 20 sample messages',
    });

    // 5. Create sample admin logs
    const actions = ['user_upgrade', 'user_ban', 'quota_reset', 'content_delete'];
    for (let i = 0; i < 15; i++) {
      await db.collection('admin_logs').add({
        adminUid: 'n7pMJaMJQGYPY7EztbQ5cP80SPw2',
        adminEmail: 'smartjaganrao@gmail.com',
        action: actions[i % actions.length],
        targetUserId: userIds[i % userIds.length],
        targetUserEmail: users[i % users.length].email,
        timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        details: {
          oldPlan: 'free',
          newPlan: 'pro',
          reason: 'User requested upgrade',
        },
      });
    }

    results.push({
      type: 'admin_logs',
      count: 15,
      message: 'Created 15 audit log entries',
    });

    // 6. Create sample support tickets
    for (let i = 0; i < 5; i++) {
      const statuses = ['open', 'in-progress', 'resolved', 'closed'];
      await db.collection('support_tickets').add({
        userId: userIds[i % userIds.length],
        userEmail: users[i % users.length].email,
        title: `Support ticket ${i + 1}: ${['Billing issue', 'Feature request', 'Bug report', 'Account help', 'Technical support'][i % 5]}`,
        description: `This is a sample support ticket. User is asking about ${['billing', 'features', 'bugs', 'account', 'technical'][i % 5]} issues.`,
        status: statuses[i % statuses.length],
        priority: ['low', 'medium', 'high', 'critical'][i % 4],
        createdAt: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000,
        messages: [
          {
            senderType: 'user',
            senderUid: userIds[i % userIds.length],
            senderEmail: users[i % users.length].email,
            message: 'I need help with this issue',
            timestamp: Date.now() - 24 * 60 * 60 * 1000,
          },
        ],
      });
    }

    results.push({
      type: 'support_tickets',
      count: 5,
      message: 'Created 5 sample support tickets',
    });

    // 7. Create usage tracking data
    for (let i = 0; i < userIds.length; i++) {
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM
      await db.collection('usage_tracking').doc(`${userIds[i]}_${month}`).set({
        userId: userIds[i],
        month: month,
        tokensUsed: Math.floor(Math.random() * 10000),
        voiceMinutes: Math.floor(Math.random() * 300),
        screenshotsUsed: Math.floor(Math.random() * 50),
        updatedAt: Date.now(),
      });
    }

    results.push({
      type: 'usage_tracking',
      count: userIds.length,
      message: `Created usage tracking for ${userIds.length} users`,
    });

    return NextResponse.json({
      status: 'success',
      message: 'Test data created successfully',
      summary: {
        users: users.length,
        subscriptions: userIds.length,
        sessions: 10,
        messages: 20,
        logs: 15,
        tickets: 5,
        usageRecords: userIds.length,
      },
      results,
    });
  } catch (error: any) {
    console.error('[Setup] Error creating test data:', error);
    return NextResponse.json(
      {
        error: 'Failed to create test data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
