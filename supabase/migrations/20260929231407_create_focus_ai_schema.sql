/*
# Focus AI — Initial database schema

Creates the core tables for the Focus AI task manager app.

1. New Tables
- `profiles` — User profile information (name, timezone)
  - id (uuid, PK)
  - user_id (uuid, FK to auth.users, defaults to auth.uid(), unique)
  - name (text, default empty string)
  - timezone (text, default 'UTC')
  - created_at, updated_at (timestamptz)

- `projects` — User-created projects for organizing tasks
  - id (uuid, PK)
  - user_id (uuid, FK to auth.users, defaults to auth.uid())
  - name (text, not null)
  - created_at, updated_at (timestamptz)

- `tasks` — User tasks with full metadata
  - id (uuid, PK)
  - user_id (uuid, FK to auth.users, defaults to auth.uid())
  - project_id (uuid, FK to projects, nullable, ON DELETE SET NULL)
  - parent_task_id (uuid, self-referential FK, nullable, ON DELETE CASCADE)
  - title (text, not null)
  - description (text)
  - completed (boolean, default false)
  - priority (integer, 1=High 2=Medium 3=Low, default 2, CHECK constraint)
  - due_date (date, nullable)
  - due_time (time, nullable)
  - reminder_at (timestamptz, nullable)
  - estimated_minutes (integer, nullable)
  - created_at, updated_at, completed_at (timestamptz)

- `ai_actions` — Audit log for AI operations
  - id (uuid, PK)
  - user_id (uuid, FK to auth.users, defaults to auth.uid())
  - action_type (text)
  - input (jsonb)
  - output (jsonb)
  - created_at (timestamptz)

2. Security
- RLS enabled on ALL tables
- Owner-scoped CRUD: 4 policies per table (SELECT/INSERT/UPDATE/DELETE)
- All policies scoped TO authenticated with auth.uid() = user_id
- user_id columns default to auth.uid() so client inserts omitting user_id succeed
- Auto-create profile trigger on auth.users INSERT (SECURITY DEFINER)

3. Indexes
- tasks: user_id, project_id, parent_task_id, due_date, completed
- projects: user_id
- profiles: user_id

4. Triggers
- update_updated_at on profiles, projects, tasks (BEFORE UPDATE)
- on_auth_user_created on auth.users (AFTER INSERT) — auto-creates profile row
*/

-- ============================================================
-- Helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON public.profiles;
CREATE POLICY "delete_own_profile" ON public.profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Projects
-- ============================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON public.projects;
CREATE POLICY "select_own_projects" ON public.projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON public.projects;
CREATE POLICY "insert_own_projects" ON public.projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON public.projects;
CREATE POLICY "update_own_projects" ON public.projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON public.projects;
CREATE POLICY "delete_own_projects" ON public.projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Tasks
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  completed boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 2 CHECK (priority IN (1, 2, 3)),
  due_date date,
  due_time time,
  reminder_at timestamptz,
  estimated_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON public.tasks;
CREATE POLICY "select_own_tasks" ON public.tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tasks" ON public.tasks;
CREATE POLICY "insert_own_tasks" ON public.tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tasks" ON public.tasks;
CREATE POLICY "update_own_tasks" ON public.tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tasks" ON public.tasks;
CREATE POLICY "delete_own_tasks" ON public.tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- AI Actions (audit log)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  input jsonb,
  output jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_actions" ON public.ai_actions;
CREATE POLICY "select_own_ai_actions" ON public.ai_actions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ai_actions" ON public.ai_actions;
CREATE POLICY "insert_own_ai_actions" ON public.ai_actions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ai_actions" ON public.ai_actions;
CREATE POLICY "delete_own_ai_actions" ON public.ai_actions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON public.tasks(completed);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- ============================================================
-- Triggers
-- ============================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();