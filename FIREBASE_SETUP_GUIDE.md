# Firebase Setup Guide - New Project

## Step 1: Get Your New Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your **new project**
3. Click the **⚙️ Settings** icon (gear icon) → **Project settings**
4. Scroll down to **Your apps** section
5. If you don't have a web app yet:
   - Click **"Add app"** → Select **Web** (</> icon)
   - Register your app with a nickname (e.g., "CenterSportsScience Web")
   - Click **"Register app"**
6. You'll see your Firebase configuration. It should look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};
```

## Step 2: Get Your Database ID

1. In Firebase Console, go to **Firestore Database**
2. If you haven't created a database yet:
   - Click **"Create database"**
   - Choose your location
   - Select **"Start in production mode"** (you can change rules later)
3. If you have multiple databases, you'll see them listed
4. The database ID is shown next to each database (usually `(default)` or a custom name like `css-2025`)

## Step 3: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"** if you haven't enabled it yet
3. Go to **Sign-in method** tab
4. Enable **Email/Password**:
   - Click on **Email/Password**
   - Toggle **Enable** to ON
   - Click **Save**

## Step 4: Update Your Code

Once you have the configuration values, update `lib/firebase.ts` with your new values.

## Step 5: Get Service Account Key (for Admin SDK)

1. In Firebase Console → **Project settings** → **Service accounts** tab
2. Click **"Generate new private key"**
3. Download the JSON file
4. Add it to your `.env.local` file (see `env.example` for format)

