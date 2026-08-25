import { db } from "./db.js";
import type { Plan, Subscription } from "./types.js";

/** Add one calendar month to an ISO timestamp, returning an ISO timestamp. */
export function addMonth(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  d.setMonth(d.getMonth() + 1);
  // Guard against month overflow (e.g. Jan 31 -> Mar 3).
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString();
}

export function getPlan(key: string): Plan | undefined {
  const row = db.prepare("SELECT * FROM plans WHERE key = ?").get(key) as
    | (Omit<Plan, "features"> & { features: string })
    | undefined;
  if (!row) return undefined;
  return { ...row, features: JSON.parse(row.features) as string[] };
}

export function listPlans(): Plan[] {
  const rows = db.prepare("SELECT * FROM plans ORDER BY price_cents").all() as Array<
    Omit<Plan, "features"> & { features: string }
  >;
  return rows.map((r) => ({ ...r, features: JSON.parse(r.features) as string[] }));
}

export function activeSubscriptionFor(planKey: string): Subscription | undefined {
  return db
    .prepare(
      "SELECT * FROM subscriptions WHERE plan_key = ? AND status = 'active' ORDER BY id DESC LIMIT 1"
    )
    .get(planKey) as Subscription | undefined;
}

export function hasActiveSubscription(planKey: string): boolean {
  return activeSubscriptionFor(planKey) !== undefined;
}
