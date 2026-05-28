import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import promoVideo1 from "@/assets/promo-video-1.mp4";
import promoVideo2 from "@/assets/promo-video-2.mp4";
import promoVideo3 from "@/assets/promo-video-3.mp4";

const fallbackVideos = [
  { src: promoVideo1, title: "SpeedUp", subtitle: "Fastest delivery in Ghana", cta: "Order Now" },
  { src: promoVideo2, title: "New Bowls", subtitle: "Fresh every day", cta: "Explore" },
  { src: promoVideo3, title: "Jollof Special", subtitle: "Spice up your week", cta: "Order Now" },
];

interface BannerSlide {
  src: string;
  title: string;
  subtitle: string;
  cta: string;
}

const PromoBanner = () => {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Fetch from promo_banners table on mount
  useEffect(() => {
    const load = async () => {
      try {
        const { data: rows, error } = await supabase
          .from("promo_banners")
          .select("title, subtitle, cta, file_path, bucket")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error || !rows || rows.length === 0) {
          console.warn("[PromoBanner] db load failed, using fallback", error?.message);
          setSlides(fallbackVideos);
          return;
        }

        const mapped: BannerSlide[] = (rows as any[]).map((r) => {
          const { data } = supabase.storage.from(r.bucket || "promo-videos").getPublicUrl(r.file_path);
          return {
            src: data.publicUrl,
            title: r.title || "",
            subtitle: r.subtitle || "",
            cta: r.cta || "",
          };
        });
        setSlides(mapped);
      } catch (err: any) {
        console.error("[PromoBanner] unexpected error:", err?.message || err);
        setSlides(fallbackVideos);
      }
    };
    load();
  }, []);

  const go = (dir: number) => setCurrent((p) => (p + dir + slides.length) % Math.max(slides.length, 1));

  // Auto-rotate every 5.5s
  useEffect(() => {
    if (slides.length === 0) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  // Play current video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [current]);

  if (slides.length === 0) return null;

  const slide = slides[current];
  const isVideo = slide.src.match(/\.(mp4|webm|mov)(\?.*)?$/i);

  return (
    <section className="container mx-auto px-4 py-5">
      <div className="group relative cursor-pointer overflow-hidden rounded-3xl shadow-md ring-1 ring-black/10">
        {/* Media layer */}
        <div className="relative h-52 w-full sm:h-64 md:h-72">
          {isVideo ? (
            <video
              ref={videoRef}
              src={slide.src}
              className="h-full w-full object-cover"
              autoPlay
              loop
              playsInline
              muted={false}
            />
          ) : (
            <img src={slide.src} alt={slide.title} className="h-full w-full object-cover" />
          )}

          {/* Text overlay */}
          {(slide.title || slide.subtitle || slide.cta) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-center p-4">
              {slide.title && (
                <h2 className="text-xl font-bold text-white sm:text-2xl md:text-3xl drop-shadow-lg">
                  {slide.title}
                </h2>
              )}
              {slide.subtitle && (
                <p className="mt-1 text-sm text-white/90 sm:text-base drop-shadow">
                  {slide.subtitle}
                </p>
              )}
              {slide.cta && (
                <button
                  onClick={() => navigate("/menu")}
                  className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-primary/90"
                >
                  {slide.cta}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Arrows */}
        <button
          onClick={(e) => { e.stopPropagation(); go(-1); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-white/30"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); go(1); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-white/30"
        >
          <ChevronRight className="h-4 w-4 text-white" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 right-5 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-6 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
