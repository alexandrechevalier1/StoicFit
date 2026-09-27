export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map((part) => Number(part));
  return new Date(year, month - 1, day);
}

export function addDaysToDateKey(dateKey: string, offsetDays: number): string {
  const nextDate = parseLocalDateKey(dateKey);
  nextDate.setDate(nextDate.getDate() + offsetDays);
  return getLocalDateKey(nextDate);
}

export function getWeekRange(dateKey: string): string[] {
  const currentDate = parseLocalDateKey(dateKey);
  const dayIndex = currentDate.getDay();
  const daysFromMonday = dayIndex === 0 ? 6 : dayIndex - 1;
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() - daysFromMonday);

  return Array.from({ length: 7 }, (_, index) => getLocalDateKey(addDays(monday, index)));
}

export function isSameDateKey(left: string, right: string): boolean {
  return left === right;
}

function addDays(date: Date, offsetDays: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + offsetDays);
  return nextDate;
}