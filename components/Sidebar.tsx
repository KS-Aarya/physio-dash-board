'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useCallback, useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export type SidebarLink = { href: string; label: string; icon: string };

interface SidebarProps {
	title: string;
	links: SidebarLink[];
	onLinkClick?: (href: string) => void;
	activeHref?: string;
	onProfileClick?: () => void;
}

interface UserProfile {
	userName?: string;
	profileImage?: string;
}

export default function Sidebar({ title, links, onLinkClick, activeHref, onProfileClick }: SidebarProps) {
	const pathname = usePathname();
	const router = useRouter();
	const { user } = useAuth();
	const [userProfile, setUserProfile] = useState<UserProfile>({});

	// Load user profile data
	useEffect(() => {
		const loadProfile = async () => {
			if (!user?.email) return;

			try {
				const staffQuery = query(collection(db, 'staff'), where('userEmail', '==', user.email));
				const querySnapshot = await getDocs(staffQuery);

				if (!querySnapshot.empty) {
					const data = querySnapshot.docs[0].data();
					setUserProfile({
						userName: data.userName || user.displayName || '',
						profileImage: data.profileImage || '',
					});
				} else {
					setUserProfile({
						userName: user.displayName || user.email?.split('@')[0] || '',
						profileImage: '',
					});
				}
			} catch (error) {
				console.error('Failed to load user profile:', error);
				setUserProfile({
					userName: user.displayName || user.email?.split('@')[0] || '',
					profileImage: '',
				});
			}
		};

		loadProfile();
	}, [user]);

	const handleLogout = useCallback(async () => {
		try {
			// Prefer Firebase signOut when available
			if (auth) {
				await signOut(auth);
			}
		} catch {
			// ignore Firebase errors; still proceed to local cleanup
		} finally {
			try {
				localStorage.removeItem('currentUser');
			} catch {
				// ignore storage errors
			}
			router.replace('/login');
		}
	}, [router]);

	return (
		<nav
			className="fixed left-0 top-0 z-40 flex h-svh w-64 flex-col bg-blue-700 text-white shadow-lg"
			aria-label="Sidebar Navigation"
			suppressHydrationWarning
		>
			<div className="px-5 py-4 border-b border-white/10">
				<h4 className="flex items-center text-lg font-semibold mb-3">
					<i className="fas fa-house-medical mr-2" aria-hidden="true" />
					{title}
				</h4>
				{/* Profile Section */}
				{onProfileClick ? (
					<button
						type="button"
						onClick={onProfileClick}
						className="flex w-full items-center gap-3 mt-4 pt-4 border-t border-white/10 hover:bg-white/5 rounded-lg px-2 py-2 transition"
					>
						<div className="flex-shrink-0">
							{userProfile.profileImage ? (
								<img
									src={userProfile.profileImage}
									alt={userProfile.userName || 'User'}
									className="h-12 w-12 rounded-full object-cover border-2 border-white/30"
								/>
							) : (
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 border-2 border-white/30">
									<i className="fas fa-user text-white text-lg" aria-hidden="true" />
								</div>
							)}
						</div>
						<div className="flex-1 min-w-0 text-left">
							<p className="text-xs text-blue-100 font-medium">Hi, Welcome</p>
							<p className="text-sm font-semibold text-white truncate">
								{userProfile.userName || user?.displayName || user?.email?.split('@')[0] || 'User'}
							</p>
						</div>
						<i className="fas fa-chevron-right text-white/50 text-xs" aria-hidden="true" />
					</button>
				) : (
					<div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
						<div className="flex-shrink-0">
							{userProfile.profileImage ? (
								<img
									src={userProfile.profileImage}
									alt={userProfile.userName || 'User'}
									className="h-12 w-12 rounded-full object-cover border-2 border-white/30"
								/>
							) : (
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 border-2 border-white/30">
									<i className="fas fa-user text-white text-lg" aria-hidden="true" />
								</div>
							)}
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-xs text-blue-100 font-medium">Hi, Welcome</p>
							<p className="text-sm font-semibold text-white truncate">
								{userProfile.userName || user?.displayName || user?.email?.split('@')[0] || 'User'}
							</p>
						</div>
					</div>
				)}
			</div>

			<ul className="flex-1 space-y-1 px-2 py-3 overflow-y-auto" role="menu">
				{links.map(link => {
					const isActive = activeHref
						? activeHref === link.href
						: pathname === link.href ||
						  (pathname?.startsWith(link.href) && link.href !== '/');
					
					if (onLinkClick) {
						return (
							<li key={link.href} role="none">
								<button
									type="button"
									onClick={() => onLinkClick(link.href)}
									role="menuitem"
									className={[
										'flex w-full items-center rounded-md px-3 py-2 text-sm transition text-left',
										isActive
											? 'bg-blue-600 text-white'
											: 'text-blue-50 hover:bg-blue-600/70 hover:text-white',
									].join(' ')}
									aria-current={isActive ? 'page' : undefined}
								>
									<i className={`${link.icon} mr-2 text-sm`} aria-hidden="true" />
									<span>{link.label}</span>
								</button>
							</li>
						);
					}
					
					return (
						<li key={link.href} role="none">
							<Link
								href={link.href}
								role="menuitem"
								className={[
									'flex items-center rounded-md px-3 py-2 text-sm transition',
									isActive
										? 'bg-blue-600 text-white'
										: 'text-blue-50 hover:bg-blue-600/70 hover:text-white',
								].join(' ')}
								aria-current={isActive ? 'page' : undefined}
							>
								<i className={`${link.icon} mr-2 text-sm`} aria-hidden="true" />
								<span>{link.label}</span>
							</Link>
						</li>
					);
				})}
			</ul>

			<div className="mt-auto border-t border-white/10 px-2 py-3">
				<button
					type="button"
					onClick={handleLogout}
					className="flex w-full items-center justify-center rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-red-100 hover:bg-white/15"
				>
					<i className="fas fa-sign-out-alt mr-2" aria-hidden="true" />
					Logout
				</button>
			</div>
		</nav>
	);
}