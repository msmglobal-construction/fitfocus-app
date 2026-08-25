import { useCallback, useEffect, useState } from "react";
import { api, isDemoMode } from "./api";
import { Dashboard } from "./pages/Dashboard";
import { PlansPage } from "./pages/PlansPage";
import { VideosPage } from "./pages/VideosPage";
import { WeeklyPage } from "./pages/WeeklyPage";
import type { Plan, Subscription } from "./types";

type View = "dashboard" | "weekly" | "videos" | "plans";

const NAV: Array<{ id: View; label: string; icon: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "weekly", label: "Weekly Plan", icon: "📬" },
  { id: "videos", label: "Trainer Videos", icon: "🎬" },
  { id: "plans", label: "Plans & Billing", icon: "💳" },
];

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [billingVersion, setBillingVersion] = useState(0);
  const [addSignal, setAddSignal] = useState(0);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    void isDemoMode().then(setDemo);
  }, []);

  const refreshBilling = useCallback(async () => {
    const [p, s] = await Promise.all([api.getPlans(), api.getSubscriptions()]);
    setPlans(p);
    setSubscriptions(s);
    setBillingVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    void refreshBilling();
  }, [refreshBilling]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <img
                src="/fitfocus-logo.png"
                alt="Fit Focus"
                className="h-9 w-auto"
              />
              <span className="hidden text-xs text-slate-400 sm:inline">
                Laconia, NH · Members app
              </span>
              {demo && (
                <span
                  title="No backend connected — data is sample data and resets on refresh."
                  className="rounded-full border border-brand-500/40 bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-300"
                >
                  Demo
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setView("dashboard");
                setAddSignal((n) => n + 1);
              }}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-500"
            >
              + Log Workout
            </button>
          </div>

          <nav className="flex gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                  view === item.id
                    ? "border-brand-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {view === "dashboard" && <Dashboard onAddClick={addSignal} />}
        {view === "weekly" && (
          <WeeklyPage
            subscriptions={subscriptions}
            onGoToPlans={() => setView("plans")}
          />
        )}
        {view === "videos" && (
          <VideosPage
            onGoToPlans={() => setView("plans")}
            billingVersion={billingVersion}
          />
        )}
        {view === "plans" && (
          <PlansPage
            plans={plans}
            subscriptions={subscriptions}
            onRefresh={refreshBilling}
          />
        )}
      </main>
    </div>
  );
}
