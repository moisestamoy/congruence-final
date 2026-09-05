import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../../utils/id';
import { FlightOffer, FlightQuery, SavedSearch } from './types';

const nextMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 7);
};

export const DEFAULT_QUERY: FlightQuery = {
    origin: '',
    destination: '',
    departDate: nextMonth(),
    returnDate: null,
    maxStops: 1,
    currency: 'EUR',
    maxPrice: null,
};

interface FlightState {
    query: FlightQuery;
    results: FlightOffer[];
    lastFetchedAt: string | null;
    savedSearches: SavedSearch[];
    recentAirports: string[];

    setQuery: (patch: Partial<FlightQuery>) => void;
    setResults: (flights: FlightOffer[], fetchedAt: string) => void;
    clearResults: () => void;
    rememberAirports: (...codes: string[]) => void;

    saveSearch: (name: string, query: FlightQuery, targetPrice: number | null) => void;
    updateSavedSearch: (id: string, patch: Partial<Pick<SavedSearch, 'name' | 'targetPrice'>>) => void;
    recordCheck: (id: string, bestPrice: number | null, bestOfferId: string | null) => void;
    removeSavedSearch: (id: string) => void;
}

export const useFlightStore = create<FlightState>()(
    persist(
        (set) => ({
            query: DEFAULT_QUERY,
            results: [],
            lastFetchedAt: null,
            savedSearches: [],
            recentAirports: [],

            setQuery: (patch) => set((s) => ({ query: { ...s.query, ...patch } })),
            setResults: (flights, fetchedAt) => set({ results: flights, lastFetchedAt: fetchedAt }),
            clearResults: () => set({ results: [], lastFetchedAt: null }),
            rememberAirports: (...codes) =>
                set((s) => {
                    const clean = codes.map(c => c.toUpperCase()).filter(c => /^[A-Z]{3}$/.test(c));
                    const merged = [...clean, ...s.recentAirports.filter(c => !clean.includes(c))];
                    return { recentAirports: merged.slice(0, 8) };
                }),

            saveSearch: (name, query, targetPrice) =>
                set((s) => ({
                    savedSearches: [
                        { id: generateId(), name, query, targetPrice, createdAt: Date.now(), lastCheckedAt: null, lastBestPrice: null, lastBestOfferId: null },
                        ...s.savedSearches,
                    ],
                })),
            updateSavedSearch: (id, patch) =>
                set((s) => ({ savedSearches: s.savedSearches.map(x => x.id === id ? { ...x, ...patch } : x) })),
            recordCheck: (id, bestPrice, bestOfferId) =>
                set((s) => ({
                    savedSearches: s.savedSearches.map(x =>
                        x.id === id ? { ...x, lastCheckedAt: Date.now(), lastBestPrice: bestPrice, lastBestOfferId: bestOfferId } : x
                    ),
                })),
            removeSavedSearch: (id) =>
                set((s) => ({ savedSearches: s.savedSearches.filter(x => x.id !== id) })),
        }),
        {
            name: 'congruence-flights',
            partialize: (s) => ({ query: s.query, savedSearches: s.savedSearches, recentAirports: s.recentAirports }),
        }
    )
);
