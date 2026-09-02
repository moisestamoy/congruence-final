import { format, subDays } from 'date-fns';
import { ReadingItem, ReadingSettings, ReadingSource } from '../../types';

const X_HOSTS = ['x.com', 'twitter.com', 'mobile.twitter.com', 'www.x.com', 'www.twitter.com'];

/** Pull every http(s) URL out of free text (handles pasted lists and share-sheet text). */
export function extractUrls(text: string): string[] {
    const found = text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
    return found.map(u => u.replace(/[.,;:!?)]+$/, ''));
}

/** Strip tracking params and trailing slashes so the same link is never saved twice. */
export function normalizeUrl(raw: string): string {
    try {
        const u = new URL(raw.trim());
        u.hash = '';
        if (X_HOSTS.includes(u.hostname)) {
            u.hostname = 'x.com';
            u.search = '';
        } else {
            [...u.searchParams.keys()]
                .filter(k => /^(utm_|fbclid|gclid|ref|s|t)$/i.test(k) || k.startsWith('utm_'))
                .forEach(k => u.searchParams.delete(k));
        }
        return u.toString().replace(/\/$/, '');
    } catch {
        return raw.trim();
    }
}

export function detectSource(url: string): ReadingSource {
    try {
        return X_HOSTS.includes(new URL(url).hostname) ? 'x' : 'web';
    } catch {
        return 'web';
    }
}

/** "@handle" for X links, bare hostname for everything else. */
export function labelFor(url: string): string {
    try {
        const u = new URL(url);
        if (X_HOSTS.includes(u.hostname)) {
            const [handle] = u.pathname.split('/').filter(Boolean);
            if (handle && handle !== 'i') return `@${handle}`;
            return 'x.com';
        }
        return u.hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

export function isXArticle(url: string): boolean {
    return /x\.com\/i\/article\//.test(url);
}

// ── Night window ───────────────────────────────────────────────────────────
// A "night" starts at the configured hour and runs until the next day's hour.
// Its key is the calendar date on which it started.

export function serveTimeToday(now: Date, s: ReadingSettings): Date {
    const d = new Date(now);
    d.setHours(s.hour, s.minute, 0, 0);
    return d;
}

/** Key of the night that is currently open, or null if the first night hasn't started. */
export function currentNightKey(now: Date, s: ReadingSettings): { key: string; startedToday: boolean } {
    const start = serveTimeToday(now, s);
    if (now >= start) return { key: format(now, 'yyyy-MM-dd'), startedToday: true };
    return { key: format(subDays(now, 1), 'yyyy-MM-dd'), startedToday: false };
}

export function formatServeTime(s: ReadingSettings): string {
    return `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`;
}

// ── Picking ────────────────────────────────────────────────────────────────

/**
 * Choose what to serve tonight.
 *  - If last night's item was ignored and has only been offered once, repeat it
 *    ("el mismo si sigue siendo el mejor").
 *  - Otherwise: the queue item offered the fewest times, oldest first.
 */
export function chooseCandidate(items: ReadingItem[], previousId: string | null, excludeId: string | null = null): ReadingItem | null {
    const queue = items.filter(i => i.status === 'queue' && i.id !== excludeId);
    if (queue.length === 0) return null;

    const prev = previousId ? queue.find(i => i.id === previousId) : undefined;
    if (prev && prev.servedDates.length < 2 && !prev.openedAt) return prev;

    return [...queue].sort((a, b) => {
        if (a.servedDates.length !== b.servedDates.length) return a.servedDates.length - b.servedDates.length;
        return a.addedAt - b.addedAt;
    })[0];
}

/** Consecutive nights (ending today or yesterday) with at least one read. */
export function readStreak(items: ReadingItem[], now: Date): number {
    const days = new Set(items.filter(i => i.readAt).map(i => format(new Date(i.readAt!), 'yyyy-MM-dd')));
    let streak = 0;
    let cursor = now;
    if (!days.has(format(cursor, 'yyyy-MM-dd'))) cursor = subDays(cursor, 1);
    while (days.has(format(cursor, 'yyyy-MM-dd'))) {
        streak += 1;
        cursor = subDays(cursor, 1);
    }
    return streak;
}
