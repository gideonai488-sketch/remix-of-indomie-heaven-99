import { useNavigate } from "react-router-dom";
import { SERVICE_DEFS } from "@/types/services";
import { ArrowRight } from "lucide-react";

const ServicesStrip = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between">
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

      {/* Service cards 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {SERVICE_DEFS.map((svc) => (
          <button
            key={svc.type}
            onClick={() => navigate(`/service-request/${svc.type}`)}
            className="group overflow-hidden rounded-3xl bg-white text-left shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]"
          >
            {/* Red gradient header — like the auth page */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary to-red-700 px-4 pb-4 pt-4">
              {/* Decorative blobs */}
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10" />
              <div className="absolute -bottom-3 -left-3 h-10 w-10 rounded-full bg-white/10" />

              {/* Icon in white pill */}
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md text-2xl">
                {svc.icon}
              </div>
            </div>

            {/* White body */}
            <div className="px-4 py-3">
              <p className="text-sm font-extrabold text-foreground">{svc.label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{svc.tagline}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default ServicesStrip;
