import cors from "cors";
import express from "express";
import { seedIfEmpty, seedPlans } from "./db.js";
import { billingRouter } from "./routes/billing.js";
import { deliveriesRouter } from "./routes/deliveries.js";
import { videosRouter } from "./routes/videos.js";
import { listWorkouts, workoutsRouter } from "./routes/workouts.js";

seedPlans();
seedIfEmpty();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 4000;

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/workouts", workoutsRouter);
app.use("/api/billing", billingRouter);
app.use("/api/deliveries", deliveriesRouter);
app.use("/api/videos", videosRouter);

app.get("/api/stats", (_req, res) => {
  const workouts = listWorkouts();
  const totalWorkouts = workouts.length;

  let totalVolume = 0;
  let totalSets = 0;
  for (const w of workouts) {
    for (const e of w.exercises) {
      totalVolume += e.sets * e.reps * e.weight;
      totalSets += e.sets;
    }
  }

  const days: Array<{ date: string; label: string; volume: number }> = [];
  const volumeByDate = new Map<string, number>();
  for (const w of workouts) {
    let vol = 0;
    for (const e of w.exercises) vol += e.sets * e.reps * e.weight;
    volumeByDate.set(w.date, (volumeByDate.get(w.date) ?? 0) + vol);
  }
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      date: iso,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      volume: Math.round(volumeByDate.get(iso) ?? 0),
    });
  }

  const workoutDates = new Set(workouts.map((w) => w.date));
  let streak = 0;
  const cursor = new Date(today);
  while (workoutDates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  res.json({
    totalWorkouts,
    totalVolume: Math.round(totalVolume),
    totalSets,
    streak,
    weeklyVolume: days,
  });
});

// Surface multer/upload errors as JSON instead of HTML stack traces.
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(400).json({ error: err.message || "Unexpected error" });
  }
);

app.listen(PORT, () => {
  console.log(`FitFocus API listening on http://localhost:${PORT}`);
});
