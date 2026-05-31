import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const actionFilter = searchParams.get('action') || '';
    const adminFilter = searchParams.get('admin') || '';

    const pageSize = Math.min(limit, 100);
    const offset = (page - 1) * pageSize;

    // Build query
    let queryRef: any = db.collection('admin_logs');

    if (actionFilter && actionFilter !== 'all') {
      queryRef = queryRef.where('action', '==', actionFilter);
    }

    // Get total count
    const countSnapshot = await queryRef.count().get();
    const totalCount = countSnapshot.data().count;

    // Fetch logs with pagination
    const snapshot = await queryRef
      .orderBy('timestamp', 'desc')
      .offset(offset)
      .limit(pageSize)
      .get();

    const logs = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      adminEmail: doc.data().adminEmail || 'Unknown',
      action: doc.data().action || 'unknown',
      targetUserEmail: doc.data().targetUserEmail || '',
      details: doc.data().details || {},
      timestamp: doc.data().timestamp || 0,
      ipAddress: doc.data().ipAddress || 'unknown',
    }));

    // Filter by admin email (client-side for simplicity)
    const filtered = adminFilter
      ? logs.filter((log: any) =>
          log.adminEmail.toLowerCase().includes(adminFilter.toLowerCase())
        )
      : logs;

    return NextResponse.json({
      logs: filtered,
      total: totalCount,
      page,
      limit: pageSize,
      hasMore: offset + pageSize < totalCount,
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
