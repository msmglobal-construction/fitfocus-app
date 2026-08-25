import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Persistent data location. In production (e.g. a mounted disk) set DATA_DIR;
// locally it defaults to server/data. Holds the SQLite db and uploaded videos.
export const DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(here, "../data");

export const UPLOAD_DIR = join(DATA_DIR, "uploads");

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOAD_DIR, { recursive: true });
