import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const SERVICES = [
  {
    type: "errand",
    label: "Errands",
    tagline: "We run it for you",
    emoji: "🏃",
    accent: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    type: "parcel",
    label: "Parcel",
    tagline: "Send anything, fast",
    emoji: "📦",
    accent: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    type: "package",
    label: "Package",
    tagline: "Big or small, we carry",
    emoji: "📫",
    accent: "text-violet-500",
    bg: "bg-violet-50",
  },
  {
    type: "pharmacy",
    label: "Pharmacy",
    tagline: "Meds at your door",
    emoji: "💊",
    accent: "text-emerald-500",
    bg: "bg-emerald-50",
  },
];

const ServicesStrip = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-primary px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">⚡ SpeedUp</p>
          <h2 className="mt-0.5 font-display text-xl font-extrabold text-white">Our Services</h2>
          <p className="text-xs text-white/70">More than food — we deliver everything</p>
        </div>
        <button
          onClick={() => navigate("/services")}
          className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/30"
        >
          See all <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {SERVICES.map((svc) => (
          <button
            key={svc.type}
            onClick={() => navigate(`/service-request/${svc.type}`)}
            className="group relative flex flex-col items-start overflow-hidden rounded-2xl bg-white p-4 shadow-sm transition-transform duration-150 active:scale-[0.97] hover:-translate-y-0.5"
          >
            {/* Ghost emoji watermark */}
            <span className="pointer-events-none absolute -bottom-2 -right-2 select-none text-[64px] leading-none opacity-[0.07]">
              {svc.emoji}
            </span>

            {/* Emoji badge */}
            <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${svc.bg} text-2xl`}>
              {svc.emoji}
            </div>

            {/* Text */}
            <p className={`text-sm font-extrabold ${svc.accent}`}>{svc.label}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{svc.tagline}</p>

            {/* CTA */}
            <div className={`mt-3 flex items-center gap-1 text-[11px] font-bold ${svc.accent}`}>
              Book now <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default ServicesStrip;
