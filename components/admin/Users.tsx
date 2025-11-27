'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	addDoc,
	collection,
	doc,
	onSnapshot,
	serverTimestamp,
	updateDoc,
	Timestamp,
} from 'firebase/firestore';

import { db, auth } from '@/lib/firebase';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

type EmployeeRole = 'FrontDesk' | 'ClinicalTeam' | 'Physiotherapist' | 'StrengthAndConditioning' | 'Admin';
type EmployeeStatus = 'Active' | 'Inactive';

interface Employee {
	id: string;
	userName: string;
	userEmail: string;
	role: EmployeeRole;
	status: EmployeeStatus;
	createdAt?: string | null;
	deleted?: boolean;
	deletedAt?: string | null;
	// Profile fields
	phone?: string;
	address?: string;
	dateOfBirth?: string;
	dateOfJoining?: string;
	gender?: string;
	bloodGroup?: string;
	emergencyContact?: string;
	emergencyPhone?: string;
	qualifications?: string;
	specialization?: string;
	experience?: string;
	professionalAim?: string;
	profileImage?: string;
}

interface FormState {
	userName: string;
	userEmail: string;
	userRole: Extract<EmployeeRole, 'FrontDesk' | 'ClinicalTeam' | 'Physiotherapist' | 'StrengthAndConditioning'>;
	userStatus: EmployeeStatus;
	password: string;
}

const ROLE_LABELS: Record<EmployeeRole, string> = {
	Admin: 'Admin',
	FrontDesk: 'Front Desk',
	ClinicalTeam: 'Clinical Team',
	Physiotherapist: 'Physiotherapist',
	StrengthAndConditioning: 'Strength & Conditioning',
};

const ROLE_OPTIONS: Array<{ value: FormState['userRole']; label: string }> = [
	{ value: 'FrontDesk', label: 'Front Desk' },
	{ value: 'ClinicalTeam', label: 'Clinical Team' },
	{ value: 'Physiotherapist', label: 'Physiotherapist' },
	{ value: 'StrengthAndConditioning', label: 'Strength & Conditioning' },
];

const INITIAL_FORM: FormState = {
	userName: '',
	userEmail: '',
	userRole: 'FrontDesk',
	userStatus: 'Active',
	password: '',
};

function formatDate(iso?: string | null) {
	if (!iso) return '—';
	try {
		return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
			new Date(iso)
		);
	} catch {
		return '—';
	}
}

export default function Users() {
	const { user } = useAuth();
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [roleFilter, setRoleFilter] = useState<'all' | EmployeeRole>('all');

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
	const [formState, setFormState] = useState<FormState>(INITIAL_FORM);
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
	const [activityDraft, setActivityDraft] = useState('');
	const [activityNotes, setActivityNotes] = useState<Record<
		string,
		Array<{ id: string; text: string; createdAt: Date }>
	>>({});
	const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
	const [showDeletedEmployees, setShowDeletedEmployees] = useState(false);

	useEffect(() => {
		setLoading(true);

		const unsubscribe = onSnapshot(
			collection(db, 'staff'),
			snapshot => {
				const records: Employee[] = snapshot.docs
					.map(docSnap => {
					const data = docSnap.data() as Record<string, unknown>;
					const created = (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.();
					const deleted = (data.deletedAt as { toDate?: () => Date } | undefined)?.toDate?.();
					return {
						id: docSnap.id,
						userName: String(data.userName ?? ''),
						userEmail: String(data.userEmail ?? ''),
						role: (data.role as EmployeeRole) ?? 'FrontDesk',
						status: (data.status as EmployeeStatus) ?? 'Active',
						createdAt: created
							? created.toISOString()
							: typeof data.createdAt === 'string'
								? (data.createdAt as string)
								: null,
						deleted: data.deleted === true,
						deletedAt: deleted
							? deleted.toISOString()
							: typeof data.deletedAt === 'string'
								? (data.deletedAt as string)
								: null,
						// Profile fields
						phone: data.phone ? String(data.phone) : undefined,
						address: data.address ? String(data.address) : undefined,
						dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth) : undefined,
						dateOfJoining: data.dateOfJoining ? String(data.dateOfJoining) : undefined,
						gender: data.gender ? String(data.gender) : undefined,
						bloodGroup: data.bloodGroup ? String(data.bloodGroup) : undefined,
						emergencyContact: data.emergencyContact ? String(data.emergencyContact) : undefined,
						emergencyPhone: data.emergencyPhone ? String(data.emergencyPhone) : undefined,
						qualifications: data.qualifications ? String(data.qualifications) : undefined,
						specialization: data.specialization ? String(data.specialization) : undefined,
						experience: data.experience ? String(data.experience) : undefined,
						professionalAim: data.professionalAim ? String(data.professionalAim) : (data.notes ? String(data.notes) : undefined), // Support both old and new field names
						profileImage: data.profileImage ? String(data.profileImage) : undefined,
					};
					})
					.filter(record => 
						record.role === 'FrontDesk' || 
						record.role === 'ClinicalTeam' || 
						record.role === 'Physiotherapist' || 
						record.role === 'StrengthAndConditioning'
					)
					.sort((a, b) => a.userName.localeCompare(b.userName));

				setEmployees(records);
				setLoading(false);
			},
			err => {
				console.error('Failed to load employees', err);
				setError('Unable to load employees. Please try again later.');
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, []);

	const filteredEmployees = useMemo(() => {
		const query = searchTerm.trim().toLowerCase();
		return employees.filter(employee => {
			// Filter by deleted status
			const isDeleted = employee.deleted === true;
			if (showDeletedEmployees && !isDeleted) return false;
			if (!showDeletedEmployees && isDeleted) return false;

			const matchesSearch =
				!query ||
				employee.userName.toLowerCase().includes(query) ||
				employee.userEmail.toLowerCase().includes(query) ||
				ROLE_LABELS[employee.role].toLowerCase().includes(query);

			const matchesRole = roleFilter === 'all' || employee.role === roleFilter;

			return matchesSearch && matchesRole;
		});
	}, [employees, searchTerm, roleFilter, showDeletedEmployees]);

	const analytics = useMemo(() => {
		const activeEmployees = employees.filter(emp => !emp.deleted);
		const total = activeEmployees.length;
		const active = activeEmployees.filter(emp => emp.status === 'Active').length;
		const inactive = total - active;
		const frontDesk = activeEmployees.filter(emp => emp.role === 'FrontDesk').length;
		const clinical = activeEmployees.filter(emp => emp.role === 'ClinicalTeam').length;
		const adminCount = activeEmployees.filter(emp => emp.role === 'Admin').length;
		const deletedCount = employees.filter(emp => emp.deleted === true).length;

		return { total, active, inactive, frontDesk, clinical, adminCount, deletedCount };
	}, [employees]);

	const openCreateDialog = () => {
		setEditingEmployee(null);
		setFormState(INITIAL_FORM);
		setIsDialogOpen(true);
		setError(null);
	};

	const openEditDialog = (employee: Employee | null) => {
		if (!employee) return;
		setEditingEmployee(employee);
		setFormState({
			userName: employee.userName,
			userEmail: employee.userEmail,
			userRole: employee.role === 'Admin' ? 'FrontDesk' : (employee.role as FormState['userRole']),
			userStatus: employee.status,
			password: '',
		});
		setIsDialogOpen(true);
		setError(null);
	};

	const closeDialog = () => {
		setIsDialogOpen(false);
		setEditingEmployee(null);
		setFormState(INITIAL_FORM);
		// Don't close the view profile when closing edit dialog
	};

	const handleDelete = async (employee: Employee) => {
		const confirmed = window.confirm(
			`Are you sure you want to remove ${employee.userName || employee.userEmail}? This will mark them as a past employee.`
		);
		if (!confirmed) return;

		setSaving(true);
		setError(null);
		try {
			await updateDoc(doc(db, 'staff', employee.id), {
				deleted: true,
				deletedAt: serverTimestamp(),
				status: 'Inactive', // Also set status to Inactive
			});
		} catch (err) {
			console.error('Failed to delete employee', err);
			setError('Unable to remove employee. Please try again.');
		} finally {
			setSaving(false);
		}
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);

		const trimmedName = formState.userName.trim();
		const trimmedEmail = formState.userEmail.trim().toLowerCase();
		const trimmedPassword = formState.password.trim();

		if (!trimmedName || !trimmedEmail) {
			setError('Name and email are required.');
			return;
		}

		// Password is optional since authentication is disabled
		// Only validate if provided
		if (!editingEmployee && trimmedPassword && trimmedPassword.length < 6) {
			setError('Password must be at least 6 characters long (if provided).');
			return;
		}

		setSaving(true);
		try {
			if (editingEmployee) {
				// Update existing employee
				await updateDoc(doc(db, 'staff', editingEmployee.id), {
					userName: trimmedName,
					role: formState.userRole,
					status: formState.userStatus,
				});
			} else {
				// Create new employee - since authentication is disabled, create staff record directly
				try {
					// Create staff record in Firestore directly
					await addDoc(collection(db, 'staff'), {
						userName: trimmedName,
						userEmail: trimmedEmail,
						role: formState.userRole,
						status: formState.userStatus,
						createdAt: serverTimestamp(),
					});
				} catch (err: any) {
					console.error('Failed to create staff record:', err);
					
					// Check if it's a permissions error
					if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.code === 'PERMISSION_DENIED') {
						setError(
							'❌ Permission Denied Error!\n\n' +
							'Your Firestore security rules are blocking writes.\n\n' +
							'🔧 Quick Fix:\n' +
							'1. Open Firebase Console → Firestore Database → Rules tab\n' +
							'2. Replace the rules with:\n\n' +
							'rules_version = \'2\';\n' +
							'service cloud.firestore {\n' +
							'  match /databases/{database}/documents {\n' +
							'    match /{document=**} {\n' +
							'      allow read, write: if true;\n' +
							'    }\n' +
							'  }\n' +
							'}\n\n' +
							'3. Click "Publish"\n' +
							'4. Try saving again\n\n' +
							'Error code: ' + (err?.code || 'Unknown')
						);
					} else if (err?.code === 'unavailable' || err?.message?.includes('unavailable')) {
						setError(
							'❌ Firestore Database Unavailable\n\n' +
							'Please check:\n' +
							'1. Firebase Console → Firestore Database exists and is active\n' +
							'2. Your internet connection\n' +
							'3. Firestore rules are published\n\n' +
							'Error: ' + (err?.message || 'Unknown error')
						);
					} else {
						const errorMsg = err?.message || err?.toString() || 'Unknown error';
						const errorCode = err?.code || 'N/A';
						setError(
							'❌ Failed to Create Employee\n\n' +
							'Error: ' + errorMsg + '\n' +
							'Code: ' + errorCode + '\n\n' +
							'Please check:\n' +
							'1. Firestore database is created\n' +
							'2. Firestore rules allow writes (should be: allow read, write: if true;)\n' +
							'3. Browser console (F12) for more details'
						);
					}
					setSaving(false);
					return; // Don't close dialog, show error
				}
			}
			closeDialog();
		} catch (err: any) {
			console.error('Failed to save employee', err);
			const errorMsg = err?.message || err?.toString() || 'Unknown error';
			setError(
				'❌ Error: ' + errorMsg + '\n\n' +
				'Please check the browser console (F12) for details.'
			);
		} finally {
			setSaving(false);
		}
	};

	// Accept nullable since we call these with selectedEmployee which can be null
	const handleResetPassword = async (employee: Employee | null) => {
		if (!employee) return;
		// Create a temp password and show to admin — replace with API call to update in Auth if needed
		const tempPassword = Math.random().toString(36).slice(-8);
		alert(`Temporary password for ${employee.userEmail}: ${tempPassword}\n\n(Show this to the user and/or update the Auth account through your admin API.)`);
	};

	const handleSendResetEmail = async (employee: Employee | null) => {
		if (!employee) return;
		// Placeholder behavior: show an alert. Replace with real sendPasswordResetEmail(auth, email) call if you want.
		alert(`A password reset email would be sent to ${employee.userEmail} (placeholder).`);
	};

	const handleToggleStatus = async (employee: Employee) => {
		const nextStatus: EmployeeStatus = employee.status === 'Active' ? 'Inactive' : 'Active';
		try {
			await updateDoc(doc(db, 'staff', employee.id), { status: nextStatus });
			alert(`${employee.userName} is now ${nextStatus}.`);
		} catch (err) {
			console.error('Failed to toggle status', err);
			alert('Unable to update status. Please try again.');
		}
	};

	const handleExportCSV = () => {
		// Prepare CSV headers
		const headers = ['Name', 'Email', 'Role', 'Status', 'Created Date'];
		
		// Prepare CSV rows from filtered employees
		const rows = filteredEmployees.map(employee => [
			employee.userName,
			employee.userEmail,
			ROLE_LABELS[employee.role],
			employee.status,
			formatDate(employee.createdAt),
		]);

		// Combine headers and rows
		const csvContent = [
			headers.join(','),
			...rows.map(row => 
				row.map(cell => {
					// Escape commas and quotes in cell values
					const cellValue = String(cell || '');
					if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
						return `"${cellValue.replace(/"/g, '""')}"`;
					}
					return cellValue;
				}).join(',')
			),
		].join('\n');

		// Create blob and download
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleExportEmployeeDetailsCSV = () => {
		// Prepare CSV headers with all profile fields
		const headers = [
			'Name',
			'Email',
			'Role',
			'Status',
			'Phone',
			'Address',
			'Date of Birth',
			'Date of Joining',
			'Gender',
			'Blood Group',
			'Emergency Contact',
			'Emergency Phone',
			'Qualifications',
			'Specialization',
			'Experience',
			'Professional Aim',
			'Created Date',
			'Deleted',
			'Deleted Date',
		];
		
		// Prepare CSV rows from all employees (not just filtered)
		const rows = employees.map(employee => [
			employee.userName || '',
			employee.userEmail || '',
			ROLE_LABELS[employee.role] || '',
			employee.status || '',
			employee.phone || '',
			employee.address || '',
			employee.dateOfBirth || '',
			employee.dateOfJoining || '',
			employee.gender || '',
			employee.bloodGroup || '',
			employee.emergencyContact || '',
			employee.emergencyPhone || '',
			employee.qualifications || '',
			employee.specialization || '',
			employee.experience || '',
			employee.professionalAim || '',
			formatDate(employee.createdAt),
			employee.deleted ? 'Yes' : 'No',
			employee.deletedAt ? formatDate(employee.deletedAt) : '',
		]);

		// Combine headers and rows
		const csvContent = [
			headers.join(','),
			...rows.map(row => 
				row.map(cell => {
					// Escape commas and quotes in cell values
					const cellValue = String(cell || '');
					if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
						return `"${cellValue.replace(/"/g, '""')}"`;
					}
					return cellValue;
				}).join(',')
			),
		].join('\n');

		// Create blob and download
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', `employee_details_export_${new Date().toISOString().split('T')[0]}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleAddActivity = () => {
		if (!selectedEmployee || !activityDraft.trim()) return;
		const entry = {
			id: typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2),
			text: activityDraft.trim(),
			createdAt: new Date(),
		};
		setActivityNotes(prev => ({
			...prev,
			[selectedEmployee.id]: [entry, ...(prev[selectedEmployee.id] ?? [])],
		}));
		setActivityDraft('');
	};

	const rolePresets: Record<
		EmployeeRole,
		Array<{ title: string; description: string; allowed: boolean }>
	> = {
		Admin: [
			{ title: 'Global settings', description: 'Manage platform-level configuration and teams', allowed: true },
			{ title: 'Billing dashboards', description: 'Approve billing cycles and refunds', allowed: true },
			{ title: 'Clinical data', description: 'Read/write all reports and assessments', allowed: true },
		],
		FrontDesk: [
			{ title: 'Patient check-in', description: 'Register new patients and create appointments', allowed: true },
			{ title: 'Billing dashboards', description: 'Create invoices and mark payments', allowed: true },
			{ title: 'Clinical data', description: 'Read-only access to assigned patients', allowed: false },
		],
		ClinicalTeam: [
			{ title: 'Clinical data', description: 'Create and edit treatment notes and reports', allowed: true },
			{ title: 'Availability management', description: 'Update consultation slots and coverage', allowed: true },
			{ title: 'Billing dashboards', description: 'Cannot edit billing entries', allowed: false },
		],
		Physiotherapist: [
			{ title: 'Clinical data', description: 'Create and edit physio treatment notes and reports', allowed: true },
			{ title: 'Availability management', description: 'Update consultation slots and coverage', allowed: true },
			{ title: 'Billing dashboards', description: 'Cannot edit billing entries', allowed: false },
		],
		StrengthAndConditioning: [
			{ title: 'Training plans', description: 'Create and edit S&C programs and notes', allowed: true },
			{ title: 'Availability management', description: 'Update session availability', allowed: true },
			{ title: 'Clinical data', description: 'Read-only access to assigned patients', allowed: false },
		],
	};

	return (
		<div className="min-h-svh bg-slate-50 px-6 py-10">
			<div className="mx-auto max-w-6xl space-y-10">
				<PageHeader
					badge="Admin"
					title="Employee Management"
					description="Register and manage Front Desk and Clinical Team staff members."
				/>

				<div className="border-t border-slate-200" />

				<section className="rounded-2xl border-2 border-sky-600 bg-white px-6 py-6 shadow-[0_10px_35px_rgba(20,90,150,0.12)] space-y-4">
					<div className="sm:flex sm:items-center sm:justify-between sm:space-x-6">
						<div>
							<h2 className="text-xl font-semibold text-sky-700">All Employees</h2>
							<p className="mt-1 text-sm text-sky-700/80">
								Search the directory or create a new employee profile.
							</p>
						</div>
						<div className="mt-4 flex flex-col items-center justify-end gap-3 sm:mt-0 sm:flex-row">
							<input
								type="search"
								value={searchTerm}
								onChange={event => setSearchTerm(event.target.value)}
								placeholder="Search employees…"
								className="w-full min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 sm:w-auto"
							/>
							<button
								type="button"
								onClick={() => setShowDeletedEmployees(!showDeletedEmployees)}
								className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-semibold shadow-md transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
									showDeletedEmployees
										? 'border-amber-600 bg-amber-50 text-amber-700 hover:bg-amber-100 focus-visible:bg-amber-100 focus-visible:outline-amber-600'
										: 'border-slate-400 bg-white text-slate-600 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-slate-400'
								}`}
							>
								<i className={`fas ${showDeletedEmployees ? 'fa-eye-slash' : 'fa-history'} mr-2 text-sm`} aria-hidden="true" />
								{showDeletedEmployees ? 'Show Active Employees' : `Past Employees (${analytics.deletedCount})`}
							</button>
							<button
								type="button"
								onClick={() => setShowEmployeeDetails(true)}
								className="inline-flex items-center rounded-lg border border-indigo-600 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-md transition hover:bg-indigo-50 focus-visible:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
							>
								<i className="fas fa-id-card mr-2 text-sm" aria-hidden="true" />
								Employee Details
							</button>
							<button
								type="button"
								onClick={handleExportCSV}
								disabled={filteredEmployees.length === 0}
								className="inline-flex items-center rounded-lg border border-sky-600 bg-white px-4 py-2 text-sm font-semibold text-sky-600 shadow-md transition hover:bg-sky-50 focus-visible:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<i className="fas fa-file-csv mr-2 text-sm" aria-hidden="true" />
								Export CSV
							</button>
							{!showDeletedEmployees && (
								<button
									type="button"
									onClick={openCreateDialog}
									className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500 focus-visible:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
								>
									<i className="fas fa-user-plus mr-2 text-sm" aria-hidden="true" />
									Add New Employee
								</button>
							)}
						</div>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						<div>
							<label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Filter by role</label>
							<select
								value={roleFilter}
								onChange={event => setRoleFilter(event.target.value as 'all' | EmployeeRole)}
								className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
							>
								<option value="all">All roles</option>
								<option value="FrontDesk">Front Desk</option>
								<option value="ClinicalTeam">Clinical Team</option>
								<option value="Admin">Admin</option>
							</select>
						</div>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
						<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
							<p className="text-xs uppercase tracking-wide text-slate-500">Total staff</p>
							<p className="mt-2 text-2xl font-semibold text-slate-900">{analytics.total}</p>
						</div>
						<div className="rounded-xl border border-slate-200 bg-emerald-50 p-4">
							<p className="text-xs uppercase tracking-wide text-emerald-700">Active</p>
							<p className="mt-2 text-2xl font-semibold text-emerald-800">{analytics.active}</p>
						</div>
						<div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
							<p className="text-xs uppercase tracking-wide text-slate-600">Inactive</p>
							<p className="mt-2 text-2xl font-semibold text-slate-800">{analytics.inactive}</p>
						</div>
						<div className="rounded-xl border border-slate-200 bg-sky-50 p-4">
							<p className="text-xs uppercase tracking-wide text-sky-700">Front desk</p>
							<p className="mt-2 text-2xl font-semibold text-sky-900">{analytics.frontDesk}</p>
						</div>
						<div className="rounded-xl border border-slate-200 bg-indigo-50 p-4">
							<p className="text-xs uppercase tracking-wide text-indigo-700">Clinical team</p>
							<p className="mt-2 text-2xl font-semibold text-indigo-900">{analytics.clinical}</p>
						</div>
					</div>
				</section>

			{error && (
				<div className="mx-auto mt-6 max-w-5xl rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{error}
				</div>
			)}

			<section className="mx-auto mt-8 max-w-6xl rounded-2xl bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
				{loading ? (
					<div className="py-10 text-center text-sm text-slate-500">Loading employees…</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
							<thead className="bg-sky-50 text-xs uppercase tracking-wide text-sky-700">
								<tr>
									<th className="px-4 py-3 font-semibold">#</th>
									<th className="px-4 py-3 font-semibold">Name</th>
									<th className="px-4 py-3 font-semibold">Email/Login</th>
									<th className="px-4 py-3 font-semibold">Role</th>
									<th className="px-4 py-3 font-semibold">Status</th>
									<th className="px-4 py-3 font-semibold">Created</th>
									<th className="px-4 py-3 font-semibold text-center">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{filteredEmployees.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
											{showDeletedEmployees 
												? 'No past employees found.' 
												: 'No employees found. Adjust your search or add someone new.'}
										</td>
									</tr>
								) : (
									filteredEmployees.map((employee, index) => (
										<tr key={employee.id} className={employee.deleted ? 'bg-slate-50 opacity-75' : ''}>
											<td className="px-4 py-4 text-sm text-slate-500">{index + 1}</td>
											<td className="px-4 py-4 font-medium text-slate-800">
												{employee.userName}
												{employee.deleted && (
													<span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
														Past Employee
													</span>
												)}
											</td>
											<td className="px-4 py-4 text-slate-600">{employee.userEmail}</td>
											<td className="px-4 py-4">
												<span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
													<i className="fas fa-user-shield mr-1 text-[11px]" aria-hidden="true" />
													{ROLE_LABELS[employee.role]}
												</span>
											</td>
											<td className="px-4 py-4">
												<span
													className={[
														'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
														employee.status === 'Active'
															? 'bg-emerald-100 text-emerald-700'
															: 'bg-slate-200 text-slate-600',
													].join(' ')}
												>
													{employee.status}
												</span>
											</td>
											<td className="px-4 py-4 text-sm text-slate-500">
												{showDeletedEmployees && employee.deletedAt 
													? `Removed: ${formatDate(employee.deletedAt)}`
													: formatDate(employee.createdAt)}
											</td>
											<td className="px-4 py-4 text-center text-sm">
												<div className="flex flex-wrap justify-center gap-2">
													{/* VIEW PROFILE */}
													<button
														type="button"
														onClick={() => setSelectedEmployee(employee)}
														className="inline-flex items-center rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-800 focus-visible:border-sky-400 focus-visible:text-sky-800 focus-visible:outline-none"
													>
														<i className="fas fa-id-badge mr-1 text-[11px]" aria-hidden="true" />
														View profile
													</button>

													{/* DELETE - Only show for active employees */}
													{!showDeletedEmployees && !employee.deleted && (
														<button
															type="button"
															onClick={() => handleDelete(employee)}
															className="inline-flex items-center rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-400 hover:text-rose-700 focus-visible:border-rose-400 focus-visible:text-rose-700 focus-visible:outline-none"
															disabled={saving}
														>
															<i className="fas fa-trash mr-1 text-[11px]" aria-hidden="true" />
															Delete
														</button>
													)}
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</section>

			{selectedEmployee && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6"
					onClick={() => setSelectedEmployee(null)}
					role="dialog"
					aria-modal="true"
				>
					<div
						className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
						onClick={event => event.stopPropagation()}
					>
						<header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
							<div>
								<div className="flex items-center gap-2">
									<h3 className="text-lg font-semibold text-slate-900">{selectedEmployee.userName}</h3>
									{selectedEmployee.deleted && (
										<span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
											Past Employee
										</span>
									)}
								</div>
								<p className="text-xs text-slate-500">{selectedEmployee.userEmail}</p>
							</div>
							<button
								type="button"
								onClick={() => setSelectedEmployee(null)}
								className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
								aria-label="Close profile"
							>
								<i className="fas fa-times" aria-hidden="true" />
							</button>
						</header>

						<div className="grid max-h-[calc(90vh-56px)] gap-4 overflow-y-auto px-6 py-6 lg:grid-cols-[1.2fr,0.8fr]">
							<section className="space-y-4">
								<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
									<h4 className="text-sm font-semibold text-slate-800">Profile overview</h4>
									<dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
										<div>
											<dt className="font-semibold text-slate-500">Role</dt>
											<dd>{ROLE_LABELS[selectedEmployee.role]}</dd>
										</div>
										<div>
											<dt className="font-semibold text-slate-500">Status</dt>
											<dd>{selectedEmployee.status}</dd>
										</div>
										<div>
											<dt className="font-semibold text-slate-500">Joined</dt>
											<dd>{formatDate(selectedEmployee.createdAt)}</dd>
										</div>
										<div>
											<dt className="font-semibold text-slate-500">Permissions</dt>
											<dd>Preset: {ROLE_LABELS[selectedEmployee.role]} defaults</dd>
										</div>
									</dl>
								</div>

								{/* Personal Information */}
								{(selectedEmployee.phone || selectedEmployee.address || selectedEmployee.dateOfBirth || selectedEmployee.gender) && (
									<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
										<h4 className="text-sm font-semibold text-slate-800">Personal Information</h4>
										<dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
											{selectedEmployee.phone && (
												<div>
													<dt className="font-semibold text-slate-500">Phone</dt>
													<dd>{selectedEmployee.phone}</dd>
												</div>
											)}
											{selectedEmployee.dateOfBirth && (
												<div>
													<dt className="font-semibold text-slate-500">Date of Birth</dt>
													<dd>{selectedEmployee.dateOfBirth}</dd>
												</div>
											)}
											{selectedEmployee.dateOfJoining && (
												<div>
													<dt className="font-semibold text-slate-500">Date of Joining</dt>
													<dd>{selectedEmployee.dateOfJoining}</dd>
												</div>
											)}
											{selectedEmployee.gender && (
												<div>
													<dt className="font-semibold text-slate-500">Gender</dt>
													<dd>{selectedEmployee.gender}</dd>
												</div>
											)}
											{selectedEmployee.bloodGroup && (
												<div>
													<dt className="font-semibold text-slate-500">Blood Group</dt>
													<dd>{selectedEmployee.bloodGroup}</dd>
												</div>
											)}
											{selectedEmployee.address && (
												<div className="sm:col-span-2">
													<dt className="font-semibold text-slate-500">Address</dt>
													<dd className="whitespace-pre-wrap">{selectedEmployee.address}</dd>
												</div>
											)}
										</dl>
									</div>
								)}

								{/* Emergency Contact */}
								{(selectedEmployee.emergencyContact || selectedEmployee.emergencyPhone) && (
									<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
										<h4 className="text-sm font-semibold text-slate-800">Emergency Contact</h4>
										<dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
											{selectedEmployee.emergencyContact && (
												<div>
													<dt className="font-semibold text-slate-500">Contact Name</dt>
													<dd>{selectedEmployee.emergencyContact}</dd>
												</div>
											)}
											{selectedEmployee.emergencyPhone && (
												<div>
													<dt className="font-semibold text-slate-500">Contact Phone</dt>
													<dd>{selectedEmployee.emergencyPhone}</dd>
												</div>
											)}
										</dl>
									</div>
								)}

								{/* Professional Information */}
								{(selectedEmployee.qualifications || selectedEmployee.specialization || selectedEmployee.experience) && (
									<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
										<h4 className="text-sm font-semibold text-slate-800">Professional Information</h4>
										<dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
											{selectedEmployee.qualifications && (
												<div>
													<dt className="font-semibold text-slate-500">Qualifications</dt>
													<dd>{selectedEmployee.qualifications}</dd>
												</div>
											)}
											{selectedEmployee.specialization && (
												<div>
													<dt className="font-semibold text-slate-500">Specialization</dt>
													<dd>{selectedEmployee.specialization}</dd>
												</div>
											)}
											{selectedEmployee.experience && (
												<div>
													<dt className="font-semibold text-slate-500">Experience</dt>
													<dd>{selectedEmployee.experience}</dd>
												</div>
											)}
										</dl>
									</div>
								)}

								{/* Professional Aim */}
								{selectedEmployee.professionalAim && (
									<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
										<h4 className="text-sm font-semibold text-slate-800">Professional Aim</h4>
										<p className="mt-3 whitespace-pre-wrap text-xs text-slate-600">{selectedEmployee.professionalAim}</p>
									</div>
								)}

								<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
									<h4 className="text-sm font-semibold text-slate-800">Role permissions</h4>
									<ul className="mt-3 space-y-2 text-xs">
										{(rolePresets[selectedEmployee.role] ?? []).map(permission => (
											<li
												key={permission.title}
												className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
											>
												<span
													className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
														permission.allowed
															? 'bg-emerald-100 text-emerald-700'
															: 'bg-slate-200 text-slate-500'
													}`}
												>
													{permission.allowed ? <i className="fas fa-check" /> : <i className="fas fa-minus" />}
												</span>
												<div>
													<p className="font-semibold text-slate-700">{permission.title}</p>
													<p className="text-slate-500">{permission.description}</p>
												</div>
											</li>
										))}
									</ul>
								</div>

								<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
									<h4 className="text-sm font-semibold text-slate-800">Activity log</h4>
									{(activityNotes[selectedEmployee.id]?.length ?? 0) === 0 ? (
										<p className="mt-3 text-xs text-slate-500">No activity notes yet.</p>
									) : (
										<ul className="mt-3 space-y-2 text-xs text-slate-600">
											{activityNotes[selectedEmployee.id]?.map(entry => (
												<li key={entry.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
													{entry.text}
													<p className="text-[10px] text-slate-400">{entry.createdAt.toLocaleString()}</p>
												</li>
											))}
										</ul>
									)}
									<div className="mt-3 space-y-2">
										<textarea
											value={activityDraft}
											onChange={event => setActivityDraft(event.target.value)}
											placeholder="Add internal note..."
											className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
											rows={3}
										/>
										<div className="flex justify-end">
											<button type="button" onClick={handleAddActivity} className="btn-primary text-xs">
												Log activity
											</button>
										</div>
									</div>
								</div>
							</section>

							<aside className="space-y-4">
								<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
									<h4 className="text-sm font-semibold text-slate-800">Quick actions</h4>
									<div className="mt-3 space-y-2 text-xs">
										{/* Send reset email (placeholder) */}
										<button
											type="button"
											onClick={() => handleSendResetEmail(selectedEmployee)}
											className="btn-tertiary w-full justify-start"
										>
											<i className="fas fa-envelope text-xs" aria-hidden="true" />
											Send reset email
										</button>

										{/* Reset password (temporary password generator / placeholder) */}
										<button
											type="button"
											onClick={() => handleResetPassword(selectedEmployee)}
											className="btn-tertiary w-full justify-start"
										>
											<i className="fas fa-key text-xs" aria-hidden="true" />
											Reset password
										</button>

										{/* Toggle status & edit remain available in modal */}
										<button
											type="button"
											onClick={() => handleToggleStatus(selectedEmployee)}
											className="btn-tertiary w-full justify-start"
										>
											<i className="fas fa-power-off text-xs" aria-hidden="true" />
											{selectedEmployee.status === 'Active' ? 'Deactivate user' : 'Activate user'}
										</button>
										<button
											type="button"
											onClick={() => {
												openEditDialog(selectedEmployee);
											}}
											className="btn-tertiary w-full justify-start"
										>
											<i className="fas fa-edit text-xs" aria-hidden="true" />
											Edit details
										</button>
									</div>
								</div>
								<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
									<h4 className="text-sm font-semibold text-slate-800">Summary</h4>
									<ul className="mt-3 space-y-1 text-xs text-slate-600">
										<li className="flex items-center justify-between">
											<span>Role</span>
											<span className="font-semibold">{ROLE_LABELS[selectedEmployee.role]}</span>
										</li>
										<li className="flex items-center justify-between">
											<span>Status</span>
											<span className="font-semibold">{selectedEmployee.status}</span>
										</li>
										<li className="flex items-center justify-between">
											<span>Created</span>
											<span className="font-semibold">{formatDate(selectedEmployee.createdAt)}</span>
										</li>
										{selectedEmployee.deleted && selectedEmployee.deletedAt && (
											<li className="flex items-center justify-between">
												<span>Removed</span>
												<span className="font-semibold text-amber-700">{formatDate(selectedEmployee.deletedAt)}</span>
											</li>
										)}
									</ul>
								</div>
							</aside>
						</div>
					</div>
				</div>
			)}

			{isDialogOpen && (
				<div
					role="dialog"
					aria-modal="true"
					className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4 py-6"
					onClick={closeDialog}
				>
					<div 
						className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
						onClick={event => event.stopPropagation()}
					>
						<header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
							<h2 className="text-lg font-semibold text-slate-900">
								{editingEmployee ? 'Edit Employee' : 'Add Employee'}
							</h2>
							<button
								type="button"
								onClick={closeDialog}
								className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:bg-slate-100 focus-visible:text-slate-600 focus-visible:outline-none"
								aria-label="Close dialog"
							>
								<i className="fas fa-times" aria-hidden="true" />
							</button>
						</header>
						<form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
							{error && (
								<div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 whitespace-pre-line">
									{error}
								</div>
							)}
							<div>
								<label className="block text-sm font-medium text-slate-700">Full Name</label>
								<input
									type="text"
									value={formState.userName}
									onChange={event => setFormState(current => ({ ...current, userName: event.target.value }))}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700">Email (Login)</label>
								<input
									type="email"
									value={formState.userEmail}
									onChange={event => setFormState(current => ({ ...current, userEmail: event.target.value }))}
									disabled={Boolean(editingEmployee)}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-100"
									required
								/>
							</div>
							{!editingEmployee && (
								<div>
									<label className="block text-sm font-medium text-slate-700">Password (Optional)</label>
									<input
										type="password"
										value={formState.password}
										onChange={event => setFormState(current => ({ ...current, password: event.target.value }))}
										className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
										minLength={6}
										placeholder="Leave empty if not creating auth account"
									/>
									<p className="mt-1 text-xs text-slate-500">
										Optional. Only needed if creating Firebase Authentication account. Must be at least 6 characters if provided.
									</p>
								</div>
							)}
							<div>
								<label className="block text-sm font-medium text-slate-700">Role</label>
								<select
									value={formState.userRole}
									onChange={event =>
										setFormState(current => ({
											...current,
											userRole: event.target.value as FormState['userRole'],
										}))
									}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
									required
								>
									{ROLE_OPTIONS.map(option => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700">Status</label>
								<select
									value={formState.userStatus}
									onChange={event =>
										setFormState(current => ({
											...current,
											userStatus: event.target.value as EmployeeStatus,
										}))
									}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
									required
								>
									<option value="Active">Active</option>
									<option value="Inactive">Inactive</option>
								</select>
							</div>
							<footer className="flex items-center justify-end gap-3 pt-2">
								<button
									type="button"
									onClick={closeDialog}
									disabled={saving}
									className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800 focus-visible:border-slate-300 focus-visible:text-slate-800 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={saving}
									className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 focus-visible:bg-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
								>
									{saving ? 'Saving…' : 'Save Employee'}
								</button>
							</footer>
						</form>
					</div>
				</div>
			)}

			{/* Employee Details Modal */}
			{showEmployeeDetails && (
				<div
					role="dialog"
					aria-modal="true"
					className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4 py-6"
					onClick={() => setShowEmployeeDetails(false)}
				>
					<div 
						className="w-full max-w-7xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden"
						onClick={event => event.stopPropagation()}
					>
						<header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
							<div>
								<h2 className="text-lg font-semibold text-slate-900">Employee Details</h2>
								<p className="text-xs text-slate-500 mt-1">
									All profile information filled by employees
								</p>
							</div>
							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={handleExportEmployeeDetailsCSV}
									className="inline-flex items-center rounded-lg border border-sky-600 bg-white px-4 py-2 text-sm font-semibold text-sky-600 shadow-md transition hover:bg-sky-50 focus-visible:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
								>
									<i className="fas fa-file-csv mr-2 text-sm" aria-hidden="true" />
									Export CSV
								</button>
								<button
									type="button"
									onClick={() => setShowEmployeeDetails(false)}
									className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
									aria-label="Close dialog"
								>
									<i className="fas fa-times" aria-hidden="true" />
								</button>
							</div>
						</header>

						<div className="overflow-y-auto max-h-[calc(90vh-80px)]">
							<div className="p-6">
								{loading ? (
									<div className="py-10 text-center text-sm text-slate-500">Loading employee details…</div>
								) : employees.length === 0 ? (
									<div className="py-10 text-center text-sm text-slate-500">
										No employees found.
									</div>
								) : (
									<div className="overflow-x-auto">
										<table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
											<thead className="bg-sky-50 text-xs uppercase tracking-wide text-sky-700 sticky top-0">
												<tr>
													<th className="px-4 py-3 font-semibold">Image</th>
													<th className="px-4 py-3 font-semibold">Name</th>
													<th className="px-4 py-3 font-semibold">Email</th>
													<th className="px-4 py-3 font-semibold">Role</th>
													<th className="px-4 py-3 font-semibold">Phone</th>
													<th className="px-4 py-3 font-semibold">Date of Birth</th>
													<th className="px-4 py-3 font-semibold">Date of Joining</th>
													<th className="px-4 py-3 font-semibold">Gender</th>
													<th className="px-4 py-3 font-semibold">Blood Group</th>
													<th className="px-4 py-3 font-semibold">Address</th>
													<th className="px-4 py-3 font-semibold">Emergency Contact</th>
													<th className="px-4 py-3 font-semibold">Emergency Phone</th>
													<th className="px-4 py-3 font-semibold">Qualifications</th>
													<th className="px-4 py-3 font-semibold">Specialization</th>
													<th className="px-4 py-3 font-semibold">Experience</th>
													<th className="px-4 py-3 font-semibold">Professional Aim</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-slate-100 bg-white">
												{employees.filter(emp => !emp.deleted).map((employee) => (
													<tr key={employee.id} className="hover:bg-slate-50">
														<td className="px-4 py-3">
															{employee.profileImage ? (
																<img
																	src={employee.profileImage}
																	alt={employee.userName || 'Employee'}
																	className="h-10 w-10 rounded-full object-cover border-2 border-slate-200"
																/>
															) : (
																<div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 border-2 border-slate-200">
																	<i className="fas fa-user text-slate-400 text-sm" aria-hidden="true" />
																</div>
															)}
														</td>
														<td className="px-4 py-3 font-medium text-slate-800">{employee.userName || '—'}</td>
														<td className="px-4 py-3 text-slate-600">{employee.userEmail || '—'}</td>
														<td className="px-4 py-3">
															<span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
																{ROLE_LABELS[employee.role]}
															</span>
														</td>
														<td className="px-4 py-3 text-slate-600">{employee.phone || '—'}</td>
														<td className="px-4 py-3 text-slate-600">{employee.dateOfBirth || '—'}</td>
														<td className="px-4 py-3 text-slate-600">{employee.dateOfJoining || '—'}</td>
														<td className="px-4 py-3 text-slate-600">{employee.gender || '—'}</td>
														<td className="px-4 py-3 text-slate-600">{employee.bloodGroup || '—'}</td>
														<td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={employee.address || ''}>
															{employee.address || '—'}
														</td>
														<td className="px-4 py-3 text-slate-600">{employee.emergencyContact || '—'}</td>
														<td className="px-4 py-3 text-slate-600">{employee.emergencyPhone || '—'}</td>
														<td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={employee.qualifications || ''}>
															{employee.qualifications || '—'}
														</td>
														<td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={employee.specialization || ''}>
															{employee.specialization || '—'}
														</td>
														<td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={employee.experience || ''}>
															{employee.experience || '—'}
														</td>
														<td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={employee.professionalAim || ''}>
															{employee.professionalAim || '—'}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
			</div>
		</div>
	);
}
