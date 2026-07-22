# Jack Off Clubs — Digital Passport
## Claude Code Handoff Brief — Build v1

---

## 1. What this is

A mobile-first web app (PWA) where members collect digital stamps by scanning QR codes at Jack Off Clubs locations worldwide. Members earn achievements, leave ratings/reviews, climb tiers (Bronze → Silver → Gold → Platinum), and compete on a leaderboard. Club owners get an admin dashboard for their location.

Supports 35+ clubs across the US, Canada, Mexico, France, England, South Africa, and Australia (seeded from jackoffclubs.com).

---

## 2. Tech stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) | UI, routing, API routes, SSR |
| Hosting | Vercel | Deploy from GitHub, free tier |
| Database | Supabase (Postgres) | Users, clubs, check-ins, reviews, achievements |
| Auth | Supabase Auth | Email/password (+ OAuth later) |
| File storage | Supabase Storage | Club logos, user avatars |
| Mobile | PWA (manifest + service worker) | Installable, offline-capable, no native app needed for v1 |

**Why this stack:** one codebase covers web and "mobile app" via PWA install — no separate iOS/Android build for v1. If a real App Store presence is wanted later, wrap the same Next.js app in Capacitor rather than rewriting.

---

## 3. Database schema (Supabase / Postgres)

Run in the Supabase SQL Editor:

```sql
create extension if not exists "uuid-ossp";

create table clubs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  city text not null,
  region text not null,
  country text not null default 'USA',
  logo_url text,
  avg_rating numeric(2,1) default 0,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  home_club_id uuid references clubs(id),
  tier text default 'Bronze' check (tier in ('Bronze', 'Silver', 'Gold', 'Platinum')),
  created_at timestamptz default now()
);

create table qr_codes (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references clubs(id) on delete cascade,
  code text unique not null,
  active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table check_ins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  qr_code_id uuid references qr_codes(id),
  checked_in_at timestamptz default now()
);

create table reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  check_in_id uuid references check_ins(id),
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz default now()
);

create table achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_type text not null,
  earned_at timestamptz default now()
);

create table user_stats (
  user_id uuid primary key references profiles(id) on delete cascade,
  total_checkins int default 0,
  unique_clubs int default 0,
  unique_regions int default 0,
  total_reviews int default 0
);
```

**Relationships:** `profiles` 1—many `check_ins`, `reviews`, `achievements`; `clubs` 1—many `check_ins`, `reviews`, `qr_codes`; `check_ins` optionally 1—1 `reviews`; `profiles` 1—1 `user_stats`.

---

## 4. API routes needed

- **Auth** — Supabase handles login/signup directly; `GET /api/auth/me` for current profile.
- **Check-ins** — `POST /api/checkin/[code]` (main QR-scan endpoint — validates code, creates check-in, runs achievement engine, returns any new badges). `GET /api/checkins` (user's passport history).
- **Reviews** — `POST /api/reviews`, `PUT /api/reviews/[id]`, `GET /api/clubs/[id]/reviews`.
- **Clubs** — `GET /api/clubs` (directory), `GET /api/clubs/[id]` (detail + avg rating).
- **Leaderboard** — `GET /api/leaderboard` (from `user_stats`, sorted by `unique_clubs`).
- **Achievements** — `GET /api/achievements` (earned + locked badges).

**Check-in flow:** QR → `jackoffclubs.com/checkin/[unique-code]` → login if needed → API validates code is active + belongs to a real club → creates `check_ins` row → runs achievement engine against updated stats → returns new badges to frontend for a celebration moment → passport UI shows new stamp.

---

## 5. Achievement engine

Rules-based system, runs server-side after every check-in:
- Evaluates each rule as a simple condition against the user's stats (e.g. "Repeat Customer" fires when any single club hits 5+ visits).
- After evaluating all rules, recalculates the user's tier from `unique_clubs`.
- Returns newly-earned badges to the frontend for a celebration moment.

*(Full rule set to be fleshed out in Claude Code — starter rules: first check-in, 5 clubs visited = Silver, 15 = Gold, 30 = Platinum, 5 visits to one club = "Repeat Customer", first review = "Critic".)*

---

## 6. Admin dashboard (club owners)

Three tabs:
- **Overview** — check-in volume, unique members, average rating.
- **QR Codes** — generate, activate/deactivate, download codes for print.
- **Reviews** — rating distribution bars + recent member review feed.

---

## 7. Existing prototype

A working single-file React simulation of the passport UI (stamps, check-in, achievements, admin dashboard, leaderboard) was already built and can serve as the visual/UX blueprint — ask to see it again if useful as a reference while rebuilding as real Next.js components.

---

## 8. v1 build order

1. `npx create-next-app` — real project, real `npm install` (not sandboxed)
2. Supabase project setup, run schema above, get env vars
3. Port passport, check-in flow, and achievement engine into real client components
4. Wire Supabase Auth
5. Deploy to Vercel, get a live URL
6. Add PWA manifest + service worker (`manifest.json`, `apple-touch-icon`, `theme_color: #0A0A0F`)
7. Seed the 35+ clubs
8. Test QR check-in flow end-to-end
9. Club admin dashboard

---

## 9. Notes / decisions already made

- Region for Supabase: US East (closest to Raleigh, NC)
- Dark theme, `#0A0A0F` background
- Tier names: Bronze, Silver, Gold, Platinum
