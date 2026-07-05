import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PromoVideo {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  sort_order: number;
  active: boolean;
}

export const usePromoVideos = () => {
  const [videos, setVideos] = useState<PromoVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPromoVideos = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch active promo videos ordered by sort_order
        const { data, error: err } = await supabase
          .from("promo_videos")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true });

        if (err) throw err;

        setVideos((data as PromoVideo[]) || []);
      } catch (e: any) {
        console.error("Error fetching promo videos:", e);
        setError(e.message || "Failed to fetch promo videos");
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromoVideos();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("promo-videos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promo_videos" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setVideos((prev) => [...prev, payload.new as PromoVideo].sort((a, b) => a.sort_order - b.sort_order));
          } else if (payload.eventType === "UPDATE") {
            setVideos((prev) =>
              prev.map((video) =>
                video.id === (payload.new as any).id ? (payload.new as PromoVideo) : video
              ).sort((a, b) => a.sort_order - b.sort_order)
            );
          } else if (payload.eventType === "DELETE") {
            setVideos((prev) => prev.filter((video) => video.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { videos, loading, error };
};
