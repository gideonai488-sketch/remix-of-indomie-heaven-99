import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Location {
  lat: number;
  lng: number;
}

interface FareEstimate {
  distance_km: number;
  fee: number;
  rider_payout: number;
  platform_fee: number;
}

export const usePriceCalculator = () => {
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateFare = useCallback(async (pickup: Location, dropoff: Location) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("calculate-fare", {
        body: {
          pickup: { lat: pickup.lat, lng: pickup.lng },
          dropoff: { lat: dropoff.lat, lng: dropoff.lng },
        },
      });

      if (err) throw err;
      if (!data) throw new Error("No fare data returned");

      setEstimate(data as FareEstimate);
      return data as FareEstimate;
    } catch (e: any) {
      const msg = e.message || "Failed to calculate fare";
      setError(msg);
      console.error("Fare calculation error:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { estimate, loading, error, calculateFare };
};
