# Quick Setup Guide - Fix Authentication Error

## Problem
You're getting `auth/configuration-not-found` error because the Firebase configuration doesn't match your new Firebase project.

## Solution - 3 Steps

### Step 1: Get Your New Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your **new project**
3. Click **⚙️ Settings** → **Project settings**
4. Scroll to **Your apps** section
5. If you don't have a web app:
   - Click **"Add app"** → Select **Web** (</> icon)
   - Register with nickname: "CenterSportsScience Web"
   - Click **"Register app"**
6. **Copy these values** from the config object:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
   - `measurementId` (optional)

### Step 2: Update lib/firebase.ts

Open `lib/firebase.ts` and replace the values in the `firebaseConfig` object (lines 10-17) with your new values:

```typescript
const firebaseConfig = {
	apiKey: "YOUR_NEW_API_KEY",
	authDomain: "your-project.firebaseapp.com",
	projectId: "your-project-id",
	storageBucket: "your-project.appspot.com",
	messagingSenderId: "123456789",
	appId: "1:123456789:web:abcdef",
	measurementId: "G-XXXXXXXXXX"
};
```

Also update the `DATABASE_ID` constant (line 23) if your database has a different name:
```typescript
const DATABASE_ID = '(default)'; // or 'your-database-id'
```

### Step 3: Enable Authentication

1. In Firebase Console → **Authentication**
2. Click **"Get started"** if needed
3. Go to **Sign-in method** tab
4. Click on **Email/Password**
5. Toggle **Enable** to ON
6. Click **Save**

### Step 4: Update Environment Variables (Optional - for Admin SDK)

If you want to use the admin user creation script:

1. Create `.env.local` file in project root
2. Add:
   ```env
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ```
   (Get service account key from Firebase Console → Project Settings → Service Accounts)

### Step 5: Restart Development Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

## Verify It Works

1. Open browser console (F12)
2. You should see: `✅ Firebase initialized` with your project details
3. Try logging in - the error should be gone!

## Still Having Issues?

Check:
- ✅ Firebase configuration values are correct in `lib/firebase.ts`
- ✅ Authentication is enabled in Firebase Console
- ✅ Database ID matches your Firestore database name
- ✅ Development server was restarted after changes

