import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

type Role = 'super-admin' | 'admin' | 'moderator' | 'analyst';
const VALID_ROLES: Role[] = ['super-admin', 'admin', 'moderator', 'analyst'];

/** Only super-admins may view or manage the admin list — granting admin access is the most sensitive action in the system. */
async function requireSuperAdmin() {
  const session = await getSession();
  return session?.isAdmin && session.role === 'super-admin' ? session : null;
}

async function logAction(adminUid: string, adminEmail: string, action: string, details: Record<string, unknown>) {
  if (!db) return;
  await db.collection('admin_logs').add({
    adminUid, adminEmail, action, details, timestamp: Date.now(),
  });
}

/** GET — list every Firebase Auth user carrying the admin custom claim. */
export async function GET() {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Forbidden — super-admin only' }, { status: 403 });
  }
  if (!auth) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const admins: Array<{ uid: string; email: string; role: Role; createdAt: number | null }> = [];
  let pageToken: string | undefined;
  do {
    const result = await auth.listUsers(1000, pageToken);
    for (const user of result.users) {
      const claims = user.customClaims as Record<string, unknown> | undefined;
      if (claims?.admin === true) {
        admins.push({
          uid: user.uid,
          email: user.email || '',
          role: (claims.role as Role) || 'admin',
          createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : null,
        });
      }
    }
    pageToken = result.pageToken;
  } while (pageToken);

  return NextResponse.json({ admins });
}

/** POST { email, role } — grant admin access to an existing Firebase Auth user. */
export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden — super-admin only' }, { status: 403 });
  }
  if (!auth) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const { email, role } = await request.json();
  if (!email || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Missing email or invalid role' }, { status: 400 });
  }

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    return NextResponse.json(
      { error: 'No account exists for that email. Ask them to sign in once at the admin panel first (it will be denied), then try again.' },
      { status: 404 }
    );
  }

  await auth.setCustomUserClaims(user.uid, { admin: true, role });
  await logAction(session.uid, session.email, 'admin_grant', { targetEmail: email, role });

  return NextResponse.json({ ok: true, message: `Granted ${role} to ${email}` });
}

/** PATCH { uid, role } — change an existing admin's role. */
export async function PATCH(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden — super-admin only' }, { status: 403 });
  }
  if (!auth) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const { uid, role } = await request.json();
  if (!uid || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Missing uid or invalid role' }, { status: 400 });
  }

  await auth.setCustomUserClaims(uid, { admin: true, role });
  await logAction(session.uid, session.email, 'admin_role_change', { targetUid: uid, role });

  return NextResponse.json({ ok: true, message: 'Role updated' });
}

/** DELETE { uid } — revoke admin access (does not delete the underlying user account). */
export async function DELETE(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden — super-admin only' }, { status: 403 });
  }
  if (!auth) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const { uid } = await request.json();
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
  }
  if (uid === session.uid) {
    return NextResponse.json({ error: 'You cannot revoke your own admin access' }, { status: 400 });
  }

  await auth.setCustomUserClaims(uid, { admin: false });
  await logAction(session.uid, session.email, 'admin_revoke', { targetUid: uid });

  return NextResponse.json({ ok: true, message: 'Admin access revoked' });
}
