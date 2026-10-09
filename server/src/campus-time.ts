export function timeInMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59) return null;
  if (match[3]) {
    if (hour < 1 || hour > 12) return null;
    hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  } else if (hour > 23) return null;
  return hour * 60 + minute;
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function overlaps(start: string, end: string, otherStart: string, otherEnd: string): boolean {
  const times = [start, end, otherStart, otherEnd].map(timeInMinutes);
  if (times.some(time => time === null)) return false;
  return times[0]! < times[3]! && times[1]! > times[2]!;
}
