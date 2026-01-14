# Analytics Modal Integration Example

This document shows how to integrate the `<AnalyticsModal />` component into your Patient List component.

## Step 1: Add Import

Add this import at the top of your `components/admin/Patients.tsx` (or `components/frontdesk/Patients.tsx`) file:

```typescript
import AnalyticsModal from '@/components/AnalyticsModal';
```

## Step 2: Add State Management

Add these state variables alongside your other state declarations (around line 220):

```typescript
const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
const [analyticsPatientId, setAnalyticsPatientId] = useState<string | null>(null);
```

## Step 3: Add Analytics Button

In the actions column of your patient table (around line 2212-2233), add the Analytics button alongside the existing View and Delete buttons:

```typescript
<td className="px-2 py-4 text-center">
	<div className="inline-flex items-center gap-1">
		<button
			type="button"
			onClick={() => setSelectedPatientId(id)}
			className="inline-flex items-center justify-center rounded-full border border-sky-200 px-1.5 py-1 text-sky-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 focus-visible:border-sky-300 focus-visible:text-sky-800 focus-visible:outline-none"
			title="View profile"
		>
			<i className="fas fa-user text-[10px]" aria-hidden="true" />
		</button>
		
		{/* Add Analytics Button */}
		<button
			type="button"
			onClick={() => {
				setAnalyticsPatientId(patient.patientId);
				setShowAnalyticsModal(true);
			}}
			className="inline-flex items-center justify-center rounded-full border border-purple-200 px-1.5 py-1 text-purple-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-800 focus-visible:border-purple-300 focus-visible:text-purple-800 focus-visible:outline-none"
			title="View Analytics"
		>
			<i className="fas fa-chart-line text-[10px]" aria-hidden="true" />
		</button>
		
		{!showDeletedPatients && !patient.deleted && (
			<button
				type="button"
				onClick={() => handleDeleteClick(id)}
				className="inline-flex items-center justify-center rounded-full border border-rose-200 px-1.5 py-1 text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 focus-visible:border-rose-300 focus-visible:text-rose-700 focus-visible:outline-none"
				title="Delete"
			>
				<i className="fas fa-trash text-[10px]" aria-hidden="true" />
			</button>
		)}
	</div>
</td>
```

## Step 4: Add Modal Component

Add the `<AnalyticsModal />` component at the end of your component's return statement, just before the closing tag (around line 3330):

```typescript
{/* Analytics Modal */}
{analyticsPatientId && (
	<AnalyticsModal
		isOpen={showAnalyticsModal}
		onClose={() => {
			setShowAnalyticsModal(false);
			setAnalyticsPatientId(null);
		}}
		patientId={analyticsPatientId}
	/>
)}
```

## Complete Example

Here's a complete code snippet showing the integration:

```typescript
// At the top with other imports
import AnalyticsModal from '@/components/AnalyticsModal';

// In your component function, add state:
const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
const [analyticsPatientId, setAnalyticsPatientId] = useState<string | null>(null);

// In your table row actions:
<button
	type="button"
	onClick={() => {
		setAnalyticsPatientId(patient.patientId);
		setShowAnalyticsModal(true);
	}}
	className="inline-flex items-center justify-center rounded-full border border-purple-200 px-1.5 py-1 text-purple-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-800"
	title="View Analytics"
>
	<i className="fas fa-chart-line text-[10px]" aria-hidden="true" />
</button>

// At the end of your component's JSX:
{analyticsPatientId && (
	<AnalyticsModal
		isOpen={showAnalyticsModal}
		onClose={() => {
			setShowAnalyticsModal(false);
			setAnalyticsPatientId(null);
		}}
		patientId={analyticsPatientId}
	/>
)}
```

## Notes

- The modal will automatically fetch and display analytics when opened
- The `patientId` prop should match the `patientId` field in your Firestore `sessions` collection
- Make sure your `.env.local` file has `OPENAI_API_KEY` set
- The modal handles loading, error, and success states automatically

