-- SpeedUp: Drop FK constraint on orders.delivery_address_id
-- This removes the blocking FK check so orders can be inserted freely.
-- The delivery address is stored as plain text in delivery_address column.
-- Run this in Supabase SQL Editor.

-- Drop the foreign key constraint (name may vary — this covers both old and new names)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_address_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_address_id_fkey;

-- Also ensure delivery_address text column exists (in case migration hasn't run yet)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS customer_name    TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone   TEXT,
  ADD COLUMN IF NOT EXISTS momo_phone       TEXT,
  ADD COLUMN IF NOT EXISTS momo_network     TEXT,
  ADD COLUMN IF NOT EXISTS payment_status   TEXT DEFAULT 'pending';
