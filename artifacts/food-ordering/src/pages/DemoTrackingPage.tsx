import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Star, Phone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

type OrderStatus = "pending" | "confirmed" | "preparing" | "delivering" | "delivered";

const ACCRA: [number, number] = [-0.1870, 5.6037];
const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

const PICKUP_ADDR   = "Accra Mall, Spintex Road, Accra";
const DELIVERY_ADDR = "University of Ghana, Legon, Accra";

const STATUS_SEQUENCE: OrderStatus[] = ["pending", "confirmed", "preparing", "delivering", "delivered"];
const STATUS_DURATIONS: Record<OrderStatus, number> = {
  pending: 4000, confirmed: 4000, preparing: 4000, delivering: 6000, delivered: 99999,
};
const STATUS_PROGRESS: Record<OrderStatus, number> = {
  pending: 0, confirmed: 0.15, preparing: 0.32, delivering: 0.72, delivered: 1,
};
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   "Finding Rider…",
  confirmed: "Rider Assigned ✅",
  preparing: "Heading to Pickup 🏍️",
  delivering:"On the Way 🚀",
  delivered: "Delivered 🎉",
};
const STATUS_TOASTS: Record<OrderStatus, string> = {
  pending:   "",
  confirmed: "🎉 Rider accepted your order!",
  preparing: "🏍️ Rider heading to pickup",
  delivering:"🚀 Rider is on the way to you!",
  delivered: "✅ Your order has been delivered!",
};

const STEPS = [
  { key: "pending",    label: "Finding Rider", icon: "🔍" },
  { key: "confirmed",  label: "Rider Assigned",icon: "✅"  },
  { key: "delivering", label: "On the Way",    icon: "🏍️" },
  { key: "delivered",  label: "Delivered",     icon: "🎉" },
] as const;

const STEP_IDX: Record<OrderStatus, number> = {
  pending: 0, confirmed: 1, preparing: 1, delivering: 2, delivered: 3,
};

async function geocode(query: string): Promise<[number, number] | null> {
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${TOKEN}&country=GH&limit=1&proximity=${ACCRA[0]},${ACCRA[1]}`
    );
    const json = await res.json();
    const c = json.features?.[0]?.geometry?.coordinates;
    return c ? [c[0], c[1]] : null;
  } catch { return null; }
}

async function getRoute(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&overview=full&access_token=${TOKEN}`
    );
    const json = await res.json();
    return json.routes?.[0]?.geometry?.coordinates ?? [from, to];
  } catch { return [from, to]; }
}

function interpolate(coords: [number, number][], t: number): [number, number] {
  if (coords.length < 2) return coords[0] ?? ACCRA;
  const total = coords.length - 1;
  const idx = Math.min(Math.floor(t * total), total - 1);
  const frac = t * total - idx;
  const a = coords[idx], b = coords[idx + 1];
  return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
}

function calcBearing([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]): number {
  const r = Math.PI / 180;
  const dLng = (lng2 - lng1) * r;
  const la1 = lat1 * r, la2 = lat2 * r;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return (Math.atan2(y, x) / r + 360) % 360;
}

const DemoTrackingPage = () => {
  const navigate = useNavigate();
  const [statusIdx, setStatusIdx] = useState(0);
  const [toast, setToast] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [webGLError, setWebGLError] = useState(false);

  const status = STATUS_SEQUENCE[statusIdx];

  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<mapboxgl.Map | null>(null);
  const riderMarkerRef= useRef<mapboxgl.Marker | null>(null);
  const routeCoordsRef= useRef<[number, number][]>([]);
  const animFrameRef  = useRef<number>(0);
  const progressRef   = useRef(0);

  const showMsg = (msg: string) => {
    if (!msg) return;
    setToast(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Auto-advance status
  useEffect(() => {
    if (statusIdx >= STATUS_SEQUENCE.length - 1) return;
    const t = setTimeout(() => {
      const next = statusIdx + 1;
      setStatusIdx(next);
      showMsg(STATUS_TOASTS[STATUS_SEQUENCE[next]]);
    }, STATUS_DURATIONS[status]);
    return () => clearTimeout(t);
  }, [statusIdx, status]);

  // Animate rider with bearing-aware rotation
  const animateRider = useCallback(() => {
    const target = STATUS_PROGRESS[STATUS_SEQUENCE[statusIdx]] ?? 0;
    const coords = routeCoordsRef.current;
    if (coords.length > 1) {
      progressRef.current += (target - progressRef.current) * 0.025;
      const pos = interpolate(coords, progressRef.current);
      riderMarkerRef.current?.setLngLat(pos);

      // Rotate emoji: front wheel faces direction of travel
      const aheadT = Math.min(progressRef.current + 0.02, 1);
      const ahead  = interpolate(coords, aheadT);
      const travelBearing = calcBearing(pos, ahead);
      const mapBearing = mapRef.current?.getBearing() ?? 0;
      const el = riderMarkerRef.current?.getElement();
      if (el) {
        el.style.transform = `rotate(${travelBearing - mapBearing - 90}deg)`;
        el.style.transformOrigin = "center center";
      }
    }
    animFrameRef.current = requestAnimationFrame(animateRider);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusIdx]);

  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animateRider);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animateRider]);

  // Build map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: ACCRA,
        zoom: 13,
        attributionControl: false,
      });
    } catch {
      setWebGLError(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-left");

    map.on("load", async () => {
      let pickup   = (await geocode(PICKUP_ADDR))   ?? [-0.207, 5.595] as [number, number];
      let delivery = (await geocode(DELIVERY_ADDR)) ?? [-0.187, 5.650] as [number, number];
      if (!isFinite(pickup[0]))   pickup   = [-0.207, 5.595];
      if (!isFinite(delivery[0])) delivery = [-0.187, 5.650];

      const route = await getRoute(pickup, delivery);
      routeCoordsRef.current = route.filter(([x, y]) => isFinite(x) && isFinite(y));

      map.addSource("route", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: route }, properties: {} },
      });
      map.addLayer({
        id: "route-casing", type: "line", source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.6 },
      });
      map.addLayer({
        id: "route-line", type: "line", source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ef4444", "line-width": 5, "line-opacity": 0.9 },
      });

      const pEl = document.createElement("div");
      pEl.innerHTML = `<div style="background:#22c55e;width:42px;height:42px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35)"><div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;height:100%;font-size:16px">🏪</div></div>`;
      new mapboxgl.Marker({ element: pEl, anchor: "bottom" })
        .setLngLat(pickup)
        .setPopup(new mapboxgl.Popup({ offset: 30 }).setHTML(`<strong>Pickup</strong><br/><span style='font-size:11px'>${PICKUP_ADDR}</span>`))
        .addTo(map);

      const dEl = document.createElement("div");
      dEl.innerHTML = `<div style="background:#ef4444;width:42px;height:42px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35)"><div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;height:100%;font-size:16px">🏠</div></div>`;
      new mapboxgl.Marker({ element: dEl, anchor: "bottom" })
        .setLngLat(delivery)
        .setPopup(new mapboxgl.Popup({ offset: 30 }).setHTML(`<strong>Your location</strong><br/><span style='font-size:11px'>${DELIVERY_ADDR}</span>`))
        .addTo(map);

      const rEl = document.createElement("div");
      rEl.style.cssText = "font-size:30px;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6));transform-origin:center center;will-change:transform;";
      rEl.textContent = "🏍️";
      const riderMarker = new mapboxgl.Marker({ element: rEl, anchor: "center" })
        .setLngLat(pickup)
        .addTo(map);
      riderMarkerRef.current = riderMarker;

      const bounds = route.reduce(
        (b, c) => b.extend(c as [number, number]),
        new mapboxgl.LngLatBounds(route[0] as [number, number], route[0] as [number, number])
      );
      map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 1400 });
    });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const curStep = STEP_IDX[status];

  return (
    <div className="flex min-h-screen flex-col bg-background">

      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4"/>
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Track Order — Demo</h1>
            <p className="text-[10px] text-muted-foreground">Live simulation · Accra, Ghana</p>
          </div>
          <span className={`ml-auto rounded-full px-3 py-0.5 text-xs font-bold transition-all ${
            status === "delivered" ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"
          }`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </header>

      <div className={`fixed top-16 left-1/2 z-[200] -translate-x-1/2 transition-all duration-500 ${showToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl">
          {toast}
        </div>
      </div>

      <div className="container mx-auto max-w-lg flex-1 space-y-4 px-4 py-4 pb-8">

        <div className="relative w-full overflow-hidden rounded-3xl shadow-xl" style={{ height: 300 }}>
          {webGLError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117] gap-3">
              <span className="text-6xl">🗺️</span>
              <p className="font-bold text-white text-center px-6">Live Mapbox map<br/>renders on your device</p>
              <p className="text-xs text-gray-400 text-center px-8">
                Streets of Accra · Rider tracking · Real route<br/>
                (WebGL required — works on all phones &amp; browsers)
              </p>
              <div className="flex gap-2 mt-1">
                <span className="rounded-full bg-green-500/20 border border-green-500/40 px-2.5 py-1 text-[11px] text-green-400">📍 Accra Mall</span>
                <span className="rounded-full bg-red-500/20 border border-red-500/40 px-2.5 py-1 text-[11px] text-red-400">📍 UG Legon</span>
              </div>
            </div>
          ) : (
            <div ref={containerRef} className="absolute inset-0"/>
          )}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow text-xs font-semibold text-green-700">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"/> Accra Mall
            </div>
            {status !== "pending" && (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/90 backdrop-blur-sm px-3 py-1.5 shadow text-xs font-semibold text-white animate-pulse">
                🏍️ Rider en route
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow text-xs font-semibold text-red-600">
              <div className="h-2 w-2 rounded-full bg-red-500"/> UG Legon
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <Clock className="h-5 w-5 text-primary shrink-0"/>
          <div>
            <p className="text-xs text-muted-foreground">Estimated arrival</p>
            <p className="font-bold text-foreground">
              {status === "pending" ? "Matching rider…" : status === "confirmed" ? "~20 min" : status === "preparing" ? "~15 min" : status === "delivering" ? "~8 min" : "Arrived ✓"}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Demo order</p>
            <p className="font-bold text-primary">GH₵45.00</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-1">
            {STEPS.map((step, i) => {
              const done = curStep > i;
              const active = curStep === i;
              return (
                <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-all duration-500 ${done ? "bg-primary" : active ? "bg-primary animate-pulse" : "bg-muted"}`}>
                    {done ? <CheckCircle2 className="h-4 w-4 text-white"/> : <span>{step.icon}</span>}
                  </div>
                  <p className={`text-center text-[9px] font-semibold leading-tight transition-colors ${active ? "text-primary" : done ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {status === "pending" && (
          <div className="rounded-2xl border border-border bg-card shadow-sm p-8 flex flex-col items-center">
            <div className="relative mb-5">
              <div className="h-24 w-24 rounded-full border-4 border-primary/20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"/>
                <span className="text-4xl">🏍️</span>
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary animate-ping"/>
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary"/>
            </div>
            <h3 className="font-bold text-xl text-foreground">Finding your rider…</h3>
            <p className="text-sm text-muted-foreground mt-1">Matching you with a nearby rider</p>
            <div className="mt-4 flex gap-1.5">
              {[0,1,2].map(i => <div key={i} className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}/>)}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Order Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-green-500 shrink-0 mt-0.5"/>
              <div><p className="text-[11px] text-muted-foreground">Pickup</p><p className="font-medium text-foreground">Accra Mall, Spintex Road</p></div>
            </div>
            <div className="ml-4 border-l-2 border-dashed border-border h-3"/>
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5"/>
              <div><p className="text-[11px] text-muted-foreground">Delivery</p><p className="font-medium text-foreground">University of Ghana, Legon</p></div>
            </div>
          </div>
          <div className="border-t border-border pt-3 space-y-1.5 text-sm">
            {[["After Lectures Bowl","GH₵25.00"],["Delivery fee","GH₵10.00"],["Platform fee","GH₵2.00"]].map(([k,v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-border pt-1.5">
              <span>Total</span><span className="text-primary">GH₵45.00</span>
            </div>
          </div>
        </div>

        {status !== "pending" && (
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">🧑‍💼</div>
            <div className="flex-1">
              <p className="font-bold text-foreground">Kofi Mensah</p>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => <Star key={s} className="h-3 w-3 text-yellow-400 fill-yellow-400"/>)}
                <span className="ml-1 text-xs text-muted-foreground">4.9 · 823 trips</span>
              </div>
            </div>
            <a href="tel:+233000000000"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20">
              <Phone className="h-5 w-5"/>
            </a>
          </div>
        )}

        {status === "delivered" && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-5 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold text-green-700 text-lg">Order Delivered!</p>
            <p className="text-sm text-green-600 mt-1">Paystack payment request sent to your phone</p>
            <Button className="mt-4 w-full rounded-2xl bg-primary text-white font-bold py-5">
              Pay Now — GH₵45.00
            </Button>
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Demo Controls</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_SEQUENCE.map((s, i) => (
              <button key={s} onClick={() => { setStatusIdx(i); showMsg(STATUS_TOASTS[s]); }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${statusIdx === i ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary/40"}`}>
                {STATUS_LABELS[s].replace(/[🎉✅🏍️🚀]/g, "").trim() || s}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Auto-advances every few seconds · Click any status to jump</p>
        </div>

      </div>
    </div>
  );
};

export default DemoTrackingPage;
