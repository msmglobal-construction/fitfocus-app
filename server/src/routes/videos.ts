import { createReadStream, existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";
import { hasActiveSubscription } from "../billing.js";
import { db } from "../db.js";
import type { Video } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = resolve(__dirname, "../../uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });

export const videosRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname) || ".mp4";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are allowed."));
  },
});

function publicVideo(v: Video) {
  return {
    id: v.id,
    title: v.title,
    trainer: v.trainer,
    description: v.description,
    mime: v.mime,
    size: v.size,
    created_at: v.created_at,
    streamUrl: `/api/videos/${v.id}/stream`,
  };
}

videosRouter.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM videos ORDER BY id DESC")
    .all() as Video[];
  res.json({
    subscribed: hasActiveSubscription("trainer_videos"),
    videos: rows.map(publicVideo),
  });
});

videosRouter.post("/", upload.single("video"), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "A video file is required." });

  const { title, trainer, description } = req.body as {
    title?: string;
    trainer?: string;
    description?: string;
  };
  if (!title || !title.trim()) {
    unlinkSync(resolve(UPLOAD_DIR, file.filename));
    return res.status(400).json({ error: "A title is required." });
  }

  const info = db
    .prepare(
      `INSERT INTO videos (title, trainer, description, filename, mime, size)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      title.trim(),
      (trainer ?? "").trim(),
      (description ?? "").trim(),
      file.filename,
      file.mimetype,
      file.size
    );

  const video = db
    .prepare("SELECT * FROM videos WHERE id = ?")
    .get(info.lastInsertRowid as number) as Video;
  res.status(201).json(publicVideo(video));
});

// Streaming playback is gated behind an active Trainer Video Library subscription.
videosRouter.get("/:id/stream", (req, res) => {
  if (!hasActiveSubscription("trainer_videos")) {
    return res
      .status(402)
      .json({ error: "An active Trainer Video Library subscription is required." });
  }

  const video = db
    .prepare("SELECT * FROM videos WHERE id = ?")
    .get(Number(req.params.id)) as Video | undefined;
  if (!video) return res.status(404).json({ error: "Video not found" });

  const filePath = resolve(UPLOAD_DIR, video.filename);
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: "Video file missing" });
  }

  const { size } = statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match && match[1] ? parseInt(match[1], 10) : 0;
    const end = match && match[2] ? parseInt(match[2], 10) : size - 1;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": video.mime,
    });
    createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": size,
      "Content-Type": video.mime,
      "Accept-Ranges": "bytes",
    });
    createReadStream(filePath).pipe(res);
  }
});

videosRouter.delete("/:id", (req, res) => {
  const video = db
    .prepare("SELECT * FROM videos WHERE id = ?")
    .get(Number(req.params.id)) as Video | undefined;
  if (!video) return res.status(404).json({ error: "Video not found" });

  const filePath = resolve(UPLOAD_DIR, video.filename);
  if (existsSync(filePath)) unlinkSync(filePath);
  db.prepare("DELETE FROM videos WHERE id = ?").run(video.id);
  res.status(204).end();
});
