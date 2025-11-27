/**
 * Script to create an admin user in Firebase
 * Run with: node scripts/create-admin-user.js
 * 
 * This script creates:
 * 1. Firebase Auth user with email and password
 * 2. Firestore profile in the 'users' collection with Admin role
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const isStaging = process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging';
const DEFAULT_PROJECT_ID = 'centerforsportsandscience';
const DEFAULT_DATABASE_ID = 'sixs-physio';

const getAdminEnv = (key) => {
	const stagingKey = `FIREBASE_ADMIN_STAGING_${key}`;
	const prodKey = `FIREBASE_ADMIN_${key}`;
	const stagingVal = process.env[stagingKey];
	const prodVal = process.env[prodKey];
	return isStaging ? stagingVal || prodVal : prodVal || stagingVal;
};

const resolveProjectId = (serviceAccountProjectId) => {
	const stagingId =
		process.env.NEXT_PUBLIC_FIREBASE_STAGING_PROJECT_ID ||
		process.env.FIREBASE_STAGING_PROJECT_ID;
	const prodId =
		process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

	return (
		(isStaging ? stagingId ?? prodId : prodId ?? stagingId) ||
		serviceAccountProjectId ||
		DEFAULT_PROJECT_ID
	);
};

const resolveDatabaseId = () => {
	const stagingId =
		process.env.FIREBASE_STAGING_DATABASE_ID ||
		process.env.NEXT_PUBLIC_FIREBASE_STAGING_DATABASE_ID;
	const prodId =
		process.env.FIREBASE_DATABASE_ID || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID;
	const rawId = isStaging ? stagingId ?? prodId : prodId ?? stagingId;

	const candidate = rawId || DEFAULT_DATABASE_ID;
	if (!candidate || candidate === '(default)' || candidate.toLowerCase() === 'default') {
		return undefined;
	}
	return candidate;
};

// Admin user credentials
const ADMIN_USER = {
	email: 'admincss@test.com',
	password: 'admin123',
	displayName: 'Admin User',
	role: 'Admin'
};

const buildServiceAccountFromFragments = () => {
	const projectId = getAdminEnv('PROJECT_ID');
	const clientEmail = getAdminEnv('CLIENT_EMAIL');
	const privateKey = getAdminEnv('PRIVATE_KEY');

	if (!projectId || !clientEmail || !privateKey) {
		return null;
	}

	const normalizedKey = privateKey.replace(/\\n/g, '\n').replace(/\\r/g, '\r');

	return {
		type: 'service_account',
		project_id: projectId,
		private_key: normalizedKey,
		private_key_id: getAdminEnv('PRIVATE_KEY_ID') || 'auto-generated-key',
		client_email: clientEmail,
		client_id: getAdminEnv('CLIENT_ID'),
		auth_uri: 'https://accounts.google.com/o/oauth2/auth',
		token_uri: 'https://oauth2.googleapis.com/token',
		auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
		client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
	};
};

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
	// Check if already initialized
	if (getApps().length > 0) {
		return getApps()[0];
	}

	// Try to load service account credentials
	let serviceAccountKey = null;

	// Method 0: Build from FIREBASE_ADMIN_* fragments
	const fragmentKey = buildServiceAccountFromFragments();
	if (fragmentKey) {
		serviceAccountKey = fragmentKey;
		console.log('✅ Built service account from FIREBASE_ADMIN_* variables');
	}

	// Method 1: Try from environment variable
	if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
		try {
			let keyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
			// Remove surrounding quotes if present
			if ((keyString.startsWith("'") && keyString.endsWith("'")) || 
			    (keyString.startsWith('"') && keyString.endsWith('"'))) {
				keyString = keyString.slice(1, -1);
			}
			serviceAccountKey = JSON.parse(keyString);
			console.log('✅ Loaded service account from FIREBASE_SERVICE_ACCOUNT_KEY');
		} catch (error) {
			console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error.message);
		}
	}

	// Method 2: Try from file path
	if (!serviceAccountKey) {
		const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
			join(process.cwd(), 'firebase-service-account.json');
		
		if (existsSync(credentialsPath)) {
			try {
				serviceAccountKey = JSON.parse(readFileSync(credentialsPath, 'utf8'));
				console.log('✅ Loaded service account from file:', credentialsPath);
			} catch (error) {
				console.error('❌ Failed to read service account file:', error.message);
			}
		}
	}

	if (!serviceAccountKey) {
		throw new Error(
			'Firebase Admin SDK credentials not found.\n' +
			'Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable or\n' +
			'GOOGLE_APPLICATION_CREDENTIALS pointing to your service account JSON file.\n' +
			'See FIREBASE_ADMIN_SETUP.md for instructions.'
		);
	}

	// Get project ID from config or service account
	const projectId = resolveProjectId(serviceAccountKey.project_id);

	return initializeApp({
		credential: cert(serviceAccountKey),
		projectId: projectId,
	});
}

async function createAdminUser() {
	console.log('🚀 Creating admin user...\n');
	console.log('Email:', ADMIN_USER.email);
	console.log('Role:', ADMIN_USER.role);
	console.log('');

	try {
		// Initialize Firebase Admin
		const app = initializeFirebaseAdmin();
		const auth = getAuth(app);
		const databaseId = resolveDatabaseId();
		const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

		// Check if user already exists
		let userRecord;
		let isNewUser = false;

		try {
			userRecord = await auth.getUserByEmail(ADMIN_USER.email);
			console.log('⚠️  User already exists with email:', ADMIN_USER.email);
			console.log('   Updating user...');
			
			// Update existing user
			userRecord = await auth.updateUser(userRecord.uid, {
				displayName: ADMIN_USER.displayName,
				password: ADMIN_USER.password,
				disabled: false,
			});
		} catch (getUserError) {
			if (getUserError.code === 'auth/user-not-found') {
				// Create new user
				console.log('📝 Creating new user...');
				userRecord = await auth.createUser({
					email: ADMIN_USER.email,
					password: ADMIN_USER.password,
					displayName: ADMIN_USER.displayName,
					disabled: false,
				});
				isNewUser = true;
				console.log('✅ User created successfully!');
			} else {
				throw getUserError;
			}
		}

		// Set custom claims (role)
		console.log('🔐 Setting custom claims (role)...');
		await auth.setCustomUserClaims(userRecord.uid, { role: ADMIN_USER.role });
		console.log('✅ Custom claims set');

		// Create/update Firestore profile
		console.log('💾 Creating/updating Firestore profile...');
		const userProfileData = {
			email: ADMIN_USER.email,
			displayName: ADMIN_USER.displayName,
			userName: ADMIN_USER.displayName,
			role: ADMIN_USER.role,
			status: 'Active',
			updatedAt: new Date().toISOString(),
		};

		if (isNewUser) {
			userProfileData.createdAt = new Date().toISOString();
		}

		await db.collection('users').doc(userRecord.uid).set(userProfileData, { merge: true });
		console.log('✅ Firestore profile created/updated');

		console.log('\n✨ Success! Admin user is ready to use.');
		console.log('\n📋 User Details:');
		console.log('   UID:', userRecord.uid);
		console.log('   Email:', ADMIN_USER.email);
		console.log('   Password:', ADMIN_USER.password);
		console.log('   Role:', ADMIN_USER.role);
		console.log('   Status: Active');
		console.log('\n🔑 You can now log in with:');
		console.log('   Email: admincss@test.com');
		console.log('   Password: admin123');

	} catch (error) {
		console.error('\n❌ Error creating admin user:', error.message);
		if (error.code) {
			console.error('   Error code:', error.code);
		}
		if (error.stack) {
			console.error('\nStack trace:');
			console.error(error.stack);
		}
		process.exit(1);
	}
}

// Run the script
createAdminUser()
	.then(() => {
		console.log('\n✅ Script completed successfully!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Script failed:', error);
		process.exit(1);
	});

