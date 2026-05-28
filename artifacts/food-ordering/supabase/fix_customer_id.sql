-- SpeedUp: Fix customer_id column on orders table
-- Run this in Supabase SQL Editor

-- Add customer_id column if it doesn't exist, default to user_id value
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id UUID;

-- Backfill customer_id from user_id for existing rows
UPDATE public.orders SET customer_id = user_id WHERE customer_id IS NULL;

-- Keep them in sync automatically going forward
CREATE OR REPLACE FUNCTION sync_customer_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN
    NEW.customer_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_sync_customer_id ON public.orders;
CREATE TRIGGER orders_sync_customer_id
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION sync_customer_id();

-- Fix RLS: ensure policy allows insert when user_id = auth.uid() OR customer_id = auth.uid()
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;

CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() = customer_id);

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = customer_id);

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = customer_id);
