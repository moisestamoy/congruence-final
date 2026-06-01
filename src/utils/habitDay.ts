import { subDays } from 'date-fns';

/**
 * Returns the current "habit day" using a 5 AM reset boundary.
 * - Before 05:00 → previous day (the day hasn't reset yet)
 * - At/after 05:00 → current day
 *
 * This means: if it's 3 AM, you're still on "yesterday" and can
 * mark yesterday's habits without the day having flipped.
 */
export function getHabitDay(): Date {
    const now = new Date();
    return now.getHours() < 5 ? subDays(now, 1) : now;
}
