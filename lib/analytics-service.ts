import { collection, query, where, getDocs, orderBy, type Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface PatientAnalytics {
	summary: string;
	trend_analysis: string;
	key_achievements: string[];
	recommendation: string;
}

interface ReportVersionData {
	patientId: string;
	version: number;
	createdAt: string | Timestamp;
	reportData?: {
		vasScale?: number | string;
		rom?: string;
		diagnosis?: string;
		treatmentProvided?: string;
		treatmentDone?: string;
		[key: string]: any;
	};
	[key: string]: any;
}

/**
 * Fetches patient analytics by:
 * 1. Querying Firestore 'reportVersions' collection for the given patientId
 * 2. Sorting them chronologically (by createdAt or version)
 * 3. Extracting relevant fields (painRating, rom, diagnosis, treatmentDone, createdAt)
 * 4. Sending the sorted history to the analyze-patient API endpoint
 * 5. Returning the parsed analytics report
 */
export async function fetchPatientAnalytics(patientId: string): Promise<PatientAnalytics> {
	if (!patientId) {
		throw new Error('Patient ID is required');
	}

	// Step 1: Query Firestore for reportVersions
	const reportVersionsRef = collection(db, 'reportVersions');
	
	// Try to query with orderBy, fallback to simple query if field doesn't exist
	let versionsSnapshot;
	try {
		// Try ordering by createdAt first (most common)
		const versionsQuery = query(
			reportVersionsRef,
			where('patientId', '==', patientId),
			orderBy('createdAt', 'asc') // Ascending to get chronological order
		);
		versionsSnapshot = await getDocs(versionsQuery);
	} catch (error: any) {
		// If orderBy fails (e.g., no index), try ordering by version
		if (error?.code === 'failed-precondition') {
			try {
				console.warn('Firestore index missing for createdAt, trying version field');
				const versionsQuery = query(
					reportVersionsRef,
					where('patientId', '==', patientId),
					orderBy('version', 'asc')
				);
				versionsSnapshot = await getDocs(versionsQuery);
			} catch (versionError: any) {
				// If that also fails, query without orderBy and sort in JavaScript
				if (versionError?.code === 'failed-precondition') {
					console.warn('Firestore index missing for version field, querying without orderBy and sorting client-side');
					const versionsQuery = query(
						reportVersionsRef,
						where('patientId', '==', patientId)
					);
					versionsSnapshot = await getDocs(versionsQuery);
				} else {
					throw versionError;
				}
			}
		} else {
			throw error;
		}
	}
	
	// Step 2: Convert Firestore documents to plain objects and extract relevant fields
	const reportHistory = versionsSnapshot.docs.map(doc => {
		const data = doc.data() as ReportVersionData;
		const reportData = data.reportData || data.data || {};
		
		// Handle Firestore Timestamp conversion
		let createdAt: string;
		if (data.createdAt) {
			if (typeof data.createdAt === 'object' && 'toDate' in data.createdAt) {
				createdAt = (data.createdAt as Timestamp).toDate().toISOString();
			} else if (typeof data.createdAt === 'string') {
				createdAt = data.createdAt;
			} else {
				createdAt = new Date().toISOString();
			}
		} else {
			createdAt = new Date().toISOString();
		}
		
		// Extract only relevant fields to keep payload small
		return {
			version: data.version || 0,
			createdAt,
			// Extract pain-related fields (vasScale is common field name)
			painRating: reportData.vasScale ?? reportData.painScale ?? reportData.painRating ?? null,
			rom: reportData.rom ?? reportData.rangeOfMotion ?? null,
			diagnosis: reportData.diagnosis ?? reportData.clinicalDiagnosis ?? null,
			treatmentDone: reportData.treatmentProvided ?? reportData.treatmentDone ?? reportData.treatment ?? null,
		};
	});

	// Step 3: Sort chronologically if we couldn't use Firestore orderBy
	if (reportHistory.length > 0) {
		// Check if already sorted (if Firestore orderBy worked)
		const isSorted = reportHistory.every((item, index) => {
			if (index === 0) return true;
			const prevDate = new Date(reportHistory[index - 1].createdAt).getTime();
			const currDate = new Date(item.createdAt).getTime();
			return prevDate <= currDate;
		});

		if (!isSorted) {
			// Sort by createdAt, then by version as fallback
			reportHistory.sort((a, b) => {
				const dateA = new Date(a.createdAt).getTime();
				const dateB = new Date(b.createdAt).getTime();
				if (dateA !== dateB) {
					return dateA - dateB;
				}
				return (a.version || 0) - (b.version || 0);
			});
		}
	}

	if (reportHistory.length === 0) {
		throw new Error('No report versions found for this patient');
	}

	// Step 3.5: Limit to latest 5 reports to reduce token usage
	// Since reports are sorted chronologically (oldest to newest), take the last 5
	const latestReports = reportHistory.slice(-5);
	
	if (reportHistory.length > 5) {
		console.log(`Limiting analysis to latest ${latestReports.length} of ${reportHistory.length} reports to optimize token usage`);
	}

	// Step 4: Send only the latest 5 reports to the analyze-patient API
	const response = await fetch('/api/analyze-patient', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			reportHistory: latestReports,
		}),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
		throw new Error(errorData.message || `API request failed with status ${response.status}`);
	}

	const result = await response.json();

	if (!result.success || !result.data) {
		throw new Error(result.message || 'Failed to get analytics from API');
	}

	// Step 5: Return the parsed analytics
	return result.data as PatientAnalytics;
}
