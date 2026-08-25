import type { Workout } from "../types";
import { formatDate, formatNumber, workoutVolume } from "../utils";

interface WorkoutCardProps {
  workout: Workout;
  onDelete: (id: number) => void;
}

export function WorkoutCard({ workout, onDelete }: WorkoutCardProps) {
  const volume = workoutVolume(workout.exercises);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg transition hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{workout.name}</h3>
          <p className="text-sm text-slate-400">{formatDate(workout.date)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold text-brand-400">
              {formatNumber(volume)} lbs
            </div>
            <div className="text-xs text-slate-500">
              {workout.exercises.length} exercises
            </div>
          </div>
          <button
            onClick={() => onDelete(workout.id)}
            aria-label={`Delete ${workout.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-500 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {workout.exercises.map((ex) => (
          <div
            key={ex.id}
            className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-sm"
          >
            <span className="font-medium text-slate-200">{ex.name}</span>
            <span className="text-slate-400">
              {ex.sets} × {ex.reps}
              {ex.weight > 0 && (
                <span className="ml-2 text-brand-300">{formatNumber(ex.weight)} lbs</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {workout.notes && (
        <p className="mt-3 border-t border-slate-800 pt-3 text-sm italic text-slate-400">
          “{workout.notes}”
        </p>
      )}
    </div>
  );
}
