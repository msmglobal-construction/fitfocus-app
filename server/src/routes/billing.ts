import { Router } from "express";
import {
  activeSubscriptionFor,
  addMonth,
  getPlan,
  listPlans,
} from "../billing.js";
import { db } from "../db.js";
import type { Charge, Subscription } from "../types.js";

export const billingRouter = Router();

function serializeSubscription(sub: Subscription) {
  const plan = getPlan(sub.plan_key);
  const charges = db
    .prepare("SELECT * FROM charges WHERE subscription_id = ? ORDER BY id DESC")
    .all(sub.id) as Charge[];
  return { ...sub, plan, charges };
}

function listSubscriptions() {
  const subs = db
    .prepare("SELECT * FROM subscriptions ORDER BY id DESC")
    .all() as Subscription[];
  return subs.map(serializeSubscription);
}

billingRouter.get("/plans", (_req, res) => {
  const plans = listPlans().map((p) => ({
    ...p,
    active: activeSubscriptionFor(p.key) !== undefined,
  }));
  res.json(plans);
});

billingRouter.get("/subscriptions", (_req, res) => {
  res.json(listSubscriptions());
});

billingRouter.get("/charges", (_req, res) => {
  const charges = db
    .prepare("SELECT * FROM charges ORDER BY id DESC")
    .all() as Charge[];
  res.json(charges);
});

billingRouter.post("/subscriptions", (req, res) => {
  const { plan_key, delivery_method, email } = req.body as {
    plan_key?: string;
    delivery_method?: "email" | "in_app";
    email?: string;
  };

  const plan = plan_key ? getPlan(plan_key) : undefined;
  if (!plan) return res.status(400).json({ error: "Unknown plan" });

  if (activeSubscriptionFor(plan.key)) {
    return res
      .status(409)
      .json({ error: `You already have an active ${plan.name} subscription.` });
  }

  if (plan.key === "weekly_delivery") {
    if (delivery_method !== "email" && delivery_method !== "in_app") {
      return res
        .status(400)
        .json({ error: "Choose a delivery method: email or in_app." });
    }
    if (delivery_method === "email" && !(email ?? "").trim()) {
      return res
        .status(400)
        .json({ error: "An email address is required for email delivery." });
    }
  }

  const now = new Date().toISOString();
  const periodEnd = addMonth(now);

  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO subscriptions
          (plan_key, status, delivery_method, email, started_at, current_period_start, current_period_end)
         VALUES (?, 'active', ?, ?, ?, ?, ?)`
      )
      .run(
        plan.key,
        plan.key === "weekly_delivery" ? delivery_method : null,
        plan.key === "weekly_delivery" && delivery_method === "email"
          ? (email ?? "").trim()
          : null,
        now,
        now,
        periodEnd
      );
    const subId = info.lastInsertRowid as number;
    // First recurring charge, processed immediately on signup.
    db.prepare(
      `INSERT INTO charges (subscription_id, amount_cents, status, period_start, period_end)
       VALUES (?, ?, 'paid', ?, ?)`
    ).run(subId, plan.price_cents, now, periodEnd);
    return subId;
  });

  const subId = tx();
  const sub = db
    .prepare("SELECT * FROM subscriptions WHERE id = ?")
    .get(subId) as Subscription;
  res.status(201).json(serializeSubscription(sub));
});

// Simulate the next monthly billing cycle for a subscription. In production
// this is driven by the payment processor's recurring invoice webhook; here it
// is exposed as an explicit action so the recurring lifecycle is demonstrable.
billingRouter.post("/subscriptions/:id/cycle", (req, res) => {
  const sub = db
    .prepare("SELECT * FROM subscriptions WHERE id = ?")
    .get(Number(req.params.id)) as Subscription | undefined;
  if (!sub) return res.status(404).json({ error: "Subscription not found" });
  if (sub.status !== "active") {
    return res.status(400).json({ error: "Subscription is not active." });
  }
  const plan = getPlan(sub.plan_key);
  if (!plan) return res.status(400).json({ error: "Plan not found" });

  const newStart = sub.current_period_end;
  const newEnd = addMonth(newStart);

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE subscriptions SET current_period_start = ?, current_period_end = ? WHERE id = ?"
    ).run(newStart, newEnd, sub.id);
    db.prepare(
      `INSERT INTO charges (subscription_id, amount_cents, status, period_start, period_end)
       VALUES (?, ?, 'paid', ?, ?)`
    ).run(sub.id, plan.price_cents, newStart, newEnd);
  });
  tx();

  const updated = db
    .prepare("SELECT * FROM subscriptions WHERE id = ?")
    .get(sub.id) as Subscription;
  res.json(serializeSubscription(updated));
});

billingRouter.post("/subscriptions/:id/cancel", (req, res) => {
  const info = db
    .prepare(
      "UPDATE subscriptions SET status = 'canceled', canceled_at = datetime('now') WHERE id = ? AND status = 'active'"
    )
    .run(Number(req.params.id));
  if (info.changes === 0) {
    return res
      .status(404)
      .json({ error: "Active subscription not found." });
  }
  const sub = db
    .prepare("SELECT * FROM subscriptions WHERE id = ?")
    .get(Number(req.params.id)) as Subscription;
  res.json(serializeSubscription(sub));
});
