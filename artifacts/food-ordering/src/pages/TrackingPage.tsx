import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ServiceRequest, ServiceStatus } from "@/types/services";
import {
  ArrowLeft, Phone, CheckCircle2, Loader2, Banknote,
  Smartphone, X, Star, MapPin, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ------- Animated Map -------
const MapView = ({ status }: { status: ServiceStatus }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const targets: Record<ServiceStatus, number> = {
      searching: 0,
      accepted: 8,
      in_progress: 55,
      completed: 100,
      cancelled: 0,
    };
    const target = targets[status] ?? 0;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= target) { clearInterval(interval); return target; }
        return Math.min(prev + 1, target);
      });
    }, 30);
    return () => clearInterval(interval);
  }, [status]);

  // Bezier control points for the rider path
  const startX = 60, startY = 170;
  const endX = 340, endY = 50;
  const cpX = 200, cpY = 30;

  // Quadratic bezier point at t
  const bezier = (t: number) => ({
    x: (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX,
    y: (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY,
  });

  const t = progress / 100;
  const riderPos = bezier(t);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-[#0d1117]" style={{ height: 240 }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
        {/* City grid streets */}
        {[40, 80, 130, 175].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
        ))}
        {[50, 120, 200, 280, 350].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="220" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
        ))}

        {/* Street center lines */}
        {[40, 80, 130, 175].map((y) => (
          <line key={`hc${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#1e3a5f" strokeWidth="2" strokeDasharray="12 8" />
        ))}

        {/* City blocks fill */}
        {[[55, 45, 60, 35], [130, 45, 65, 35], [205, 45, 65, 35], [290, 45, 55, 35],
          [55, 90, 60, 32], [130, 90, 65, 32], [205, 90, 65, 32], [290, 90, 55, 32],
          [55, 140, 60, 28], [130, 140, 65, 28], [205, 140, 65, 28], [290, 140, 55, 28]].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="4" fill="#111827" />
        ))}

        {/* Route path */}
        <path
          d={`M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`}
          stroke="#ef4444"
          strokeWidth="3"
          strokeDasharray="10 5"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Completed route (red solid) */}
        {progress > 0 && (
          <path
            d={`M ${startX} ${startY} Q ${cpX} ${cpY} ${riderPos.x} ${riderPos.y}`}
            stroke="#ef4444"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Pickup pin (green pulsing) */}
        {status !== 'completed' && (
          <>
            <circle cx={startX} cy={startY} r="14" fill="#22c55e" opacity="0.2">
              <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
          </>
        )}
        <circle cx={startX} cy={startY} r="8" fill="#22c55e" />
        <text x={startX} y={startY + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="white" fontWeight="bold">P</text>

        {/* Delivery pin (red) */}
        <circle cx={endX} cy={endY} r="8" fill={progress >= 100 ? "#22c55e" : "#ef4444"} />
        <text x={endX} y={endY + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="white" fontWeight="bold">
          {progress >= 100 ? "✓" : "D"}
        </text>

        {/* Rider */}
        {progress > 0 && status !== 'cancelled' && (
          <text
            x={riderPos.x - 10}
            y={riderPos.y + 6}
            fontSize="18"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
          >
            🏍️
          </text>
        )}
      </svg>

      {/* Pickup / Delivery labels */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg bg-green-500/20 border border-green-500/30 px-2 py-1 text-[11px] font-semibold text-green-400">
        <div className="h-2 w-2 rounded-full bg-green-400" /> Pickup
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-red-500/20 border border-red-500/30 px-2 py-1 text-[11px] font-semibold text-red-400">
        <div className="h-2 w-2 rounded-full bg-red-400" /> Delivery
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-border">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// ------- Status stepper -------
const steps: { key: ServiceStatus; label: string; icon: string }[] = [
  { key: "searching", label: "Finding Rider", icon: "🔍" },
  { key: "accepted", label: "Rider Assigned", icon: "✅" },
  { key: "in_progress", label: "On the Way", icon: "🏍️" },
  { key: "completed", label: "Delivered", icon: "🎉" },
];

const STATUS_ORDER: ServiceStatus[] = ["searching", "accepted", "in_progress", "completed"];

const StatusStepper = ({ status }: { status: ServiceStatus }) => {
  const current = STATUS_ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-all ${
              done ? "bg-primary" : active ? "bg-primary animate-pulse" : "bg-muted"
            }`}>
              {done ? <CheckCircle2 className="h-4 w-4 text-white" /> : <span>{step.icon}</span>}
            </div>
            <p className={`text-center text-[9px] font-semibold leading-tight ${active ? "text-primary" : done ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
              {step.label}
            </p>
            {i < steps.length - 1 && (
              <div className="absolute" style={{ display: "none" }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ------- Payment Modal -------
const PaymentModal = ({
  request,
  onClose,
}: {
  request: ServiceRequest;
  onClose: () => void;
}) => {
  const [paid, setPaid] = useState(false);

  const handleConfirm = async () => {
    setPaid(true);
    toast.success("Payment confirmed! Thank you 🙏");
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl animate-slide-in-right">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Delivery Complete!</p>
              <p className="text-xs text-muted-foreground">Please confirm payment</p>
            </div>
          </div>
          {!paid && (
            <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Confetti / illustration */}
        <div className="mb-5 flex flex-col items-center rounded-2xl bg-primary/5 p-5 text-center">
          <span className="text-5xl mb-2">🎉</span>
          <p className="font-display text-2xl font-black text-primary">GH₵{request.service_fee}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {request.payment_method === "momo" ? "Mobile Money" : "Cash"} payment
          </p>
          {request.rider_name && (
            <p className="mt-2 text-xs text-muted-foreground">
              Rider: <span className="font-semibold text-foreground">{request.rider_name}</span>
            </p>
          )}
        </div>

        {/* Rating */}
        <div className="mb-5 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Rate your rider</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="h-7 w-7 cursor-pointer text-accent fill-accent" />
            ))}
          </div>
        </div>

        {/* Payment details */}
        {request.payment_method === "momo" && (
          <div className="mb-4 rounded-xl bg-muted/50 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">MoMo prompt sent to</span>
              <span className="font-bold text-foreground">{request.momo_phone}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Approve the prompt on your phone to complete</p>
          </div>
        )}

        {request.payment_method === "cash" && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm">
            <Banknote className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Hand</span>
            <span className="font-bold text-foreground">GH₵{request.service_fee}</span>
            <span className="text-muted-foreground">cash to the rider</span>
          </div>
        )}

        <Button
          onClick={handleConfirm}
          disabled={paid}
          className="w-full rounded-2xl bg-gradient-warm py-5 text-base font-bold text-white shadow-warm"
        >
          {paid ? <><CheckCircle2 className="mr-2 h-5 w-5" /> Paid!</> : "Confirm Payment ✓"}
        </Button>
      </div>
    </div>
  );
};

// ------- Searching Animation -------
const SearchingRider = () => (
  <div className="flex flex-col items-center py-8">
    <div className="relative mb-5">
      <div className="h-24 w-24 rounded-full border-4 border-primary/20 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <span className="text-4xl">🏍️</span>
      </div>
      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent animate-ping" />
      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent" />
    </div>
    <h3 className="font-display text-xl font-bold text-foreground">Finding your rider…</h3>
    <p className="mt-1 text-sm text-muted-foreground">We're matching you with a nearby rider</p>
    <div className="mt-4 flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2 w-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  </div>
);

// ------- Rider Card -------
const RiderCard = ({ request }: { request: ServiceRequest }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-3xl">
      🧑‍💼
    </div>
    <div className="flex-1">
      <p className="font-bold text-foreground">{request.rider_name || "SpeedUp Rider"}</p>
      <div className="mt-0.5 flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(s => <Star key={s} className="h-3 w-3 text-accent fill-accent" />)}
        </div>
        <span className="text-xs text-muted-foreground">4.9</span>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        {request.rider_vehicle || "Motorcycle"} · {request.rider_phone || "---"}
      </p>
    </div>
    {request.rider_phone && (
      <a href={`tel:${request.rider_phone}`}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Phone className="h-5 w-5" />
      </a>
    )}
  </div>
);

// ------- Main TrackingPage -------
const TrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isService = searchParams.get("type") === "service";

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);

  // Fetch initial
  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("service_requests" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (data) setRequest(data as unknown as ServiceRequest);
      setLoading(false);
    };
    fetch();
  }, [id]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`track-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_requests",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const updated = payload.new as unknown as ServiceRequest;
          setRequest(updated);
          if (updated.status === "accepted") {
            toast.success("🎉 Rider accepted! On the way.");
          }
          if (updated.status === "in_progress") {
            toast.success("🏍️ Rider has picked up your request!");
          }
          if (updated.status === "completed") {
            setShowPayment(true);
          }
          if (updated.status === "cancelled") {
            toast.error("Request was cancelled.");
          }
        }
      )
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

  if (!request) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
        <p className="text-muted-foreground">Request not found.</p>
        <Button onClick={() => navigate("/services")}>Back to Services</Button>
      </div>
    );
  }

  const statusLabel: Record<ServiceStatus, string> = {
    searching: "Searching for rider…",
    accepted: "Rider on the way",
    in_progress: "In progress",
    completed: "Delivered ✓",
    cancelled: "Cancelled",
  };

  const eta: Record<ServiceStatus, string> = {
    searching: "Matching…",
    accepted: "~15 min",
    in_progress: "~8 min",
    completed: "Done",
    cancelled: "—",
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Track Order</h1>
          <span className={`ml-auto rounded-full px-3 py-0.5 text-xs font-bold ${
            request.status === "completed" ? "bg-green-500/20 text-green-400"
            : request.status === "cancelled" ? "bg-destructive/20 text-destructive"
            : "bg-primary/20 text-primary"
          }`}>
            {statusLabel[request.status]}
          </span>
        </div>
      </header>

      <div className="container mx-auto max-w-lg flex-1 space-y-4 px-4 py-5 pb-8">

        {/* Map */}
        <MapView status={request.status} />

        {/* ETA bar */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <Clock className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Estimated time</p>
            <p className="font-bold text-foreground">{eta[request.status]}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Service fee</p>
            <p className="font-bold text-primary">GH₵{request.service_fee}</p>
          </div>
        </div>

        {/* Status stepper */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <StatusStepper status={request.status} />
        </div>

        {/* Searching animation or Rider card */}
        {request.status === "searching" ? (
          <div className="rounded-2xl border border-border bg-card">
            <SearchingRider />
          </div>
        ) : request.status !== "cancelled" ? (
          <RiderCard request={request} />
        ) : null}

        {/* Request details */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Request Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground">Pickup</p>
                <p className="font-medium text-foreground">{request.pickup_address}</p>
              </div>
            </div>
            <div className="ml-4 border-l-2 border-dashed border-border h-3" />
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground">Delivery</p>
                <p className="font-medium text-foreground">{request.delivery_address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel button (only if searching) */}
        {request.status === "searching" && (
          <button
            onClick={async () => {
              await supabase.from("service_requests" as any).update({ status: "cancelled" }).eq("id", id);
              toast("Request cancelled.");
              navigate(-1);
            }}
            className="w-full rounded-2xl border border-destructive/40 py-3 text-sm font-semibold text-destructive hover:bg-destructive/5 transition-colors"
          >
            Cancel Request
          </button>
        )}
      </div>

      {/* Payment modal */}
      {showPayment && request && (
        <PaymentModal request={request} onClose={() => { setShowPayment(false); navigate("/profile"); }} />
      )}
    </div>
  );
};

export default TrackingPage;
