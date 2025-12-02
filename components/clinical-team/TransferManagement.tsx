'use client';

import { useState } from 'react';
import Transfer from '@/components/clinical-team/Transfer';
import SessionTransfer from '@/components/clinical-team/SessionTransfer';
import PageHeader from '@/components/PageHeader';

type TransferTab = 'patient' | 'session';

export default function TransferManagement() {
	const [activeTab, setActiveTab] = useState<TransferTab>('patient');

	return (
		<div className="min-h-svh bg-slate-50 px-6 py-10">
			<div className="mx-auto max-w-6xl space-y-6">
				<PageHeader title="Transfer Management" />

				{/* Tab Navigation */}
				<div className="border-b border-slate-200">
					<nav className="flex gap-4" role="tablist">
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'patient'}
							onClick={() => setActiveTab('patient')}
							className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
								activeTab === 'patient'
									? 'border-blue-600 text-blue-600'
									: 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
							}`}
						>
							<i className="fas fa-exchange-alt mr-2" aria-hidden="true" />
							Transfer Patients
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'session'}
							onClick={() => setActiveTab('session')}
							className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
								activeTab === 'session'
									? 'border-blue-600 text-blue-600'
									: 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
							}`}
						>
							<i className="fas fa-share-alt mr-2" aria-hidden="true" />
							Transfer Sessions
						</button>
					</nav>
				</div>

				{/* Tab Content */}
				<div className="mt-6">
					{activeTab === 'patient' ? <Transfer /> : <SessionTransfer />}
				</div>
			</div>
		</div>
	);
}

