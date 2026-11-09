// Date helpers working on the *local* calendar day.
//
// Days sent to the backend are "YYYY-MM-DD" strings built from the local
// date. Never use toISOString() for that: it converts to UTC first, which
// gives the previous day for any time between local midnight and the UTC
// offset (e.g. 00:00 - 02:00 in France).

/** Format a date as "YYYY-MM-DD" using its local calendar day. */
export function toYMD(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** Local midnight of the given date (today by default). */
export function startOfDay(date: Date = new Date()): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

/** A copy of the date moved by the given number of calendar days. */
export function addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

/** Monday of the current week, at local midnight. On Sunday, the next Monday. */
export function getMonday(): Date {
    const today = startOfDay();
    const dayOfWeek = today.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
    const offset = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
    return addDays(today, offset);
}

/** Sunday of the week starting at the given Monday, at local midnight. */
export function getSundayFromMonday(monday: Date): Date {
    return addDays(startOfDay(monday), 6);
}
