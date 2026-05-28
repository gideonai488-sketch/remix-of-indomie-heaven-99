-- SpeedUp: Fix order_items unit_price constraint
-- Run this in Supabase SQL Editor

-- Option 1 (simplest): make unit_price auto-fill from price column
ALTER TABLE public.order_items
  ALTER COLUMN unit_price DROP NOT NULL;

-- Set default to use price value when unit_price is omitted
UPDATE public.order_items
  SET unit_price = price
  WHERE unit_price IS NULL AND price IS NOT NULL;

-- Add trigger so future inserts always have unit_price filled
CREATE OR REPLACE FUNCTION fill_unit_price()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit_price IS NULL THEN
    NEW.unit_price = NEW.price;
  END IF;
  IF NEW.price IS NULL THEN
    NEW.price = NEW.unit_price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_items_fill_unit_price ON public.order_items;
CREATE TRIGGER order_items_fill_unit_price
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION fill_unit_price();
