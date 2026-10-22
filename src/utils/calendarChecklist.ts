import type { CalendarEvent } from "@/types";

// Keep unfinished tasks first, with the earliest deadlines (including overdue ones)
// at the top. Sorting a copy preserves the calendar's stored event order.
export function sortChecklistEvents(events: CalendarEvent[], completed: ReadonlySet<string>) {
  return [...events].sort((a, b) =>
    Number(completed.has(a.id)) - Number(completed.has(b.id)) ||
    a.date[0] - b.date[0] || a.date[1] - b.date[1] || a.date[2] - b.date[2] ||
    a.name.localeCompare(b.name),
  );
}
