# Firebase Setup Guide for Admin Panel

Complete step-by-step guide to configure Firebase for the Super Admin Panel.

---

## Prerequisites

- Google account
- Firebase project (create at https://console.firebase.google.com)
- Node.js and npm installed
- Admin panel cloned and ready

---

## Step 1: Create Firebase Project

### 1.1 Go to Firebase Console
```
https://console.firebase.google.com
```

### 1.2 Create New Project
1. Click **"Create a project"**
2. Enter project name: `AI Interview Helper Admin`
3. Enable Google Analytics (optional)
4. Click **"Create project"**

### 1.3 Wait for Project Setup
- Firebase will set up your project (takes ~1 minute)
- Click **"Continue"** when ready

---

## Step 2: Set Up Authentication

### 2.1 Enable Email/Password Authentication
1. Go to **Authentication** (left sidebar)
2. Click **"Get started"**
3. Click **"Email/Password"** provider
4. Toggle **"Enable"**
5. Toggle **"Email link (passwordless sign-in)"** OFF (we'll use password)
6. Click **"Save"**

### 2.2 Create Test Admin User
1. Click **"Users"** tab
2. Click **"Add user"**
3. Enter:
   - Email: `admin@test.com`
   - Password: `Test123456!` (strong password)
4. Click **"Add user"**
5. Copy the **UID** (you'll need this for custom claims)

---

## Step 3: Set Custom Admin Claim

### 3.1 Go to Custom Claims
1. In Authentication → **Users** tab
2. Click on the user you just created (`admin@test.com`)
3. Scroll to **Custom claims**
4. Click the **pencil icon** to edit
5. Paste this JSON:
```json
{
  "admin": true,
  "role": "super-admin"
}
```
6. Click **"Save"**

### 3.2 Verify Custom Claims
- You should see the custom claims JSON displayed
- If you see an error, check your JSON formatting

---

## Step 4: Create Firestore Database

### 4.1 Enable Firestore
1. Go to **Firestore Database** (left sidebar)
2. Click **"Create database"**
3. Choose location:
   - Select your closest region (e.g., `us-east1`)
4. Choose security rules:
   - Select **"Start in test mode"** (we'll update rules later)
5. Click **"Create"**

### 4.2 Wait for Database Creation
- Firestore will create your database (takes ~1 minute)
- You'll see an empty database when ready

---

## Step 5: Create Firestore Collections

### 5.1 Create "users" Collection
1. Click **"Start collection"**
2. Collection ID: `users`
3. Auto ID for first document: click **"Auto ID"**
4. Add these fields:
   ```
   email: string → admin@test.com
   name: string → Admin User
   plan: string → pro
   createdAt: number → (current timestamp)
   ```
5. Click **"Save"**

### 5.2 Create "subscriptions" Collection
1. Click **"Start collection"**
2. Collection ID: `subscriptions`
3. Document ID: (use same UID from Step 2.2)
4. Add these fields:
   ```
   plan: string → pro
   status: string → active
   renewalDate: number → (Date.now() + 30 days)
   startedAt: number → (current timestamp)
   ```
5. Click **"Save"**

### 5.3 Create Other Required Collections

Create empty collections (we'll add documents via API):
- `admin_logs` - For audit trail
- `interview_sessions` - For user sessions
- `interview_messages` - For Q&A
- `support_tickets` - For support system
- `usage_tracking` - For usage metrics

**To create empty collections:**
1. Click **"Start collection"**
2. Enter collection name
3. Click **"Next"**
4. Click **"Start a collection"** (skip adding first document)

---

## Step 6: Set Up Firestore Security Rules

### 6.1 Go to Security Rules
1. In Firestore Database → **"Rules"** tab
2. Replace all content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Admin-only access to sensitive collections
    match /admin_logs/{logId} {
      allow read, write: if request.auth.token.admin == true;
    }
    
    match /support_tickets/{ticketId} {
      allow read: if request.auth.uid == resource.data.userId || 
                     request.auth.token.admin == true;
      allow create: if request.auth != null;
      allow update: if request.auth.token.admin == true;
    }
    
    // User data access
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid || 
                            request.auth.token.admin == true;
    }
    
    match /subscriptions/{uid} {
      allow read: if request.auth.uid == uid || 
                     request.auth.token.admin == true;
      allow write: if request.auth.token.admin == true;
    }
    
    // Interview data
    match /interview_sessions/{sessionId} {
      allow read, write: if request.auth != null;
    }
    
    match /interview_messages/{messageId} {
      allow read, write: if request.auth != null;
    }
    
    match /usage_tracking/{userId} {
      allow read: if request.auth.uid == userId || 
                     request.auth.token.admin == true;
      allow write: if request.auth.uid == userId || 
                      request.auth.token.admin == true;
    }
  }
}
```

3. Click **"Publish"**

---

## Step 7: Get Firebase Credentials

### 7.1 Get Web Config
1. Go to **Project settings** (gear icon, top right)
2. Click **"Your apps"** section
3. Look for web app (if not created, click web icon `</>`):
   - App nickname: `Admin Panel`
   - Click **"Register app"**
4. Copy the config object (you'll see `firebaseConfig`)
5. Keep this open - you'll need these values

### 7.2 Get Service Account Key
1. Still in **Project settings**
2. Click **"Service accounts"** tab
3. Click **"Generate new private key"**
4. A JSON file will download
5. Open it and copy the entire JSON content

---

## Step 8: Configure Environment Variables

### 8.1 Create .env.local File
```bash
cd "D:\Jagan\Projects\AI Tutor\ai-interview-admin"
```

### 8.2 Edit .env.local
Open `.env.local` and add these values (from Step 7):

```
# From firebaseConfig (Step 7.1)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# From Service Account Key JSON (Step 7.2) - ENTIRE JSON AS STRING
FIREBASE_ADMIN_SDK_JSON={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}

# Generate this with: openssl rand -base64 32
NEXTAUTH_SECRET=your_random_secret_here
```

### 8.3 Generate NEXTAUTH_SECRET
Run this in PowerShell/Terminal:
```bash
# Windows PowerShell
$random = New-Object byte[] 32
[System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($random)
[Convert]::ToBase64String($random)

# Or use online tool: https://generate-random.org/encryption-key-generator
```

Copy the output and add to `.env.local`

---

## Step 9: Test Firebase Connection

### 9.1 Restart Dev Server
```bash
cd "D:\Jagan\Projects\AI Tutor\ai-interview-admin"
npm run dev
```

### 9.2 Check Health Endpoint
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "success",
  "message": "Firebase Admin SDK initialized successfully"
}
```

If you see error, check:
- Service account JSON is valid
- All environment variables are set
- Dev server restarted after adding env vars

---

## Step 10: Test Admin Login

### 10.1 Open Login Page
```
http://localhost:3000/login
```

### 10.2 Login with Test Admin
- Email: `admin@test.com`
- Password: `Test123456!`
- Click **"Sign in"**

### 10.3 Expected Result
- If successful: Redirects to `/dashboard`
- If failed: Shows error message

### 10.4 Troubleshoot Login Issues

**Error: "Firebase Admin SDK not configured"**
- ✅ FIREBASE_ADMIN_SDK_JSON not set in .env.local
- Solution: Add service account JSON

**Error: "User not found"**
- ✅ User doesn't have admin custom claim
- Solution: Re-do Step 3 to add custom claims

**Error: "Invalid email format"**
- ✅ Email not recognized by Firebase
- Solution: Use the exact email from Step 2.2

---

## Step 11: Verify Admin Features

### 11.1 After Successful Login
You should see:
- ✅ Dashboard with KPI cards
- ✅ Sidebar with all menu items
- ✅ TopNav with your email
- ✅ "Logout" button

### 11.2 Test Each Page
1. **Users** (`/users`) - Shows user list
2. **Analytics** (`/analytics`) - Shows charts
3. **Audit Logs** (`/audit`) - Shows admin logs
4. **Moderation** (`/moderation`) - Shows flagged content
5. **Support** (`/support`) - Shows tickets
6. **Settings** - Admin/API Keys/Organization pages

### 11.3 Test Each Feature
- **Users**: Try to upgrade a user plan
- **Analytics**: Check KPI cards load
- **Audit Logs**: Verify your plan upgrade appears in logs
- **Moderation**: See if any moderation data appears
- **Support**: Check if any tickets appear

---

## Step 12: Create Additional Test Users

### 12.1 Add Free Tier User
1. Go to Firebase Console → Authentication → **"Add user"**
2. Email: `user@test.com`
3. Password: `Test123456!`
4. Click **"Add user"**

### 12.2 Create Firestore User Document
1. Go to Firestore → `users` collection
2. Add new document:
   - Document ID: (same as user's UID from Firebase)
   - Fields:
     ```
     email: user@test.com
     name: Test User
     plan: free
     createdAt: (current timestamp)
     ```

### 12.3 Create Subscription
1. Go to `subscriptions` collection
2. Add new document:
   - Document ID: (same UID)
   - Fields:
     ```
     plan: free
     status: active
     renewalDate: (future date)
     ```

---

## Step 13: Verify Admin Panel Features

### 13.1 Check User Management
1. Go to `/users` page
2. Should see the test user you created
3. Click **"Upgrade to..."** dropdown
4. Select "Pro"
5. Verify audit log appears in `/audit`

### 13.2 Check Analytics
1. Go to `/analytics`
2. KPI cards should show:
   - Total Users: 2
   - Active This Week: (depends on sessions)
   - MRR: (depends on active subscriptions)

### 13.3 Check Audit Logs
1. Go to `/audit`
2. Should see your plan upgrade action logged
3. Try CSV export

---

## Troubleshooting Common Issues

### Issue: "Database not configured"
**Cause**: FIREBASE_ADMIN_SDK_JSON is missing or invalid  
**Solution**:
```bash
# Verify .env.local has FIREBASE_ADMIN_SDK_JSON
# Check that it's valid JSON (no missing quotes, brackets)
# Restart dev server: npm run dev
```

### Issue: "Unauthorized" on protected routes
**Cause**: User doesn't have admin custom claim  
**Solution**:
```bash
# Go to Firebase Console → Authentication → Users
# Click your user
# Add custom claim: {"admin": true}
```

### Issue: "Invalid token" when logging in
**Cause**: NEXTAUTH_SECRET is missing or wrong format  
**Solution**:
```bash
# Generate new secret: openssl rand -base64 32
# Add to .env.local: NEXTAUTH_SECRET=your_secret
# Restart dev server
```

### Issue: Firestore queries fail
**Cause**: Collection doesn't exist or security rules block access  
**Solution**:
```bash
# 1. Create missing collections in Firestore
# 2. Check security rules allow admin access
# 3. Verify custom claim is set: {"admin": true}
```

---

## Production Deployment

When deploying to Vercel:

### 1. Add Environment Variables
1. Go to Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all variables from .env.local:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `FIREBASE_ADMIN_SDK_JSON` (entire JSON as string)
   - `NEXTAUTH_SECRET`

### 2. Deploy
```bash
git push origin master
# Vercel auto-deploys
```

### 3. Verify Production
```
https://yourdomain.com/login
```

---

## Security Best Practices

✅ **Do:**
- [x] Use strong passwords for admin accounts
- [x] Store NEXTAUTH_SECRET securely
- [x] Keep service account key private
- [x] Review Firestore security rules
- [x] Enable 2FA on Firebase account
- [x] Regularly rotate service account keys
- [x] Monitor audit logs for suspicious activity

❌ **Don't:**
- [ ] Commit .env.local to git
- [ ] Share service account key
- [ ] Use test Firebase project in production
- [ ] Have overly permissive security rules
- [ ] Leave default test data in production
- [ ] Ignore audit logs

---

## Next Steps

After Firebase is set up:

1. **Invite Team Members**
   - Create additional admin users in Firebase
   - Set custom claims for each

2. **Configure Main App**
   - Point main AI Interview Helper app to same Firebase project
   - Set up Firestore sync

3. **Set Up Monitoring**
   - Enable Firebase Analytics
   - Set up Cloud Logging
   - Configure alerts

4. **Production Hardening**
   - Review and tighten Firestore rules
   - Set up backup strategy
   - Enable audit logging in Cloud Audit Logs

---

## Support & Resources

- **Firebase Docs**: https://firebase.google.com/docs
- **Firestore Security Rules**: https://firebase.google.com/docs/firestore/security/start
- **Custom Claims**: https://firebase.google.com/docs/auth/admin-sdk-setup
- **Next.js Firebase**: https://nextjs.org/learn/dashboard-app/setting-up-your-database

---

**Status**: Ready to set up Firebase! Follow the steps above in order.
