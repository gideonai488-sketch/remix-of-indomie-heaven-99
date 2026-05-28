import { useNavigate } from "react-router-dom";
import { SERVICE_DEFS } from "@/types/services";
import { ChevronRight } from "lucide-react";

const ServicesStrip = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Our Services</h2>
          <p className="text-xs text-muted-foreground">More than just food — we deliver everything</p>
        </div>
        <button
          onClick={() => navigate("/services")}
          className="flex items-center gap-1 text-xs font-semibold text-accent"
        >
          See all <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SERVICE_DEFS.map((svc) => (
          <button
            key={svc.type}
            onClick={() => navigate(`/service-request/${svc.type}`)}
            className={`group relative flex flex-col items-start gap-2 rounded-2xl border border-border p-4 text-left transition-all active:scale-95 hover:border-primary/40 ${svc.color}`}
          >
            <span className="text-3xl leading-none">{svc.icon}</span>
            <div>
              <p className={`text-sm font-bold ${svc.accent}`}>{svc.label}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">{svc.tagline}</p>
            </div>
            <ChevronRight className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${svc.accent}`} />
          </button>
        ))}
      </div>
    </section>
  );
};

export default ServicesStrip;
