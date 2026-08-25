import { useState } from "react";
import { api, formatMoney } from "../api";
import type { Plan, SubscribeInput, Subscription } from "../types";

interface PlansPageProps {
  plans: Plan[];
  subscriptions: Subscription[];
  onRefresh: () => Promise<void>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PlansPage({ plans, subscriptions, onRefresh }: PlansPageProps) {
  const [subscribingKey, setSubscribingKey] = useState<string | null>(null);
  const [method, setMethod] = useState<"email" | "in_app">("in_app");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const activeSubs = subscriptions.filter((s) => s.status === "active");

  const doSubscribe = async (input: SubscribeInput) => {
    setError(null);
    try {
      await api.subscribe(input);
      setSubscribingKey(null);
      setEmail("");
      setMethod("in_app");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription failed.");
    }
  };

  const handleSubscribeClick = (plan: Plan) => {
    setError(null);
    if (plan.key === "weekly_delivery") {
      setSubscribingKey(plan.key);
    } else {
      void doSubscribe({ plan_key: plan.key });
    }
  };

  const cardAccent: Record<string, string> = {
    weekly_delivery: "from-brand-400 to-brand-600",
    trainer_videos: "from-emerald-400 to-brand-500",
  };

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold text-white">Membership Plans</h2>
        <p className="mt-1 text-sm text-slate-400">
          Level up your training. Both plans are billed monthly and you can cancel anytime.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${cardAccent[plan.key] ?? "from-brand-400 to-brand-600"}`}
              />
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                {plan.active && (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">
                  {formatMoney(plan.price_cents)}
                </span>
                <span className="text-sm text-slate-500">/ month</span>
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled={plan.active}
                onClick={() => handleSubscribeClick(plan)}
                className="mt-6 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {plan.active ? "Subscribed" : `Subscribe — ${formatMoney(plan.price_cents)}/mo`}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Your Subscriptions</h2>
        {activeSubs.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
            No active subscriptions yet. Subscribe to a plan above to get started.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {activeSubs.map((sub) => {
              const total = sub.charges.reduce((s, c) => s + c.amount_cents, 0);
              return (
                <div
                  key={sub.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {sub.plan?.name ?? sub.plan_key}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {formatMoney(sub.plan?.price_cents ?? 0)} / month
                        {sub.delivery_method && (
                          <>
                            {" · "}
                            delivery:{" "}
                            <span className="text-slate-300">
                              {sub.delivery_method === "email"
                                ? `email (${sub.email})`
                                : "in-app"}
                            </span>
                          </>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Next charge on {formatDate(sub.current_period_end)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={busyId === sub.id}
                        onClick={async () => {
                          setBusyId(sub.id);
                          try {
                            await api.runBillingCycle(sub.id);
                            await onRefresh();
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                        title="Simulate the next monthly invoice"
                      >
                        Run next billing cycle
                      </button>
                      <button
                        disabled={busyId === sub.id}
                        onClick={async () => {
                          setBusyId(sub.id);
                          try {
                            await api.cancelSubscription(sub.id);
                            await onRefresh();
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40">
                    <div className="border-b border-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Billing history · {sub.charges.length} charge
                      {sub.charges.length === 1 ? "" : "s"} · {formatMoney(total)} total
                    </div>
                    <div className="divide-y divide-slate-800/70">
                      {sub.charges.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between px-4 py-2 text-sm"
                        >
                          <span className="text-slate-300">
                            {formatDate(c.period_start)} → {formatDate(c.period_end)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                              {c.status}
                            </span>
                            <span className="font-semibold text-white">
                              {formatMoney(c.amount_cents)}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {subscribingKey === "weekly_delivery" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Weekly Workout Plan</h3>
            <p className="mt-1 text-sm text-slate-400">
              How would you like your weekly workouts delivered?
            </p>

            <div className="mt-4 space-y-2">
              {(["in_app", "email"] as const).map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    method === m
                      ? "border-brand-500 bg-brand-500/10"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="method"
                    checked={method === m}
                    onChange={() => setMethod(m)}
                    className="accent-brand-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {m === "in_app" ? "In-app inbox" : "Email"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {m === "in_app"
                        ? "Read your plan inside FitFocus each week."
                        : "Get your plan delivered to your inbox each week."}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {method === "email" && (
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSubscribingKey(null);
                  setError(null);
                }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  doSubscribe({
                    plan_key: "weekly_delivery",
                    delivery_method: method,
                    email: method === "email" ? email : undefined,
                  })
                }
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-500"
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
