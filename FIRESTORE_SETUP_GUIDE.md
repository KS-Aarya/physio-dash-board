# Firestore Database Setup Guide

This guide will help you create and configure the Firestore database in Firebase Console.

## Step 1: Create Firestore Database

1. **Open Firebase Console**
   - Go to [https://console.firebase.google.com](https://console.firebase.google.com)
   - Select your project: **centerforsportsandscience**

2. **Create Firestore Database**
   - Click on **"Build"** → **"Firestore Database"** in the left sidebar
   - If you see "Create database" button, click it
   - If you already have a database, skip to Step 2

3. **Configure Database Settings**
   - Choose **"Start in test mode"** (for development - allows all reads/writes temporarily)
   - Click **"Next"**
   - Choose your **location** (select the closest region to you, e.g., `us-central`, `asia-south1`)
   - Click **"Enable"**

   ⚠️ **Important**: The code is now configured to use the **default database**. Don't create a named database - just use the default one that gets created automatically.

4. **Wait for Database Creation**
   - Firebase will take 1-2 minutes to create the database
   - You'll see a success message when it's ready

## Step 2: Set Up Firestore Security Rules (Temporary for Development)

1. **Go to Firestore Rules**
   - In Firestore Database page, click on **"Rules"** tab at the top

2. **Update Rules for Development**
   - Replace the rules with this (allows all access for development):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

3. **Publish Rules**
   - Click **"Publish"** button
   - Rules will be active immediately

   ⚠️ **Security Note**: These rules allow anyone to read/write. Use this ONLY for local development. For production, implement proper authentication-based rules.

## Step 3: Create Required Collections

You don't need to manually create collections - they will be created automatically when the app writes data to them. However, if you want to prepare the structure, here are the collections you can create:

### Core Collections (Create these first):

1. **users** - User profiles linked to Firebase Auth
2. **staff** - Employee/staff member records
3. **patients** - Patient records
4. **appointments** - Appointment bookings
5. **billing** - Billing records
6. **billingCycles** - Monthly billing cycles

### Additional Collections (Will be created automatically as needed):

7. **activities** - Staff activity logs
8. **notifications** - In-app notifications
9. **transferRequests** - Patient transfer requests
10. **transferHistory** - Transfer audit log
11. **sessionTransfers** - Session transfer records
12. **reportVersions** - Report version history
13. **strengthConditioningReports** - Detailed reports
14. **headerConfigs** - Header/logo configuration
15. **notificationPreferences** - User notification settings
16. **availabilityTemplates** - Availability templates
17. **appointmentTemplates** - Appointment templates

### To Create Collections Manually (Optional):

1. In Firestore Database, click **"Start collection"**
2. Enter collection ID (e.g., `users`)
3. Click **"Next"**
4. Add a test document (you can delete it later):
   - Document ID: `test`
   - Add a field: `test` → type `string` → value `test`
   - Click **"Save"**
5. The collection is now created (you can delete the test document)

## Step 4: Verify Database Connection

1. **Restart your development server**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Check browser console**
   - Open browser DevTools (F12)
   - Go to Console tab
   - You should see: `✅ Firebase Firestore initialized with default database`
   - No error messages about Firestore

3. **Test the app**
   - Navigate to any dashboard (Admin, Front Desk, Clinical Team)
   - The app should load without Firestore errors

## Step 5: Set Up Initial Data (Next Steps)

After the database is set up, you'll need to:

1. **Create Authentication Users** (see AUTHENTICATION_SETUP.md)
2. **Create users collection documents** (match Firebase Auth UIDs)
3. **Create staff collection documents**
4. **Seed test data** (optional)

## Troubleshooting

### Error: "Missing or insufficient permissions"
- **Solution**: Make sure Firestore rules are set to allow all access (see Step 2 above)
- Click "Publish" after updating rules

### Error: "Firestore internal assertion failed"
- **Solution**: The database might not exist or connection is bad
- Restart the dev server: `npm run dev`
- Clear browser cache and reload

### Error: "Database not found"
- **Solution**: Make sure you created the Firestore database (Step 1)
- Verify you're using the default database (not a named one)
- Check that `lib/firebase.ts` uses `getFirestore(app)` without a database ID

### Still having issues?
1. Check Firebase Console → Firestore Database - is the database visible?
2. Check browser console for specific error messages
3. Verify Firebase project configuration in `lib/firebase.ts` matches your Firebase Console

## Next: Set Up Collections with Initial Data

Once the database is working, proceed to create the collections with actual data. See `DATABASE_COLLECTIONS_GUIDE.md` for detailed collection structures.

