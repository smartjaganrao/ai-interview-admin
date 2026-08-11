# Netlify environment variables for ai-interview-admin
# Copy these into Netlify Site settings > Environment variables
# Replace placeholder values with your real production values

# ------------------------------
# Public variables (exposed to browser)
# ------------------------------
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ai-interview-tutor.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ai-interview-tutor
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ai-interview-tutor.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=475876914174
NEXT_PUBLIC_FIREBASE_APP_ID=1:475876914174:web:caceda87b97359476546af
NODE_VERSION=20

# ------------------------------
# Secret variables (server-only)
# ------------------------------
FIREBASE_ADMIN_SDK_JSON={"type":"service_account","project_id":"ai-interview-tutor",...}
NEXTAUTH_SECRET=shKXVjhFvqYYvKCE//Gqc4QY5Y8Yd89eKzhkvu0Kw2Y=
SETUP_SECRET=...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=JavihAI <noreply@javihai.in>
