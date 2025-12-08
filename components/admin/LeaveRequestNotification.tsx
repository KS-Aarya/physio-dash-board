'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, getDocs, type QuerySnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface LeaveRequest {
	id: string;
	userId: string;
	userEmail: string | null;
	userName: string;
	userRole: string;
	leaveType: string;
	startDate: string;
	endDate: string;
	numberOfDays: number;
	reasons: string;
	status: 'pending' | 'approved' | 'disapproved';
	approvalRequestedToEmail: string | null;
	createdAt: any;
}

interface ToastNotification {
	id: string;
	message: string;
	leaveRequestId: string;
}

export default function LeaveRequestNotification({ onNavigateToLeave }: { onNavigateToLeave?: () => void }) {
	const { user } = useAuth();
	const [pendingCount, setPendingCount] = useState(0);
	const [toasts, setToasts] = useState<ToastNotification[]>([]);
	const previousRequestIds = useRef<Set<string>>(new Set());
	const hasInitialized = useRef(false);

	// Load pending leave requests and listen for new ones
	useEffect(() => {
		if (!user?.email) return;

		const adminEmail = user.email.toLowerCase();

		// Query for pending leave requests assigned to this admin
		const unsubscribe = onSnapshot(
			query(collection(db, 'leaveRequests'), where('status', '==', 'pending')),
			(snapshot: QuerySnapshot) => {
				const requests: LeaveRequest[] = [];
				const currentRequestIds = new Set<string>();

				snapshot.forEach(docSnap => {
					const data = docSnap.data();
					const requestEmail = (data.approvalRequestedToEmail || '').toLowerCase();
					
					// Only count requests where this admin was requested for approval
					if (requestEmail === adminEmail && requestEmail !== '') {
						const requestId = docSnap.id;
						currentRequestIds.add(requestId);

						requests.push({
							id: requestId,
							userId: data.userId || '',
							userEmail: data.userEmail || null,
							userName: data.userName || 'Unknown',
							userRole: data.userRole || '',
							leaveType: data.leaveType || '',
							startDate: data.startDate || '',
							endDate: data.endDate || '',
							numberOfDays: data.numberOfDays || 0,
							reasons: data.reasons || '',
							status: data.status || 'pending',
							approvalRequestedToEmail: data.approvalRequestedToEmail || null,
							createdAt: data.createdAt,
						});
					}
				});

				// Update pending count
				setPendingCount(requests.length);

				// Show toast for new requests (only after initial load)
				if (hasInitialized.current) {
					// Find new requests that weren't in the previous set
					// This works even if previousRequestIds was empty (initial load had 0 requests)
					const newRequests = requests.filter(req => !previousRequestIds.current.has(req.id));
					
					if (newRequests.length > 0) {
						newRequests.forEach(request => {
							const formatDate = (dateStr: string) => {
								if (!dateStr) return '';
								try {
									const date = new Date(dateStr);
									return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
								} catch {
									return dateStr;
								}
							};

							const toast: ToastNotification = {
								id: `${request.id}-${Date.now()}`,
								message: `New leave request from ${request.userName}: ${request.leaveType} from ${formatDate(request.startDate)} to ${formatDate(request.endDate)}`,
								leaveRequestId: request.id,
							};

							setToasts(prev => [...prev, toast]);

							// Auto-remove toast after 8 seconds
							setTimeout(() => {
								setToasts(prev => prev.filter(t => t.id !== toast.id));
							}, 8000);
						});
					}
				}

				// Update previous request IDs
				previousRequestIds.current = currentRequestIds;
				hasInitialized.current = true;
			},
			error => {
				console.error('Failed to load leave requests:', error);
			}
		);

		return () => unsubscribe();
	}, [user]);

	// Remove toast manually
	const removeToast = (toastId: string) => {
		setToasts(prev => prev.filter(t => t.id !== toastId));
	};

	// Handle clicking on toast to navigate to leave management
	const handleToastClick = (toast: ToastNotification) => {
		if (onNavigateToLeave) {
			onNavigateToLeave();
		}
		removeToast(toast.id);
	};

	return (
		<>
			{/* Notification Badge */}
			{pendingCount > 0 && (
				<button
					type="button"
					onClick={onNavigateToLeave}
					className="fixed top-4 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 animate-pulse"
					title="Click to view pending leave requests"
				>
					<i className="fas fa-bell text-white text-sm" aria-hidden="true" />
					<span className="text-white font-semibold text-sm">
						{pendingCount} {pendingCount === 1 ? 'Request' : 'Requests'} Pending
					</span>
				</button>
			)}

			{/* Toast Notifications */}
			<div className="fixed top-20 right-4 z-50 space-y-3">
				{toasts.map((toast, index) => (
					<div
						key={toast.id}
						className="flex items-start gap-3 rounded-lg bg-white border-2 border-yellow-200 shadow-2xl px-4 py-3 min-w-[320px] max-w-[400px] cursor-pointer hover:shadow-3xl transition-all duration-300"
						style={{
							animation: 'slideIn 0.3s ease-out',
							animationFillMode: 'both',
						}}
						onClick={() => handleToastClick(toast)}
					>
						<div className="flex-shrink-0 mt-0.5">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-400">
								<i className="fas fa-calendar-times text-white text-lg" aria-hidden="true" />
							</div>
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center justify-between mb-1">
								<h4 className="text-sm font-semibold text-slate-900">New Leave Request</h4>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										removeToast(toast.id);
									}}
									className="text-slate-400 hover:text-slate-600 transition-colors"
									aria-label="Close notification"
								>
									<i className="fas fa-times text-xs" aria-hidden="true" />
								</button>
							</div>
							<p className="text-xs text-slate-600 line-clamp-2">{toast.message}</p>
							<p className="text-xs text-blue-600 font-medium mt-1">Click to view →</p>
						</div>
					</div>
				))}
			</div>
		</>
	);
}