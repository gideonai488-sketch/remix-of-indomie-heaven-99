-- Fix overly permissive INSERT policy on notifications
-- Only allow authenticated users to insert their own notifications or admins to insert any
DROP POLICY "System inserts notifications" ON public.notifications;

CREATE POLICY "Users insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins insert any notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));