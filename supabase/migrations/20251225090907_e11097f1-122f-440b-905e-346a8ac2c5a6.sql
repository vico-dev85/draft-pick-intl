-- Fix: Restrict error_logs INSERT to authenticated users only
-- This prevents anonymous users from spamming the database with fake error entries

-- Drop the permissive anonymous insert policy
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;

-- Create a new policy that only allows authenticated users to insert error logs
CREATE POLICY "Authenticated users can insert error logs"
ON public.error_logs
FOR INSERT
TO authenticated
WITH CHECK (true);