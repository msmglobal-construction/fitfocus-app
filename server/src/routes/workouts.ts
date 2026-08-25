import { Router } from "express";
import { db } from "../db.js";
import type { Exercise, Workout, WorkoutInput } from "../types.js";

export const workoutsRouter = Router();

export function getWorkout(id: number): Workout | undefined {
  const workout = db
    .prepare("SELECT * FROM workouts WHERE id = ?")
    .get(id) as Omit<Workout, "exercises"> | undefined;
  if (!workout) return undefined;
  const exercises = db
    .prepare("SELECT * FROM exercises WHERE workout_id = ? ORDER BY id")
    .all(id) as Exercise[];
  return { ...workout, exercises };
}

export function listWorkouts(): Workout[] {
  const workouts = db
    .prepare("SELECT * FROM workouts ORDER BY date DESC, id DESC")
    .all() as Array<Omit<Workout, "exercises">>;
  const exercises = db
    .prepare("SELECT * FROM exercises ORDER BY id")
    .all() as Exercise[];
  const byWorkout = new Map<number, Exercise[]>();
  for (const ex of exercises) {
    const arr = byWorkout.get(ex.workout_id) ?? [];
    arr.push(ex);
    byWorkout.set(ex.workout_id, arr);
  }
  return workouts.map((w) => ({ ...w, exercises: byWorkout.get(w.id) ?? [] }));
}

workoutsRouter.get("/", (_req, res) => {
  res.json(listWorkouts());
});

workoutsRouter.get("/:id", (req, res) => {
  const workout = getWorkout(Number(req.params.id));
  if (!workout) return res.status(404).json({ error: "Workout not found" });
  res.json(workout);
});

workoutsRouter.post("/", (req, res) => {
  const body = req.body as WorkoutInput;
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return res.status(400).json({ error: "Workout name is required" });
  }
  if (typeof body.date !== "string" || !body.date.trim()) {
    return res.status(400).json({ error: "Workout date is required" });
  }
  const exercises = Array.isArray(body.exercises) ? body.exercises : [];

  const insertWorkout = db.prepare(
    "INSERT INTO workouts (name, date, notes) VALUES (?, ?, ?)"
  );
  const insertExercise = db.prepare(
    "INSERT INTO exercises (workout_id, name, sets, reps, weight) VALUES (?, ?, ?, ?, ?)"
  );

  const tx = db.transaction(() => {
    const info = insertWorkout.run(
      body.name.trim(),
      body.date.trim(),
      (body.notes ?? "").trim()
    );
    const workoutId = info.lastInsertRowid as number;
    for (const e of exercises) {
      if (!e || typeof e.name !== "string" || !e.name.trim()) continue;
      insertExercise.run(
        workoutId,
        e.name.trim(),
        Number(e.sets) || 0,
        Number(e.reps) || 0,
        Number(e.weight) || 0
      );
    }
    return workoutId;
  });

  const newId = tx();
  res.status(201).json(getWorkout(newId));
});

workoutsRouter.delete("/:id", (req, res) => {
  const info = db
    .prepare("DELETE FROM workouts WHERE id = ?")
    .run(Number(req.params.id));
  if (info.changes === 0) {
    return res.status(404).json({ error: "Workout not found" });
  }
  res.status(204).end();
});
