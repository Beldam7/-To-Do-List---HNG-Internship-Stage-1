/*
# Fix security advisor warnings

1. Security changes
- Set explicit search_path on `update_updated_at_column()` and `handle_new_user()` functions
- Revoke EXECUTE on `handle_new_user()` from anon and authenticated roles — it should only be called by the trigger, not via the REST API
*/

-- Fix mutable search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix mutable search_path on handle_new_user and restrict execution
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, '');
  RETURN NEW;
END;
$$;

-- Revoke execute from anon and authenticated — only the trigger should call this
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
