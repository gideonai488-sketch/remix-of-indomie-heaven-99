import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import promoVideo1 from "@/assets/promo-video-1.mp4";
import promoVideo2 from "@/assets/promo-video-2.mp4";
import promoVideo3 from "@/assets/promo-video-3.mp4";

const videos = [
  { src: promoVideo1, label: "The Ultimate Combo!", subtitle: "Bowl + Fries + Drink — everything you need.", cta: "Order Now" },
  { src: promoVideo2, label: "Fresh & Loaded", subtitle: "Made fresh, served bold. Your next favourite bowl.", cta: "See Menu" },
  { src: promoVideo3, label: "Oh Chale! Specials", subtitle: "Limited-time flavours you don't want to miss.", cta: "Grab It" },
];

const PromoBanner = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const go = (dir: number) => setCurrent((p) => (p + dir + videos.length) % videos.length);

  useEffect(() => {
    const t = setInterval(() => setCurrent((p) => (p + 1) % videos.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="container mx-auto px-4 py-5">
      <div
        className="group relative cursor-pointer overflow-hidden rounded-3xl shadow-md ring-1 ring-black/10"
        onClick={() => navigate("/menu")}
      >
        {/* Videos */}
        <div className="relative h-52 w-full sm:h-64 md:h-72">
          {videos.map((v, i) => (
            <video
              key={i}
              ref={(el) => { videoRefs.current[i] = el; }}
              src={v.src}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                i === current ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              autoPlay
              loop
              muted
              playsInline
            />
          ))}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-8">
          <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            <Zap className="h-3 w-3 fill-white" /> SpeedUp
          </div>
          <h2 className="font-display text-2xl font-black leading-tight text-white sm:text-3xl">
            {videos[current].label.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="text-primary">{videos[current].label.split(" ").slice(-1)}</span>
          </h2>
          <p className="mt-1.5 max-w-xs text-sm text-white/70">
            {videos[current].subtitle}
          </p>
          <button className="mt-4 w-fit rounded-2xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-warm transition-transform hover:scale-105 active:scale-95">
            {videos[current].cta} →
          </button>
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
          {videos.map((_, i) => (
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
