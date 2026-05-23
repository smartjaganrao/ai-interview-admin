# Firebase Quick Start - 5 Minute Setup

TL;DR version for experienced Firebase users.

---

## The Essentials

```bash
# 1. Create Firebase project
https://console.firebase.google.com
Project Name: AI Interview Helper Admin

# 2. Enable Email/Password Auth
Authentication → Email/Password → Enable

# 3. Create test user
Email: admin@test.com
Password: Test123456!

# 4. Add custom claim
Custom claims: {"admin": true, "role": "super-admin"}

# 5. Create Firestore database
Firestore Database → Create → Start in test mode

# 6. Create collections
users, subscriptions, admin_logs, interview_sessions, 
interview_messages, support_tickets, usage_tracking

# 7. Add documents
users/{uid}:
  - email: admin@test.com
  - name: Admin User
  - plan: pro
  - createdAt: timestamp

subscriptions/{uid}:
  - plan: pro
  - status: active
  - renewalDate: future timestamp

# 8. Security Rules
Copy from: FIREBASE_SETUP_GUIDE.md Step 6
```

---

## Environment Setup

```bash
cd "D:\Jagan\Projects\AI Tutor\ai-interview-admin"
```

Edit `.env.local`:

```
# From Firebase Console > Project Settings > Web App
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# From Firebase Console > Project Settings > Service Accounts > Private Key
FIREBASE_ADMIN_SDK_JSON={"type":"service_account",...}

# Generate: openssl rand -base64 32
NEXTAUTH_SECRET=...
```

---

## Verify Setup

```bash
# Restart dev server
npm run dev

# Test health endpoint
curl http://localhost:3000/api/health
# Should return: {"status": "success", ...}

# Test login
http://localhost:3000/login
# admin@test.com / Test123456!
# Should redirect to /dashboard
```

---

## What You Get

After setup:
- ✅ 12 fully functional admin pages
- ✅ 17 API endpoints with real Firebase data
- ✅ User management with plan upgrades
- ✅ Analytics dashboard with charts
- ✅ Complete audit logging
- ✅ Support ticket system
- ✅ Admin role management
- ✅ API key generation

---

## Collections Schema Reference

```javascript
// users
{
  email: string,
  name: string,
  plan: 'free' | 'pro' | 'power',
  createdAt: number
}

// subscriptions
{
  plan: string,
  status: 'active' | 'inactive',
  renewalDate: number
}

// admin_logs
{
  adminUid: string,
  adminEmail: string,
  action: string,
  targetUserId: string,
  timestamp: number,
  ipAddress: string
}

// support_tickets
{
  userId: string,
  title: string,
  status: 'open' | 'in-progress' | 'resolved' | 'closed',
  priority: 'low' | 'medium' | 'high' | 'critical',
  messages: array,
  createdAt: number
}

// interview_sessions, interview_messages, usage_tracking
// (created automatically by main app)
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Firebase not configured" | Add FIREBASE_ADMIN_SDK_JSON to .env.local |
| "Unauthorized" | Add custom claim `{"admin": true}` to user |
| Login fails | Verify user exists, check password |
| Queries fail | Create all collections, check security rules |
| API 403 errors | Verify admin custom claim is set |

---

## Production Deployment

```bash
# 1. Deploy to Vercel
git push origin master

# 2. Add to Vercel Environment Variables
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
FIREBASE_ADMIN_SDK_JSON=...
NEXTAUTH_SECRET=...

# 3. Add custom domain
https://admin.yourdomain.com

# 4. Test production
# Login at https://yourdomain.com/login
```

---

## Important Notes

- ⚠️ Never commit .env.local to git
- ⚠️ Keep service account key secret
- ⚠️ Use strong admin passwords
- ⚠️ Review Firestore security rules before production
- ✅ Test all features before deploying
- ✅ Enable 2FA on Firebase account

---

## Next Steps

1. Follow FIREBASE_SETUP_GUIDE.md for detailed instructions
2. Use FIREBASE_SETUP_CHECKLIST.md to track progress
3. Test all admin features
4. Deploy to Vercel when ready

---

**Total time to production: ~35 minutes**
