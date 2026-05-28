-- Add payment method to orders
ALTER TABLE public.orders
ADD COLUMN payment_method text NOT NULL DEFAULT 'cash_on_delivery';

-- Add momo phone number for mobile money payments
ALTER TABLE public.orders
ADD COLUMN momo_phone text;