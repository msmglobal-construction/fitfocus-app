import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, "../data/fittrack.db");
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sets INTEGER NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    weight REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL,
    interval TEXT NOT NULL DEFAULT 'month',
    features TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    delivery_method TEXT,
    email TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    canceled_at TEXT,
    FOREIGN KEY (plan_key) REFERENCES plans(key)
  );

  CREATE TABLE IF NOT EXISTS charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid',
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    week_of TEXT NOT NULL,
    channel TEXT NOT NULL,
    recipient TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    trainer TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    filename TEXT NOT NULL,
    mime TEXT NOT NULL DEFAULT 'video/mp4',
    size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function seedPlans(): void {
  const plans: Array<{
    key: string;
    name: string;
    description: string;
    price_cents: number;
    features: string[];
  }> = [
    {
      key: "weekly_delivery",
      name: "Weekly Workout Plan",
      description:
        "A fresh, personalized weekly workout plan delivered to you every week by email or in the app.",
      price_cents: 999,
      features: [
        "New workout plan every week",
        "Delivered by email or in-app",
        "Built from your training history",
        "Cancel anytime",
      ],
    },
    {
      key: "trainer_videos",
      name: "Trainer Video Library",
      description:
        "Stream follow-along videos of our gym's trainers performing the workouts, on any device.",
      price_cents: 1999,
      features: [
        "Unlimited follow-along videos",
        "Real trainers from your gym",
        "New uploads added regularly",
        "Cancel anytime",
      ],
    },
  ];

  const upsert = db.prepare(
    `INSERT INTO plans (key, name, description, price_cents, features)
     VALUES (@key, @name, @description, @price_cents, @features)
     ON CONFLICT(key) DO UPDATE SET
       name = excluded.name,
       description = excluded.description,
       price_cents = excluded.price_cents,
       features = excluded.features`
  );
  const tx = db.transaction(() => {
    for (const p of plans) {
      upsert.run({ ...p, features: JSON.stringify(p.features) });
    }
  });
  tx();
}

export function seedIfEmpty(): void {
  const count = db.prepare("SELECT COUNT(*) AS c FROM workouts").get() as {
    c: number;
  };
  if (count.c > 0) return;

  const today = new Date();
  const dayISO = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };

  const seed: Array<{
    name: string;
    date: string;
    notes: string;
    exercises: Array<{ name: string; sets: number; reps: number; weight: number }>;
  }> = [
    {
      name: "Push Day",
      date: dayISO(5),
      notes: "Felt strong on bench.",
      exercises: [
        { name: "Bench Press", sets: 4, reps: 8, weight: 135 },
        { name: "Overhead Press", sets: 3, reps: 10, weight: 75 },
        { name: "Tricep Pushdown", sets: 3, reps: 12, weight: 50 },
      ],
    },
    {
      name: "Pull Day",
      date: dayISO(3),
      notes: "New PR on rows.",
      exercises: [
        { name: "Deadlift", sets: 3, reps: 5, weight: 225 },
        { name: "Barbell Row", sets: 4, reps: 8, weight: 115 },
        { name: "Lat Pulldown", sets: 3, reps: 12, weight: 90 },
      ],
    },
    {
      name: "Leg Day",
      date: dayISO(1),
      notes: "Legs are toast.",
      exercises: [
        { name: "Back Squat", sets: 5, reps: 5, weight: 185 },
        { name: "Romanian Deadlift", sets: 3, reps: 10, weight: 135 },
        { name: "Leg Press", sets: 3, reps: 12, weight: 300 },
      ],
    },
  ];

  const insertWorkout = db.prepare(
    "INSERT INTO workouts (name, date, notes) VALUES (?, ?, ?)"
  );
  const insertExercise = db.prepare(
    "INSERT INTO exercises (workout_id, name, sets, reps, weight) VALUES (?, ?, ?, ?, ?)"
  );

  const tx = db.transaction(() => {
    for (const w of seed) {
      const info = insertWorkout.run(w.name, w.date, w.notes);
      const workoutId = info.lastInsertRowid as number;
      for (const e of w.exercises) {
        insertExercise.run(workoutId, e.name, e.sets, e.reps, e.weight);
      }
    }
  });
  tx();
}
