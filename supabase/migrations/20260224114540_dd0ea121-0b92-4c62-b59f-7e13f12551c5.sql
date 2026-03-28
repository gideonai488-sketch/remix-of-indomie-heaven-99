-- Enable realtime for orders table so users can see live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;