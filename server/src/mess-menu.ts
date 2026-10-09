import { z } from 'zod';

export const MENU_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export function indiaWeekday(now = new Date()): number {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).format(now);
  return MENU_DAYS.indexOf(day as typeof MENU_DAYS[number]) + 1;
}

export const menuQuerySchema = z.object({ weekday: z.coerce.number().int().min(1).max(7).optional() }).strict();
export const menuInputSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  breakfast: z.string().trim().min(1).max(2000),
  lunch: z.string().trim().min(1).max(2000),
  dinner: z.string().trim().min(1).max(2000),
  specialNotice: z.string().trim().max(2000).optional(),
}).strict();

export function menuResponse(row: { weekday: number; breakfast: string; lunch: string; dinner: string; special_notice: string }, messName: string) {
  return { messName, day: MENU_DAYS[row.weekday - 1], weekday: row.weekday, todayWeekday: indiaWeekday(),
    breakfast: row.breakfast, lunch: row.lunch, dinner: row.dinner, specialNotice: row.special_notice };
}
