
-- Remove all RLS policies first
DROP POLICY IF EXISTS "Allow all delete" ON public.disparos;
DROP POLICY IF EXISTS "Allow all insert" ON public.disparos;
DROP POLICY IF EXISTS "Allow all select" ON public.disparos;
DROP POLICY IF EXISTS "Allow all update" ON public.disparos;

-- Drop the table from Cloud
DROP TABLE IF EXISTS public.disparos;
