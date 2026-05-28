import { useNavigate } from "react-router-dom";
import { SERVICE_DEFS } from "@/types/services";
import { ArrowLeft, ArrowRight, Clock, Shield, Star, Zap, Route } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const perks = [
  { icon: Clock, text: "30–60 min" },
  { icon: Shield, text: "Verified riders" },
  { icon: Star, text: "Live tracking" },
];

const subText: Record<string, string> = {
  errand: "Shopping, queuing, bill payments & more",
  parcel: "Documents, small items, gifts",
  package: "Boxes, furniture pieces, fragile items",
  pharmacy: "Prescriptions, OTC meds, health products",
};

const ServicesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">

      {/* White sticky header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-sm">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm text-muted-foreground hover:bg-gray-100 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-extrabold text-foreground">SpeedUp Services</h1>
          <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Zap className="h-4 w-4 fill-primary text-primary" />
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-lg px-4 py-5 space-y-5">

        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-red-700 p-6 text-white shadow-warm">
          {/* Background circles */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />

          <div className="relative">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
              <Zap className="h-3 w-3 fill-current" /> SpeedUp
            </div>
            <h2 className="font-display text-3xl font-black leading-tight">
              We Handle It.<br />
              <span className="text-white/80">You Relax.</span>
            </h2>
            <p className="mt-2 max-w-xs text-sm text-white/75">
              Errands, parcels, packages, pharmacy — all with live GPS tracking.
            </p>
            <div className="mt-5 flex gap-3">
              {perks.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                  <p.icon className="h-3.5 w-3.5" /> {p.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing info */}
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <Route className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-bold text-foreground">Dynamic pricing</p>
            <p className="text-[11px] text-muted-foreground">GH₵5 base + GH₵2.00/km + GH₵0.30/min · Min GH₵10</p>
          </div>
        </div>

        {/* Service cards */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Choose a Service</p>

          {SERVICE_DEFS.map((svc) => (
            <button
              key={svc.type}
              onClick={() => navigate(`/service-request/${svc.type}`)}
              className="group flex w-full items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/20 active:scale-[0.98]"
            >
              {/* Icon */}
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl ${svc.color}`}>
                {svc.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-base font-extrabold ${svc.accent}`}>{svc.label}</p>
                <p className="text-xs font-medium text-muted-foreground">{svc.tagline}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">{subText[svc.type]}</p>
              </div>

              {/* Arrow */}
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition-all group-hover:translate-x-0.5 ${svc.color}`}>
                <ArrowRight className={`h-4 w-4 ${svc.accent}`} />
              </div>
            </button>
          ))}

          {/* Food ordering */}
          <button
            onClick={() => navigate("/menu")}
            className="group flex w-full items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/20 active:scale-[0.98]"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
              🍜
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-extrabold text-primary">Food Delivery</p>
              <p className="text-xs font-medium text-muted-foreground">Order meals from our menu</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/70">Bowls, sides, drinks & more</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 transition-all group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
          </button>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "⚡", title: "Fast", sub: "30–60 min avg" },
            { icon: "🛡️", title: "Safe", sub: "Verified riders" },
            { icon: "📍", title: "Live", sub: "GPS tracking" },
          ].map((b) => (
            <div key={b.title} className="flex flex-col items-center rounded-2xl bg-white py-4 shadow-sm ring-1 ring-black/5 text-center">
              <span className="text-2xl">{b.icon}</span>
              <p className="mt-1.5 text-xs font-extrabold text-foreground">{b.title}</p>
              <p className="text-[10px] text-muted-foreground">{b.sub}</p>
            </div>
          ))}
        </div>

      </div>

      <BottomNav />
    </div>
  );
};

export default ServicesPage;
