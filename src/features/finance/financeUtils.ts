// Returns the events that apply on a given date, RECURRING-AWARE — mirrors the
// matching logic in DailyProjectionEngine. A recurring event repeats on its
// day-of-month for every month from its start month onward. Non-recurring
// events match only their exact date.
export function eventsOnDate(events: any[], dateStr: string) {
    const [y, m, d] = dateStr.split('-');
    const targetYM = `${y}-${m}`;
    const dayOfMonth = parseInt(d, 10);
    const daysInMonth = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    return events.filter((e: any) => {
        if (e.isRecurring) {
            const [eY, eM, eD] = e.date.split('-');
            const startYM = `${eY}-${eM}`;
            if (targetYM < startYM) return false;
            const effectiveDay = Math.min(parseInt(eD, 10), daysInMonth);
            return effectiveDay === dayOfMonth;
        }
        return e.date === dateStr;
    });
}
