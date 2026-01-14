'use client';

import { useEffect, useState } from 'react';
import { fetchPatientAnalytics, type PatientAnalytics } from '@/lib/analytics-service';

interface AnalyticsModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId: string;
}

export default function AnalyticsModal({ isOpen, onClose, patientId }: AnalyticsModalProps) {
	const [analytics, setAnalytics] = useState<PatientAnalytics | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen && patientId) {
			loadAnalytics();
		} else {
			// Reset state when modal closes
			setAnalytics(null);
			setError(null);
			setLoading(false);
		}
	}, [isOpen, patientId]);

	const loadAnalytics = async () => {
		setLoading(true);
		setError(null);
		setAnalytics(null);

		try {
			const result = await fetchPatientAnalytics(patientId);
			setAnalytics(result);
		} catch (err: any) {
			console.error('Error loading analytics:', err);
			setError(err?.message || 'Failed to load patient analytics');
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Modal */}
			<div className="relative z-10 w-full max-w-3xl max-h-[90vh] mx-4 bg-white rounded-lg shadow-xl flex flex-col">
				{/* Header */}
				<header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
					<h2 className="text-xl font-semibold text-slate-900">Patient Recovery Analytics</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
						aria-label="Close"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</header>

				{/* Content */}
				<div className="flex-1 overflow-y-auto px-6 py-6">
					{loading && (
						<div className="flex flex-col items-center justify-center py-12">
							<div className="relative w-12 h-12 mb-4">
								<div className="absolute inset-0 border-4 border-slate-200 rounded-full" />
								<div className="absolute inset-0 border-4 border-sky-600 rounded-full border-t-transparent animate-spin" />
							</div>
							<p className="text-sm text-slate-600">Analyzing patient data...</p>
						</div>
					)}

					{error && (
						<div className="flex flex-col items-center justify-center py-12">
							<div className="rounded-full bg-rose-100 p-3 mb-4">
								<svg
									className="w-6 h-6 text-rose-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<p className="text-sm font-medium text-slate-900 mb-2">Error loading analytics</p>
							<p className="text-sm text-slate-600 mb-4 text-center max-w-md">{error}</p>
							<button
								type="button"
								onClick={loadAnalytics}
								className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition"
							>
								Retry
							</button>
						</div>
					)}

					{analytics && !loading && !error && (
						<div className="space-y-6">
							{/* Section 1: Progress Summary */}
							<section className="bg-slate-50 rounded-lg p-6">
								<h3 className="text-lg font-semibold text-slate-900 mb-3">Progress Summary</h3>
								<p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
									{analytics.summary}
								</p>
							</section>

							{/* Section 2: Trend Analysis */}
							<section>
								<h3 className="text-lg font-semibold text-slate-900 mb-3">Trend Analysis</h3>
								<div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
									<p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
										{analytics.trend_analysis}
									</p>
								</div>
							</section>

							{/* Section 3: Key Achievements */}
							{analytics.key_achievements && analytics.key_achievements.length > 0 && (
								<section>
									<h3 className="text-lg font-semibold text-slate-900 mb-3">Key Achievements</h3>
									<ul className="space-y-2">
										{analytics.key_achievements.map((achievement, index) => (
											<li key={index} className="flex items-start gap-3">
												<div className="flex-shrink-0 mt-0.5">
													<svg
														className="w-5 h-5 text-emerald-600"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M5 13l4 4L19 7"
														/>
													</svg>
												</div>
												<p className="text-sm text-slate-700 flex-1">{achievement}</p>
											</li>
										))}
									</ul>
								</section>
							)}

							{/* Section 4: Recommendations */}
							<section className="bg-sky-50 rounded-lg p-6 border border-sky-200">
								<div className="flex items-start gap-3">
									<div className="flex-shrink-0 mt-0.5">
										<svg
											className="w-5 h-5 text-sky-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</div>
									<div className="flex-1">
										<h3 className="text-lg font-semibold text-sky-900 mb-2">Recommendations</h3>
										<p className="text-sm text-sky-800 leading-relaxed whitespace-pre-wrap">
											{analytics.recommendation}
										</p>
									</div>
								</div>
							</section>
						</div>
					)}
				</div>

				{/* Footer */}
				<footer className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
					>
						Close
					</button>
				</footer>
			</div>
		</div>
	);
}
