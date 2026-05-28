-- SpeedUp: Service Requests Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('errand', 'parcel', 'package', 'pharmacy')),
  status TEXT NOT NULL DEFAULT 'searching' CHECK (
    status IN ('searching', 'accepted', 'in_progress', 'completed', 'cancelled')
  ),

  -- Addresses
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,

  -- Customer
  customer_name TEXT,
  customer_phone TEXT,

  -- Payment
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('momo', 'cash')),
  momo_phone TEXT,
  service_fee NUMERIC DEFAULT 20,

  -- Service-specific details (flexible JSONB)
  details JSONB DEFAULT '{}',

  -- Notes
  notes TEXT,

  -- Rider info (populated by rider app when accepted)
  rider_id UUID,
  rider_name TEXT,
  rider_phone TEXT,
  rider_vehicle TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own service requests"
  ON service_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create service requests"
  ON service_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requests"
  ON service_requests FOR UPDATE
  USING (auth.uid() = user_id);

-- Riders can update any request (rider app uses service role or a rider policy)
-- If you have a riders table, add a policy here for rider_id

-- Enable Realtime (run this separately if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;

-- ============================================================
-- Orders: allow customers to cancel their own pending orders
-- Run this in Supabase SQL Editor if cancel button doesn't work
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders' AND policyname = 'Customers can cancel own pending orders'
  ) THEN
    CREATE POLICY "Customers can cancel own pending orders"
      ON public.orders FOR UPDATE
      USING (auth.uid() = user_id AND status = 'pending')
      WITH CHECK (status = 'cancelled');
  END IF;
END $$;

-- ============================================================
-- Promo Banners: admin-managed promotional videos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promo_banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta TEXT,
  file_path TEXT NOT NULL,
  bucket TEXT DEFAULT 'promo-videos',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger
CREATE TRIGGER IF NOT EXISTS update_promo_banners_updated_at
  BEFORE UPDATE ON promo_banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;

-- Everyone can read active banners
CREATE POLICY IF NOT EXISTS "Anyone can read active promo banners"
  ON promo_banners FOR SELECT
  USING (is_active = true);

-- Authenticated users (admins) can manage
CREATE POLICY IF NOT EXISTS "Admins can manage promo banners"
  ON promo_banners FOR ALL
  USING (auth.uid() IS NOT NULL);
