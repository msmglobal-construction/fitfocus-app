import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { VideoItem } from "../types";

interface VideosPageProps {
  onGoToPlans: () => void;
  billingVersion: number;
}

export function VideosPage({ onGoToPlans, billingVersion }: VideosPageProps) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<VideoItem | null>(null);

  const [title, setTitle] = useState("");
  const [trainer, setTrainer] = useState("");
  const [description, setDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await api.getVideos();
    setSubscribed(res.subscribed);
    setVideos(res.videos);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load, billingVersion]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!title.trim()) return setError("Please add a title.");
    if (!file) return setError("Please choose a video file.");

    const form = new FormData();
    form.append("title", title.trim());
    form.append("trainer", trainer.trim());
    form.append("description", description.trim());
    form.append("video", file);

    setUploading(true);
    try {
      await api.uploadVideo(form);
      setUploadOpen(false);
      setTitle("");
      setTrainer("");
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await api.deleteVideo(id);
    if (active?.id === id) setActive(null);
    await load();
  };

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Trainer Video Library</h2>
          <p className="mt-1 text-sm text-slate-400">
            Follow-along workouts filmed with the trainers at your gym.
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
        >
          + Upload video
        </button>
      </div>

      {!subscribed && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div>
            <p className="font-semibold text-white">🔒 Playback is a members feature</p>
            <p className="mt-1 text-sm text-emerald-200/80">
              Subscribe to the Trainer Video Library to stream and follow along with
              every workout.
            </p>
          </div>
          <button
            onClick={onGoToPlans}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Unlock — $19.99/mo
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">
          Loading videos…
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
          <div className="text-4xl">🎬</div>
          <p className="mt-3 font-semibold text-white">No videos yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Upload the first trainer video to build your library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <div
              key={v.id}
              className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg"
            >
              <div
                className="relative flex aspect-video cursor-pointer items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900"
                onClick={() => subscribed && setActive(v)}
              >
                {subscribed ? (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl backdrop-blur transition group-hover:scale-110 group-hover:bg-white/20">
                    ▶
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-3xl">🔒</div>
                    <p className="mt-1 text-xs text-slate-400">Members only</p>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{v.title}</h3>
                  <button
                    onClick={() => handleDelete(v.id)}
                    aria-label={`Delete ${v.title}`}
                    className="text-slate-600 transition hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
                {v.trainer && (
                  <p className="mt-0.5 text-xs font-medium text-emerald-300">
                    with {v.trainer}
                  </p>
                )}
                {v.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                    {v.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {active && subscribed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
              <div>
                <h3 className="font-semibold text-white">{active.title}</h3>
                {active.trainer && (
                  <p className="text-xs text-emerald-300">Follow along with {active.trainer}</p>
                )}
              </div>
              <button
                onClick={() => setActive(null)}
                className="text-slate-400 hover:text-white"
                aria-label="Close player"
              >
                ✕
              </button>
            </div>
            <video
              key={active.id}
              src={active.streamUrl}
              controls
              autoPlay
              className="aspect-video w-full bg-black"
            />
            {active.description && (
              <p className="px-5 py-4 text-sm text-slate-300">{active.description}</p>
            )}
          </div>
        </div>
      )}

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleUpload}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white">Upload trainer video</h3>
            <div className="mt-4 space-y-3">
              <input
                className={inputClass}
                placeholder="Video title (e.g. Back Squat Demo)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Trainer name (e.g. Mike)"
                value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
              />
              <textarea
                className={inputClass}
                rows={2}
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-500"
              />
            </div>

            {error && (
              <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setUploadOpen(false);
                  setError(null);
                }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
