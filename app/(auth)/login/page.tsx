'use client';

import Link from 'next/link';

const dashboards = [
	{ label: 'Admin Dashboard', href: '/admin', description: 'User management, reports, and system configuration.' },
	{ label: 'Front Desk', href: '/frontdesk', description: 'Patient intake, appointments, and billing tools.' },
	{ label: 'Clinical Team', href: '/clinical-team', description: 'Assessments, treatment plans, and therapist workflow.' },
];

export default function LoginPage() {
	return (
		<div className="flex min-h-svh items-center justify-center bg-gray-50 px-4 py-10">
			<div className="w-full max-w-lg">
				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<h2 className="mb-2 text-center text-xl font-semibold text-gray-900">Choose a dashboard</h2>
					<p className="mb-6 text-center text-sm text-gray-600">
						Authentication has been disabled for this environment. Pick a dashboard to explore the app.
					</p>
					<div className="space-y-4">
						{dashboards.map(item => (
							<Link
								key={item.href}
								href={item.href}
								className="block rounded-lg border border-gray-200 px-4 py-3 transition hover:border-gray-300 hover:bg-gray-50"
							>
								<p className="text-sm font-semibold text-gray-900">{item.label}</p>
								<p className="text-sm text-gray-600">{item.description}</p>
							</Link>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

