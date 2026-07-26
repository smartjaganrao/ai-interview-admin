import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';

export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { logId, deleteAll } = (await request.json()) as { logId?: string; deleteAll?: boolean };

    if (deleteAll) {
      const snap = await db.collection('admin_logs').limit(500).get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return NextResponse.json({ ok: true, deleted: snap.size });
    }

    if (!logId) return NextResponse.json({ error: 'logId required' }, { status: 400 });
    await db.collection('admin_logs').doc(logId).delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
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

    // Order by a single field only (auto-indexed) and apply the action/admin
    // filters in memory — avoids needing a composite index (action + timestamp).
    const snapshot = await db
      .collection('admin_logs')
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();

    let logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      adminEmail: doc.data().adminEmail || 'Unknown',
      action: doc.data().action || 'unknown',
      targetUserEmail: doc.data().targetUserEmail || '',
      details: doc.data().details || {},
      timestamp: doc.data().timestamp || 0,
      ipAddress: doc.data().ipAddress || 'unknown',
    }));

    if (actionFilter && actionFilter !== 'all') {
      logs = logs.filter((l) => l.action === actionFilter);
    }
    if (adminFilter) {
      logs = logs.filter((l) =>
        l.adminEmail.toLowerCase().includes(adminFilter.toLowerCase())
      );
    }

    const totalCount = logs.length;
    const paged = logs.slice(offset, offset + pageSize);

    return NextResponse.json({
      logs: paged,
      total: totalCount,
      page,
      limit: pageSize,
      hasMore: offset + pageSize < totalCount,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch audit logs';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
