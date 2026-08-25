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
  getWorkouts: () => fetch(`${BASE}/workouts`).then(handle<Workout[]>),
  getStats: () => fetch(`${BASE}/stats`).then(handle<Stats>),
  createWorkout: (input: WorkoutInput) =>
    fetch(`${BASE}/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Workout>),
  deleteWorkout: (id: number) =>
    fetch(`${BASE}/workouts/${id}`, { method: "DELETE" }).then(handle<void>),

  getPlans: () => fetch(`${BASE}/billing/plans`).then(handle<Plan[]>),
  getSubscriptions: () =>
    fetch(`${BASE}/billing/subscriptions`).then(handle<Subscription[]>),
  subscribe: (input: SubscribeInput) =>
    fetch(`${BASE}/billing/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Subscription>),
  cancelSubscription: (id: number) =>
    fetch(`${BASE}/billing/subscriptions/${id}/cancel`, {
      method: "POST",
    }).then(handle<Subscription>),
  runBillingCycle: (id: number) =>
    fetch(`${BASE}/billing/subscriptions/${id}/cycle`, {
      method: "POST",
    }).then(handle<Subscription>),

  getDeliveries: () => fetch(`${BASE}/deliveries`).then(handle<Delivery[]>),
  runDelivery: () =>
    fetch(`${BASE}/deliveries/run`, { method: "POST" }).then(handle<Delivery>),

  getVideos: () => fetch(`${BASE}/videos`).then(handle<VideosResponse>),
  uploadVideo: (form: FormData) =>
    fetch(`${BASE}/videos`, { method: "POST", body: form }).then(handle<unknown>),
  deleteVideo: (id: number) =>
    fetch(`${BASE}/videos/${id}`, { method: "DELETE" }).then(handle<void>),
};

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
