-- SpeedUp: Orders table — add missing columns for proper order tracking
-- Run this in your Supabase SQL Editor

-- Add customer details as proper columns (not buried in JSON notes)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name    TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone   TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS momo_phone       TEXT,
  ADD COLUMN IF NOT EXISTS momo_network     TEXT,
  ADD COLUMN IF NOT EXISTS payment_status   TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'waived'));

-- Rename address_id to delivery_address_id if it doesn't already exist
-- (only run if your column is still called address_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_address_id'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN address_id TO delivery_address_id;
  END IF;
END $$;

-- Ensure payment_method allows new values
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN (
    'cash_on_delivery',
    'momo_on_delivery',
    'paystack',
    'wallet',
    'cash',
    'momo'
  ));

-- Index for fast user order lookups
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx  ON public.orders (status);

-- Enable Realtime for orders if not already enabled
-- (Run separately in Supabase Dashboard → Database → Replication
--  or with: ALTER PUBLICATION supabase_realtime ADD TABLE orders;)
