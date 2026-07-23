'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ContactItem } from '@/app/registro-dashboard/components/types';

interface UseContactsParams {
    page: number;
    pageSize: number;
    search: string;
    levels: number[];
    seccionales: string[];
    colonias: string[];
    events: string[];
    municipios?: string[];
    coordinators?: string[];
    onlyOrphans: boolean;
    pyramidType: 'all' | 'votation' | 'defense';
    enabled: boolean; // only fetch when authenticated
}

interface UseContactsResult {
    contacts: ContactItem[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    totalFiltered: number | undefined;
    refetch: () => void;
}

interface StatsData {
    totalContacts: number;
    byLevel: Record<number, number>;
    byConsent: { yes: number; no: number; pending: number };
    uniqueSeccionales: string[];
    uniqueColonias: string[];
    uniqueMunicipios: string[];
    uniqueEventNames: string[];
    level4Coordinators?: { id: string; name: string; seccional?: string }[];
}

interface UseStatsResult {
    stats: StatsData | null;
    isLoading: boolean;
    refetch: () => void;
}

// --- Debounce helper ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

// =============================================================
// useContacts — paginated contacts from server API
// =============================================================
export function useContacts({
    page, pageSize, search, levels, seccionales, colonias,
    events, municipios = [], coordinators = [], onlyOrphans, pyramidType, enabled
}: UseContactsParams): UseContactsResult {
    const [contacts, setContacts] = useState<ContactItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [totalFiltered, setTotalFiltered] = useState<number | undefined>(undefined);

    // Debounce the search input to avoid firing on every keystroke
    const debouncedSearch = useDebounce(search, 300);
    const abortRef = useRef<AbortController | null>(null);

    const fetchContacts = useCallback(async () => {
        if (!enabled) return;

        // Cancel any in-flight request
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('pageSize', String(pageSize));
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (levels.length > 0) params.set('levels', levels.join(','));
            if (seccionales.length > 0) params.set('seccionales', seccionales.join(','));
            if (colonias.length > 0) params.set('colonias', colonias.join(','));
            if (events.length > 0) params.set('events', events.join(','));
            if (municipios.length > 0) params.set('municipios', municipios.join(','));
            if (coordinators.length > 0) params.set('coordinators', coordinators.join(','));
            if (onlyOrphans) params.set('onlyOrphans', 'true');
            if (pyramidType !== 'all') params.set('pyramidType', pyramidType);

            const res = await fetch(`/api/contactsApi?${params.toString()}`, {
                signal: controller.signal,
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            const data = await res.json();

            // Convert server timestamps back to Firestore-like objects for compatibility
            const processedContacts = data.contacts.map((c: any) => ({
                ...c,
                timestamp: c.timestamp?.seconds
                    ? { toDate: () => new Date(c.timestamp.seconds * 1000), seconds: c.timestamp.seconds }
                    : c.timestamp,
            }));

            setContacts(processedContacts);
            setHasMore(data.hasMore);
            setTotalFiltered(data.totalFiltered);
        } catch (err: any) {
            if (err.name === 'AbortError') return; // Ignore cancelled requests
            setError(err.message);
            console.error('useContacts error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, debouncedSearch, levels, seccionales, colonias, events, municipios, coordinators, onlyOrphans, pyramidType, enabled]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    return { contacts, isLoading, error, hasMore, totalFiltered, refetch: fetchContacts };
}

// =============================================================
// useStats — dashboard-level aggregations from server API
// =============================================================
export function useStats(enabled: boolean): UseStatsResult {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchStats = useCallback(async () => {
        if (!enabled) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/statsApi');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error('useStats error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Refresh stats every 60 seconds
    useEffect(() => {
        if (!enabled) return;
        const interval = setInterval(fetchStats, 60_000);
        return () => clearInterval(interval);
    }, [enabled, fetchStats]);

    return { stats, isLoading, refetch: fetchStats };
}

export type { StatsData };
