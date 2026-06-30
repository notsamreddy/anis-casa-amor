# Ani's Workout Planner

A mobile-friendly Push / Pull / Legs workout app. Pick a workout, follow your coach's plan, and check off exercises at the gym.

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Clerk** for authentication
- **Neon PostgreSQL** + **Drizzle ORM**

## Features

- Sign in / sign up with Clerk
- Home dashboard after login
- Gym page with Push, Pull, and Legs workout cards
- Exercise checklist with sets/reps, daily checkoffs, and demo video links
- Admin settings (coach only) to add, edit, delete, and reorder exercises
- Seed script with default PPL exercises

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `ADMIN_USER_ID` | Your Clerk user ID (coach gets admin access) |

**Finding your Clerk user ID:** Sign up in the app, then check the [Clerk Dashboard](https://dashboard.clerk.com) → Users → copy the user ID (starts with `user_`).

### 3. Push database schema

```bash
npm run db:push
```

### 4. Seed default workouts

```bash
npm run db:seed
```

This creates Push, Pull, and Legs plans with starter exercises. Safe to re-run — it skips if data already exists.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema to Neon |
| `npm run db:seed` | Seed default PPL exercises |
| `npm run db:studio` | Open Drizzle Studio |

## Usage

1. **Coach:** Sign up first, set `ADMIN_USER_ID` in `.env.local` to your Clerk user ID, restart the dev server, then open **Admin** (gear icon) to manage exercises and video URLs.
2. **Friend:** Sign up, go to **Go to workouts**, pick Push/Pull/Legs, and check off exercises during the session.

## Project structure

```
src/
  app/           # Pages (home, gym, admin, auth)
  actions/       # Server actions (completions, exercise CRUD)
  components/    # UI components
  db/            # Drizzle schema and connection
  lib/           # Queries, admin helpers, workout types
  scripts/       # Database seed script
```
