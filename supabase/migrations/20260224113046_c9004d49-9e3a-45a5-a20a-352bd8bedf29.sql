
-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Delivery addresses
CREATE TABLE public.delivery_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL DEFAULT 'Accra',
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address_id UUID REFERENCES public.delivery_addresses(id),
  status public.order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  promo_code TEXT,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Promo codes (system managed)
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.uid() = _user_id $$;

CREATE OR REPLACE FUNCTION public.is_order_owner(_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders WHERE id = _order_id AND user_id = auth.uid()
  )
$$;

-- RLS Policies: Profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (public.is_owner(user_id));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (public.is_owner(user_id));
CREATE POLICY "System creates profile" ON public.profiles FOR INSERT WITH CHECK (public.is_owner(user_id));

-- RLS Policies: Delivery Addresses
CREATE POLICY "Users read own addresses" ON public.delivery_addresses FOR SELECT USING (public.is_owner(user_id));
CREATE POLICY "Users create own addresses" ON public.delivery_addresses FOR INSERT WITH CHECK (public.is_owner(user_id));
CREATE POLICY "Users update own addresses" ON public.delivery_addresses FOR UPDATE USING (public.is_owner(user_id));
CREATE POLICY "Users delete own addresses" ON public.delivery_addresses FOR DELETE USING (public.is_owner(user_id));

-- RLS Policies: Orders
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT USING (public.is_owner(user_id));
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT WITH CHECK (public.is_owner(user_id));
CREATE POLICY "Users update own orders" ON public.orders FOR UPDATE USING (public.is_owner(user_id));

-- RLS Policies: Order Items
CREATE POLICY "Users read own order items" ON public.order_items FOR SELECT USING (public.is_order_owner(order_id));
CREATE POLICY "Users create own order items" ON public.order_items FOR INSERT WITH CHECK (public.is_order_owner(order_id));

-- RLS Policies: Favorites
CREATE POLICY "Users read own favorites" ON public.favorites FOR SELECT USING (public.is_owner(user_id));
CREATE POLICY "Users create own favorites" ON public.favorites FOR INSERT WITH CHECK (public.is_owner(user_id));
CREATE POLICY "Users delete own favorites" ON public.favorites FOR DELETE USING (public.is_owner(user_id));

-- RLS Policies: Promo codes (read-only for users, active ones only)
CREATE POLICY "Users read active promos" ON public.promo_codes FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Insert some sample promo codes
INSERT INTO public.promo_codes (code, discount_percent, max_uses, valid_until) VALUES
('GHANA10', 10, 100, now() + interval '30 days'),
('WELCOME20', 20, 50, now() + interval '14 days'),
('INDOMIE15', 15, 200, now() + interval '60 days');

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar read public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
