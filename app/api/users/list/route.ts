import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';
import { getCachedActivityMap, segmentFor } from '@/lib/usage-activity';
import { getCachedSubscriptionsMap } from '@/lib/subscriptions-map';
import { getCached } from '@/lib/route-cache';

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
    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit  = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const plan   = searchParams.get('plan') || '';
    const status = searchParams.get('status') || '';

    const cacheKey = `users:list:${page}:${limit}:${search}:${plan}:${status}`;

    return getCached(cacheKey, 5 * 60 * 1000, async () => {
      const firestore = db!;
      let queryRef: FirebaseFirestore.Query = firestore.collection('users');

      if (plan && plan !== 'all') {
        queryRef = queryRef.where('plan', '==', plan);
      }
      if (status && status !== 'all') {
        queryRef = queryRef.where('status', '==', status);
      }

      // Fetch all matching users without artificial limits so search and pagination apply over 100% of records.
      const [snapshot, activity, subscriptions] = await Promise.all([
        queryRef.get(),
        getCachedActivityMap(),
        getCachedSubscriptionsMap(),
      ]);

      let users = snapshot.docs.map((doc) => ({
        id:        doc.id,
        email:     (doc.data().email     || '') as string,
        name:      (doc.data().name      || '') as string,
        plan:      (doc.data().plan      || 'free') as string,
        status:    (doc.data().status    || 'active') as string,
        createdAt: (doc.data().createdAt as number) || doc.createTime.toMillis(),
        phone:           (doc.data().phone           || '') as string,
        experienceLevel: (doc.data().experienceLevel || '') as string,
        city:            (doc.data().city            || '') as string,
        platform:        (doc.data().platform         || '') as string,
        appVersion:      (doc.data().appVersion        || '') as string,
        referralSource:  (doc.data().referralSource || doc.data().acquisition?.customerSelectedSource || '') as string,
        lastActive:      Math.max(activity.get(doc.id)?.lastActive ?? 0, (doc.data().lastSeen || 0) as number),
        activeDays:      activity.get(doc.id)?.activeDays ?? 0,
        tokensUsed:      activity.get(doc.id)?.tokensUsed ?? 0,
        voiceMinutes:    activity.get(doc.id)?.voiceMinutes ?? 0,
        screenshotsUsed: activity.get(doc.id)?.screenshotsUsed ?? 0,
        mockSessions:    activity.get(doc.id)?.mockSessions ?? 0,
        duplicateEmail:  false,
        adminGranted:    (doc.data().adminGranted as boolean) ?? false,
        countTowardRevenue: (doc.data().countTowardRevenue as boolean) ?? false,
        planExpiresAt:   subscriptions.get(doc.id)?.planExpiresAt ?? null,
      }));

      // Backfill missing email/name from Firebase Auth for any partial user documents
      const missingIdentity = users.filter(u => !u.email || !u.name);
      if (missingIdentity.length > 0 && auth) {
        const authClient = auth;
        const fbUsers = await Promise.allSettled(
          missingIdentity.map(u => authClient.getUser(u.id).catch(() => null))
        );
        fbUsers.forEach((result, i) => {
          if (result.status === 'fulfilled' && result.value) {
            const fb = result.value;
            if (!missingIdentity[i].email && fb.email) missingIdentity[i].email = fb.email;
            if (!missingIdentity[i].name && fb.displayName) missingIdentity[i].name = fb.displayName;
          }
        });
      }

      // ── Firebase Auth full user pool merge ─────────────────────────────────
      // Ensures any user registered in Firebase Auth whose Firestore document was
      // delayed or missing is still displayed in the admin list.
      if ((!plan || plan === 'all') && (!status || status === 'all') && auth) {
        try {
          const authClient = auth;
          const authUsers: Array<import('firebase-admin/auth').UserRecord> = [];
          let pageToken: string | undefined = undefined;
          do {
            const res = await authClient.listUsers(1000, pageToken);
            authUsers.push(...res.users);
            pageToken = res.pageToken;
          } while (pageToken);

          const existingUids = new Set(users.map((u) => u.id));
          for (const fbUser of authUsers) {
            if (!existingUids.has(fbUser.uid)) {
              const creationTime = fbUser.metadata.creationTime ? new Date(fbUser.metadata.creationTime).getTime() : Date.now();
              users.push({
                id:        fbUser.uid,
                email:     fbUser.email || '',
                name:      fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
                plan:      'free',
                status:    'active',
                createdAt: creationTime,
                phone:           fbUser.phoneNumber || '',
                experienceLevel: '',
                city:            '',
                platform:        '',
                appVersion:      '',
                referralSource:  '',
                lastActive:      0,
                activeDays:      0,
                tokensUsed:      0,
                voiceMinutes:    0,
                screenshotsUsed: 0,
                mockSessions:    0,
                duplicateEmail:  false,
                adminGranted:    false,
                countTowardRevenue: false,
                planExpiresAt:   null,
              });
            }
          }
        } catch (err) {
          console.error('[users/list] Auth sync error:', err);
        }
      }

      // ── Duplicate email detection ─────────────────────────────────────────
      const emailToIndices = new Map<string, number[]>();
      users.forEach((u, i) => {
        if (u.email) {
          const key = u.email.toLowerCase();
          const arr = emailToIndices.get(key) || [];
          arr.push(i);
          emailToIndices.set(key, arr);
        }
      });
      const duplicateEmailIndices = new Set<number>();
      for (const arr of emailToIndices.values()) {
        if (arr.length > 1) {
          arr.forEach(i => duplicateEmailIndices.add(i));
        }
      }
      users.forEach((u, i) => {
        u.duplicateEmail = duplicateEmailIndices.has(i);
      });

      users.sort((a, b) => b.createdAt - a.createdAt);

      // Apply search filter server-side before pagination
      if (search) {
        users = users.filter(
          (u) => u.email.toLowerCase().includes(search) || u.name.toLowerCase().includes(search)
        );
      }

      const total      = users.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const safePage   = Math.min(page, totalPages);
      const offset     = (safePage - 1) * limit;
      const paginated  = users.slice(offset, offset + limit);

      const [totalAgg, bannedAgg, paidAgg] = await Promise.all([
        firestore.collection('users').count().get(),
        firestore.collection('users').where('status', '==', 'banned').count().get(),
        firestore.collection('users').where('plan', 'in', ['quick_pass', 'pro', 'power']).count().get(),
      ]);

      const now = Date.now();
      let activeCount = 0;
      for (const a of activity.values()) {
        const segment = segmentFor(a.lastActive, now);
        if (segment === 'active7' || segment === 'active30') activeCount++;
      }
      const stats = {
        total: totalAgg.data().count,
        banned: bannedAgg.data().count,
        paid: paidAgg.data().count,
        active: activeCount,
      };

      return {
        users:   paginated,
        total,
        stats,
        page:    safePage,
        limit,
        totalPages,
        hasMore: offset + limit < total,
      };
    }).then((data) => {
      return NextResponse.json(data);
    }).catch((error) => {
      console.error('[users/list] cache fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    console.error('[users/list]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
