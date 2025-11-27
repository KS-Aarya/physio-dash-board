# How to Add Employee Data to Firestore

Since authentication is currently disabled, here's how to add employees directly to Firestore.

## Option 1: Add Employee via Firebase Console (Easiest)

1. **Open Firebase Console**
   - Go to [https://console.firebase.google.com](https://console.firebase.google.com)
   - Select your project: **centerforsportsandscience**
   - Click **"Build"** → **"Firestore Database"**

2. **Create the `staff` collection (if it doesn't exist)**
   - Click **"Start collection"** (or use existing if already created)
   - Collection ID: `staff`
   - Click **"Next"**

3. **Add an Employee Document**
   - Leave Document ID as **Auto-generate** (or set a custom ID)
   - Click **"Auto-generate"** to let Firestore create an ID
   - Click **"Next"**

4. **Add Required Fields**
   - Click **"Add field"** for each field below:

   | Field Name | Type | Value | Required |
   |------------|------|-------|----------|
   | `userName` | string | "John Doe" | ✅ Yes |
   | `userEmail` | string | "john.doe@clinic.com" | ✅ Yes |
   | `role` | string | One of: `FrontDesk`, `ClinicalTeam`, `Physiotherapist`, `StrengthAndConditioning`, `Admin` | ✅ Yes |
   | `status` | string | `Active` or `Inactive` | ✅ Yes |
   | `createdAt` | timestamp | Click timestamp icon, leave as current time | ✅ Recommended |

5. **Save the Document**
   - Click **"Save"**
   - The employee will now appear in the Admin Dashboard!

## Option 2: Use the Admin Dashboard (If Firestore Rules Allow)

1. **Ensure Firestore Rules Allow Writes**
   - Go to Firestore Database → **"Rules"** tab
   - Make sure rules allow writes (for development):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;  // Allow all for development
       }
     }
   }
   ```
   - Click **"Publish"**

2. **Try Adding via Admin Dashboard**
   - Navigate to Admin Dashboard → Employee Management
   - Click **"Add New Employee"**
   - Fill in the form
   - If it fails, check browser console for errors

## Sample Employee Data

Here are example employees you can create:

### Front Desk Employee
```
userName: "Jane Smith"
userEmail: "jane.smith@clinic.com"
role: "FrontDesk"
status: "Active"
createdAt: [Current timestamp]
```

### Clinical Team Member
```
userName: "Dr. Sarah Johnson"
userEmail: "sarah.johnson@clinic.com"
role: "ClinicalTeam"
status: "Active"
createdAt: [Current timestamp]
```

### Physiotherapist
```
userName: "Dr. Michael Chen"
userEmail: "michael.chen@clinic.com"
role: "Physiotherapist"
status: "Active"
createdAt: [Current timestamp]
```

### Strength & Conditioning
```
userName: "James Wilson"
userEmail: "james.wilson@clinic.com"
role: "StrengthAndConditioning"
status: "Active"
createdAt: [Current timestamp]
```

## Troubleshooting

### Error: "Missing or insufficient permissions"
- **Solution**: Update Firestore rules to allow writes (see Option 2, step 1)

### Error: "Collection does not exist"
- **Solution**: Create the `staff` collection manually in Firebase Console

### Employee not showing in dashboard
- Check that all required fields are present (`userName`, `userEmail`, `role`, `status`)
- Verify the `role` field matches exactly: `FrontDesk`, `ClinicalTeam`, `Physiotherapist`, `StrengthAndConditioning`, or `Admin`
- Refresh the browser page

### Browser console shows Firestore errors
- Make sure Firestore database is created and active
- Check that `lib/firebase.ts` is using the default database
- Restart the dev server: `npm run dev`

## Next Steps

After adding employees:
1. They will appear in Admin Dashboard → Employee Management
2. You can edit their details by clicking "Edit" in the table
3. You can view full profiles by clicking "View profile"

