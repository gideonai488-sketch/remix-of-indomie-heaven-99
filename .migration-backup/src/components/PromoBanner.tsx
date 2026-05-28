import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import promoVideo1 from "@/assets/promo-video-1.mp4";
import promoVideo2 from "@/assets/promo-video-2.mp4";
import promoVideo3 from "@/assets/promo-video-3.mp4";

const videos = [
  { src: promoVideo1, label: "The Ultimate Combo!", subtitle: "Bowl + Fries + Drink — everything you need in one order." },
  { src: promoVideo2, label: "Fresh & Loaded", subtitle: "Made fresh, served bold. Your next favourite bowl awaits." },
  { src: promoVideo3, label: "Oh Chale! Specials", subtitle: "Limited-time flavours you don't want to miss." },
];

const PromoBanner = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const go = (dir: number) => {
    setCurrent((prev) => (prev + dir + videos.length) % videos.length);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrent((prev) => (prev + 1) % videos.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="container mx-auto px-4 py-8">
      <div
        className="relative overflow-hidden rounded-2xl cursor-pointer group"
        onClick={() => navigate("/menu")}
      >
        {/* Video */}
        <div className="relative w-full h-56 sm:h-72 md:h-80">
          {videos.map((v, i) => (
            <video
              key={i}
              ref={(el) => { videoRefs.current[i] = el; }}
              src={v.src}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                i === current ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              autoPlay
              loop
              muted
              playsInline
            />
          ))}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/40 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10">
          <span className="text-xs font-bold uppercase tracking-widest text-accent mb-1">
            Limited Time
          </span>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black uppercase text-primary-foreground leading-tight">
            {videos[current].label.split(" ").slice(0, -1).join(" ")}<br />
            <span className="text-accent">{videos[current].label.split(" ").slice(-1)}</span>
          </h2>
          <p className="mt-2 max-w-xs text-sm text-primary-foreground/70">
            {videos[current].subtitle}
          </p>
          <button className="mt-4 w-fit rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-warm transition-transform hover:scale-105 active:scale-95">
            Order Now
          </button>
        </div>

        {/* Nav arrows */}
        <button
          onClick={(e) => { e.stopPropagation(); go(-1); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/60 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); go(1); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/60 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {videos.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current ? "bg-accent w-5" : "bg-primary-foreground/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
