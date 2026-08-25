import type { Exercise } from "./types";

export function workoutVolume(exercises: Exercise[]): number {
  return exercises.reduce((sum, e) => sum + e.sets * e.reps * e.weight, 0);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
