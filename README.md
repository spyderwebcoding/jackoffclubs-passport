# Jack Off Clubs — Digital Passport

A digital passport app for Jack Off Clubs worldwide. Members collect stamps by scanning QR codes at clubs, earn achievements, leave reviews, and compete on the leaderboard.

## Quick Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repository
4. Click **Deploy** — no environment variables needed for the demo

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- **Stamp collection** — Check into clubs via QR code scan
- **Star ratings & reviews** — Rate and review every club you visit
- **Achievements** — Unlock badges like Repeat Customer, Road Tripper, Coast to Coast
- **Tier system** — Bronze → Silver → Gold → Platinum based on unique clubs visited
- **Leaderboard** — Compete with other members worldwide
- **Club admin dashboard** — Manage QR codes, view stats, read reviews

## Tech Stack

- **Next.js 14** — React framework with App Router
- **Vercel** — Hosting and deployment
- **Supabase** (next phase) — Auth, Postgres database, file storage
