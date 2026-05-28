import { useNavigate } from "react-router-dom";
import { SERVICE_DEFS } from "@/types/services";
import { ArrowLeft, ChevronRight, Clock, Shield, Star } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const perks = [
  { icon: <Clock className="h-4 w-4" />, text: "30–60 min delivery" },
  { icon: <Shield className="h-4 w-4" />, text: "Verified riders" },
  { icon: <Star className="h-4 w-4" />, text: "Real-time tracking" },
];

const ServicesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold text-foreground">SpeedUp Services</h1>
        </div>
      </header>

      <div className="container mx-auto max-w-lg px-4 py-5 space-y-6">
        {/* Hero banner */}
        <div className="rounded-3xl bg-gradient-to-br from-primary via-primary to-accent/80 p-6 text-white shadow-warm">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70">⚡ SpeedUp</p>
          <h2 className="mt-1 font-display text-2xl font-black">We Handle It.<br/>You Relax.</h2>
          <p className="mt-2 text-sm opacity-80">Errands, parcels, packages, pharmacy — all with live GPS tracking.</p>
          <div className="mt-4 flex gap-4">
            {perks.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs opacity-90">
                {p.icon} {p.text}
              </div>
            ))}
          </div>
        </div>

        {/* Service cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Choose a Service</h3>
          {SERVICE_DEFS.map((svc) => (
            <button
              key={svc.type}
              onClick={() => navigate(`/service-request/${svc.type}`)}
              className={`group flex w-full items-center gap-4 rounded-2xl border border-border p-4 text-left transition-all active:scale-[0.98] hover:border-primary/40 ${svc.color}`}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background/60 text-3xl">
                {svc.icon}
              </div>
              <div className="flex-1">
                <p className={`text-base font-bold ${svc.accent}`}>{svc.label}</p>
                <p className="text-xs text-muted-foreground">{svc.tagline}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  {svc.type === 'errand' && 'Shopping, queuing, bill payments & more'}
                  {svc.type === 'parcel' && 'Documents, small items, gifts'}
                  {svc.type === 'package' && 'Boxes, furniture pieces, fragile items'}
                  {svc.type === 'pharmacy' && 'Prescriptions, OTC meds, health products'}
                </p>
              </div>
              <ChevronRight className={`h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1 ${svc.accent}`} />
            </button>
          ))}
        </div>

        {/* Food ordering CTA */}
        <button
          onClick={() => navigate("/menu")}
          className="flex w-full items-center gap-4 rounded-2xl border border-border bg-primary/10 p-4 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background/60 text-3xl">
            🍜
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-primary">Food Delivery</p>
            <p className="text-xs text-muted-foreground">Order meals from our menu</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ServicesPage;
