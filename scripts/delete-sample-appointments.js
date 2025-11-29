/**
 * Script to delete fake/sample appointments from Firestore
 * 
 * This script identifies and deletes sample appointments created by seed data:
 * - Appointments with notes containing "Sample" or "testing"
 * - Appointments with patient names from seed data
 * - Appointments with doctor names from seed data
 * 
 * Usage: node scripts/delete-sample-appointments.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
try {
  // Try to use service account from environment or default credentials
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Try to use default credentials (for Firebase CLI authenticated environments)
    admin.initializeApp();
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  console.error('\nPlease ensure you have Firebase Admin SDK credentials set up.');
  console.error('You can either:');
  console.error('1. Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
  console.error('2. Use Firebase CLI: firebase login:ci');
  console.error('3. Set GOOGLE_APPLICATION_CREDENTIALS to point to your service account JSON file');
  process.exit(1);
}

const db = admin.firestore();

// Sample patient names from seed data
const SAMPLE_PATIENT_NAMES = [
  'John Doe',
  'Jane Smith',
  'Robert Johnson',
  'Emily Williams',
  'Michael Brown',
  'Sarah Davis',
  'David Wilson',
  'Lisa Anderson',
];

// Sample doctor names from seed data
const SAMPLE_DOCTOR_NAMES = [
  'Dr. Smith',
  'Dr. Johnson',
  'Dr. Williams',
  'Dr. Brown',
  'Dr. Davis',
];

// Sample patient IDs pattern (PAT1000-PAT9999)
const SAMPLE_PATIENT_ID_PATTERN = /^PAT\d{4}$/;

async function deleteSampleAppointments() {
  try {
    console.log('🔍 Searching for sample appointments...\n');

    const appointmentsRef = db.collection('appointments');
    const snapshot = await appointmentsRef.get();

    if (snapshot.empty) {
      console.log('✅ No appointments found in database.');
      return;
    }

    const appointmentsToDelete = [];
    let checkedCount = 0;

    snapshot.forEach((doc) => {
      checkedCount++;
      const data = doc.data();
      let isSample = false;
      const reasons = [];

      // Check notes for "Sample" or "testing"
      if (data.notes) {
        const notesLower = String(data.notes).toLowerCase();
        if (notesLower.includes('sample') || notesLower.includes('testing')) {
          isSample = true;
          reasons.push('notes contain "sample" or "testing"');
        }
      }

      // Check patient name
      if (data.patient && SAMPLE_PATIENT_NAMES.includes(data.patient)) {
        isSample = true;
        reasons.push(`patient name "${data.patient}" is from seed data`);
      }

      // Check doctor name
      if (data.doctor && SAMPLE_DOCTOR_NAMES.includes(data.doctor)) {
        isSample = true;
        reasons.push(`doctor name "${data.doctor}" is from seed data`);
      }

      // Check patient ID pattern
      if (data.patientId && SAMPLE_PATIENT_ID_PATTERN.test(data.patientId)) {
        isSample = true;
        reasons.push(`patient ID "${data.patientId}" matches sample pattern`);
      }

      if (isSample) {
        appointmentsToDelete.push({
          id: doc.id,
          appointmentId: data.appointmentId || 'N/A',
          patient: data.patient || 'N/A',
          doctor: data.doctor || 'N/A',
          date: data.date || 'N/A',
          time: data.time || 'N/A',
          reasons: reasons,
        });
      }
    });

    console.log(`📊 Checked ${checkedCount} appointments`);
    console.log(`🎯 Found ${appointmentsToDelete.length} sample appointments to delete\n`);

    if (appointmentsToDelete.length === 0) {
      console.log('✅ No sample appointments found. Nothing to delete.');
      return;
    }

    // Show what will be deleted
    console.log('📋 Sample appointments to be deleted:');
    appointmentsToDelete.forEach((apt, index) => {
      console.log(`\n${index + 1}. ID: ${apt.id}`);
      console.log(`   Appointment ID: ${apt.appointmentId}`);
      console.log(`   Patient: ${apt.patient}`);
      console.log(`   Doctor: ${apt.doctor}`);
      console.log(`   Date: ${apt.date} ${apt.time}`);
      console.log(`   Reasons: ${apt.reasons.join(', ')}`);
    });

    // Delete appointments
    console.log(`\n🗑️  Deleting ${appointmentsToDelete.length} sample appointments...\n`);

    let deletedCount = 0;
    let errorCount = 0;

    for (const apt of appointmentsToDelete) {
      try {
        await appointmentsRef.doc(apt.id).delete();
        deletedCount++;
        console.log(`✅ Deleted: ${apt.appointmentId} (${apt.patient} - ${apt.doctor})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error deleting ${apt.id}:`, error.message);
      }
    }

    console.log(`\n✨ Deletion complete!`);
    console.log(`   ✅ Successfully deleted: ${deletedCount}`);
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount}`);
    }
  } catch (error) {
    console.error('❌ Error during deletion process:', error);
    process.exit(1);
  }
}

// Run the script
deleteSampleAppointments()
  .then(() => {
    console.log('\n✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

