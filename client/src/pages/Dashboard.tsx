import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { AddWorkoutModal } from "../components/AddWorkoutModal";
import { StatCard } from "../components/StatCard";
import { VolumeChart } from "../components/VolumeChart";
import { WorkoutCard } from "../components/WorkoutCard";
import type { Stats, Workout, WorkoutInput } from "../types";
import { formatNumber } from "../utils";

interface DashboardProps {
  onAddClick: number;
}

export function Dashboard({ onAddClick }: DashboardProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [w, s] = await Promise.all([api.getWorkouts(), api.getStats()]);
      setWorkouts(w);
      setStats(s);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load data from the API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (onAddClick > 0) setModalOpen(true);
  }, [onAddClick]);

  const handleCreate = async (input: WorkoutInput) => {
    await api.createWorkout(input);
    setModalOpen(false);
    await load();
  };

  const handleDelete = async (id: number) => {
    await api.deleteWorkout(id);
    await load();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Loading your workouts…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-300">
        <p className="font-semibold">Couldn’t reach the API</p>
        <p className="mt-1 text-sm text-red-400/80">{error}</p>
        <button
          onClick={load}
          className="mt-4 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/10"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Workouts"
          value={formatNumber(stats?.totalWorkouts ?? 0)}
          sublabel="all time"
          icon="📓"
          accent="bg-brand-500/15 text-brand-300"
        />
        <StatCard
          label="Total Volume"
          value={`${formatNumber(stats?.totalVolume ?? 0)}`}
          sublabel="lbs lifted"
          icon="💪"
          accent="bg-fuchsia-500/15 text-fuchsia-300"
        />
        <StatCard
          label="Total Sets"
          value={formatNumber(stats?.totalSets ?? 0)}
          sublabel="all time"
          icon="🔁"
          accent="bg-emerald-500/15 text-emerald-300"
        />
        <StatCard
          label="Day Streak"
          value={formatNumber(stats?.streak ?? 0)}
          sublabel="consecutive days"
          icon="🔥"
          accent="bg-amber-500/15 text-amber-300"
        />
      </section>

      <section className="mt-6">
        {stats && <VolumeChart data={stats.weeklyVolume} />}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Workouts</h2>
          <span className="text-sm text-slate-500">{workouts.length} total</span>
        </div>

        {workouts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
            <div className="text-4xl">🏋️</div>
            <p className="mt-3 font-semibold text-white">No workouts yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Log your first workout to start tracking your progress.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
            >
              + Log Workout
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>

      {modalOpen && (
        <AddWorkoutModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreate}
        />
      )}
    </>
  );
}
