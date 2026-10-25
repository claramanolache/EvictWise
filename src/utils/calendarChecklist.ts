import type { CalendarEvent, CalendarTaskPriority } from "@/types";
export type PrioritySettings = Record<string, CalendarTaskPriority>;
const clamp = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
export function taskPrioritySettings(task: CalendarEvent, settings: PrioritySettings = {}): CalendarTaskPriority {
  const saved = settings[task.id];
  return { importance: clamp(saved?.importance, ({ court: 1, payment: 0.8, house: 0.6 })[task.type] ?? 0.5),
    effort: clamp(saved?.effort, 0.5), dependsOn: Array.isArray(saved?.dependsOn) ? [...new Set(saved.dependsOn.filter(id => typeof id === 'string'))] : [] };
}
// Compare date-only deadlines as local calendar days, avoiding daylight-saving hour shifts.
export function deadlineDay(date: CalendarEvent['date']): number | null {
  if (!Array.isArray(date) || date.length !== 3 || !date.every(Number.isInteger)) return null;
  const [year, month, day] = date;
  if (year < 1900 || year > 9999) return null;
  const value = new Date(Date.UTC(year, month, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month && value.getUTCDate() === day ? value.getTime() / 86400000 : null;
}
export function scheduleChecklist(events: CalendarEvent[], completed: ReadonlySet<string>, settings: PrioritySettings = {}, now = new Date()) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000;
  const ids = new Set(events.map(event => event.id));
  const config = new Map(events.map(task => [task.id, taskPrioritySettings(task, settings)]));
  return events.map(task => {
    const { importance, effort, dependsOn } = config.get(task.id)!;
    const pendingDependencies = dependsOn.filter(id => !ids.has(id) || !completed.has(id));
    const day = deadlineDay(task.date);
    const daysRemaining = day === null ? null : day - today;
    const urgency = daysRemaining === null ? 0 : 1 / (1 + Math.max(0, daysRemaining) / 7);
    const unlocks = completed.has(task.id) ? 0 : events.filter(other => {
      const dependencies = config.get(other.id)!.dependsOn;
      return other.id !== task.id && !completed.has(other.id) && dependencies.includes(task.id)
        && dependencies.every(id => id === task.id || (ids.has(id) && completed.has(id)));
    }).length;
    const dependencyImpact = Math.min(unlocks / 3, 1);
    return { task, importance, urgency, dependencyImpact, effort, unlocks, daysRemaining, pendingDependencies,
      score: 40 * importance + 50 * urgency + 10 * dependencyImpact - 10 * effort,
      completed: completed.has(task.id), blocked: pendingDependencies.length > 0 };
  }).sort((a,b) => Number(a.completed) - Number(b.completed)
    || (!a.completed ? Number(a.blocked) - Number(b.blocked) || b.score - a.score : 0)
    || (deadlineDay(a.task.date) ?? Infinity) - (deadlineDay(b.task.date) ?? Infinity)
    || a.task.name.localeCompare(b.task.name) || a.task.id.localeCompare(b.task.id));
}
export function sortChecklistEvents(events: CalendarEvent[], completed: ReadonlySet<string>, settings: PrioritySettings = {}, now = new Date()) {
  return scheduleChecklist(events, completed, settings, now).map(item => item.task);
}
