import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
// Get these values from Firebase Console → Project Settings → Your apps → Web app
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// TODO: Update these values with your new Firebase project configuration
const firebaseConfig = {
	apiKey: "AIzaSyC-3_3wcTHRkkU_LDIT0dlOXudMaLkLNe8", // Replace with your new API key
	authDomain: "centerforsportsandscience.firebaseapp.com", // Replace with your new auth domain
	projectId: "centerforsportsandscience", // Replace with your new project ID
	storageBucket: "centerforsportsandscience.firebasestorage.app", // Replace with your new storage bucket
	messagingSenderId: "600654016382", // Replace with your new messaging sender ID
	appId: "1:600654016382:web:cf9b3f9a119094856bcd2f", // Replace with your new app ID
	measurementId: "G-5Q8GF58QCG" // Replace with your new measurement ID (optional)
};

// Database ID for Firestore
// Using the default database - if you need a named database, set this to your database ID
// For most projects, you can use the default database by omitting the parameter or using '(default)'
const DATABASE_ID = '(default)'; // Using default database

// Initialize Firebase
let app;
try {
	app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
	
	// Validate configuration
	if (!app) {
		throw new Error('Failed to initialize Firebase app');
	}
	
	// Log configuration in development
	if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
		console.log('✅ Firebase initialized:', {
			projectId: firebaseConfig.projectId,
			authDomain: firebaseConfig.authDomain,
			databaseId: DATABASE_ID
		});
	}
} catch (error) {
	console.error('❌ Firebase initialization error:', error);
	throw error;
}

// Initialize Analytics (only in browser environment)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
	try {
		analytics = getAnalytics(app);
	} catch (error) {
		// Analytics may fail if already initialized or in certain environments
		console.warn('Firebase Analytics initialization failed:', error);
	}
}

// Initialize Auth - ensure it's initialized with the correct app
let auth;
try {
	auth = getAuth(app);
	if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
		console.log('✅ Firebase Auth initialized');
		console.log('   Auth Domain:', firebaseConfig.authDomain);
		console.log('   Project ID:', firebaseConfig.projectId);
	}
} catch (error: any) {
	console.error('❌ Firebase Auth initialization error:', error);
	if (error?.code === 'auth/configuration-not-found' || error?.message?.includes('configuration')) {
		console.error('\n⚠️  Firebase Authentication Configuration Error!');
		console.error('   This usually means:');
		console.error('   1. The Firebase project configuration is incorrect');
		console.error('   2. Authentication is not enabled in Firebase Console');
		console.error('   3. The auth domain does not match your project');
		console.error('\n   Please check:');
		console.error('   - Firebase Console → Authentication → Sign-in method (enable Email/Password)');
		console.error('   - Update lib/firebase.ts with your correct Firebase configuration');
		console.error('   - Verify the projectId and authDomain match your Firebase project');
	}
	throw error;
}

// Initialize Firestore with default database
let db;
try {
	// Use default database - if you have a named database, uncomment and set DATABASE_ID
	db = getFirestore(app); // Using default database
	// db = getFirestore(app, DATABASE_ID); // Use this if you have a named database
	if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
		console.log('✅ Firebase Firestore initialized with default database');
	}
} catch (error) {
	console.error('❌ Firebase Firestore initialization error:', error);
	throw error;
}

export { auth, db, analytics };

