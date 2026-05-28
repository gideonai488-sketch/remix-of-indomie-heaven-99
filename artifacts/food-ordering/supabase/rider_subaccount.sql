-- SpeedUp: Add Paystack subaccount to riders table
-- Run this in Supabase SQL Editor

-- Add subaccount code column to riders
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS paystack_subaccount_code TEXT,
  ADD COLUMN IF NOT EXISTS bank_name                TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number      TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name        TEXT;

-- Also store rider_id on orders so payment knows which subaccount to pay
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL;

-- Index for fast rider order lookups
CREATE INDEX IF NOT EXISTS orders_rider_id_idx ON public.orders (rider_id);
