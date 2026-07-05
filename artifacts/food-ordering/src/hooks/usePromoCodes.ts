import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses?: number;
  uses?: number;
  min_order_value?: number;
  active: boolean;
  expires_at?: string;
}

export const usePromoCodes = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePromoCode = useCallback(async (code: string): Promise<PromoCode | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", code.toUpperCase())
        .eq("active", true)
        .single();

      if (err) {
        if (err.code === "PGRST116") {
          setError("Promo code not found");
        } else {
          throw err;
        }
        return null;
      }

      // Check if code has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError("Promo code has expired");
        return null;
      }

      // Check if code has reached max uses
      if (data.max_uses && data.uses && data.uses >= data.max_uses) {
        setError("Promo code has reached maximum uses");
        return null;
      }

      return data as PromoCode;
    } catch (e: any) {
      const msg = e.message || "Failed to validate promo code";
      setError(msg);
      console.error("Promo code validation error:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateDiscount = useCallback((promoCode: PromoCode, orderAmount: number): number => {
    if (!promoCode) return 0;

    if (promoCode.min_order_value && orderAmount < promoCode.min_order_value) {
      return 0;
    }

    if (promoCode.discount_type === "percentage") {
      return Math.round((orderAmount * promoCode.discount_value) / 100 * 100) / 100;
    } else {
      return Math.min(promoCode.discount_value, orderAmount);
    }
  }, []);

  return { validatePromoCode, calculateDiscount, loading, error };
};
