export interface Exercise {
  id: number;
  workout_id: number;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface Workout {
  id: number;
  name: string;
  date: string;
  notes: string;
  created_at: string;
  exercises: Exercise[];
}

export interface Stats {
  totalWorkouts: number;
  totalVolume: number;
  totalSets: number;
  streak: number;
  weeklyVolume: Array<{ date: string; label: string; volume: number }>;
}

export interface ExerciseInput {
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface WorkoutInput {
  name: string;
  date: string;
  notes: string;
  exercises: ExerciseInput[];
}

export interface Plan {
  id: number;
  key: string;
  name: string;
  description: string;
  price_cents: number;
  interval: string;
  features: string[];
  active: boolean;
}

export interface Charge {
  id: number;
  subscription_id: number;
  amount_cents: number;
  status: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface Subscription {
  id: number;
  plan_key: string;
  status: "active" | "canceled";
  delivery_method: "email" | "in_app" | null;
  email: string | null;
  started_at: string;
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
  plan?: Omit<Plan, "active">;
  charges: Charge[];
}

export interface Delivery {
  id: number;
  subscription_id: number;
  week_of: string;
  channel: "email" | "in_app";
  recipient: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
}

export interface VideoItem {
  id: number;
  title: string;
  trainer: string;
  description: string;
  mime: string;
  size: number;
  created_at: string;
  streamUrl: string;
}

export interface VideosResponse {
  subscribed: boolean;
  videos: VideoItem[];
}

export interface SubscribeInput {
  plan_key: string;
  delivery_method?: "email" | "in_app";
  email?: string;
}
