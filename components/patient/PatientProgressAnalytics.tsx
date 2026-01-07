'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import StatsChart from '@/components/dashboard/StatsChart';
import type { PatientRecordFull } from '@/lib/types';

interface PatientProgressAnalyticsProps {
	patientId: string;
	patientName?: string;
}

interface ReportVersion {
	id: string;
	version: number;
	createdAt: string;
	createdBy: string;
	data: Partial<PatientRecordFull>;
}

interface SessionMetrics {
	sessionNumber: number;
	date: string;
	vasScale: number | null;
	painStatus: string | null;
	rom: string | null;
	romData: Record<string, any> | null;
	strength: string | null;
	mmtData: Record<string, any> | null;
	functionalAbility: string | null;
	compliance: string | null;
	treatmentProvided: string | null;
	progressNotes: string | null;
	cumulativeVasChange: number | null;
	cumulativeImprovementRate: number;
}

export default function PatientProgressAnalytics({ patientId, patientName }: PatientProgressAnalyticsProps) {
	const [reportVersions, setReportVersions] = useState<ReportVersion[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [patientInfo, setPatientInfo] = useState<{ totalSessions?: number; remainingSessions?: number } | null>(null);

	// Load patient info and report versions
	useEffect(() => {
		const loadData = async () => {
			if (!patientId) return;
			
			setLoading(true);
			setError(null);
			try {
				console.log(`Loading analytics for patient: ${patientId}`);
				
				// Load patient info for session tracking
				try {
					const patientQuery = query(
						collection(db, 'patients'),
						where('patientId', '==', patientId)
					);
					const patientSnapshot = await getDocs(patientQuery);
					
					if (!patientSnapshot.empty) {
						const patientData = patientSnapshot.docs[0].data();
						setPatientInfo({
							totalSessions: typeof patientData.totalSessionsRequired === 'number' 
								? patientData.totalSessionsRequired 
								: undefined,
							remainingSessions: typeof patientData.remainingSessions === 'number' 
								? patientData.remainingSessions 
								: undefined,
						});
					}
				} catch (patientError) {
					console.warn('Failed to load patient info:', patientError);
				}
				
				// Load report versions
				const physioQuery = query(
					collection(db, 'reportVersions'),
					where('patientId', '==', patientId)
				);
				const physioSnapshot = await getDocs(physioQuery);
				
				console.log(`Found ${physioSnapshot.docs.length} report versions`);
				
				const versions: ReportVersion[] = physioSnapshot.docs.map(doc => {
					const data = doc.data();
					const createdAt = (data.createdAt as Timestamp | undefined)?.toDate?.();
					
					const reportData = data.reportData || data.data || data;
					
					return {
						id: doc.id,
						version: (data.version as number) || 0,
						createdAt: createdAt ? createdAt.toISOString() : new Date().toISOString(),
						createdBy: (data.createdBy as string) || (data.createdById as string) || 'Unknown',
						data: (reportData as Partial<PatientRecordFull>) || {},
					};
				});
				
				// Sort by version number (ascending), then by createdAt as fallback
				versions.sort((a, b) => {
					if (a.version !== b.version) {
						return a.version - b.version;
					}
					return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
				});
				
				// If no report versions found, try to get current report data from patients collection
				if (versions.length === 0) {
					console.log(`No report versions found. Fetching current report data...`);
					try {
						const patientQuery = query(
							collection(db, 'patients'),
							where('patientId', '==', patientId)
						);
						const patientSnapshot = await getDocs(patientQuery);
						
						if (!patientSnapshot.empty) {
							const patientDoc = patientSnapshot.docs[0];
							const patientData = patientDoc.data() as Partial<PatientRecordFull>;
							
							const hasReportData = patientData.vasScale || 
								patientData.complaints || 
								patientData.currentPainStatus || 
								patientData.rom || 
								patientData.mmt;
							
							if (hasReportData) {
								const currentVersion: ReportVersion = {
									id: patientDoc.id,
									version: 1,
									createdAt: new Date().toISOString(),
									createdBy: 'Current Report',
									data: patientData,
								};
								
								versions.push(currentVersion);
								console.log('Added current report data as version 1');
							}
						}
					} catch (patientError) {
						console.warn('Failed to fetch current report from patients collection:', patientError);
					}
				}
				
				setReportVersions(versions);
				setError(null);
				
				if (versions.length === 0) {
					console.warn(`No report data found for patient ${patientId}`);
				}
			} catch (error: any) {
				console.error('Error loading report versions:', error);
				
				if (error?.code === 'permission-denied') {
					const errorMsg = 'Permission denied: You do not have access to view report versions. Please contact your administrator.';
					setError(errorMsg);
				} else if (error?.code === 'failed-precondition') {
					setError('Database index required. Please contact your administrator to create the required index.');
				} else {
					setError(`Failed to load progress data: ${error?.message || 'Unknown error'}`);
				}
				
				setReportVersions([]);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, [patientId]);

	// Helper to extract numeric value from string
	const extractNumeric = (value: string | number | null | undefined): number | null => {
		if (typeof value === 'number') return value;
		if (!value) return null;
		const num = parseFloat(String(value).replace(/[^\d.]/g, ''));
		return !isNaN(num) ? num : null;
	};

	// Helper to format ROM data for display
	const formatRomData = (romData: Record<string, any> | null | undefined): string => {
		if (!romData || typeof romData !== 'object') return '';
		
		const joints = Object.keys(romData);
		if (joints.length === 0) return '';
		
		// Count joints with data
		const jointsWithData = joints.filter(joint => {
			const jointData = romData[joint];
			return jointData && typeof jointData === 'object' && Object.keys(jointData).length > 0;
		});
		
		if (jointsWithData.length === 0) return '';
		return `${jointsWithData.length} joint${jointsWithData.length !== 1 ? 's' : ''} assessed`;
	};

	// Helper to format MMT data for display
	const formatMmtData = (mmtData: Record<string, any> | null | undefined): string => {
		if (!mmtData || typeof mmtData !== 'object') return '';
		
		const muscles = Object.keys(mmtData);
		if (muscles.length === 0) return '';
		
		// Count muscles with data
		const musclesWithData = muscles.filter(muscle => {
			const muscleData = mmtData[muscle];
			return muscleData && (muscleData.grade || muscleData.left || muscleData.right);
		});
		
		if (musclesWithData.length === 0) return '';
		return `${musclesWithData.length} muscle${musclesWithData.length !== 1 ? 's' : ''} tested`;
	};

	// Calculate session-by-session metrics
	const sessionMetrics = useMemo((): SessionMetrics[] => {
		if (reportVersions.length === 0) return [];

		const firstVas = reportVersions[0] ? extractNumeric(reportVersions[0].data.vasScale) : null;
		
		return reportVersions.map((version, index) => {
			const vas = extractNumeric(version.data.vasScale);
			const vasChange = firstVas !== null && vas !== null ? firstVas - vas : null;
			
			// Calculate cumulative improvement rate
			const sessionsWithImprovement = reportVersions
				.slice(0, index + 1)
				.filter(v => v.data.currentPainStatus === 'Improved').length;
			const cumulativeImprovementRate = ((sessionsWithImprovement / (index + 1)) * 100);

			// Extract ROM and MMT data
			const romData = version.data.rom && typeof version.data.rom === 'object' 
				? version.data.rom as Record<string, any>
				: null;
			const mmtData = version.data.mmt && typeof version.data.mmt === 'object'
				? version.data.mmt as Record<string, any>
				: null;

			return {
				sessionNumber: version.version || index + 1,
				date: new Date(version.createdAt).toLocaleDateString('en-IN', { 
					day: 'numeric', 
					month: 'short', 
					year: 'numeric' 
				}),
				vasScale: vas,
				painStatus: version.data.currentPainStatus || null,
				rom: version.data.currentRom || formatRomData(romData),
				romData: romData,
				strength: version.data.currentStrength || formatMmtData(mmtData),
				mmtData: mmtData,
				functionalAbility: version.data.currentFunctionalAbility || null,
				compliance: version.data.complianceWithHEP || null,
				treatmentProvided: version.data.treatmentProvided || null,
				progressNotes: version.data.progressNotes || null,
				cumulativeVasChange: vasChange,
				cumulativeImprovementRate: Math.round(cumulativeImprovementRate),
			};
		});
	}, [reportVersions]);

	// Calculate completion status
	const completionStatus = useMemo(() => {
		if (!patientInfo?.totalSessions) {
			return {
				completed: reportVersions.length,
				total: reportVersions.length,
				percentage: 100,
				remaining: 0,
			};
		}

		const completed = patientInfo.totalSessions - (patientInfo.remainingSessions || 0);
		const percentage = Math.round((completed / patientInfo.totalSessions) * 100);
		
		return {
			completed: Math.max(0, completed),
			total: patientInfo.totalSessions,
			percentage,
			remaining: Math.max(0, patientInfo.remainingSessions || 0),
		};
	}, [patientInfo, reportVersions.length]);

	// Generate comprehensive summary
	const comprehensiveSummary = useMemo(() => {
		if (reportVersions.length === 0) {
			return "No report data available for analysis.";
		}

		const summaries: string[] = [];
		const firstReport = reportVersions[0];
		const lastReport = reportVersions[reportVersions.length - 1];
		const totalSessions = reportVersions.length;

		// Session completion status
		if (patientInfo?.totalSessions) {
			const completed = completionStatus.completed;
			const total = completionStatus.total;
			summaries.push(`Treatment Progress: ${completed} of ${total} sessions completed (${completionStatus.percentage}%).`);
			
			if (completionStatus.remaining > 0) {
				summaries.push(`${completionStatus.remaining} session${completionStatus.remaining !== 1 ? 's' : ''} remaining.`);
			} else if (completionStatus.percentage === 100) {
				summaries.push(`All sessions have been completed.`);
			}
		} else {
			summaries.push(`This patient has ${totalSessions} session report${totalSessions !== 1 ? 's' : ''} recorded.`);
		}

		// VAS Scale Analysis
		const firstVas = firstReport ? extractNumeric(firstReport.data.vasScale) : null;
		const lastVas = lastReport ? extractNumeric(lastReport.data.vasScale) : null;
		const vasChange = (firstVas !== null && lastVas !== null) ? firstVas - lastVas : null;
		
		if (firstVas !== null && lastVas !== null && vasChange !== null) {
			const vasPercentChange = ((vasChange / firstVas) * 100).toFixed(1);
			
			if (vasChange > 2) {
				summaries.push(`Pain levels have shown significant improvement, decreasing from ${firstVas.toFixed(1)} to ${lastVas.toFixed(1)} on the VAS scale (${vasPercentChange}% reduction).`);
			} else if (vasChange > 0.5) {
				summaries.push(`Pain levels have improved, decreasing from ${firstVas.toFixed(1)} to ${lastVas.toFixed(1)} on the VAS scale (${vasPercentChange}% reduction).`);
			} else if (vasChange < -1) {
				summaries.push(`Pain levels have increased from ${firstVas.toFixed(1)} to ${lastVas.toFixed(1)} on the VAS scale, indicating a need for treatment plan review.`);
			} else if (Math.abs(vasChange) <= 0.5) {
				summaries.push(`Pain levels have remained relatively stable, with minimal change from ${firstVas.toFixed(1)} to ${lastVas.toFixed(1)} on the VAS scale.`);
			}
		}

		// Recovery trajectory
		const improvedSessions = reportVersions.filter(v => v.data.currentPainStatus === 'Improved').length;
		const worsenedSessions = reportVersions.filter(v => v.data.currentPainStatus === 'Worsened').length;
		
		if (improvedSessions > totalSessions * 0.6) {
			summaries.push(`Strong positive trajectory: ${improvedSessions} out of ${totalSessions} sessions show improvement.`);
		} else if (improvedSessions > totalSessions * 0.4) {
			summaries.push(`Moderate positive trajectory: ${improvedSessions} out of ${totalSessions} sessions show improvement.`);
		} else if (worsenedSessions > totalSessions * 0.3) {
			summaries.push(`Concerning trajectory: ${worsenedSessions} out of ${totalSessions} sessions show worsening, suggesting treatment adjustments may be necessary.`);
		}

		// Compliance Analysis
		const excellentCompliance = reportVersions.filter(v => v.data.complianceWithHEP === 'Excellent').length;
		const poorCompliance = reportVersions.filter(v => v.data.complianceWithHEP === 'Poor').length;
		
		if (excellentCompliance > totalSessions * 0.5) {
			summaries.push(`Excellent home exercise program compliance in ${excellentCompliance} out of ${totalSessions} sessions.`);
		} else if (poorCompliance > totalSessions * 0.3) {
			summaries.push(`Compliance concerns: ${poorCompliance} out of ${totalSessions} sessions indicate poor compliance with home exercises.`);
		}

		// Functional Ability Analysis
		const improvedFunctional = reportVersions.filter(v => v.data.currentFunctionalAbility === 'Improved').length;
		if (improvedFunctional > totalSessions * 0.5) {
			summaries.push(`Functional ability has improved in ${improvedFunctional} out of ${totalSessions} sessions.`);
		}

		// Treatment Duration
		if (totalSessions > 1) {
			const firstDate = new Date(firstReport.createdAt);
			const lastDate = new Date(lastReport.createdAt);
			const daysDiff = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
			const weeksDiff = Math.round(daysDiff / 7);
			
			if (weeksDiff > 0) {
				summaries.push(`Treatment duration: ${weeksDiff} week${weeksDiff !== 1 ? 's' : ''} (${daysDiff} days) across ${totalSessions} sessions.`);
			} else {
				summaries.push(`Treatment duration: ${daysDiff} day${daysDiff !== 1 ? 's' : ''} across ${totalSessions} sessions.`);
			}
		}

		return summaries.join(' ');
	}, [reportVersions, patientInfo, completionStatus]);

	// Chart 1: VAS Scale Over Time (Session-by-Session)
	const vasScaleData = useMemo(() => {
		const dataPoints = sessionMetrics
			.filter(s => s.vasScale !== null)
			.map(s => ({
				session: `Session ${s.sessionNumber}`,
				date: s.date,
				value: s.vasScale!,
			}));

		if (dataPoints.length === 0) return null;

		return {
			labels: dataPoints.map(d => d.session),
			datasets: [{
				label: 'Pain Level (VAS Scale 0-10)',
				data: dataPoints.map(d => d.value),
				borderColor: 'rgba(239, 68, 68, 0.8)',
				backgroundColor: 'rgba(239, 68, 68, 0.1)',
				borderWidth: 3,
				fill: true,
				tension: 0.4,
			}],
		};
	}, [sessionMetrics]);

	// Chart 2: Cumulative VAS Improvement
	const cumulativeVasData = useMemo(() => {
		const dataPoints = sessionMetrics
			.filter(s => s.cumulativeVasChange !== null)
			.map(s => ({
				session: `Session ${s.sessionNumber}`,
				value: s.cumulativeVasChange!,
			}));

		if (dataPoints.length === 0) return null;

		return {
			labels: dataPoints.map(d => d.session),
			datasets: [{
				label: 'Cumulative VAS Improvement',
				data: dataPoints.map(d => d.value),
				borderColor: 'rgba(16, 185, 129, 0.8)',
				backgroundColor: 'rgba(16, 185, 129, 0.1)',
				borderWidth: 3,
				fill: true,
				tension: 0.4,
			}],
		};
	}, [sessionMetrics]);

	// Chart 3: Recovery Trajectory (Pain Status Over Sessions)
	const recoveryTrajectoryData = useMemo(() => {
		const improved = sessionMetrics.filter(s => s.painStatus === 'Improved').length;
		const same = sessionMetrics.filter(s => s.painStatus === 'Same').length;
		const worsened = sessionMetrics.filter(s => s.painStatus === 'Worsened').length;

		if (improved === 0 && same === 0 && worsened === 0) return null;

		return {
			labels: ['Improved', 'Same', 'Worsened'],
			datasets: [{
				label: 'Sessions',
				data: [improved, same, worsened],
				backgroundColor: [
					'rgba(16, 185, 129, 0.85)',
					'rgba(251, 191, 36, 0.85)',
					'rgba(239, 68, 68, 0.85)',
				],
				borderColor: '#ffffff',
				borderWidth: 2,
			}],
		};
	}, [sessionMetrics]);

	// Chart 4: Compliance Trend
	const complianceTrendData = useMemo(() => {
		const excellent = sessionMetrics.filter(s => s.compliance === 'Excellent').length;
		const moderate = sessionMetrics.filter(s => s.compliance === 'Moderate').length;
		const poor = sessionMetrics.filter(s => s.compliance === 'Poor').length;

		if (excellent === 0 && moderate === 0 && poor === 0) return null;

		return {
			labels: ['Excellent', 'Moderate', 'Poor'],
			datasets: [{
				label: 'Sessions',
				data: [excellent, moderate, poor],
				backgroundColor: [
					'rgba(16, 185, 129, 0.7)',
					'rgba(251, 191, 36, 0.7)',
					'rgba(239, 68, 68, 0.7)',
				],
				borderColor: '#ffffff',
				borderWidth: 2,
			}],
		};
	}, [sessionMetrics]);

	// Chart 5: Session Completion Progress
	const completionProgressData = useMemo(() => {
		if (!patientInfo?.totalSessions) return null;

		return {
			labels: ['Completed', 'Remaining'],
			datasets: [{
				label: 'Sessions',
				data: [completionStatus.completed, completionStatus.remaining],
				backgroundColor: [
					'rgba(16, 185, 129, 0.7)',
					'rgba(148, 163, 184, 0.7)',
				],
				borderColor: '#ffffff',
				borderWidth: 2,
			}],
		};
	}, [patientInfo, completionStatus]);

	// Key Metrics
	const keyMetrics = useMemo(() => {
		const totalSessions = reportVersions.length;
		const firstReport = reportVersions[0];
		const lastReport = reportVersions[reportVersions.length - 1];
		
		const firstVas = firstReport ? extractNumeric(firstReport.data.vasScale) : null;
		const lastVas = lastReport ? extractNumeric(lastReport.data.vasScale) : null;
		const vasImprovement = (firstVas !== null && lastVas !== null) ? firstVas - lastVas : null;
		
		const improvedSessions = reportVersions.filter(v => v.data.currentPainStatus === 'Improved').length;
		const improvementRate = totalSessions > 0 ? (improvedSessions / totalSessions) * 100 : 0;

		// Calculate average VAS across all sessions
		const vasValues = reportVersions
			.map(v => extractNumeric(v.data.vasScale))
			.filter(v => v !== null) as number[];
		const averageVas = vasValues.length > 0 
			? vasValues.reduce((sum, val) => sum + val, 0) / vasValues.length 
			: null;

		// Calculate compliance rate
		const excellentCompliance = reportVersions.filter(v => v.data.complianceWithHEP === 'Excellent').length;
		const complianceRate = totalSessions > 0 ? (excellentCompliance / totalSessions) * 100 : 0;
		
		return {
			totalSessions,
			vasImprovement,
			improvementRate: Math.round(improvementRate),
			firstVas,
			lastVas,
			averageVas,
			complianceRate: Math.round(complianceRate),
			completionPercentage: completionStatus.percentage,
		};
	}, [reportVersions, completionStatus]);

	if (loading) {
		return (
			<div className="rounded-lg border border-slate-200 bg-white p-6">
				<div className="flex items-center justify-center py-8">
					<div className="text-slate-500">Loading progress data...</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-6">
				<div className="text-center py-8">
					<i className="fas fa-exclamation-triangle text-4xl text-red-400 mb-2" aria-hidden="true" />
					<p className="text-sm font-semibold text-red-700 mb-1">Error Loading Analytics</p>
					<p className="text-sm text-red-600">{error}</p>
				</div>
			</div>
		);
	}

	if (reportVersions.length === 0) {
		return (
			<div className="rounded-lg border border-slate-200 bg-white p-6">
				<div className="text-center py-8">
					<i className="fas fa-chart-line text-4xl text-slate-400 mb-2" aria-hidden="true" />
					<p className="text-sm text-slate-500">No report data available for progress tracking.</p>
					<p className="text-xs text-slate-400 mt-2">Reports will appear here once sessions are documented.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header Section */}
			<div className="rounded-lg border border-slate-200 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-6">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<h3 className="text-2xl font-bold text-slate-900 mb-1">
							Session Progress Analytics
							{patientName && <span className="text-lg font-normal text-slate-600 ml-2">for {patientName}</span>}
						</h3>
						<p className="text-sm text-slate-600 mt-1">
							Comprehensive session-by-session recovery tracking and cumulative progress analysis
						</p>
					</div>
					{patientInfo?.totalSessions && (
						<div className="text-right">
							<div className="text-3xl font-bold text-indigo-600">
								{completionStatus.completed}/{completionStatus.total}
							</div>
							<div className="text-xs text-slate-600 mt-1">Sessions Completed</div>
						</div>
					)}
				</div>

				{/* Session Completion Progress Bar */}
				{patientInfo?.totalSessions && (
					<div className="mt-4">
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium text-slate-700">Treatment Progress</span>
							<span className="text-sm font-semibold text-indigo-600">{completionStatus.percentage}%</span>
						</div>
						<div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
							<div
								className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500"
								style={{ width: `${completionStatus.percentage}%` }}
							/>
						</div>
						<div className="flex items-center justify-between mt-2 text-xs text-slate-500">
							<span>{completionStatus.completed} completed</span>
							<span>{completionStatus.remaining} remaining</span>
						</div>
					</div>
				)}
			</div>

			{/* Comprehensive Summary */}
			<div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
				<div className="flex items-start gap-3">
					<div className="flex-shrink-0 rounded-full bg-blue-100 p-2">
						<i className="fas fa-file-alt text-blue-600 text-lg" aria-hidden="true" />
					</div>
					<div className="flex-1">
						<h4 className="text-sm font-semibold text-blue-900 mb-2">Progress Summary</h4>
						<p className="text-sm leading-relaxed text-blue-800">{comprehensiveSummary}</p>
					</div>
				</div>
			</div>

			{/* Key Metrics Dashboard */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
				{/* Total Sessions */}
				<div className="rounded-lg border border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
					<p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total Sessions</p>
					<p className="text-2xl font-bold text-blue-900 mt-1">{keyMetrics.totalSessions}</p>
					{patientInfo?.totalSessions && (
						<p className="text-xs text-blue-600 mt-1">of {patientInfo.totalSessions} assigned</p>
					)}
				</div>

				{/* VAS Improvement */}
				<div className="rounded-lg border border-slate-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-4">
					<p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">VAS Improvement</p>
					<p className="text-2xl font-bold text-emerald-900 mt-1">
						{keyMetrics.vasImprovement !== null 
							? `${keyMetrics.vasImprovement > 0 ? '+' : ''}${keyMetrics.vasImprovement.toFixed(1)}`
							: '—'
						}
					</p>
					{keyMetrics.firstVas !== null && keyMetrics.lastVas !== null && (
						<p className="text-xs text-emerald-700 mt-1">
							{keyMetrics.firstVas.toFixed(1)} → {keyMetrics.lastVas.toFixed(1)}
						</p>
					)}
				</div>

				{/* Average VAS */}
				<div className="rounded-lg border border-slate-200 bg-gradient-to-br from-amber-50 to-amber-100 p-4">
					<p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Average VAS</p>
					<p className="text-2xl font-bold text-amber-900 mt-1">
						{keyMetrics.averageVas !== null ? keyMetrics.averageVas.toFixed(1) : '—'}
					</p>
					<p className="text-xs text-amber-700 mt-1">Across all sessions</p>
				</div>

				{/* Improvement Rate */}
				<div className="rounded-lg border border-slate-200 bg-gradient-to-br from-purple-50 to-purple-100 p-4">
					<p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Improvement Rate</p>
					<p className="text-2xl font-bold text-purple-900 mt-1">{keyMetrics.improvementRate}%</p>
					<p className="text-xs text-purple-700 mt-1">Sessions showing improvement</p>
				</div>

				{/* Compliance Rate */}
				<div className="rounded-lg border border-slate-200 bg-gradient-to-br from-teal-50 to-teal-100 p-4">
					<p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Compliance Rate</p>
					<p className="text-2xl font-bold text-teal-900 mt-1">{keyMetrics.complianceRate}%</p>
					<p className="text-xs text-teal-700 mt-1">Excellent compliance</p>
				</div>

				{/* Completion Status */}
				{patientInfo?.totalSessions && (
					<div className="rounded-lg border border-slate-200 bg-gradient-to-br from-indigo-50 to-indigo-100 p-4">
						<p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Completion</p>
						<p className="text-2xl font-bold text-indigo-900 mt-1">{keyMetrics.completionPercentage}%</p>
						<p className="text-xs text-indigo-700 mt-1">
							{completionStatus.completed}/{completionStatus.total} sessions
						</p>
					</div>
				)}
			</div>

			{/* Charts Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Chart 1: VAS Scale Over Time (Session-by-Session) */}
				{vasScaleData && (
					<div className="rounded-lg border border-slate-200 bg-white p-4">
						<h4 className="text-sm font-semibold text-slate-700 mb-3">
							Pain Level (VAS) - Session Progression
						</h4>
						<StatsChart type="line" data={vasScaleData} height={280} />
						<p className="text-xs text-slate-500 mt-2 text-center">
							Tracking pain levels across each treatment session
						</p>
					</div>
				)}

				{/* Chart 2: Cumulative VAS Improvement */}
				{cumulativeVasData && (
					<div className="rounded-lg border border-slate-200 bg-white p-4">
						<h4 className="text-sm font-semibold text-slate-700 mb-3">
							Cumulative Pain Reduction
						</h4>
						<StatsChart type="line" data={cumulativeVasData} height={280} />
						<p className="text-xs text-slate-500 mt-2 text-center">
							Total improvement from baseline across sessions
						</p>
					</div>
				)}

				{/* Chart 3: Recovery Trajectory */}
				{recoveryTrajectoryData && (
					<div className="rounded-lg border border-slate-200 bg-white p-4">
						<h4 className="text-sm font-semibold text-slate-700 mb-3">
							Recovery Trajectory
						</h4>
						<StatsChart type="doughnut" data={recoveryTrajectoryData} height={280} />
						<p className="text-xs text-slate-500 mt-2 text-center">
							Distribution of pain status across all sessions
						</p>
					</div>
				)}

				{/* Chart 4: Compliance Trend */}
				{complianceTrendData && (
					<div className="rounded-lg border border-slate-200 bg-white p-4">
						<h4 className="text-sm font-semibold text-slate-700 mb-3">
							Home Exercise Compliance
						</h4>
						<StatsChart type="doughnut" data={complianceTrendData} height={280} />
						<p className="text-xs text-slate-500 mt-2 text-center">
							Compliance distribution across sessions
						</p>
					</div>
				)}

				{/* Chart 5: Session Completion Progress */}
				{completionProgressData && (
					<div className="rounded-lg border border-slate-200 bg-white p-4">
						<h4 className="text-sm font-semibold text-slate-700 mb-3">
							Session Completion Status
						</h4>
						<StatsChart type="doughnut" data={completionProgressData} height={280} />
						<p className="text-xs text-slate-500 mt-2 text-center">
							Progress toward treatment completion
						</p>
					</div>
				)}
			</div>

			{/* Session-by-Session Detailed Table */}
			<div className="rounded-lg border border-slate-200 bg-white p-6">
				<h4 className="text-lg font-semibold text-slate-900 mb-4">
					Session-by-Session Progress Timeline
				</h4>
				<div className="overflow-x-auto rounded-lg border border-slate-200">
					<table className="min-w-full divide-y divide-slate-200 text-sm">
						<thead className="bg-gradient-to-r from-slate-50 to-slate-100">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Session #</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Date</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">VAS Scale</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Pain Status</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">ROM</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Strength</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Functional</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Compliance</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Treatment</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Cumulative Change</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 bg-white">
							{sessionMetrics.map((session, index) => {
								const reportVersion = reportVersions[index];
								return (
									<tr key={index} className="hover:bg-slate-50 transition-colors">
										<td className="px-4 py-3 text-slate-700 font-medium">
											<span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
												{session.sessionNumber}
											</span>
										</td>
										<td className="px-4 py-3 text-slate-600">{session.date}</td>
										<td className="px-4 py-3">
											{session.vasScale !== null ? (
												<span className={`font-semibold ${
													session.vasScale <= 3 ? 'text-emerald-600' :
													session.vasScale <= 6 ? 'text-amber-600' :
													'text-red-600'
												}`}>
													{session.vasScale.toFixed(1)}
												</span>
											) : (
												<span className="text-slate-400">—</span>
											)}
										</td>
										<td className="px-4 py-3">
											{session.painStatus && (
												<span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
													session.painStatus === 'Improved' 
														? 'bg-emerald-100 text-emerald-700'
														: session.painStatus === 'Worsened'
														? 'bg-rose-100 text-rose-700'
														: 'bg-amber-100 text-amber-700'
												}`}>
													{session.painStatus}
												</span>
											)}
										</td>
										<td className="px-4 py-3 text-slate-600 text-xs">
											{session.rom ? (
												<span className="inline-flex items-center gap-1">
													{session.romData && (
														<i className="fas fa-check-circle text-emerald-500 text-xs" aria-hidden="true" />
													)}
													{session.rom}
												</span>
											) : (
												<span className="text-slate-400">—</span>
											)}
										</td>
										<td className="px-4 py-3 text-slate-600 text-xs">
											{session.strength ? (
												<span className="inline-flex items-center gap-1">
													{session.mmtData && (
														<i className="fas fa-check-circle text-emerald-500 text-xs" aria-hidden="true" />
													)}
													{session.strength}
												</span>
											) : (
												<span className="text-slate-400">—</span>
											)}
										</td>
										<td className="px-4 py-3">
											{session.functionalAbility && (
												<span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
													session.functionalAbility === 'Improved'
														? 'bg-blue-100 text-blue-700'
														: 'bg-slate-100 text-slate-700'
												}`}>
													{session.functionalAbility}
												</span>
											)}
										</td>
										<td className="px-4 py-3">
											{session.compliance && (
												<span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
													session.compliance === 'Excellent'
														? 'bg-emerald-100 text-emerald-700'
														: session.compliance === 'Moderate'
														? 'bg-amber-100 text-amber-700'
														: 'bg-rose-100 text-rose-700'
												}`}>
													{session.compliance}
												</span>
											)}
										</td>
										<td className="px-4 py-3 text-slate-600 text-xs max-w-xs">
											{session.treatmentProvided ? (
												<span className="truncate block" title={session.treatmentProvided}>
													{session.treatmentProvided.length > 30 
														? `${session.treatmentProvided.substring(0, 30)}...` 
														: session.treatmentProvided}
												</span>
											) : (
												<span className="text-slate-400">—</span>
											)}
										</td>
										<td className="px-4 py-3">
											{session.cumulativeVasChange !== null ? (
												<span className={`font-semibold ${
													session.cumulativeVasChange > 0 
														? 'text-emerald-600' 
														: session.cumulativeVasChange < 0
														? 'text-red-600'
														: 'text-slate-600'
												}`}>
													{session.cumulativeVasChange > 0 ? '+' : ''}{session.cumulativeVasChange.toFixed(1)}
												</span>
											) : (
												<span className="text-slate-400">—</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* Detailed Report Data Section */}
			{reportVersions.length > 0 && (
				<div className="rounded-lg border border-slate-200 bg-white p-6">
					<h4 className="text-lg font-semibold text-slate-900 mb-4">
						Detailed Report Data by Session
					</h4>
					<div className="space-y-4">
						{reportVersions.map((version, index) => {
							const session = sessionMetrics[index];
							const hasRomData = session?.romData && Object.keys(session.romData).length > 0;
							const hasMmtData = session?.mmtData && Object.keys(session.mmtData).length > 0;
							const hasTreatment = version.data.treatmentProvided;
							const hasProgressNotes = version.data.progressNotes;
							
							if (!hasRomData && !hasMmtData && !hasTreatment && !hasProgressNotes) {
								return null;
							}

							return (
								<div key={version.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
									<div className="flex items-center gap-2 mb-3">
										<span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
											{session?.sessionNumber || index + 1}
										</span>
										<span className="font-semibold text-slate-700">
											Session {session?.sessionNumber || index + 1} - {session?.date}
										</span>
									</div>
									
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{hasRomData && session.romData && (
											<div className="bg-white rounded-lg p-3 border border-slate-200">
												<h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
													<i className="fas fa-arrows-alt text-indigo-500" aria-hidden="true" />
													Range of Motion (ROM)
												</h5>
												<div className="text-xs text-slate-600 space-y-1">
													{Object.keys(session.romData).slice(0, 3).map(joint => (
														<div key={joint} className="capitalize">
															• {joint.replace(/([A-Z])/g, ' $1').trim()}
														</div>
													))}
													{Object.keys(session.romData).length > 3 && (
														<div className="text-slate-500 italic">
															+ {Object.keys(session.romData).length - 3} more joint(s)
														</div>
													)}
												</div>
											</div>
										)}
										
										{hasMmtData && session.mmtData && (
											<div className="bg-white rounded-lg p-3 border border-slate-200">
												<h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
													<i className="fas fa-dumbbell text-indigo-500" aria-hidden="true" />
													Manual Muscle Testing (MMT)
												</h5>
												<div className="text-xs text-slate-600 space-y-1">
													{Object.keys(session.mmtData).slice(0, 3).map(muscle => (
														<div key={muscle} className="capitalize">
															• {muscle.replace(/([A-Z])/g, ' $1').trim()}
														</div>
													))}
													{Object.keys(session.mmtData).length > 3 && (
														<div className="text-slate-500 italic">
															+ {Object.keys(session.mmtData).length - 3} more muscle(s)
														</div>
													)}
												</div>
											</div>
										)}
										
										{hasTreatment && (
											<div className="bg-white rounded-lg p-3 border border-slate-200">
												<h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
													<i className="fas fa-stethoscope text-indigo-500" aria-hidden="true" />
													Treatment Provided
												</h5>
												<p className="text-xs text-slate-600 line-clamp-3">
													{version.data.treatmentProvided}
												</p>
											</div>
										)}
										
										{hasProgressNotes && (
											<div className="bg-white rounded-lg p-3 border border-slate-200">
												<h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
													<i className="fas fa-clipboard-list text-indigo-500" aria-hidden="true" />
													Progress Notes
												</h5>
												<p className="text-xs text-slate-600 line-clamp-3">
													{version.data.progressNotes}
												</p>
											</div>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
