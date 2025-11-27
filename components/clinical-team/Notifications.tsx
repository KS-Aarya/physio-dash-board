'use client';

import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/PageHeader';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export default function Notifications() {
	const { user } = useAuth();

	return (
		<div className="p-6">
			<PageHeader
				badge="Clinical Team"
				title="Notifications"
				description="Stay updated with appointments, reminders, and important updates for your patients and schedule."
			/>

			<div className="mt-6">
				<NotificationCenter
					userId={user?.uid || null}
					className=""
					emptyStateHint="You're all caught up! No notifications at the moment."
				/>
			</div>
		</div>
	);
}

