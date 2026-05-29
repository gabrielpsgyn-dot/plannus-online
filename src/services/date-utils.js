export function parseISODate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
export function toISODate(date) { return date.toISOString().slice(0, 10); }
export function addDays(date, days) { const copy = new Date(date.getTime()); copy.setUTCDate(copy.getUTCDate() + days); return copy; }
export function diffDays(startISO, endISO) { return Math.round((parseISODate(endISO) - parseISODate(startISO)) / 86400000); }
export function formatDate(iso) { return iso ? parseISODate(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"; }
export function maxISODate(values) { return values.filter(Boolean).sort().at(-1) ?? null; }
