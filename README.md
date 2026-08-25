# Fit Focus — Members App

The Fit Focus (Laconia, NH) members web app. Log your training, get a fresh
workout plan delivered every week, and follow along with video workouts filmed
with the gym's trainers.

![stack](https://img.shields.io/badge/stack-React%20%7C%20Express%20%7C%20SQLite-7dc622)

## Features

### Core tracker
- **Workout logging** — record a workout with any number of exercises (sets, reps, weight).
- **Dashboard stats** — total workouts, total volume lifted, total sets, and current day streak.
- **Weekly volume chart** — visualize lbs lifted over the last 7 days.

### 📬 Weekly Workout Plan *(subscription — $9.99 / month)*
- Subscribe and choose delivery by **email** or **in-app inbox**.
- Generates a personalized weekly plan from your training history.
- Deliveries are recorded to an in-app inbox; email delivery renders and logs the
  message (wire up a real email provider to actually send — see below).

### 🎬 Trainer Video Library *(subscription — $19.99 / month)*
- Upload follow-along videos of the gym's trainers (title, trainer, description, file).
- Members stream videos with an in-app follow-along player (HTTP range streaming).
- Playback is **gated**: non-members see a paywall; the stream endpoint returns
  `402 Payment Required` without an active subscription.

### 💳 Billing
- Monthly recurring subscriptions with a full charge lifecycle (first charge on
  signup, subsequent charges per cycle, billing history, cancel anytime).
- The recurring cycle is exposed as an explicit **"Run next billing cycle"** action
  so the monthly lifecycle is demonstrable without waiting a month.

> **Payments note:** billing here uses a self-contained engine (plans,
> subscriptions, charges, period math) with a *simulated* payment processor, so the
> app runs end-to-end with no external accounts. To take real money, swap the charge
> creation in `server/src/routes/billing.ts` for Stripe subscriptions + webhooks
> (needs a `STRIPE_SECRET_KEY` secret and egress to `api.stripe.com`). Likewise,
> email delivery in `server/src/routes/deliveries.ts` is simulated and can be wired
> to a provider such as Resend/SendGrid.

## Tech stack

| Layer    | Tech                                                    |
| -------- | ------------------------------------------------------- |
| Frontend | Vite, React 18, TypeScript, Tailwind CSS, Recharts       |
| Backend  | Node, Express, TypeScript, better-sqlite3, Multer         |

## Project structure

```
.
├── client/          # Vite + React + Tailwind frontend
│   └── src/
│       ├── pages/   # Dashboard, WeeklyPage, VideosPage, PlansPage
│       └── components/
├── server/          # Express + SQLite REST API
│   └── src/routes/  # workouts, billing, deliveries, videos
├── package.json     # npm workspaces + dev scripts
└── .cursor/         # Cloud Agent environment config
```

## Getting started

```bash
npm install          # installs client + server workspaces
npm run dev          # runs API (:4000) and web (:5173) together
```

Then open http://localhost:5173.

Run them individually if you prefer:

```bash
npm run dev:server   # API only
npm run dev:client   # Frontend only
```

## API

| Method   | Endpoint                             | Description                                  |
| -------- | ------------------------------------ | -------------------------------------------- |
| `GET`    | `/api/health`                        | Health check                                 |
| `GET`    | `/api/workouts`                      | List workouts with exercises                 |
| `POST`   | `/api/workouts`                      | Create a workout                             |
| `DELETE` | `/api/workouts/:id`                  | Delete a workout                             |
| `GET`    | `/api/stats`                         | Aggregated dashboard stats                   |
| `GET`    | `/api/billing/plans`                 | List membership plans (+ active flag)        |
| `GET`    | `/api/billing/subscriptions`         | Subscriptions with plan + billing history    |
| `POST`   | `/api/billing/subscriptions`         | Subscribe to a plan                          |
| `POST`   | `/api/billing/subscriptions/:id/cycle`  | Process the next monthly charge           |
| `POST`   | `/api/billing/subscriptions/:id/cancel` | Cancel a subscription                     |
| `GET`    | `/api/deliveries`                    | List weekly deliveries                       |
| `POST`   | `/api/deliveries/run`                | Generate & deliver this week's plan          |
| `GET`    | `/api/videos`                        | List videos (+ subscription flag)            |
| `POST`   | `/api/videos`                        | Upload a trainer video (multipart)           |
| `GET`    | `/api/videos/:id/stream`             | Stream a video (subscription-gated)          |
| `DELETE` | `/api/videos/:id`                    | Delete a video                               |

The SQLite database is created automatically at `server/data/fittrack.db` and
seeded with sample workouts and the two membership plans on first run. Uploaded
videos are stored under `server/uploads/`.
