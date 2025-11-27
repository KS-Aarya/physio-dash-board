# Quick Fix: Unable to Save Employee Data

## The Problem
Your Firestore security rules require authentication, but authentication is currently disabled. This blocks all writes.

## Solution: Update Firestore Rules (2 minutes)

### Step 1: Open Firebase Console
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Select your project: **centerforsportsandscience**
3. Click **"Build"** → **"Firestore Database"**

### Step 2: Update Rules
1. Click on the **"Rules"** tab at the top
2. **Delete all existing rules** and replace with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ⚠ DEVELOPMENT ONLY - Allows all reads/writes
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"** button (top right)
4. Wait for "Rules published successfully" message

### Step 3: Try Again
1. Go back to your Admin Dashboard
2. Try adding the employee again
3. It should work now!

## Why This Happened

Your current rules require authentication:
```javascript
allow read, write: if request.auth != null;
```

Since authentication is disabled, `request.auth` is always `null`, so writes are blocked.

The new rules allow all reads/writes for development (only use this for local development, not production!).

## Still Not Working?

1. **Check browser console (F12)**
   - Look for red error messages
   - Copy any error messages you see

2. **Verify Firestore is active**
   - Firebase Console → Firestore Database
   - You should see your database listed
   - If not, create it first

3. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

4. **Restart dev server**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

