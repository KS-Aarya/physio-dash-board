/**
 * Billing utilities for cycle management and billing operations
 */

import type { Firestore } from 'firebase/firestore';

export interface BillingCycle {
	id: string;
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD
	month: number; // 1-12
	year: number;
	status: 'active' | 'closed' | 'pending';
	createdAt: string;
	closedAt?: string;
}

/**
 * Get current billing cycle (month)
 */
export function getCurrentBillingCycle(): { month: number; year: number; startDate: string; endDate: string } {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1; // 1-12
	
	// First day of current month
	const startDate = new Date(year, month - 1, 1);
	// Last day of current month
	const endDate = new Date(year, month, 0);
	
	return {
		month,
		year,
		startDate: formatDate(startDate),
		endDate: formatDate(endDate),
	};
}

/**
 * Get billing cycle for a specific date
 */
export function getBillingCycleForDate(date: Date | string): { month: number; year: number; startDate: string; endDate: string } {
	const d = typeof date === 'string' ? new Date(date) : date;
	const year = d.getFullYear();
	const month = d.getMonth() + 1;
	
	const startDate = new Date(year, month - 1, 1);
	const endDate = new Date(year, month, 0);
	
	return {
		month,
		year,
		startDate: formatDate(startDate),
		endDate: formatDate(endDate),
	};
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Get billing cycle ID (format: YYYY-MM)
 */
export function getBillingCycleId(month?: number, year?: number): string {
	const now = new Date();
	const m = month ?? now.getMonth() + 1;
	const y = year ?? now.getFullYear();
	return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * Check if a date is within a billing cycle
 */
export function isDateInBillingCycle(date: Date | string, cycleStart: string, cycleEnd: string): boolean {
	const d = typeof date === 'string' ? new Date(date) : date;
	const start = new Date(cycleStart);
	const end = new Date(cycleEnd);
	end.setHours(23, 59, 59, 999); // Include entire end date
	return d >= start && d <= end;
}

/**
 * Get previous billing cycle
 */
export function getPreviousBillingCycle(): { month: number; year: number; startDate: string; endDate: string } {
	const now = new Date();
	const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
	const month = now.getMonth() === 0 ? 12 : now.getMonth();
	
	const startDate = new Date(year, month - 1, 1);
	const endDate = new Date(year, month, 0);
	
	return {
		month,
		year,
		startDate: formatDate(startDate),
		endDate: formatDate(endDate),
	};
}

/**
 * Get next billing cycle
 */
export function getNextBillingCycle(): { month: number; year: number; startDate: string; endDate: string } {
	const now = new Date();
	const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
	const month = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
	
	const startDate = new Date(year, month - 1, 1);
	const endDate = new Date(year, month, 0);
	
	return {
		month,
		year,
		startDate: formatDate(startDate),
		endDate: formatDate(endDate),
	};
}

/**
 * Get month name from number
 */
export function getMonthName(month: number): string {
	const months = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];
	return months[month - 1] || '';
}

/**
 * Recalculate and update the total amount for a billing cycle
 * This function queries all billing records within the cycle date range
 * and sums up the amounts of completed records, then updates the cycle document
 */
export async function updateCycleTotalAmount(
	db: Firestore,
	cycleId: string,
	cycleStartDate: string,
	cycleEndDate: string
): Promise<void> {
	try {
		const { collection, query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');
		
		// Query all billing records within the cycle date range
		const billingQuery = query(
			collection(db, 'billing'),
			where('date', '>=', cycleStartDate),
			where('date', '<=', cycleEndDate)
		);
		
		const billingSnapshot = await getDocs(billingQuery);
		
		// Calculate total from completed billing records
		let totalAmount = 0;
		billingSnapshot.docs.forEach(docSnap => {
			const data = docSnap.data();
			if (data.status === 'Completed' && data.amount) {
				totalAmount += Number(data.amount) || 0;
			}
		});
		
		// Update the cycle document with the calculated total
		const cycleRef = doc(db, 'billingCycles', cycleId);
		await updateDoc(cycleRef, {
			totalAmount: Number(totalAmount.toFixed(2)),
			updatedAt: new Date().toISOString(),
		});
	} catch (error) {
		console.error(`Failed to update cycle total for cycle ${cycleId}:`, error);
		// Don't throw - allow the billing operation to complete even if cycle update fails
	}
}

/**
 * Update cycle total amount for a specific date
 * Determines which cycle the date belongs to and updates that cycle's total
 */
export async function updateCycleTotalForDate(
	db: Firestore,
	billingDate: string
): Promise<void> {
	try {
		const cycle = getBillingCycleForDate(billingDate);
		const cycleId = getBillingCycleId(cycle.month, cycle.year);
		
		// Find the cycle document
		const { collection, query, where, getDocs, addDoc, serverTimestamp } = await import('firebase/firestore');
		const cyclesQuery = query(
			collection(db, 'billingCycles'),
			where('month', '==', cycle.month),
			where('year', '==', cycle.year)
		);
		
		const cyclesSnapshot = await getDocs(cyclesQuery);
		if (!cyclesSnapshot.empty) {
			const cycleDoc = cyclesSnapshot.docs[0];
			await updateCycleTotalAmount(db, cycleDoc.id, cycle.startDate, cycle.endDate);
		} else {
			// Cycle doesn't exist yet, create it
			const cycleRef = await addDoc(collection(db, 'billingCycles'), {
				id: cycleId,
				startDate: cycle.startDate,
				endDate: cycle.endDate,
				month: cycle.month,
				year: cycle.year,
				status: 'active',
				totalAmount: 0,
				createdAt: serverTimestamp(),
			});
			// Calculate and update the totalAmount after creating the cycle
			await updateCycleTotalAmount(db, cycleRef.id, cycle.startDate, cycle.endDate);
		}
	} catch (error) {
		console.error(`Failed to update cycle total for date ${billingDate}:`, error);
	}
}
