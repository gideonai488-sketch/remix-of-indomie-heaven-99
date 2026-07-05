import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Ad {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  video_url?: string;
  cta_text?: string;
  cta_link?: string;
  placement: "home_banner" | "home_feed" | "checkout" | "tracking";
  active: boolean;
  sort_order: number;
}

export const useAds = (placement?: string) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from("ads")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true });

        if (placement) {
          query = query.eq("placement", placement);
        }

        const { data, error: err } = await query;

        if (err) throw err;

        setAds((data as Ad[]) || []);
      } catch (e: any) {
        console.error("Error fetching ads:", e);
        setError(e.message || "Failed to fetch ads");
        setAds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("ads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ads" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setAds((prev) => [...prev, payload.new as Ad].sort((a, b) => a.sort_order - b.sort_order));
          } else if (payload.eventType === "UPDATE") {
            setAds((prev) =>
              prev.map((ad) =>
                ad.id === (payload.new as any).id ? (payload.new as Ad) : ad
              ).sort((a, b) => a.sort_order - b.sort_order)
            );
          } else if (payload.eventType === "DELETE") {
            setAds((prev) => prev.filter((ad) => ad.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [placement]);

  return { ads, loading, error };
};
