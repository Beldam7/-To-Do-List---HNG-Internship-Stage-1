# AGENTS.md

Guidance for AI coding agents (and humans) working on **Focus AI**, a task and notes app with AI helpers.
Read this before making changes.

## Project overview

Focus AI is a single-page web app for managing tasks, projects and notes. AI features turn natural-language input into structured tasks, break tasks into subtasks, plan the day, sort the inbox and suggest what to do next.

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS 3
- **Icons:** `lucide-react` only
- **Backend:** Supabase (Postgres with Row Level Security, Auth, Edge Functions)
- **AI:** OpenAI chat completions, called only from the `ai-assist` Supabase edge function
- **Hosting:** Vercel (static Vite build)

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (http://localhost:5173)
npm run build        # production build to dist/
npm run preview      # serve the production build locally
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit -p tsconfig.app.json
```

Before finishing any change, run `npm run typecheck` and `npm run build`. Both must pass.

## Project structure

```
src/
  App.tsx                  # root: auth provider, onboarding gate, page switcher
  main.tsx                 # entry point
  hooks/                   # useAuth, useTasks, useProjects, useNotes, useTheme, useDebounce
  components/
    ai/                    # AI action buttons (plan day, next task, brain dump, ...)
    layout/                # AppLayout, Sidebar, MobileNav
    tasks/ notes/          # feature components
    ui/                    # shared primitives: Button, Input, Modal, Select, Toast, Badge, EmptyState
  pages/                   # Today, Inbox, AllTasks, Projects, Notes, Settings, Onboarding, Auth (unused)
  lib/
    supabase/client.ts     # the single Supabase client
    ai/client.ts           # calls the ai-assist edge function
    utils.ts               # shared helpers
  types/index.ts           # shared TypeScript types
supabase/
  config.toml              # function settings (ai-assist has verify_jwt = true)
  migrations/              # ordered SQL migrations
  functions/ai-assist/     # edge function (Deno)
```

## Conventions

- Import project modules with the `@/` alias (maps to `src/`), never deep relative paths such as `../../components/Foo`.
- Style with Tailwind utility classes and support both light and dark mode (`dark:` variants). Reuse the primitives in `src/components/ui/` before writing new ones.
- Do not add new UI libraries, icon packs or state managers unless explicitly asked. Use `lucide-react` for icons.
- Keep components small and typed. Put shared types in `src/types/index.ts`.
- Data access lives in the `use*` hooks. Components should not build Supabase queries inline when a hook exists.
- Always handle Supabase errors and show user-facing feedback with the toast helper (`showToast`) instead of failing silently.
- Follow the existing code style; do not reformat unrelated files.

## Authentication model

There is **no login screen**. On first load `useAuth` creates a silent **anonymous Supabase session** (`signInAnonymously`), so each browser gets its own private account.

- Anonymous sign-ins must be enabled in Supabase (Authentication, Sign In / Providers).
- Data belongs to the browser session; clearing site data creates a new empty account.
- `AuthPage.tsx` is unused legacy code. Do not route to it. There is no log-out button.
- Never remove authentication entirely. The database ties rows to `auth.uid()`, and the edge function requires a valid JWT.

## Database

Tables (all in `public`, all with RLS enabled): `profiles`, `projects`, `tasks`, `notes`, `ai_actions`.

- Every row has a `user_id` that defaults to `auth.uid()`. Client inserts should omit `user_id`.
- Policies are scoped `TO authenticated` with `auth.uid() = user_id`. Anonymous users count as `authenticated`.
- A trigger (`handle_new_user`) creates a `profiles` row for each new user with an empty name, which sends the user through onboarding.
- **Migrations:** never edit a migration that has already been applied. Add a new file in `supabase/migrations/` named `YYYYMMDDHHMMSS_description.sql`, and keep statements re-runnable (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`).
- Any new table must enable RLS and add policies for select, insert, update and delete scoped to the owner.

## AI edge function (`supabase/functions/ai-assist`)

- Runs on Deno with `verify_jwt = true`. The client sends the user's JWT and the anon key.
- Supported actions include task parsing, subtask breakdown, brain dump, inbox organisation, day planning and next-task suggestion.
- The OpenAI key comes from either the user's own key (saved in their profile via Settings) or the server secret `OPENAI_API_KEY`.
- Optional server secret `OPENAI_MODEL` overrides the default (`gpt-4o-mini`).
- The function logs actions to `ai_actions` on a best-effort basis using the service role key, which Supabase provides automatically when hosted.
- The UI must degrade gracefully: if AI is unavailable, tasks can still be added as plain tasks.
- Deploy with `npx supabase functions deploy ai-assist`. Set secrets with `npx supabase secrets set OPENAI_API_KEY=...`.

## Environment variables

Frontend (`.env` locally, Vercel project settings in production):

| Name | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL. Format: `https://<ref>.supabase.co` with no trailing slash and no path |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |

Rules:

- Vite reads `.env` only at startup. Restart the dev server after editing it, and redeploy on Vercel after changing variables.
- `.env` is git-ignored. Never commit it. `.env.example` holds placeholders only.
- **Never** put the OpenAI key or the Supabase `service_role` key in a `VITE_` variable or anywhere in `src/`. Server secrets belong in Supabase secrets.

## Deployment

- Vercel builds with `npm run build` and serves `dist/`.
- `vercel.json` should rewrite all routes to `/index.html` so refreshes do not 404.
- After changing the deployed URL, update Supabase Authentication, URL Configuration (Site URL and Redirect URLs).
- Link-preview metadata (Open Graph and Twitter tags) lives in `index.html`. Image URLs there must be absolute `https://` URLs.

## Testing checklist

There is no automated test suite yet. After a change, verify manually:

1. The app loads without a login screen and reaches the Today page.
2. Adding, editing, completing and deleting a task works and survives a refresh.
3. Projects and notes load and save.
4. With AI configured, "Plan my day" and "What should I do next?" respond. Without it, adding a task still works and shows the "AI is temporarily unavailable" notice.
5. Light and dark modes both look correct, on desktop and mobile widths.
6. `npm run typecheck` and `npm run build` pass.

## Known gotchas

- **"Invalid path specified in request URL":** `VITE_SUPABASE_URL` has a trailing slash, an extra path, quotes or a space.
- **"We couldn't save that task":** usually the tables or policies are missing in the connected Supabase project. Run all migrations in order.
- **"email rate limit exceeded":** Supabase's built-in email sender has a very low hourly limit. Not relevant to anonymous sessions, but it affects any email flow. Use custom SMTP for real email.
- **AI unavailable:** the `ai-assist` function is not deployed, or no OpenAI key is set (server secret or user key in Settings).

## Do and don't

**Do**

- Keep changes small and focused, and explain what changed and why.
- Preserve RLS on every table and keep the anon key as the only key in the browser.
- Ask before adding dependencies, changing the schema in a breaking way, or altering the auth model.

**Don't**

- Don't commit secrets, `.env` files or `node_modules`.
- Don't disable RLS or loosen policies to "make something work".
- Don't call OpenAI directly from the browser.
- Don't rewrite applied migrations.
