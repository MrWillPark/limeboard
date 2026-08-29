-- Remove BigSprout schema from the Limeboard Supabase project.
-- BigSprout now runs on its own project (bigsprout / utiiylksccfuiwzcoqbk).

-- Auth trigger: was creating a profiles row for every signup, including Limeboard users.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Realtime (household collaboration tables).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'plants') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.plants;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'care_tasks') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.care_tasks;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'care_logs') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.care_logs;
  END IF;
END $$;

-- Table triggers.
DROP TRIGGER IF EXISTS profiles_updated ON public.profiles;
DROP TRIGGER IF EXISTS plants_updated ON public.plants;
DROP TRIGGER IF EXISTS care_tasks_updated ON public.care_tasks;
DROP TRIGGER IF EXISTS ailments_updated ON public.ailments;
DROP TRIGGER IF EXISTS households_updated ON public.households;

-- Tables (child tables first; CASCADE covers remaining FKs).
DROP TABLE IF EXISTS public.care_logs CASCADE;
DROP TABLE IF EXISTS public.care_tasks CASCADE;
DROP TABLE IF EXISTS public.ailments CASCADE;
DROP TABLE IF EXISTS public.plants CASCADE;
DROP TABLE IF EXISTS public.household_invites CASCADE;
DROP TABLE IF EXISTS public.household_members CASCADE;
DROP TABLE IF EXISTS public.households CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- RPCs and helpers.
DROP FUNCTION IF EXISTS public.join_household(text);
DROP FUNCTION IF EXISTS public.create_household_invite(uuid);
DROP FUNCTION IF EXISTS public.create_household(text);
DROP FUNCTION IF EXISTS public.shares_household(uuid, uuid);
DROP FUNCTION IF EXISTS public.household_role_of(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_household_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.set_updated_at();

DROP TYPE IF EXISTS public.household_role;

-- Plant photo storage policies (bucket removed via Storage API / dashboard).
DROP POLICY IF EXISTS "plant photos owner read" ON storage.objects;
DROP POLICY IF EXISTS "plant photos owner insert" ON storage.objects;
DROP POLICY IF EXISTS "plant photos owner delete" ON storage.objects;
