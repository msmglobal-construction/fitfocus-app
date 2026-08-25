import { Router } from "express";
import { activeSubscriptionFor } from "../billing.js";
import { db } from "../db.js";
import type { Delivery } from "../types.js";
import { listWorkouts } from "./workouts.js";

export const deliveriesRouter = Router();

function startOfWeekISO(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sun
  const diff = (day + 6) % 7; // days since Monday
  date.setDate(date.getDate() - diff);
  return date.toISOString().slice(0, 10);
}

const DEFAULT_PLAN: Array<{ day: string; focus: string; moves: string[] }> = [
  { day: "Monday", focus: "Full Body Strength", moves: ["Back Squat 4x6", "Bench Press 4x8", "Barbell Row 4x8"] },
  { day: "Wednesday", focus: "Push & Core", moves: ["Overhead Press 4x8", "Incline DB Press 3x10", "Plank 3x60s"] },
  { day: "Friday", focus: "Pull & Legs", moves: ["Deadlift 3x5", "Pull-ups 4xAMRAP", "Walking Lunges 3x12"] },
];

/** Build a weekly plan from the athlete's recent workouts, falling back to a template. */
function buildWeeklyPlan(): { title: string; body: string } {
  const weekOf = startOfWeekISO();
  const workouts = listWorkouts().slice(0, 6);

  const days: Array<{ day: string; focus: string; moves: string[] }> = [];
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (workouts.length > 0) {
    const templates = workouts.slice(0, 3);
    const schedule = [0, 2, 4]; // Mon, Wed, Fri
    templates.forEach((w, i) => {
      days.push({
        day: dayNames[schedule[i] ?? i],
        focus: w.name,
        moves: w.exercises.map(
          (e) =>
            `${e.name} ${e.sets}x${e.reps}${e.weight > 0 ? ` @ ${e.weight} lbs` : ""}`
        ),
      });
    });
  } else {
    days.push(...DEFAULT_PLAN);
  }

  const lines: string[] = [
    `Your Weekly Workout Plan — week of ${weekOf}`,
    "",
    "Here is your training plan for the week. Rest on the off days, stay hydrated, and log every session in FitFocus!",
    "",
  ];
  for (const d of days) {
    lines.push(`${d.day} — ${d.focus}`);
    for (const m of d.moves) lines.push(`  • ${m}`);
    lines.push("");
  }
  lines.push("Have a great week 💪 — Team FitFocus");

  return { title: `FitFocus Weekly Plan · week of ${weekOf}`, body: lines.join("\n") };
}

deliveriesRouter.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM deliveries ORDER BY id DESC")
    .all() as Delivery[];
  res.json(rows);
});

// Generate and "send" this week's plan through the subscription's channel.
deliveriesRouter.post("/run", (_req, res) => {
  const sub = activeSubscriptionFor("weekly_delivery");
  if (!sub) {
    return res
      .status(402)
      .json({ error: "An active Weekly Workout Plan subscription is required." });
  }

  const channel = (sub.delivery_method ?? "in_app") as "email" | "in_app";
  const recipient = channel === "email" ? sub.email ?? "" : "In-app inbox";
  const weekOf = startOfWeekISO();
  const { title, body } = buildWeeklyPlan();

  const info = db
    .prepare(
      `INSERT INTO deliveries (subscription_id, week_of, channel, recipient, title, body, status)
       VALUES (?, ?, ?, ?, ?, ?, 'sent')`
    )
    .run(sub.id, weekOf, channel, recipient, title, body);

  if (channel === "email") {
    // No SMTP configured in this environment; the send is simulated and the
    // rendered message is persisted so it can be previewed in the app.
    console.log(`[delivery] Simulated email to ${recipient}: ${title}`);
  }

  const delivery = db
    .prepare("SELECT * FROM deliveries WHERE id = ?")
    .get(info.lastInsertRowid as number) as Delivery;
  res.status(201).json(delivery);
});
