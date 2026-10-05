# Soul Health

A personal health tracker. Upload your lab results (PDFs or photos, any year, any language), log meals, menus, receipts and water, and an AI (Claude via OpenRouter) helps you understand your health:

- **Today:** an overall review with a score, body-system status, priorities, foods to eat more or less of, and things to raise with a doctor.
- **Labs:** the AI reads every value. You check and correct the numbers before they're saved.
- **Markers:** a trend chart for each marker over time, with the reference range shaded. Units are standardised across labs (for example mmol/L ↔ mg/dL, г/л ↔ g/dL).
- **Plan:** which tests to take and how often, with due and overdue dates and a "+ Calendar" reminder (.ics). It starts from a rule-based baseline, and you can personalise it with AI.
- **Food:** photograph a meal (nutrition plus how it fits your labs), a menu (the best picks for you) or a grocery receipt (smart swaps). There's also a water tracker.
- **Coach:** a chat that can see your profile, lab history, food and water.

> Not a medical device. It explains and tracks; it always points you to a doctor for out-of-range or worrying results.

## Run locally

```bash
cd health
cp .env.example .env.local   # add OPENROUTER_API_KEY at minimum
npm install
npm run dev                  # http://localhost:3000
```

If you leave the Supabase variables empty, the app runs in **demo mode**: everything is stored in your browser's localStorage, with no login. This is useful for trying it out.

## Private cloud mode (recommended)

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL editor**, run `supabase/migrations/0001_init.sql`. This creates the tables, owner-only Row-Level Security and a private `health-files` storage bucket.
3. In **Authentication → URL configuration**, add your site URL and `https://<your-domain>/auth/callback` as a redirect URL.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from **Project settings → API**).

You sign in with an email magic link. Every row and file is readable only by its owner.

## Deploy on Vercel

Import the repo, set **Root Directory = `health`** and add the environment variables above. On iPhone, open the site in Safari and tap **Share → Add to Home Screen** to use it like an app.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests: biomarker matching, unit conversion, AI-output parsing, test-plan dates |

## How it's built

- Next.js (App Router) + Tailwind v4, using the Café Noir / Kombu / Moss / Tan / Bone palette (tokens in `app/globals.css`), with Fraunces + Figtree fonts.
- `lib/store/*` is one data interface with two backends: Supabase (cloud) and localStorage (demo).
- `app/api/*` holds the server-only AI routes. The OpenRouter key never reaches the browser. In cloud mode the routes require a signed-in user.
- `lib/biomarkers.ts` is the canonical marker dictionary (English and Russian aliases, unit conversions, typical ranges, explanations).
- `lib/prompts.ts` holds the system prompts. `lib/schemas.ts` holds lenient zod validators for the AI's JSON.

## Next steps

- Apple Health: upload `export.zip` (steps, sleep, resting heart rate, weight), or receive data from the *Health Auto Export* iOS app through a webhook.
- A "doctor summary" PDF export.
- Email or push reminders for due tests.
