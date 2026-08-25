// In-memory demo backend used when no real API is reachable (e.g. a frontend-only
// Netlify deploy). It mirrors the Express API so every screen and flow works.
// State lives for the browser session only and resets on reload.
import type {
  Charge,
  Delivery,
  Plan,
  Stats,
  SubscribeInput,
  Subscription,
  VideosResponse,
  Workout,
  WorkoutInput,
} from "./types";

const DEMO_VIDEO = "/demo/trainer-demo.mp4";

function dayISO(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function addMonthISO(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString();
}

interface DemoVideo {
  id: number;
  title: string;
  trainer: string;
  description: string;
  mime: string;
  size: number;
  created_at: string;
  streamUrl: string;
}

const PLAN_DEFS: Record<string, Omit<Plan, "active">> = {
  weekly_delivery: {
    id: 1,
    key: "weekly_delivery",
    name: "Weekly Workout Plan",
    description:
      "A fresh, personalized weekly workout plan delivered to you every week by email or in the app.",
    price_cents: 999,
    interval: "month",
    features: [
      "New workout plan every week",
      "Delivered by email or in-app",
      "Built from your training history",
      "Cancel anytime",
    ],
  },
  trainer_videos: {
    id: 2,
    key: "trainer_videos",
    name: "Trainer Video Library",
    description:
      "Stream follow-along videos of our gym's trainers performing the workouts, on any device.",
    price_cents: 1999,
    interval: "month",
    features: [
      "Unlimited follow-along videos",
      "Real trainers from your gym",
      "New uploads added regularly",
      "Cancel anytime",
    ],
  },
};

class DemoStore {
  private workouts: Workout[] = [];
  private subscriptions: Subscription[] = [];
  private deliveries: Delivery[] = [];
  private videos: DemoVideo[] = [];
  private seq = 1000;

  constructor() {
    this.seed();
  }

  private id(): number {
    return ++this.seq;
  }

  private seed(): void {
    this.workouts = [
      {
        id: 1,
        name: "Push Day",
        date: dayISO(5),
        notes: "Felt strong on bench.",
        created_at: dayISO(5),
        exercises: [
          { id: 1, workout_id: 1, name: "Bench Press", sets: 4, reps: 8, weight: 135 },
          { id: 2, workout_id: 1, name: "Overhead Press", sets: 3, reps: 10, weight: 75 },
          { id: 3, workout_id: 1, name: "Tricep Pushdown", sets: 3, reps: 12, weight: 50 },
        ],
      },
      {
        id: 2,
        name: "Pull Day",
        date: dayISO(3),
        notes: "New PR on rows.",
        created_at: dayISO(3),
        exercises: [
          { id: 4, workout_id: 2, name: "Deadlift", sets: 3, reps: 5, weight: 225 },
          { id: 5, workout_id: 2, name: "Barbell Row", sets: 4, reps: 8, weight: 115 },
          { id: 6, workout_id: 2, name: "Lat Pulldown", sets: 3, reps: 12, weight: 90 },
        ],
      },
      {
        id: 3,
        name: "Leg Day",
        date: dayISO(1),
        notes: "Legs are toast.",
        created_at: dayISO(1),
        exercises: [
          { id: 7, workout_id: 3, name: "Back Squat", sets: 5, reps: 5, weight: 185 },
          { id: 8, workout_id: 3, name: "Romanian Deadlift", sets: 3, reps: 10, weight: 135 },
          { id: 9, workout_id: 3, name: "Leg Press", sets: 3, reps: 12, weight: 300 },
        ],
      },
    ];

    this.videos = [
      {
        id: 1,
        title: "Back Squat Demo",
        trainer: "Mike",
        description: "Full depth back squat walkthrough with bracing cues.",
        mime: "video/mp4",
        size: 99930,
        created_at: dayISO(2),
        streamUrl: DEMO_VIDEO,
      },
      {
        id: 2,
        title: "Deadlift Form Check",
        trainer: "Sara",
        description: "Hip hinge, bar path, and lockout technique.",
        mime: "video/mp4",
        size: 99930,
        created_at: dayISO(1),
        streamUrl: DEMO_VIDEO,
      },
    ];
  }

  private activeSub(planKey: string): Subscription | undefined {
    return this.subscriptions.find(
      (s) => s.plan_key === planKey && s.status === "active"
    );
  }

  getWorkouts(): Workout[] {
    return [...this.workouts].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id
    );
  }

  createWorkout(input: WorkoutInput): Workout {
    const wid = this.id();
    const workout: Workout = {
      id: wid,
      name: input.name.trim(),
      date: input.date,
      notes: (input.notes ?? "").trim(),
      created_at: new Date().toISOString(),
      exercises: (input.exercises ?? [])
        .filter((e) => e.name.trim())
        .map((e) => ({
          id: this.id(),
          workout_id: wid,
          name: e.name.trim(),
          sets: Number(e.sets) || 0,
          reps: Number(e.reps) || 0,
          weight: Number(e.weight) || 0,
        })),
    };
    this.workouts.push(workout);
    return workout;
  }

  deleteWorkout(id: number): void {
    this.workouts = this.workouts.filter((w) => w.id !== id);
  }

  getStats(): Stats {
    const workouts = this.workouts;
    let totalVolume = 0;
    let totalSets = 0;
    for (const w of workouts) {
      for (const e of w.exercises) {
        totalVolume += e.sets * e.reps * e.weight;
        totalSets += e.sets;
      }
    }
    const volumeByDate = new Map<string, number>();
    for (const w of workouts) {
      let vol = 0;
      for (const e of w.exercises) vol += e.sets * e.reps * e.weight;
      volumeByDate.set(w.date, (volumeByDate.get(w.date) ?? 0) + vol);
    }
    const today = new Date();
    const weeklyVolume: Stats["weeklyVolume"] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      weeklyVolume.push({
        date: iso,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        volume: Math.round(volumeByDate.get(iso) ?? 0),
      });
    }
    const dates = new Set(workouts.map((w) => w.date));
    let streak = 0;
    const cursor = new Date(today);
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return {
      totalWorkouts: workouts.length,
      totalVolume: Math.round(totalVolume),
      totalSets,
      streak,
      weeklyVolume,
    };
  }

  getPlans(): Plan[] {
    return Object.values(PLAN_DEFS).map((p) => ({
      ...p,
      active: this.activeSub(p.key) !== undefined,
    }));
  }

  getSubscriptions(): Subscription[] {
    return [...this.subscriptions].sort((a, b) => b.id - a.id);
  }

  subscribe(input: SubscribeInput): Subscription {
    const plan = PLAN_DEFS[input.plan_key];
    if (!plan) throw new Error("Unknown plan");
    if (this.activeSub(plan.key)) {
      throw new Error(`You already have an active ${plan.name} subscription.`);
    }
    if (plan.key === "weekly_delivery") {
      if (input.delivery_method !== "email" && input.delivery_method !== "in_app") {
        throw new Error("Choose a delivery method: email or in_app.");
      }
      if (input.delivery_method === "email" && !(input.email ?? "").trim()) {
        throw new Error("An email address is required for email delivery.");
      }
    }
    const now = new Date().toISOString();
    const periodEnd = addMonthISO(now);
    const charge: Charge = {
      id: this.id(),
      subscription_id: 0,
      amount_cents: plan.price_cents,
      status: "paid",
      period_start: now,
      period_end: periodEnd,
      created_at: now,
    };
    const sub: Subscription = {
      id: this.id(),
      plan_key: plan.key,
      status: "active",
      delivery_method:
        plan.key === "weekly_delivery" ? input.delivery_method ?? null : null,
      email:
        plan.key === "weekly_delivery" && input.delivery_method === "email"
          ? (input.email ?? "").trim()
          : null,
      started_at: now,
      current_period_start: now,
      current_period_end: periodEnd,
      canceled_at: null,
      plan,
      charges: [charge],
    };
    charge.subscription_id = sub.id;
    this.subscriptions.push(sub);
    return sub;
  }

  runBillingCycle(id: number): Subscription {
    const sub = this.subscriptions.find((s) => s.id === id);
    if (!sub) throw new Error("Subscription not found");
    if (sub.status !== "active") throw new Error("Subscription is not active.");
    const start = sub.current_period_end;
    const end = addMonthISO(start);
    sub.current_period_start = start;
    sub.current_period_end = end;
    sub.charges = [
      {
        id: this.id(),
        subscription_id: sub.id,
        amount_cents: sub.plan?.price_cents ?? 0,
        status: "paid",
        period_start: start,
        period_end: end,
        created_at: new Date().toISOString(),
      },
      ...sub.charges,
    ];
    return sub;
  }

  cancelSubscription(id: number): Subscription {
    const sub = this.subscriptions.find((s) => s.id === id && s.status === "active");
    if (!sub) throw new Error("Active subscription not found.");
    sub.status = "canceled";
    sub.canceled_at = new Date().toISOString();
    return sub;
  }

  getDeliveries(): Delivery[] {
    return [...this.deliveries].sort((a, b) => b.id - a.id);
  }

  runDelivery(): Delivery {
    const sub = this.activeSub("weekly_delivery");
    if (!sub) {
      throw new Error("An active Weekly Workout Plan subscription is required.");
    }
    const channel = (sub.delivery_method ?? "in_app") as "email" | "in_app";
    const recipient = channel === "email" ? sub.email ?? "" : "In-app inbox";

    const date = new Date();
    const diff = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - diff);
    const weekOf = date.toISOString().slice(0, 10);

    const dayNames = ["Monday", "Wednesday", "Friday"];
    const templates = this.getWorkouts().slice(0, 3);
    const lines: string[] = [
      `Your Weekly Workout Plan — week of ${weekOf}`,
      "",
      "Here is your training plan for the week. Rest on the off days, stay hydrated, and log every session in FitFocus!",
      "",
    ];
    templates.forEach((w, i) => {
      lines.push(`${dayNames[i] ?? "Day"} — ${w.name}`);
      for (const e of w.exercises) {
        lines.push(
          `  • ${e.name} ${e.sets}x${e.reps}${e.weight > 0 ? ` @ ${e.weight} lbs` : ""}`
        );
      }
      lines.push("");
    });
    lines.push("Have a great week 💪 — Team FitFocus");

    const delivery: Delivery = {
      id: this.id(),
      subscription_id: sub.id,
      week_of: weekOf,
      channel,
      recipient,
      title: `FitFocus Weekly Plan · week of ${weekOf}`,
      body: lines.join("\n"),
      status: "sent",
      created_at: new Date().toISOString(),
    };
    this.deliveries.push(delivery);
    return delivery;
  }

  getVideos(): VideosResponse {
    return {
      subscribed: this.activeSub("trainer_videos") !== undefined,
      videos: [...this.videos].sort((a, b) => b.id - a.id),
    };
  }

  uploadVideo(form: FormData): DemoVideo {
    const title = String(form.get("title") ?? "").trim();
    if (!title) throw new Error("A title is required.");
    const file = form.get("video");
    const video: DemoVideo = {
      id: this.id(),
      title,
      trainer: String(form.get("trainer") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      mime: "video/mp4",
      size: file instanceof File ? file.size : 0,
      created_at: new Date().toISOString(),
      // Play the uploaded file locally in this session if possible; otherwise
      // fall back to the bundled sample so the tile is still playable.
      streamUrl: file instanceof File ? URL.createObjectURL(file) : DEMO_VIDEO,
    };
    this.videos.push(video);
    return video;
  }

  deleteVideo(id: number): void {
    this.videos = this.videos.filter((v) => v.id !== id);
  }
}

export const demo = new DemoStore();
