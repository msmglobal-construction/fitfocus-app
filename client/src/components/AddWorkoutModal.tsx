import { useState } from "react";
import type { ExerciseInput, WorkoutInput } from "../types";
import { todayISO } from "../utils";

interface AddWorkoutModalProps {
  onClose: () => void;
  onSubmit: (input: WorkoutInput) => Promise<void>;
}

type ExerciseRow = {
  name: string;
  sets: string;
  reps: string;
  weight: string;
};

const emptyRow = (): ExerciseRow => ({ name: "", sets: "", reps: "", weight: "" });

export function AddWorkoutModal({ onClose, onSubmit }: AddWorkoutModalProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ExerciseRow[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateRow = (index: number, patch: Partial<ExerciseRow>) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (index: number) =>
    setRows((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please give your workout a name.");
      return;
    }

    const exercises: ExerciseInput[] = rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        sets: Number(r.sets) || 0,
        reps: Number(r.reps) || 0,
        weight: Number(r.weight) || 0,
      }));

    if (exercises.length === 0) {
      setError("Add at least one exercise.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), date, notes: notes.trim(), exercises });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Log a Workout</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Workout name
              </label>
              <input
                className={inputClass}
                placeholder="e.g. Push Day"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Date
              </label>
              <input
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Exercises</label>
              <button
                type="button"
                onClick={addRow}
                className="text-sm font-medium text-brand-400 hover:text-brand-300"
              >
                + Add exercise
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_60px_60px_72px_32px] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                <span>Exercise</span>
                <span className="text-center">Sets</span>
                <span className="text-center">Reps</span>
                <span className="text-center">Lbs</span>
                <span />
              </div>
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_60px_72px_32px] gap-2">
                  <input
                    className={inputClass}
                    placeholder="Bench Press"
                    value={row.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                  />
                  <input
                    className={`${inputClass} text-center`}
                    inputMode="numeric"
                    placeholder="3"
                    value={row.sets}
                    onChange={(e) => updateRow(i, { sets: e.target.value })}
                  />
                  <input
                    className={`${inputClass} text-center`}
                    inputMode="numeric"
                    placeholder="10"
                    value={row.reps}
                    onChange={(e) => updateRow(i, { reps: e.target.value })}
                  />
                  <input
                    className={`${inputClass} text-center`}
                    inputMode="numeric"
                    placeholder="135"
                    value={row.weight}
                    onChange={(e) => updateRow(i, { weight: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                    aria-label="Remove exercise"
                    className="flex items-center justify-center rounded-lg text-slate-500 transition hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Notes <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="How did it feel?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save workout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
