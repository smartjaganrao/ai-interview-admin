# Firebase Setup Checklist

Quick reference checklist for setting up Firebase for the Admin Panel.

---

## ☐ Step 1: Firebase Project Setup
- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Project name: "AI Interview Helper Admin"
- [ ] Wait for project setup to complete
- [ ] Save project ID (you'll need it)

---

## ☐ Step 2: Authentication Setup
- [ ] Enable Email/Password authentication
- [ ] Create test admin user:
  - Email: `admin@test.com`
  - Password: `Test123456!` (or your own strong password)
- [ ] Copy the user's UID

---

## ☐ Step 3: Set Custom Claims
- [ ] Go to Authentication → Users
- [ ] Click on `admin@test.com`
- [ ] Click pencil icon on "Custom claims"
- [ ] Add:
  ```json
  {
    "admin": true,
    "role": "super-admin"
  }
  ```
- [ ] Click Save
- [ ] Verify custom claims appear

---

## ☐ Step 4: Firestore Database
- [ ] Create Firestore database
- [ ] Choose nearest region
- [ ] Start in test mode
- [ ] Wait for database creation

---

## ☐ Step 5: Create Collections
- [ ] Create `users` collection with first document
  - Email: `admin@test.com`
  - Name: `Admin User`
  - Plan: `pro`
  - CreatedAt: timestamp
- [ ] Create `subscriptions` collection with document
  - Doc ID: (admin user's UID)
  - Plan: `pro`
  - Status: `active`
  - RenewalDate: future timestamp
- [ ] Create empty collections:
  - [ ] `admin_logs`
  - [ ] `interview_sessions`
  - [ ] `interview_messages`
  - [ ] `support_tickets`
  - [ ] `usage_tracking`

---

## ☐ Step 6: Firestore Security Rules
- [ ] Go to Firestore → Rules tab
- [ ] Replace all content with provided security rules
- [ ] Click Publish

---

## ☐ Step 7: Get Credentials
- [ ] Go to Project Settings (gear icon)
- [ ] Click "Your apps" → Web app
- [ ] Copy firebaseConfig:
  - [ ] NEXT_PUBLIC_FIREBASE_API_KEY
  - [ ] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  - [ ] NEXT_PUBLIC_FIREBASE_PROJECT_ID
  - [ ] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  - [ ] NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  - [ ] NEXT_PUBLIC_FIREBASE_APP_ID
- [ ] Click "Service accounts" tab
- [ ] Generate new private key
- [ ] Copy entire JSON content

---

## ☐ Step 8: Environment Variables
- [ ] Open `.env.local` in admin panel directory
- [ ] Add all NEXT_PUBLIC_* variables from Step 7
- [ ] Add FIREBASE_ADMIN_SDK_JSON (entire JSON as string)
- [ ] Generate NEXTAUTH_SECRET:
  ```bash
  openssl rand -base64 32
  ```
- [ ] Add NEXTAUTH_SECRET to .env.local

**Example .env.local:**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=myproject.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=myproject
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=myproject.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc...
FIREBASE_ADMIN_SDK_JSON={"type":"service_account",...}
NEXTAUTH_SECRET=your_random_base64_string
```

---

## ☐ Step 9: Test Connection
- [ ] Restart dev server: `npm run dev`
- [ ] Test health endpoint:
  ```bash
  curl http://localhost:3000/api/health
  ```
- [ ] Verify success response

---

## ☐ Step 10: Test Admin Login
- [ ] Open http://localhost:3000/login
- [ ] Login with:
  - Email: `admin@test.com`
  - Password: `Test123456!`
- [ ] Click Sign in
- [ ] Verify redirect to dashboard
- [ ] Verify email shown in top-right

---

## ☐ Step 11: Test Admin Features
- [ ] Navigate to Users page
  - [ ] See test user listed
  - [ ] Try upgrading user plan
  - [ ] Verify success message
- [ ] Navigate to Analytics page
  - [ ] KPI cards display
  - [ ] Charts render
  - [ ] Filters work
- [ ] Navigate to Audit Logs
  - [ ] See your plan upgrade logged
  - [ ] Try CSV export
  - [ ] Filters work
- [ ] Navigate to Moderation
  - [ ] Page loads
  - [ ] Filters work
- [ ] Navigate to Support
  - [ ] Page loads
  - [ ] Filters work
- [ ] Navigate to Settings
  - [ ] Admins page loads
  - [ ] API Keys page loads
  - [ ] Organization page loads
  - [ ] Try saving settings

---

## ☐ Optional: Create Additional Test Data
- [ ] Create another user (`user@test.com`)
- [ ] Create subscription for that user
- [ ] Create interview session data
- [ ] Create support ticket
- [ ] Create admin log entry

---

## ☐ Production Setup (Later)
- [ ] Deploy admin panel to Vercel
- [ ] Add environment variables to Vercel
- [ ] Test production login
- [ ] Create production admin accounts
- [ ] Set up monitoring
- [ ] Enable audit logging
- [ ] Configure backups

---

## Quick Troubleshooting

### "Firebase not configured"
- Check FIREBASE_ADMIN_SDK_JSON is in .env.local
- Verify JSON is valid
- Restart dev server

### "Unauthorized - not an admin"
- Verify custom claim {"admin": true} is set
- Check in Firebase Console under user's Custom claims

### "Login fails"
- Verify user exists in Firebase Authentication
- Check email is correct
- Verify password is correct

### "Firestore queries fail"
- Create missing collections
- Check Firestore security rules
- Verify custom claims are set

---

## Environment Variables Reference

| Variable | Source | Example |
|----------|--------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | firebaseConfig | `AIzaSyD...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | firebaseConfig | `myproject.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | firebaseConfig | `myproject-12345` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | firebaseConfig | `myproject.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | firebaseConfig | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | firebaseConfig | `1:123:web:abc...` |
| `FIREBASE_ADMIN_SDK_JSON` | Service Account Key | `{"type":"service_account",...}` |
| `NEXTAUTH_SECRET` | Generated | `base64_string` |

---

## Estimated Time

- Firebase project setup: 5 minutes
- Authentication setup: 5 minutes
- Firestore setup: 10 minutes
- Environment variables: 5 minutes
- Testing: 10 minutes

**Total: ~35 minutes**

---

**When you complete all steps, you'll have a fully functional admin panel with:**
- ✅ Secure admin authentication
- ✅ User management
- ✅ Analytics dashboard
- ✅ Audit logging
- ✅ Support tickets
- ✅ Settings management
