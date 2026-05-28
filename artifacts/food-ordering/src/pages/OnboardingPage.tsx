import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MapPin, Zap, ShieldCheck } from "lucide-react";

const slides = [
  {
    id: "welcome",
    bg: "bg-gradient-to-br from-primary to-red-700",
    dark: true,
    illustration: (
      <div className="relative flex items-center justify-center">
        <div className="absolute h-48 w-48 rounded-full bg-white/10 animate-pulse" />
        <img
          src="/owl-icon.png"
          alt="SpeedUp"
          className="relative h-40 w-40 drop-shadow-2xl"
        />
      </div>
    ),
    eyebrow: "WELCOME",
    title: "SpeedUp",
    subtitle: "Ghana's fastest delivery & services app. Food, errands, parcels — we handle it all.",
  },
  {
    id: "food",
    bg: "bg-white",
    dark: false,
    illustration: (
      <div className="relative flex items-center justify-center">
        <div className="flex h-44 w-44 items-center justify-center rounded-full bg-orange-50 text-8xl shadow-inner">
          🍜
        </div>
        <div className="absolute -right-2 top-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-3xl shadow-md">
          🍗
        </div>
        <div className="absolute -left-4 bottom-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl shadow-md">
          🥘
        </div>
      </div>
    ),
    eyebrow: "FOOD DELIVERY",
    title: "Order Your\nFavourite Meal",
    subtitle: "Browse hundreds of dishes from local restaurants and get them delivered hot to your door.",
  },
  {
    id: "services",
    bg: "bg-white",
    dark: false,
    illustration: (
      <div className="grid grid-cols-2 gap-3">
        {[
          { emoji: "🏃", label: "Errands", bg: "bg-orange-100" },
          { emoji: "📦", label: "Parcel", bg: "bg-blue-100" },
          { emoji: "📫", label: "Package", bg: "bg-violet-100" },
          { emoji: "💊", label: "Pharmacy", bg: "bg-emerald-100" },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl ${s.bg} px-5 py-4 shadow-sm`}
          >
            <span className="text-3xl">{s.emoji}</span>
            <span className="text-xs font-bold text-gray-700">{s.label}</span>
          </div>
        ))}
      </div>
    ),
    eyebrow: "MORE THAN FOOD",
    title: "We Deliver\nEverything",
    subtitle: "Errands, parcels, packages, pharmacy — book any service and a rider is on the way.",
  },
  {
    id: "track",
    bg: "bg-white",
    dark: false,
    illustration: (
      <div className="relative flex items-center justify-center">
        <div className="flex h-44 w-44 items-center justify-center rounded-full bg-gray-50 shadow-inner">
          <svg viewBox="0 0 180 180" className="h-36 w-36" fill="none">
            <path d="M30 140 Q60 60 90 80 Q120 100 150 40" stroke="#ef4444" strokeWidth="3" strokeDasharray="6 4" strokeLinecap="round" />
            <circle cx="30" cy="140" r="6" fill="#ef4444" opacity="0.4" />
            <circle cx="150" cy="40" r="8" fill="#ef4444" />
            <text x="135" y="36" fontSize="16">📍</text>
            <text x="50" y="118" fontSize="22">🏍️</text>
          </svg>
        </div>
        <div className="absolute -right-1 top-6 rounded-2xl bg-primary px-3 py-1.5 shadow-lg">
          <p className="text-[10px] font-bold text-white">3 min away</p>
        </div>
      </div>
    ),
    eyebrow: "LIVE TRACKING",
    title: "Watch Your\nRider Live",
    subtitle: "Real-time GPS tracking so you always know exactly where your order is.",
  },
];

const OnboardingPage = () => {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const finish = () => {
    localStorage.setItem("speedup_onboarded", "1");
    navigate("/", { replace: true });
  };

  const next = () => {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  return (
    <div
      className={`flex min-h-screen flex-col ${slide.bg} transition-colors duration-500`}
    >
      {/* Skip */}
      <div className="flex justify-end px-6 pt-12">
        <button
          onClick={finish}
          className={`text-sm font-semibold ${slide.dark ? "text-white/70" : "text-muted-foreground"} hover:opacity-100`}
        >
          Skip
        </button>
      </div>

      {/* Illustration */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-4 pt-6">
        <div className="mb-10">{slide.illustration}</div>

        {/* Text */}
        <div className="w-full max-w-xs text-center">
          <p
            className={`mb-2 text-[10px] font-black tracking-[0.2em] ${
              slide.dark ? "text-white/60" : "text-primary"
            }`}
          >
            {slide.eyebrow}
          </p>
          <h1
            className={`font-display text-3xl font-black leading-tight ${
              slide.dark ? "text-white" : "text-foreground"
            }`}
            style={{ whiteSpace: "pre-line" }}
          >
            {slide.title}
          </h1>
          <p
            className={`mt-3 text-sm leading-relaxed ${
              slide.dark ? "text-white/70" : "text-muted-foreground"
            }`}
          >
            {slide.subtitle}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="px-6 pb-12 pt-4">
        {/* Dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index
                  ? slide.dark
                    ? "w-6 bg-white"
                    : "w-6 bg-primary"
                  : slide.dark
                  ? "w-2 bg-white/30"
                  : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={next}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold shadow-lg transition-transform active:scale-[0.97] ${
            slide.dark
              ? "bg-white text-primary shadow-black/20"
              : "bg-primary text-white shadow-primary/30"
          }`}
        >
          {isLast ? (
            <>
              <Zap className="h-5 w-5 fill-current" />
              Get Started
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>

        {/* Trust badges on last slide */}
        {isLast && (
          <div className="mt-4 flex items-center justify-center gap-5">
            {[
              { icon: <Zap className="h-3.5 w-3.5" />, label: "Fast" },
              { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: "Safe" },
              { icon: <MapPin className="h-3.5 w-3.5" />, label: "Live GPS" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                {b.icon}
                {b.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
