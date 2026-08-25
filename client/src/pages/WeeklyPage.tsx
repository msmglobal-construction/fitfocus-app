import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Delivery, Subscription } from "../types";

interface WeeklyPageProps {
  subscriptions: Subscription[];
  onGoToPlans: () => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z").toLocaleString(
    "en-US",
    { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
  );
}

export function WeeklyPage({ subscriptions, onGoToPlans }: WeeklyPageProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sub = subscriptions.find(
    (s) => s.plan_key === "weekly_delivery" && s.status === "active"
  );

  const load = useCallback(async () => {
    setDeliveries(await api.getDeliveries());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.runDelivery();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate delivery.");
    } finally {
      setBusy(false);
    }
  };

  if (!sub) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
        <div className="text-4xl">📬</div>
        <p className="mt-3 text-lg font-semibold text-white">
          Weekly Workout Plan
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
          Subscribe to get a fresh, personalized workout plan delivered every week by
          email or right here in the app.
        </p>
        <button
          onClick={onGoToPlans}
          className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
        >
          View plans
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Weekly Delivery</h2>
          <p className="mt-1 text-sm text-slate-400">
            Active · delivered via{" "}
            <span className="font-medium text-brand-300">
              {sub.delivery_method === "email"
                ? `email to ${sub.email}`
                : "in-app inbox"}
            </span>
          </p>
        </div>
        <button
          onClick={generate}
          disabled={busy}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Generate this week's delivery"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {deliveries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
          No deliveries yet. Generate your first weekly plan above.
        </p>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Delivery inbox
          </h3>
          {deliveries.map((d) => (
            <article
              key={d.id}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/40 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${
                      d.channel === "email"
                        ? "bg-blue-500/15 text-blue-300"
                        : "bg-brand-500/15 text-brand-300"
                    }`}
                  >
                    {d.channel === "email" ? "✉️" : "📱"}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">{d.title}</div>
                    <div className="text-xs text-slate-500">
                      {d.channel === "email" ? `Emailed to ${d.recipient}` : "In-app"} ·{" "}
                      {formatDateTime(d.created_at)}
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  {d.status}
                </span>
              </div>
              <pre className="whitespace-pre-wrap px-5 py-4 font-sans text-sm leading-relaxed text-slate-300">
                {d.body}
              </pre>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
