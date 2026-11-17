// Dates are YYYY-MM-DD strings in a location's own timezone, as Open-Meteo returns them.

// en-CA formats dates as YYYY-MM-DD.
const formatters = new Map<string, Intl.DateTimeFormat>();

/** The calendar date at `at` in an IANA timezone. */
export function localDate(at: Date, timeZone: string): string {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter.format(at);
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}
