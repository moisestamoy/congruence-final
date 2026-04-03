# Congruence

Personal life-management app built with React + TypeScript + Vite + Tailwind CSS.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS (dark theme, `bg-[#0a0a0a]` base)
- **State**: Zustand (per-feature stores in `useXStore.ts`)
- **Backend**: Supabase (auth + sync)
- **i18n**: react-i18next (es, en, pt)
- **Icons**: lucide-react

## Project Structure

```
src/features/
  auth/       — authentication (Supabase)
  coach/      — AI coaching
  finance/    — budgeting, transactions, savings goals
  gamification/ — XP, levels, streaks
  habits/     — habit tracking
  identity/   — user identity/values
  stats/      — analytics & charts
  sync/       — Supabase data sync
  tasks/      — task management
```

## Commands

- `npm run dev` — start dev server
- `npm run build` — type-check + production build
- `npm run lint` — ESLint

## Conventions

- UI language is Spanish by default
- Each feature has its own Zustand store (`useFinanceStore`, `useHabitStore`, etc.)
- Components use Tailwind utility classes directly (no CSS files)
- Dark-only design: blacks (#0a0a0a, #050505), white/10 borders, accent colors (indigo, rose, emerald)
- Modal pattern: fixed inset-0 overlay with centered card
