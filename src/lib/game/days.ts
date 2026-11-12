export type DayKey = string;

export type DayEntry = {
  xp: number;
  quiz: number;
  cards: number;
  challenges: number;
  labs: number;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local-time calendar day, formatted as `YYYY-MM-DD`. */
export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Adds calendar days without letting DST shifts change the day. */
export function addDays(day: DayKey, delta: number): DayKey {
  const [year = '1970', month = '1', date = '1'] = day.split('-');
  const shifted = new Date(Number(year), Number(month) - 1, Number(date) + delta, 12);
  return toDayKey(shifted);
}

/** ISO-8601 week key, e.g. `2026-W01`. */
export function isoWeekKey(value: Date | DayKey): string {
  const day = typeof value === 'string' ? value : toDayKey(value);
  const [year = '1970', month = '1', date = '1'] = day.split('-');

  const thursday = new Date(Date.UTC(Number(year), Number(month) - 1, Number(date)));
  const weekday = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - weekday);

  const isoYear = thursday.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / 86_400_000 + 1) / 7);

  return `${isoYear}-W${pad(week)}`;
}

/** Any practice action makes a day active, including a wrong answer or a lab check. */
export function isActiveDay(dayEntry: Partial<DayEntry>): boolean {
  return (
    (dayEntry.xp ?? 0) > 0 ||
    (dayEntry.quiz ?? 0) + (dayEntry.cards ?? 0) + (dayEntry.challenges ?? 0) + (dayEntry.labs ?? 0) > 0
  );
}
