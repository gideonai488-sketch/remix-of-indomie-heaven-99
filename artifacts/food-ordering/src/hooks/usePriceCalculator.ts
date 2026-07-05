import { useState, useCallback } from "react";

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

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate fare based on distance
const calculateFareFromDistance = (distanceKm: number): FareEstimate => {
  // Base fare: GH₵ 5
  const baseFare = 5;
  // Per km rate: GH₵ 2 per km
  const perKmRate = 2;
  // Minimum fare: GH₵ 10
  const minimumFare = 10;

  const distanceFare = Math.max(baseFare + distanceKm * perKmRate, minimumFare);
  const platformFee = Math.round(distanceFare * 0.1 * 100) / 100; // 10% platform fee
  const riderPayout = Math.round((distanceFare - platformFee) * 100) / 100;

  return {
    distance_km: Math.round(distanceKm * 10) / 10,
    fee: Math.round(distanceFare * 100) / 100,
    rider_payout: riderPayout,
    platform_fee: platformFee,
  };
};

export const usePriceCalculator = () => {
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateFare = useCallback(async (pickup: Location, dropoff: Location) => {
    setLoading(true);
    setError(null);
    try {
      // Calculate distance using Haversine formula
      const distanceKm = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);

      if (distanceKm < 0.1) {
        throw new Error("Pickup and dropoff locations are too close");
      }

      // Calculate fare based on distance
      const fareEstimate = calculateFareFromDistance(distanceKm);
      setEstimate(fareEstimate);
      return fareEstimate;
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
