import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';
import { getCached } from '@/lib/route-cache';

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

    const cacheKey = `audit:logs:${page}:${limit}:${actionFilter}:${adminFilter}`;

    return getCached(cacheKey, 5 * 60 * 1000, async () => {
      const firestore = db!;
      const pageSize = Math.min(Math.max(1, limit), 200);

      let queryRef: FirebaseFirestore.Query = firestore.collection('admin_logs');
      if (actionFilter && actionFilter !== 'all') {
        queryRef = queryRef.where('action', '==', actionFilter);
      }

      if (adminFilter) {
        const snapshot = await queryRef.get();
        let logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          adminEmail: doc.data().adminEmail || 'Unknown',
          action: doc.data().action || 'unknown',
          targetUserEmail: doc.data().targetUserEmail || '',
          details: doc.data().details || {},
          timestamp: doc.data().timestamp || 0,
          ipAddress: doc.data().ipAddress || 'unknown',
        }));
        logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        logs = logs.filter((l) =>
          l.adminEmail.toLowerCase().includes(adminFilter.toLowerCase())
        );

        const totalCount = logs.length;
        const totalPages = Math.ceil(totalCount / pageSize) || 1;
        const safePage = Math.min(Math.max(1, page), totalPages);
        const offset = (safePage - 1) * pageSize;
        const paged = logs.slice(offset, offset + pageSize);

        return {
          logs: paged,
          total: totalCount,
          page: safePage,
          limit: pageSize,
          totalPages,
          hasMore: offset + pageSize < totalCount,
        };
      }

      try {
        const countSnap = await queryRef.count().get();
        const totalCount = countSnap.data().count;
        const totalPages = Math.ceil(totalCount / pageSize) || 1;
        const safePage = Math.min(Math.max(1, page), totalPages);
        const offset = (safePage - 1) * pageSize;

        const snapshot = await queryRef
          .orderBy('timestamp', 'desc')
          .offset(offset)
          .limit(pageSize)
          .get();

        const logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          adminEmail: doc.data().adminEmail || 'Unknown',
          action: doc.data().action || 'unknown',
          targetUserEmail: doc.data().targetUserEmail || '',
          details: doc.data().details || {},
          timestamp: doc.data().timestamp || 0,
          ipAddress: doc.data().ipAddress || 'unknown',
        }));

        return {
          logs,
          total: totalCount,
          page: safePage,
          limit: pageSize,
          totalPages,
          hasMore: offset + pageSize < totalCount,
        };
      } catch {
        const snapshot = await queryRef.get();
        let logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          adminEmail: doc.data().adminEmail || 'Unknown',
          action: doc.data().action || 'unknown',
          targetUserEmail: doc.data().targetUserEmail || '',
          details: doc.data().details || {},
          timestamp: doc.data().timestamp || 0,
          ipAddress: doc.data().ipAddress || 'unknown',
        }));
        logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        const totalCount = logs.length;
        const totalPages = Math.ceil(totalCount / pageSize) || 1;
        const safePage = Math.min(Math.max(1, page), totalPages);
        const offset = (safePage - 1) * pageSize;
        const paged = logs.slice(offset, offset + pageSize);

        return {
          logs: paged,
          total: totalCount,
          page: safePage,
          limit: pageSize,
          totalPages,
          hasMore: offset + pageSize < totalCount,
        };
      }
    }).then((data) => NextResponse.json(data));
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch audit logs';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
