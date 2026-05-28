import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Phone, CheckCircle2, Loader2, Banknote, X, Star, MapPin, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type OrderStatus = "pending" | "confirmed" | "preparing" | "delivering" | "delivered" | "cancelled";

interface TrackOrder {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  delivery_fee: number;
  payment_method: string;
  momo_phone?: string | null;
  notes?: string | null;
  created_at: string;
  order_items?: Array<{ id: string; item_name: string; quantity: number; price: number }>;
}

// Parse notes JSON for service orders
const parseNotes = (notes?: string | null) => {
  if (!notes) return null;
  try { return JSON.parse(notes); } catch { return null; }
};

// -------- Animated Map --------
const MapView = ({ status }: { status: OrderStatus }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const targets: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 8,
      preparing: 30,
      delivering: 62,
      delivered: 100,
      cancelled: 0,
    };
    const target = targets[status] ?? 0;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= target) { clearInterval(interval); return target; }
        return Math.min(prev + 1, target);
      });
    }, 25);
    return () => clearInterval(interval);
  }, [status]);

  const startX = 55, startY = 170;
  const endX = 335, endY = 48;
  const cpX = 195, cpY = 25;

  const bezier = (t: number) => ({
    x: (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX,
    y: (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY,
  });

  const t = progress / 100;
  const riderPos = bezier(t);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-[#0d1117]" style={{ height: 230 }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 215" preserveAspectRatio="xMidYMid slice">
        {/* City grid */}
        {[38, 80, 125, 170].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#1e293b" strokeWidth="14" />
        ))}
        {[50, 120, 200, 280, 350].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="215" stroke="#1e293b" strokeWidth="10" />
        ))}
        {/* City blocks */}
        {[[55,42,60,32],[130,42,65,32],[205,42,65,32],[290,42,55,32],
          [55,88,60,30],[130,88,65,30],[205,88,65,30],[290,88,55,30],
          [55,133,60,28],[130,133,65,28],[205,133,65,28],[290,133,55,28]].map(([x,y,w,h],i)=>(
          <rect key={i} x={x} y={y} width={w} height={h} rx="3" fill="#0f1923"/>
        ))}
        {/* Dashed route */}
        <path d={`M${startX} ${startY} Q${cpX} ${cpY} ${endX} ${endY}`}
          stroke="#ef4444" strokeWidth="2.5" strokeDasharray="10 5" fill="none" strokeLinecap="round" opacity="0.5" />
        {/* Completed portion */}
        {progress > 0 && (
          <path d={`M${startX} ${startY} Q${cpX} ${cpY} ${riderPos.x} ${riderPos.y}`}
            stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        {/* Pickup ping */}
        {status !== "delivered" && (
          <circle cx={startX} cy={startY} r="12" fill="#22c55e" opacity="0.2">
            <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
        <circle cx={startX} cy={startY} r="8" fill="#22c55e" />
        <text x={startX} y={startY+1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="white" fontWeight="bold">P</text>

        {/* Delivery pin */}
        <circle cx={endX} cy={endY} r="8" fill={progress >= 100 ? "#22c55e" : "#ef4444"} />
        <text x={endX} y={endY+1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="white" fontWeight="bold">
          {progress >= 100 ? "✓" : "D"}
        </text>

        {/* Rider emoji */}
        {progress > 0 && status !== "cancelled" && (
          <text x={riderPos.x - 10} y={riderPos.y + 6} fontSize="18"
            style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.9))" }}>
            🏍️
          </text>
        )}
      </svg>

      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg bg-green-500/20 border border-green-500/30 px-2 py-1 text-[11px] font-semibold text-green-400">
        <div className="h-2 w-2 rounded-full bg-green-400" /> Pickup
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-red-500/20 border border-red-500/30 px-2 py-1 text-[11px] font-semibold text-red-400">
        <div className="h-2 w-2 rounded-full bg-red-400" /> You
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
        <div className="h-full bg-primary transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

// -------- Status Stepper --------
const STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: "pending", label: "Finding Rider", icon: "🔍" },
  { key: "confirmed", label: "Rider Assigned", icon: "✅" },
  { key: "delivering", label: "On the Way", icon: "🏍️" },
  { key: "delivered", label: "Delivered", icon: "🎉" },
];
const ORDER_ORDER: OrderStatus[] = ["pending", "confirmed", "preparing", "delivering", "delivered"];

const StatusStepper = ({ status }: { status: OrderStatus }) => {
  const current = ORDER_ORDER.indexOf(status);
  const displaySteps = STEPS;
  return (
    <div className="flex items-start gap-1">
      {displaySteps.map((step, i) => {
        const stepIdx = ORDER_ORDER.indexOf(step.key);
        const done = current > stepIdx;
        const active = status === step.key || (step.key === "delivering" && status === "preparing");
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-all ${
              done ? "bg-primary" : active ? "bg-primary animate-pulse" : "bg-muted"
            }`}>
              {done ? <CheckCircle2 className="h-4 w-4 text-white" /> : <span>{step.icon}</span>}
            </div>
            <p className={`text-center text-[9px] font-semibold leading-tight ${
              active ? "text-primary" : done ? "text-muted-foreground" : "text-muted-foreground/40"
            }`}>{step.label}</p>
          </div>
        );
      })}
    </div>
  );
};

// -------- Searching Animation --------
const SearchingRider = () => (
  <div className="flex flex-col items-center py-8">
    <div className="relative mb-5">
      <div className="h-24 w-24 rounded-full border-4 border-primary/20 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <span className="text-4xl">🏍️</span>
      </div>
      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary animate-ping" />
      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary" />
    </div>
    <h3 className="font-display text-xl font-bold text-foreground">Finding your rider…</h3>
    <p className="mt-1 text-sm text-muted-foreground">We're matching you with a nearby rider</p>
    <div className="mt-4 flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  </div>
);

// -------- Payment Modal --------
const PaymentModal = ({ order, onClose }: { order: TrackOrder; onClose: () => void }) => {
  const [paid, setPaid] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Delivery Complete! 🎉</p>
              <p className="text-xs text-muted-foreground">Please confirm payment</p>
            </div>
          </div>
          {!paid && (
            <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mb-5 flex flex-col items-center rounded-2xl bg-primary/5 p-5 text-center">
          <span className="text-5xl mb-2">🎉</span>
          <p className="font-display text-3xl font-black text-primary">GH₵{order.total_amount.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground mt-1">Cash on delivery</p>
        </div>

        <div className="mb-5 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Rate your rider</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="h-7 w-7 cursor-pointer text-accent fill-accent" />
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm">
          <Banknote className="h-4 w-4 text-primary shrink-0" />
          <span className="text-muted-foreground">Hand <strong className="text-foreground">GH₵{order.total_amount.toFixed(2)}</strong> cash to the rider</span>
        </div>

        <Button
          onClick={() => { setPaid(true); toast.success("Thank you! Enjoy 🙏"); setTimeout(onClose, 1200); }}
          disabled={paid}
          className="w-full rounded-2xl bg-primary py-5 text-base font-bold text-white shadow-warm"
        >
          {paid ? <><CheckCircle2 className="mr-2 h-5 w-5" /> Done!</> : "Confirm Payment ✓"}
        </Button>
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

  useEffect(() => {
    if (!id) return;
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setOrder(data as unknown as TrackOrder);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`order-track-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${id}`,
      }, (payload) => {
        const updated = payload.new as unknown as TrackOrder;
        setOrder((prev) => prev ? { ...prev, ...updated } : updated);
        if (updated.status === "confirmed") toast.success("🎉 Rider accepted your order!");
        if (updated.status === "preparing") toast.success("🍳 Rider is on the way to pick up!");
        if (updated.status === "delivering") toast.success("🏍️ Rider is heading to you!");
        if (updated.status === "delivered") { toast.success("✅ Delivered!"); setShowPayment(true); }
        if (updated.status === "cancelled") toast.error("Order cancelled.");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
        <p className="text-muted-foreground">Order not found.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  const parsedNotes = parseNotes(order.notes);
  const serviceType = parsedNotes?.service_type as string | undefined;
  const isServiceOrder = !!serviceType;

  const statusLabel: Record<OrderStatus, string> = {
    pending: "Finding Rider…",
    confirmed: "Rider Assigned",
    preparing: "On the Way to Pickup",
    delivering: "On the Way to You",
    delivered: "Delivered ✓",
    cancelled: "Cancelled",
  };

  const eta: Record<OrderStatus, string> = {
    pending: "Matching…",
    confirmed: "~20 min",
    preparing: "~15 min",
    delivering: "~8 min",
    delivered: "Done",
    cancelled: "—",
  };

  const pickupAddr = isServiceOrder
    ? (parsedNotes?.pickup_address || "Pickup location")
    : "Restaurant / Shop";

  const deliveryAddr = isServiceOrder
    ? (parsedNotes?.delivery_address || "Your location")
    : (parsedNotes?.manual_address || "Your saved address");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold text-foreground">
            {isServiceOrder ? `${serviceType?.charAt(0).toUpperCase()}${serviceType?.slice(1)} Request` : "Track Order"}
          </h1>
          <span className={`ml-auto rounded-full px-3 py-0.5 text-xs font-bold ${
            order.status === "delivered" ? "bg-green-100 text-green-600"
            : order.status === "cancelled" ? "bg-red-100 text-red-600"
            : "bg-primary/10 text-primary"
          }`}>{statusLabel[order.status]}</span>
        </div>
      </header>

      <div className="container mx-auto max-w-lg flex-1 space-y-4 px-4 py-5 pb-8">

        {/* Map */}
        <MapView status={order.status} />

        {/* ETA + fee */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
          <Clock className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Estimated time</p>
            <p className="font-bold text-foreground">{eta[order.status]}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-bold text-primary">GH₵{order.total_amount.toFixed(2)}</p>
          </div>
        </div>

        {/* Status stepper */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <StatusStepper status={order.status} />
        </div>

        {/* Searching or nothing */}
        {order.status === "pending" && (
          <div className="rounded-2xl border border-border bg-card shadow-card">
            <SearchingRider />
          </div>
        )}

        {/* Order/service details */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {isServiceOrder ? "Request Details" : "Order Details"}
          </h3>

          {/* Addresses */}
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground">Pickup</p>
                <p className="font-medium text-foreground">{pickupAddr}</p>
              </div>
            </div>
            <div className="ml-4 border-l-2 border-dashed border-border h-3" />
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground">Delivery</p>
                <p className="font-medium text-foreground">{deliveryAddr}</p>
              </div>
            </div>
          </div>

          {/* Food items */}
          {!isServiceOrder && order.order_items && order.order_items.length > 0 && (
            <div className="mt-3 divide-y divide-border border-t border-border pt-3">
              {order.order_items.map((oi) => (
                <div key={oi.id} className="flex justify-between py-2 text-sm">
                  <span className="text-foreground">{oi.item_name} × {oi.quantity}</span>
                  <span className="font-semibold text-foreground">GH₵{(oi.price * oi.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Service details */}
          {isServiceOrder && parsedNotes?.details && Object.keys(parsedNotes.details).length > 0 && (
            <div className="mt-3 rounded-xl bg-muted/50 p-3 text-xs space-y-1 border-t border-border pt-3">
              {Object.entries(parsedNotes.details as Record<string, any>).map(([k, v]) => (
                v ? (
                  <div key={k} className="flex gap-2">
                    <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}:</span>
                    <span className="font-medium text-foreground">{String(v)}</span>
                  </div>
                ) : null
              ))}
            </div>
          )}
        </div>

        {/* Contact rider (when assigned) */}
        {order.status !== "pending" && order.status !== "cancelled" && (
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">🧑‍💼</div>
            <div className="flex-1">
              <p className="font-bold text-foreground">SpeedUp Rider</p>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => <Star key={s} className="h-3 w-3 text-accent fill-accent" />)}
                <span className="ml-1 text-xs text-muted-foreground">4.9</span>
              </div>
            </div>
            <a href="tel:+233000000000"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20">
              <Phone className="h-5 w-5" />
            </a>
          </div>
        )}

        {/* Cancel (pending only) */}
        {order.status === "pending" && (
          <button
            onClick={async () => {
              await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
              toast("Order cancelled.");
              navigate(-1);
            }}
            className="w-full rounded-2xl border border-red-200 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
          >
            Cancel Order
          </button>
        )}
      </div>

      {showPayment && order && (
        <PaymentModal order={order} onClose={() => { setShowPayment(false); navigate("/profile"); }} />
      )}
    </div>
  );
};

export default TrackingPage;
