'use client';

import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
	// Always start with initialValue to ensure server and client render the same
	const [storedValue, setStoredValue] = useState<T>(initialValue);
	const [isHydrated, setIsHydrated] = useState(false);

	// Read from localStorage only after mount (client-side only)
	useEffect(() => {
		if (typeof window === 'undefined') return;
		
		try {
			const item = window.localStorage.getItem(key);
			if (item !== null) {
				setStoredValue(JSON.parse(item) as T);
			}
		} catch {
			// If parsing fails, keep initialValue
		} finally {
			setIsHydrated(true);
		}
	}, [key]);

	// Write to localStorage only after hydration
	useEffect(() => {
		if (!isHydrated || typeof window === 'undefined') return;
		try {
			window.localStorage.setItem(key, JSON.stringify(storedValue));
		} catch {
			// ignore write errors
		}
	}, [key, storedValue, isHydrated]);

	const setValue = (value: T | ((val: T) => T)) => {
		setStoredValue(prev => (value instanceof Function ? value(prev) : value));
	};

	return [storedValue, setValue] as const;
}

