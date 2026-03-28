
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING ((user_id = auth.uid()) OR (user_id IS NULL))
WITH CHECK ((user_id = auth.uid()) OR (user_id IS NULL));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
