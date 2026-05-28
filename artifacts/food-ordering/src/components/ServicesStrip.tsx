import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const SERVICES = [
  {
    type: "errand",
    label: "Errands",
    tagline: "We run it for you",
    emoji: "🏃",
    gradient: "from-orange-500 to-amber-500",
    ring: "ring-orange-200",
  },
  {
    type: "parcel",
    label: "Parcel",
    tagline: "Send anything, fast",
    emoji: "📦",
    gradient: "from-blue-500 to-cyan-500",
    ring: "ring-blue-200",
  },
  {
    type: "package",
    label: "Package",
    tagline: "Big or small, we carry",
    emoji: "📫",
    gradient: "from-violet-500 to-purple-600",
    ring: "ring-violet-200",
  },
  {
    type: "pharmacy",
    label: "Pharmacy",
    tagline: "Meds at your door",
    emoji: "💊",
    gradient: "from-emerald-500 to-teal-600",
    ring: "ring-emerald-200",
  },
];

const ServicesStrip = () => {
  const navigate = useNavigate();

  return (
    <section className="py-6">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between px-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">⚡ SpeedUp</p>
          <h2 className="mt-0.5 font-display text-xl font-extrabold text-foreground">Our Services</h2>
          <p className="text-xs text-muted-foreground">More than food — we deliver everything</p>
        </div>
        <button
          onClick={() => navigate("/services")}
          className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
        >
          See all <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Horizontal scroll cards */}
      <div className="flex gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
        {SERVICES.map((svc) => (
          <button
            key={svc.type}
            onClick={() => navigate(`/service-request/${svc.type}`)}
            className={`group relative flex-none w-44 overflow-hidden rounded-3xl bg-gradient-to-br ${svc.gradient} snap-start shadow-lg ring-2 ${svc.ring} transition-transform duration-200 active:scale-[0.96] hover:-translate-y-0.5`}
            style={{ height: "11rem" }}
          >
            {/* Huge ghost emoji */}
            <span className="pointer-events-none absolute -bottom-3 -right-3 select-none text-[88px] leading-none opacity-20">
              {svc.emoji}
            </span>

            {/* Content */}
            <div className="relative flex h-full flex-col p-4">
              {/* Small emoji pill */}
              <div className="mb-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white/25 text-xl shadow-inner">
                {svc.emoji}
              </div>

              <div className="mt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  SpeedUp
                </p>
                <h3 className="text-lg font-black leading-tight text-white">
                  {svc.label}
                </h3>
                <p className="text-[11px] text-white/70">{svc.tagline}</p>
              </div>

              {/* CTA pill */}
              <div className="mt-3 inline-flex items-center gap-1 self-start rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                Book now <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default ServicesStrip;
