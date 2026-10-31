// Local calendar days as "YYYY-MM-DD" (spec: log_entries.date, weigh_ins.date, weekly_targets.week_start).

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local calendar day of a date, as "YYYY-MM-DD". */
export function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear())}-${month}-${day}`;
}

/** Parses "YYYY-MM-DD" into a UTC midnight date; rejects impossible days (2026-02-30). */
function parseDateKey(key: string): Date {
  const match = DATE_KEY.exec(key);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : null;
  if (date?.toISOString().slice(0, 10) !== key) {
    throw new RangeError(`invalid date key: ${key}`);
  }
  return date;
}

export function isDateKey(key: string): boolean {
  try {
    parseDateKey(key);
    return true;
  } catch {
    return false;
  }
}

/** Monday of the week containing the day ("YYYY-MM-DD"). */
export function weekStart(key: string): string {
  const date = parseDateKey(key);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}
