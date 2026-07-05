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

// Calculate fare based on distance using backend pricing tiers
// Tiers: ≤4km=₵20, ≤8=₵25, ≤12=₵30, ≤15=₵35, ≤20=₵45, +₵3/km
const calculateFareFromDistance = (distanceKm: number): FareEstimate => {
  let fee: number;

  if (distanceKm <= 4) {
    fee = 20;
  } else if (distanceKm <= 8) {
    fee = 25;
  } else if (distanceKm <= 12) {
    fee = 30;
  } else if (distanceKm <= 15) {
    fee = 35;
  } else if (distanceKm <= 20) {
    fee = 45;
  } else {
    // Beyond 20km: base 45 + 3 per km for each km over 20
    fee = 45 + (distanceKm - 20) * 3;
  }

  // Platform fee: GH₵5 (fixed, not percentage)
  const platformFee = 5;
  const riderPayout = fee - platformFee;

  return {
    distance_km: Math.round(distanceKm * 10) / 10,
    fee: Math.round(fee * 100) / 100,
    rider_payout: Math.round(riderPayout * 100) / 100,
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

      // Calculate fare based on distance using backend pricing tiers
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
