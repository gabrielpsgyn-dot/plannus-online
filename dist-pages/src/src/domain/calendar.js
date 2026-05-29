import { addDays, parseISODate, toISODate } from "../services/date-utils.js";

export function isWorkingDay(calendar, isoDate) {
  const date = parseISODate(isoDate);
  const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  const exception = calendar.excecoes?.find((item) => item.data === isoDate);
  if (exception) return Boolean(exception.util);
  if (calendar.feriadosFixos?.includes(isoDate) || calendar.feriadosMoveis?.includes(isoDate)) return false;
  return calendar.diasUteisSemana.includes(weekday);
}

export function nextWorkingDate(calendar, preferredISO) {
  let current = parseISODate(preferredISO);
  while (!isWorkingDay(calendar, toISODate(current))) current = addDays(current, 1);
  return toISODate(current);
}

export function addWorkingDays(calendar, startISO, days) {
  let remaining = Math.max(0, Math.ceil(days));
  let current = parseISODate(startISO);
  if (remaining === 0) return nextWorkingDate(calendar, startISO);
  while (remaining > 0) {
    if (isWorkingDay(calendar, toISODate(current))) {
      remaining -= 1;
      if (remaining === 0) break;
    }
    current = addDays(current, 1);
  }
  return nextWorkingDate(calendar, toISODate(current));
}
