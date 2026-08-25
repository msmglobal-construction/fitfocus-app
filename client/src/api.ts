import { demo } from "./demo";
import type {
  Delivery,
  Plan,
  Stats,
  SubscribeInput,
  Subscription,
  VideosResponse,
  Workout,
  WorkoutInput,
} from "./types";

const BASE = "/api";

// Detect whether a real backend is reachable. When it isn't (e.g. a frontend-only
// Netlify deploy), the app runs against an in-memory demo store so the whole UI
// stays usable. Resolved once and cached for the session.
let modePromise: Promise<boolean> | null = null;

async function probeDemo(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return true;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return true; // SPA fallback HTML
    const data = (await res.json()) as { status?: string };
    return data.status !== "ok";
  } catch {
    return true;
  }
}

function isDemo(): Promise<boolean> {
  if (!modePromise) modePromise = probeDemo();
  return modePromise;
}

/** Resolves true when the app is running without a backend (demo mode). */
export function isDemoMode(): Promise<boolean> {
  return isDemo();
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await res
      .json()
      .then((d) => d.error as string)
      .catch(() => res.statusText);
    throw new Error(message || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getWorkouts: async (): Promise<Workout[]> =>
    (await isDemo())
      ? demo.getWorkouts()
      : handle<Workout[]>(await fetch(`${BASE}/workouts`)),

  getStats: async (): Promise<Stats> =>
    (await isDemo()) ? demo.getStats() : handle<Stats>(await fetch(`${BASE}/stats`)),

  createWorkout: async (input: WorkoutInput): Promise<Workout> =>
    (await isDemo())
      ? demo.createWorkout(input)
      : handle<Workout>(
          await fetch(`${BASE}/workouts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          })
        ),

  deleteWorkout: async (id: number): Promise<void> => {
    if (await isDemo()) return demo.deleteWorkout(id);
    return handle<void>(await fetch(`${BASE}/workouts/${id}`, { method: "DELETE" }));
  },

  getPlans: async (): Promise<Plan[]> =>
    (await isDemo())
      ? demo.getPlans()
      : handle<Plan[]>(await fetch(`${BASE}/billing/plans`)),

  getSubscriptions: async (): Promise<Subscription[]> =>
    (await isDemo())
      ? demo.getSubscriptions()
      : handle<Subscription[]>(await fetch(`${BASE}/billing/subscriptions`)),

  subscribe: async (input: SubscribeInput): Promise<Subscription> =>
    (await isDemo())
      ? demo.subscribe(input)
      : handle<Subscription>(
          await fetch(`${BASE}/billing/subscriptions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          })
        ),

  cancelSubscription: async (id: number): Promise<Subscription> =>
    (await isDemo())
      ? demo.cancelSubscription(id)
      : handle<Subscription>(
          await fetch(`${BASE}/billing/subscriptions/${id}/cancel`, {
            method: "POST",
          })
        ),

  runBillingCycle: async (id: number): Promise<Subscription> =>
    (await isDemo())
      ? demo.runBillingCycle(id)
      : handle<Subscription>(
          await fetch(`${BASE}/billing/subscriptions/${id}/cycle`, {
            method: "POST",
          })
        ),

  getDeliveries: async (): Promise<Delivery[]> =>
    (await isDemo())
      ? demo.getDeliveries()
      : handle<Delivery[]>(await fetch(`${BASE}/deliveries`)),

  runDelivery: async (): Promise<Delivery> =>
    (await isDemo())
      ? demo.runDelivery()
      : handle<Delivery>(await fetch(`${BASE}/deliveries/run`, { method: "POST" })),

  getVideos: async (): Promise<VideosResponse> =>
    (await isDemo())
      ? demo.getVideos()
      : handle<VideosResponse>(await fetch(`${BASE}/videos`)),

  uploadVideo: async (form: FormData): Promise<unknown> =>
    (await isDemo())
      ? demo.uploadVideo(form)
      : handle<unknown>(await fetch(`${BASE}/videos`, { method: "POST", body: form })),

  deleteVideo: async (id: number): Promise<void> => {
    if (await isDemo()) return demo.deleteVideo(id);
    return handle<void>(await fetch(`${BASE}/videos/${id}`, { method: "DELETE" }));
  },
};

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
