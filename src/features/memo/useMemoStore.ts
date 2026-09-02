import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ReadingItem, ReadingSettings, ReadingTldr, ReadingTonight } from '../../types';
import { generateId } from '../../utils/id';
import { chooseCandidate, currentNightKey, detectSource, extractUrls, labelFor, normalizeUrl } from './memoUtils';

export const DEFAULT_MEMO_SETTINGS: ReadingSettings = { hour: 21, minute: 0 };

interface MemoState {
    items: ReadingItem[];
    settings: ReadingSettings;
    tonight: ReadingTonight | null;

    /** Parse free text, add every new URL to the queue. Returns how many were added. */
    addFromText: (text: string, note?: string) => number;
    removeItem: (id: string) => void;
    archiveItem: (id: string) => void;
    restoreItem: (id: string) => void;
    markOpened: (id: string) => void;
    markRead: (id: string) => void;
    setTldr: (id: string, tldr: ReadingTldr) => void;
    setServeTime: (hour: number, minute: number) => void;

    /** Assign tonight's item if the night window is open and nothing is assigned yet. */
    ensureTonight: (now?: Date) => void;
    /** Swap tonight's item for the next candidate ("otro"). */
    skipTonight: () => void;
}

export const useMemoStore = create<MemoState>()(
    persist(
        (set, get) => ({
            items: [],
            settings: DEFAULT_MEMO_SETTINGS,
            tonight: null,

            addFromText: (text, note) => {
                const urls = extractUrls(text).map(normalizeUrl);
                const existing = new Set(get().items.map(i => i.url));
                const fresh = [...new Set(urls)].filter(u => !existing.has(u));
                if (fresh.length === 0) return 0;
                const now = Date.now();
                const additions: ReadingItem[] = fresh.map((url, idx) => ({
                    id: generateId(),
                    url,
                    label: labelFor(url),
                    ...(note?.trim() ? { note: note.trim() } : {}),
                    source: detectSource(url),
                    status: 'queue',
                    addedAt: now + idx,
                    servedDates: [],
                    openedAt: null,
                    readAt: null,
                }));
                set(s => ({ items: [...s.items, ...additions] }));
                get().ensureTonight();
                return fresh.length;
            },

            removeItem: (id) =>
                set(s => ({
                    items: s.items.filter(i => i.id !== id),
                    tonight: s.tonight?.itemId === id ? null : s.tonight,
                })),

            archiveItem: (id) =>
                set(s => ({ items: s.items.map(i => i.id === id ? { ...i, status: 'archived' } : i) })),

            restoreItem: (id) =>
                set(s => ({ items: s.items.map(i => i.id === id ? { ...i, status: 'queue', readAt: null, openedAt: null } : i) })),

            markOpened: (id) =>
                set(s => ({ items: s.items.map(i => i.id === id && !i.openedAt ? { ...i, openedAt: Date.now() } : i) })),

            markRead: (id) =>
                set(s => ({
                    items: s.items.map(i => i.id === id
                        ? { ...i, status: 'read', readAt: Date.now(), openedAt: i.openedAt ?? Date.now() }
                        : i),
                })),

            setTldr: (id, tldr) =>
                set(s => ({ items: s.items.map(i => i.id === id ? { ...i, tldr } : i) })),

            setServeTime: (hour, minute) =>
                set({ settings: { hour: Math.min(23, Math.max(0, hour)), minute: Math.min(59, Math.max(0, minute)) } }),

            ensureTonight: (now = new Date()) => {
                const { items, settings, tonight } = get();
                const { key, startedToday } = currentNightKey(now, settings);
                if (tonight?.date === key) return;         // already assigned for this night
                if (!startedToday) return;                 // never assign retroactively for last night
                const pick = chooseCandidate(items, tonight?.itemId ?? null);
                if (!pick) return;
                set(s => ({
                    tonight: { date: key, itemId: pick.id },
                    items: s.items.map(i => i.id === pick.id && !i.servedDates.includes(key)
                        ? { ...i, servedDates: [...i.servedDates, key] }
                        : i),
                }));
            },

            skipTonight: () => {
                const { items, tonight } = get();
                if (!tonight) return;
                const next = chooseCandidate(items, null, tonight.itemId);
                if (!next) return;
                const key = tonight.date;
                set(s => ({
                    tonight: { date: key, itemId: next.id },
                    items: s.items.map(i => i.id === next.id && !i.servedDates.includes(key)
                        ? { ...i, servedDates: [...i.servedDates, key] }
                        : i),
                }));
            },
        }),
        {
            name: 'congruence-memo-v1',
            version: 1,
        }
    )
);
