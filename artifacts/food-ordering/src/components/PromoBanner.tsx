import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Fallback videos baked into the app (used when Supabase storage is empty / unreachable)
import promoVideo1 from "@/assets/promo-video-1.mp4";
import promoVideo2 from "@/assets/promo-video-2.mp4";
import promoVideo3 from "@/assets/promo-video-3.mp4";

const fallbackVideos = [
  { src: promoVideo1, label: "", subtitle: "", cta: "" },
  { src: promoVideo2, label: "", subtitle: "", cta: "" },
  { src: promoVideo3, label: "", subtitle: "", cta: "" },
];

interface BannerSlide {
  src: string;
  label: string;
  subtitle: string;
  cta: string;
}

const PromoBanner = () => {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Fetch from Supabase Storage bucket on mount
  useEffect(() => {
    const load = async () => {
      try {
        const bucketName = "promo-videos";
        const { data: files, error } = await supabase.storage.from(bucketName).list("", { limit: 20 });
        if (error) {
          console.warn("[PromoBanner] storage list error:", error.message);
          setSlides(fallbackVideos);
          return;
        }

        let allMedia: { name: string; path: string }[] = [];
        const rootFiles = (files || []).filter((f) => {
          const name = f.name.toLowerCase();
          return !name.startsWith(".") && (name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".mov") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg"));
        });
        allMedia.push(...rootFiles.map((f) => ({ name: f.name, path: f.name })));

        const folders = (files || []).filter((f) => f.id === null && !f.name.startsWith("."));
        for (const folder of folders) {
          const { data: subFiles } = await supabase.storage.from(bucketName).list(folder.name, { limit: 20 });
          const subMedia = (subFiles || []).filter((f) => {
            const name = f.name.toLowerCase();
            return name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".mov") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg");
          });
          allMedia.push(...subMedia.map((f) => ({ name: f.name, path: `${folder.name}/${f.name}` })));
        }

        if (allMedia.length === 0) {
          console.warn(`[PromoBanner] bucket '${bucketName}' is empty or private.`);
          setSlides(fallbackVideos);
          return;
        }

        const mapped: BannerSlide[] = allMedia.map((m) => {
          const { data } = supabase.storage.from(bucketName).getPublicUrl(m.path);
          return {
            src: data.publicUrl,
            label: "",
            subtitle: "",
            cta: "",
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

  // Only play the current video; pause all others
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === current) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [current, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-5">
      <div
        className="group relative cursor-pointer overflow-hidden rounded-3xl shadow-md ring-1 ring-black/10"
        onClick={() => navigate("/menu")}
      >
        {/* Media layer — only render the current slide */}
        <div className="relative h-52 w-full sm:h-64 md:h-72">
          {slides.map((s, i) => (
            i === current && (
              <div key={i} className="absolute inset-0 h-full w-full">
                {s.src.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
                  <video
                    ref={(el) => { videoRefs.current[i] = el; }}
                    src={s.src}
                    className="h-full w-full object-cover"
                    autoPlay
                    loop
                    playsInline
                    muted={false}
                  />
                ) : (
                  <img src={s.src} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            )
          ))}
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
