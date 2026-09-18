import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const ratingFilter = searchParams.get('rating');
    const categoryFilter = searchParams.get('category');

    const snapshot = await db.collection('feedback').get();
    let list = snapshot.docs.map((doc) => ({
      id: doc.id,
      rating: doc.data().rating || 5,
      category: doc.data().category || 'general',
      message: doc.data().message || '',
      userEmail: doc.data().userEmail || '',
      userName: doc.data().userName || '',
      userId: doc.data().userId || null,
      platform: doc.data().platform || 'web',
      status: doc.data().status || 'new',
      createdAt: doc.data().createdAt || 0,
    }));

    // Sort descending by date
    list.sort((a, b) => b.createdAt - a.createdAt);

    // Compute metrics before filtering
    const totalCount = list.length;
    const avgRating = totalCount > 0 ? (list.reduce((acc, curr) => acc + curr.rating, 0) / totalCount) : 5;

    const ratingDistribution = {
      5: list.filter((f) => f.rating === 5).length,
      4: list.filter((f) => f.rating === 4).length,
      3: list.filter((f) => f.rating === 3).length,
      2: list.filter((f) => f.rating === 2).length,
      1: list.filter((f) => f.rating === 1).length,
    };

    // Apply filters
    if (ratingFilter && ratingFilter !== 'all') {
      const targetRating = parseInt(ratingFilter);
      list = list.filter((f) => f.rating === targetRating);
    }

    if (categoryFilter && categoryFilter !== 'all') {
      list = list.filter((f) => f.category === categoryFilter);
    }

    const filteredTotal = list.length;
    const totalPages = Math.ceil(filteredTotal / limit) || 1;
    const offset = (page - 1) * limit;
    const paged = list.slice(offset, offset + limit);

    return NextResponse.json({
      feedback: paged,
      total: filteredTotal,
      overallTotal: totalCount,
      avgRating: parseFloat(avgRating.toFixed(2)),
      ratingDistribution,
      page,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching admin feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
