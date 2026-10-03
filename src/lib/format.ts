/** Arabic-first formatting helpers (RTL, Gregorian dates, tabular numbers). */

export function formatArabicDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short" }).format(date);
}

export function formatTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar", { hour: "2-digit", minute: "2-digit", hour12: false }).format(
    date,
  );
}

export function formatRelative(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  const minutes = Math.round(abs / 60000);
  if (minutes < 1) return diff >= 0 ? "الآن" : "الآن";
  if (minutes < 60) return rtf.format(Math.round(diff / 60000), "minute");
  const hours = Math.round(diff / 3600000);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(diff / 86400000);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  const months = Math.round(diff / 2592000000);
  return rtf.format(months, "month");
}

export function formatClock(totalMs: number, halfOffsetMs = 0): string {
  const total = Math.max(0, Math.floor((totalMs + halfOffsetMs) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatGoalDifference(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("");
}
