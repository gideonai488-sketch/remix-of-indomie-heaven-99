-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to send push notification on order status change
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _title text;
  _body text;
  _supabase_url text;
  _service_key text;
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Build notification message
  CASE NEW.status
    WHEN 'confirmed' THEN
      _title := 'Order Confirmed ✅';
      _body := 'Your order #' || LEFT(NEW.id::text, 8) || ' has been confirmed!';
    WHEN 'preparing' THEN
      _title := 'Preparing Your Bowl 🍳';
      _body := 'Your Indomie is being prepared!';
    WHEN 'delivering' THEN
      _title := 'On Its Way! 🛵';
      _body := 'Your order is out for delivery!';
    WHEN 'delivered' THEN
      _title := 'Delivered! 🎉';
      _body := 'Your order has been delivered. Enjoy!';
    WHEN 'cancelled' THEN
      _title := 'Order Cancelled ❌';
      _body := 'Your order #' || LEFT(NEW.id::text, 8) || ' was cancelled.';
    ELSE
      RETURN NEW;
  END CASE;

  -- Call send-notification edge function via pg_net
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', 'order_update',
      'user_id', NEW.user_id::text,
      'title', _title,
      'body', _body,
      'data', jsonb_build_object('order_id', NEW.id::text, 'status', NEW.status)
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_status_change();

-- Function to notify admins of new orders
CREATE OR REPLACE FUNCTION public.notify_admin_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', 'admin_alert',
      'title', 'New Order! 📦',
      'body', 'New order #' || LEFT(NEW.id::text, 8) || ' — GH₵' || NEW.total_amount::text,
      'data', jsonb_build_object('order_id', NEW.id::text)
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_order_admin_alert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_new_order();