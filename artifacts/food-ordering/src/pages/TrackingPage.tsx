import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Phone, CheckCircle2, Loader2, X, Star, MapPin, Clock, Route, Zap, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

type OrderStatus = "pending" | "confirmed" | "preparing" | "delivering" | "delivered" | "cancelled";

interface TrackOrder {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  delivery_fee: number;
  payment_method: string;
  payment_status?: string | null;
  rider_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  created_at: string;
  order_items?: Array<{ id: string; item_name: string; quantity: number; price: number }>;
}

const BASE_FARE = 5;
const PER_MIN_RATE = 0.3;

const parseNotes = (notes?: string | null) => {
  if (!notes) return null;
  try { return JSON.parse(notes); } catch { return null; }
};

// -------- Live Fare Meter --------
const FareMeter = ({ running, finalAmount }: { running: boolean; finalAmount: number }) => {
  const [secs, setSecs] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    const iv = setInterval(() => setSecs(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [running]);

  const mins = secs / 60;
  const estimated = Math.max(BASE_FARE + mins * PER_MIN_RATE, 0);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  if (finalAmount > BASE_FARE && !running) {
    return (
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Final fare</p>
        <p className="font-display text-4xl font-black text-primary">GH₵{finalAmount.toFixed(2)}</p>
        <p className="mt-1 text-xs text-muted-foreground">Set by rider · Pay cash</p>
      </div>
    );
  }

  if (!running) return null;

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Meter running</p>
        </div>
        <span className="font-mono text-sm font-bold text-foreground bg-muted rounded-lg px-2 py-0.5">
          {fmt(secs)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white p-2 shadow-card">
          <p className="text-base font-bold text-foreground">GH₵{BASE_FARE}</p>
          <p className="text-[9px] text-muted-foreground">Base</p>
        </div>
        <div className="rounded-xl bg-white p-2 shadow-card">
          <div className="flex items-center justify-center gap-0.5">
            <Clock className="h-3 w-3 text-primary" />
            <p className="text-base font-bold text-foreground">+GH₵{(mins * PER_MIN_RATE).toFixed(2)}</p>
          </div>
          <p className="text-[9px] text-muted-foreground">Time</p>
        </div>
        <div className="rounded-xl bg-primary p-2 shadow-warm">
          <p className="text-base font-bold text-white">~GH₵{estimated.toFixed(2)}</p>
          <p className="text-[9px] text-white/70">Estimate</p>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        + GH₵2.00/km · Final set by rider
      </p>
    </div>
  );
};

// -------- Mapbox Live Tracking Map --------
const ACCRA: [number, number] = [-0.1870, 5.6037];
const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

async function geocode(query: string): Promise<[number, number] | null> {
  try {
    const q = encodeURIComponent(query + ", Ghana");
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${TOKEN}&country=GH&limit=1&proximity=${ACCRA[0]},${ACCRA[1]}`
    );
    const json = await res.json();
    const coords = json.features?.[0]?.geometry?.coordinates;
    return coords ? [coords[0], coords[1]] : null;
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

const STATUS_PROGRESS: Record<OrderStatus, number> = {
  pending: 0, confirmed: 0.15, preparing: 0.3, delivering: 0.65, delivered: 1, cancelled: 0,
};

const MapView = ({
  status, pickupAddress, deliveryAddress,
}: {
  status: OrderStatus;
  pickupAddress: string;
  deliveryAddress: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const routeCoordsRef = useRef<[number, number][]>([]);
  const animFrameRef = useRef<number>(0);
  const progressRef = useRef(0);

  // Build map + geocode + route once
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
      return; // WebGL not available — silently skip map
    }
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-left");

    map.on("load", async () => {
      // Geocode addresses (fallback to Accra offsets)
      let pickup = (await geocode(pickupAddress)) ?? [ACCRA[0] - 0.02, ACCRA[1] - 0.01] as [number, number];
      let delivery = (await geocode(deliveryAddress)) ?? [ACCRA[0] + 0.025, ACCRA[1] + 0.018] as [number, number];

      // Guard against NaN — hard fallback to known Accra coords
      if (!isFinite(pickup[0]) || !isFinite(pickup[1])) pickup = [ACCRA[0] - 0.02, ACCRA[1] - 0.01];
      if (!isFinite(delivery[0]) || !isFinite(delivery[1])) delivery = [ACCRA[0] + 0.025, ACCRA[1] + 0.018];

      const route = await getRoute(pickup, delivery);
      routeCoordsRef.current = route.filter(([x,y]) => isFinite(x) && isFinite(y));

      // Route line
      map.addSource("route", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: route }, properties: {} },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ef4444", "line-width": 4, "line-opacity": 0.85 },
      });

      // Pickup marker (green)
      const pickupEl = document.createElement("div");
      pickupEl.innerHTML = `<div style="background:#22c55e;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;height:100%;font-size:14px">🏪</div></div>`;
      new mapboxgl.Marker({ element: pickupEl, anchor: "bottom" })
        .setLngLat(pickup)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText("Pickup"))
        .addTo(map);

      // Delivery marker (red)
      const deliveryEl = document.createElement("div");
      deliveryEl.innerHTML = `<div style="background:#ef4444;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;height:100%;font-size:14px">🏠</div></div>`;
      new mapboxgl.Marker({ element: deliveryEl, anchor: "bottom" })
        .setLngLat(delivery)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText("Your location"))
        .addTo(map);

      // Rider marker
      const riderEl = document.createElement("div");
      riderEl.style.cssText = "font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));transition:transform 0.3s;cursor:pointer;";
      riderEl.textContent = "🏍️";
      const riderMarker = new mapboxgl.Marker({ element: riderEl, anchor: "center" })
        .setLngLat(pickup)
        .addTo(map);
      riderMarkerRef.current = riderMarker;

      // Fit map to show full route
      const bounds = route.reduce(
        (b, c) => b.extend(c as [number, number]),
        new mapboxgl.LngLatBounds(route[0], route[0])
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 1200 });

      // Start animation
      animateRider();
    });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate rider toward target progress
  const animateRider = useCallback(() => {
    const target = STATUS_PROGRESS[status] ?? 0;
    const coords = routeCoordsRef.current;
    if (coords.length > 1) {
      const diff = target - progressRef.current;
      progressRef.current += diff * 0.02;
      const pos = interpolate(coords, progressRef.current);
      riderMarkerRef.current?.setLngLat(pos);

      // Rotate emoji so front wheel faces direction of travel
      const aheadT = Math.min(progressRef.current + 0.02, 1);
      const ahead = interpolate(coords, aheadT);
      const travelBearing = calcBearing(pos, ahead);
      const mapBearing = mapRef.current?.getBearing() ?? 0;
      const el = riderMarkerRef.current?.getElement();
      if (el) el.style.transform = `rotate(${travelBearing - mapBearing - 90}deg)`;
    }
    animFrameRef.current = requestAnimationFrame(animateRider);
  }, [status]);

  // Re-run animation loop when status changes
  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animateRider);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animateRider]);

  const isActive = status !== "pending" && status !== "cancelled";

  return (
    <div className="relative w-full overflow-hidden rounded-3xl shadow-lg" style={{ height: 260 }}>
      <div ref={containerRef} className="absolute inset-0"/>
      {/* Status pill overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow text-xs font-semibold text-green-700">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"/> Pickup
        </div>
        {isActive && (
          <div className="flex items-center gap-1.5 rounded-full bg-primary/90 backdrop-blur-sm px-3 py-1.5 shadow text-xs font-semibold text-white">
            🏍️ Rider en route
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow text-xs font-semibold text-red-600">
          <div className="h-2 w-2 rounded-full bg-red-500"/> You
        </div>
      </div>
    </div>
  );
};

// -------- Status Stepper --------
const STEPS = [
  { key: "pending", label: "Finding Rider", icon: "🔍" },
  { key: "confirmed", label: "Rider Assigned", icon: "✅" },
  { key: "delivering", label: "On the Way", icon: "🏍️" },
  { key: "delivered", label: "Delivered", icon: "🎉" },
] as const;
const ORDER_IDX: Record<OrderStatus, number> = { pending:0, confirmed:1, preparing:2, delivering:2, delivered:3, cancelled:-1 };

const StatusStepper = ({ status }: { status: OrderStatus }) => (
  <div className="flex items-start gap-1">
    {STEPS.map((step, i) => {
      const cur = ORDER_IDX[status] ?? 0;
      const done = cur > i;
      const active = cur === i;
      return (
        <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-all ${done?"bg-primary":active?"bg-primary animate-pulse":"bg-muted"}`}>
            {done ? <CheckCircle2 className="h-4 w-4 text-white"/> : <span>{step.icon}</span>}
          </div>
          <p className={`text-center text-[9px] font-semibold leading-tight ${active?"text-primary":done?"text-muted-foreground":"text-muted-foreground/40"}`}>
            {step.label}
          </p>
        </div>
      );
    })}
  </div>
);

// -------- Searching Animation --------
const SearchingRider = () => (
  <div className="flex flex-col items-center py-8">
    <div className="relative mb-5">
      <div className="h-24 w-24 rounded-full border-4 border-primary/20 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"/>
        <span className="text-4xl">🏍️</span>
      </div>
      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary animate-ping"/>
      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary"/>
    </div>
    <h3 className="font-display text-xl font-bold text-foreground">Finding your rider…</h3>
    <p className="mt-1 text-sm text-muted-foreground">Matching you with a nearby rider</p>
    <div className="mt-4 flex gap-1.5">
      {[0,1,2].map(i=>(
        <div key={i} className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{animationDelay:`${i*0.2}s`}}/>
      ))}
    </div>
  </div>
);

// -------- Paystack iframe --------
const PaystackFrame = ({ url, onClose }: { url: string; onClose: () => void }) => (
  <div className="fixed inset-0 z-[200] flex flex-col bg-white">
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <p className="font-bold text-foreground">Complete Payment</p>
      <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
        <X className="h-5 w-5"/>
      </button>
    </div>
    <iframe src={url} className="flex-1 w-full border-0" title="Paystack Payment"/>
    <p className="py-2 text-center text-[10px] text-muted-foreground">
      Secured by Paystack · Do not close until payment completes
    </p>
  </div>
);

// -------- Payment Modal --------
const PaymentModal = ({ order, onClose }: { order: TrackOrder; onClose: () => void }) => {
  const parsedNotes = parseNotes(order.notes);
  const isService = !!parsedNotes?.service_type;
  const subtotal = (order.order_items || []).reduce((s, i) => s + i.price * i.quantity, 0) || order.total_amount - (order.delivery_fee || 0);
  const deliveryFee = order.delivery_fee || 0;
  const platformCut = +(deliveryFee * 0.2).toFixed(2);   // 20% admin
  const riderShare  = +(deliveryFee * 0.8).toFixed(2);   // 80% rider
  const total = order.total_amount;

  const [loading, setLoading] = useState(false);
  const [paystackUrl, setPaystackUrl] = useState<string | null>(null);
  const [rating, setRating] = useState(0);

  const handlePayNow = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: {
          order_id: order.id,
          order_type: isService ? "service" : "food",
          rider_id: order.rider_id || undefined,
          callback_url: `${window.location.origin}/track/${order.id}?type=${isService ? "service" : "food"}&paid=1`,
        },
      });
      if (error || !data?.authorization_url) throw new Error(error?.message || "Payment init failed");
      setPaystackUrl(data.authorization_url);
    } catch (e: any) {
      toast.error(e.message || "Could not start payment");
    }
    setLoading(false);
  };

  if (paystackUrl) return <PaystackFrame url={paystackUrl} onClose={() => setPaystackUrl(null)}/>;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600"/>
            </div>
            <div>
              <p className="font-bold text-foreground">Delivery Complete! 🎉</p>
              <p className="text-xs text-muted-foreground">Tap Pay Now to complete your order</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4"/>
          </button>
        </div>

        {/* Itemized breakdown */}
        <div className="mb-4 rounded-2xl border border-border bg-muted/30 divide-y divide-border overflow-hidden">
          {(order.order_items || []).map(item => (
            <div key={item.id} className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-foreground">{item.item_name} × {item.quantity}</span>
              <span className="font-semibold">GH₵{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          {(order.order_items || []).length > 0 && (
            <div className="flex justify-between px-4 py-2.5 text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>GH₵{subtotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between px-4 py-2.5 text-sm text-muted-foreground">
            <span>Delivery fee</span>
            <span>GH₵{deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-xs text-muted-foreground/70">
            <span>↳ Platform (20%)</span>
            <span>GH₵{platformCut.toFixed(2)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-xs text-muted-foreground/70">
            <span>↳ Rider (80%)</span>
            <span>GH₵{riderShare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between px-4 py-3 font-bold">
            <span className="text-foreground">Total</span>
            <span className="text-xl text-primary">GH₵{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Star rating */}
        <div className="mb-4 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Rate your rider</p>
          <div className="flex justify-center gap-1.5">
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setRating(s)}>
                <Star className={`h-7 w-7 transition-colors ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}/>
              </button>
            ))}
          </div>
        </div>

        {/* Pay Now */}
        <Button onClick={handlePayNow} disabled={loading}
          className="w-full rounded-2xl bg-primary py-5 text-base font-bold text-white shadow-warm">
          {loading
            ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Opening Paystack…</>
            : <><CreditCard className="mr-2 h-5 w-5"/>Pay Now — GH₵{total.toFixed(2)}</>
          }
        </Button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Card · MTN MoMo · Vodafone Cash · AirtelTigo · Secured by Paystack
        </p>
      </div>
    </div>
  );
};

// -------- Main Page --------
const TrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isService = searchParams.get("type") === "service";

  const [order, setOrder] = useState<TrackOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [meterRunning, setMeterRunning] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("orders").select("*, order_items(*)").eq("id", id).single()
      .then(({ data }) => { if (data) { const o = data as unknown as TrackOrder; setOrder(o); if (o.status==="delivering") setMeterRunning(true); } setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`order-track-${id}`)
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"orders", filter:`id=eq.${id}` }, (payload) => {
        const u = payload.new as unknown as TrackOrder;
        setOrder(prev => prev ? {...prev, ...u} : u);
        if (u.status==="confirmed") toast.success("🎉 Rider accepted your order!");
        if (u.status==="preparing") toast.success("🏍️ Rider is on the way to pick up!");
        if (u.status==="delivering") { toast.success("🚀 Rider heading to you!"); setMeterRunning(true); }
        if (u.status==="delivered") { setMeterRunning(false); toast.success("✅ Delivered!"); setShowPayment(true); }
        if (u.status==="cancelled") toast.error("Order cancelled.");
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // Polling fallback — updates every 8s in case Realtime is not enabled on orders table
  useEffect(() => {
    if (!id) return;
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id)
        .single();
      if (!data) return;
      const u = data as unknown as TrackOrder;
      setOrder(prev => {
        if (!prev || prev.status === u.status) return prev; // no change
        if (u.status==="confirmed") toast.success("🎉 Rider accepted your order!");
        if (u.status==="preparing") toast.success("🏍️ Rider is on the way to pick up!");
        if (u.status==="delivering") { toast.success("🚀 Rider heading to you!"); setMeterRunning(true); }
        if (u.status==="delivered") { setMeterRunning(false); toast.success("✅ Delivered!"); setShowPayment(true); }
        if (u.status==="cancelled") toast.error("Order cancelled.");
        return u;
      });
    }, 8000);
    return () => clearInterval(poll);
  }, [id]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  if (!order) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4"><p className="text-muted-foreground">Order not found.</p><Button onClick={()=>navigate("/")}>Go Home</Button></div>;

  const parsedNotes = parseNotes(order.notes);
  const serviceType = parsedNotes?.service_type as string | undefined;
  const isServiceOrder = !!serviceType;

  const statusLabel: Record<OrderStatus, string> = {
    pending:"Finding Rider…", confirmed:"Rider Assigned", preparing:"Heading to Pickup",
    delivering:"On the Way", delivered:"Delivered ✓", cancelled:"Cancelled",
  };
  const eta: Record<OrderStatus, string> = {
    pending:"Matching…", confirmed:"~20 min", preparing:"~15 min",
    delivering:"~8 min", delivered:"Done", cancelled:"—",
  };

  const pickupAddr = isServiceOrder ? (parsedNotes?.pickup_address || "Pickup location") : "Restaurant / Shop";
  const deliveryAddr = isServiceOrder
    ? (parsedNotes?.delivery_address || "Your location")
    : (order.delivery_address || parsedNotes?.manual_address || "Your address");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button onClick={()=>navigate(-1)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4"/>
          </button>
          <h1 className="text-lg font-bold text-foreground">
            {isServiceOrder ? `${serviceType?.charAt(0).toUpperCase()}${serviceType?.slice(1)} Request` : "Track Order"}
          </h1>
          <span className={`ml-auto rounded-full px-3 py-0.5 text-xs font-bold ${order.status==="delivered"?"bg-green-100 text-green-600":order.status==="cancelled"?"bg-red-100 text-red-600":"bg-primary/10 text-primary"}`}>
            {statusLabel[order.status]}
          </span>
        </div>
      </header>

      <div className="container mx-auto max-w-lg flex-1 space-y-4 px-4 py-5 pb-8">

        <MapView status={order.status} pickupAddress={pickupAddr} deliveryAddress={deliveryAddr}/>

        {/* ETA bar */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
          <Clock className="h-5 w-5 text-primary shrink-0"/>
          <div><p className="text-xs text-muted-foreground">Estimated time</p><p className="font-bold text-foreground">{eta[order.status]}</p></div>
          {!isServiceOrder && (
            <div className="ml-auto text-right"><p className="text-xs text-muted-foreground">Total</p><p className="font-bold text-primary">GH₵{order.total_amount.toFixed(2)}</p></div>
          )}
          {isServiceOrder && order.status==="pending" && (
            <div className="ml-auto text-right"><p className="text-xs text-muted-foreground">Fare starts</p><p className="font-bold text-primary">GH₵{BASE_FARE}+</p></div>
          )}
        </div>

        {/* Live meter (service orders only) */}
        {isServiceOrder && (
          <FareMeter running={meterRunning} finalAmount={order.total_amount}/>
        )}

        {/* Status stepper */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <StatusStepper status={order.status}/>
        </div>

        {/* Searching */}
        {order.status==="pending" && (
          <div className="rounded-2xl border border-border bg-card shadow-card"><SearchingRider/></div>
        )}

        {/* Locations */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {isServiceOrder ? "Request Details" : "Order Details"}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-green-500 shrink-0 mt-0.5"/>
              <div><p className="text-[11px] text-muted-foreground">Pickup</p><p className="font-medium text-foreground">{pickupAddr}</p></div>
            </div>
            <div className="ml-4 border-l-2 border-dashed border-border h-3"/>
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5"/>
              <div><p className="text-[11px] text-muted-foreground">Delivery</p><p className="font-medium text-foreground">{deliveryAddr}</p></div>
            </div>
          </div>

          {!isServiceOrder && order.order_items && order.order_items.length > 0 && (
            <div className="mt-3 divide-y divide-border border-t border-border pt-3">
              {order.order_items.map(oi=>(
                <div key={oi.id} className="flex justify-between py-2 text-sm">
                  <span>{oi.item_name} × {oi.quantity}</span>
                  <span className="font-semibold">GH₵{(oi.price*oi.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {isServiceOrder && parsedNotes?.details && Object.keys(parsedNotes.details).length > 0 && (
            <div className="mt-3 rounded-xl bg-muted/50 p-3 text-xs space-y-1 border-t border-border pt-3">
              {Object.entries(parsedNotes.details as Record<string,any>).map(([k,v])=>
                v ? <div key={k} className="flex gap-2"><span className="text-muted-foreground capitalize">{k.replace(/_/g," ")}:</span><span className="font-medium">{String(v)}</span></div> : null
              )}
            </div>
          )}
        </div>

        {/* Pricing breakdown for service orders */}
        {isServiceOrder && order.status !== "pending" && order.status !== "delivered" && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Route className="h-4 w-4 text-primary"/>
              <p className="text-sm font-bold text-foreground">Fare Breakdown</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Base fare</span><span className="font-medium">GH₵{BASE_FARE}.00</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Per km</span><span className="font-medium">GH₵2.00/km</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Per minute</span><span className="font-medium">GH₵0.30/min</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold text-muted-foreground">
                <span>Final fare</span><span className="text-primary">Set by rider on delivery</span>
              </div>
            </div>
          </div>
        )}

        {/* Rider card when assigned */}
        {order.status !== "pending" && order.status !== "cancelled" && (
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">🧑‍💼</div>
            <div className="flex-1">
              <p className="font-bold text-foreground">SpeedUp Rider</p>
              <div className="flex items-center gap-1">{[1,2,3,4,5].map(s=><Star key={s} className="h-3 w-3 text-accent fill-accent"/>)}<span className="ml-1 text-xs text-muted-foreground">4.9</span></div>
            </div>
            <a href="tel:+233000000000" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20">
              <Phone className="h-5 w-5"/>
            </a>
          </div>
        )}

        {/* Cancel */}
        {order.status==="pending" && (
          <button
            onClick={async () => {
              const { error } = await supabase.functions.invoke("cancel-order", {
                body: { order_id: id, reason: "Customer cancelled" },
              });
              if (error) {
                toast.error("Failed to cancel order");
              } else {
                toast("Order cancelled.");
                navigate(-1);
              }
            }}
            className="w-full rounded-2xl border border-red-200 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
          >
            Cancel Order
          </button>
        )}
      </div>

      {showPayment && order && (
        <PaymentModal order={order} onClose={()=>{ setShowPayment(false); navigate("/profile"); }}/>
      )}
    </div>
  );
};

export default TrackingPage;
