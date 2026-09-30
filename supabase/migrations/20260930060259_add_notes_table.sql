/*
# Add notes table for Focus AI

1. New Tables
- `notes` — Standalone notes (separate from task descriptions)
  - id (uuid, PK)
  - user_id (uuid, FK to auth.users, defaults to auth.uid())
  - title (text, default empty string)
  - content (text, default empty string)
  - pinned (boolean, default false)
  - created_at, updated_at (timestamptz)

2. Security
- RLS enabled on `notes`
- Owner-scoped CRUD: 4 policies (SELECT/INSERT/UPDATE/DELETE)
- All policies scoped TO authenticated with auth.uid() = user_id
- user_id defaults to auth.uid()

3. Indexes
- notes: user_id
- notes: pinned (for quick filtering)

4. Triggers
- update_notes_updated_at BEFORE UPDATE
*/

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notes" ON public.notes;
CREATE POLICY "select_own_notes" ON public.notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notes" ON public.notes;
CREATE POLICY "insert_own_notes" ON public.notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notes" ON public.notes;
CREATE POLICY "update_own_notes" ON public.notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notes" ON public.notes;
CREATE POLICY "delete_own_notes" ON public.notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes(pinned);

DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
