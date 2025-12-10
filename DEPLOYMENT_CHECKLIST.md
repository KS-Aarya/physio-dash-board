# Pre-Deployment Checklist

## ✅ Build Verification
- [x] Build completes successfully (`npm run build`)
- [x] No TypeScript errors
- [x] Firebase Admin SDK initialization fixed (no "already exists" errors)

## 🔐 Required Environment Variables (Vercel)

### Firebase Client Configuration (Production)
Add these in Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sixs-physio
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIREBASE_DATABASE_ID=(default)
```

### Firebase Admin SDK Configuration
**Choose ONE of these methods:**

**Option 1: Service Account Key as JSON String (Recommended for Vercel)**
```
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"sixs-physio",...}'
```
- Get from: Firebase Console → Project Settings → Service Accounts → Generate new private key
- Copy entire JSON as a single-line string
- Wrap in single quotes in Vercel

**Option 2: Service Account Key Fragments**
```
FIREBASE_ADMIN_PROJECT_ID=sixs-physio
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@sixs-physio.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Optional Services
```
# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# SMS/WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Error Tracking (Sentry)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=clancy-mendonca
SENTRY_PROJECT=centerforsportsscience
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

## 🔥 Firebase Setup

### 1. Firestore Security Rules
- [ ] Deploy Firestore rules to Firebase Console
- [ ] Go to: Firebase Console → Firestore Database → Rules
- [ ] Copy contents from `firestore.rules` in your project
- [ ] Publish rules

### 2. Firestore Indexes
- [ ] Check for any missing index errors during deployment
- [ ] Create required indexes in Firebase Console if prompted

### 3. Authentication
- [ ] Email/Password authentication enabled in Firebase Console
- [ ] Password reset email template configured (if using custom domain)

## 📦 Build Configuration (Vercel)

### Framework Preset
- ✅ Next.js (auto-detected)

### Build Settings
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (Next.js default)
- **Install Command**: `npm install` (default)

### Root Directory
- ✅ `./` (project root)

## 🚀 Deployment Steps

1. **Push to Git Repository**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Import your Git repository
   - Vercel will auto-detect Next.js

3. **Add Environment Variables**
   - Go to: Project Settings → Environment Variables
   - Add all required variables listed above
   - **Important**: Set for Production, Preview, and Development environments as needed

4. **Deploy**
   - Click "Deploy" or push to trigger automatic deployment
   - Monitor build logs for any errors

5. **Post-Deployment Verification**
   - [ ] Test login functionality
   - [ ] Verify Firebase Admin SDK operations (user creation, etc.)
   - [ ] Check API routes are working
   - [ ] Verify Firestore read/write permissions
   - [ ] Test email/SMS notifications (if configured)

## ⚠️ Important Notes

1. **Never commit sensitive files:**
   - ✅ `.env*` files are in `.gitignore`
   - ✅ `firebase-service-account.json` is in `.gitignore`
   - ✅ Service account keys should only be in Vercel environment variables

2. **Firebase Admin SDK:**
   - ✅ Fixed initialization to prevent "already exists" errors
   - ✅ Will reuse existing app instance during build

3. **Cron Jobs:**
   - ✅ Configured in `vercel.json` for `/api/reminders`
   - Runs daily at 9 AM UTC

4. **Sentry Integration:**
   - ✅ Configured in `next.config.ts`
   - Requires `SENTRY_AUTH_TOKEN` for source map uploads

## 🔍 Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Verify Firebase project ID matches in all configs
- Check build logs for specific errors

### Firebase Admin SDK Errors
- Ensure `FIREBASE_SERVICE_ACCOUNT_KEY` or fragments are set
- Verify project ID matches: `sixs-physio`
- Check service account has proper permissions

### Runtime Errors
- Check browser console for client-side errors
- Check Vercel function logs for server-side errors
- Verify Firestore rules are deployed

## 📝 Quick Reference

**Project ID**: `sixs-physio`  
**Framework**: Next.js 16.0.1  
**Node Version**: Check Vercel settings (recommend 18+)
