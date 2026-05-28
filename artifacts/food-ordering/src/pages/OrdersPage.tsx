import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, ChevronRight, Clock, CheckCircle2, XCircle, Bike, Package } from "lucide-react";
import BottomNav from "@/components/BottomNav";

type Order = {
  id: string;
  status: string;
  payment_status: string | null;
  total_amount: number;
  created_at: string;
  notes: string | null;
  order_items: Array<{ item_name: string; quantity: number }>;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: "Finding Rider",  color: "text-amber-600 bg-amber-50 border-amber-200",  icon: Clock },
  confirmed:  { label: "Rider Assigned", color: "text-blue-600 bg-blue-50 border-blue-200",    icon: Bike },
  preparing:  { label: "Preparing",      color: "text-blue-600 bg-blue-50 border-blue-200",    icon: Bike },
  delivering: { label: "On the Way",     color: "text-primary bg-primary/5 border-primary/20", icon: Bike },
  delivered:  { label: "Delivered",      color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2 },
  cancelled:  { label: "Cancelled",      color: "text-gray-500 bg-gray-50 border-gray-200",    icon: XCircle },
};

const isServiceOrder = (notes: string | null) => {
  if (!notes) return false;
  try { return !!JSON.parse(notes).service_type; } catch { return false; }
};

const getServiceType = (notes: string | null) => {
  try { return JSON.parse(notes || "").service_type as string; } catch { return null; }
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
};

const OrdersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/auth?redirect=/orders"); return; }
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, payment_status, total_amount, created_at, notes, order_items(item_name, quantity)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setOrders((data as Order[]) || []);
      setLoading(false);
    };
    load();
  }, [user, navigate]);

  const active = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const past   = orders.filter(o =>  ["delivered", "cancelled"].includes(o.status));

  const OrderCard = ({ order }: { order: Order }) => {
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    const service = isServiceOrder(order.notes);
    const svcType = service ? getServiceType(order.notes) : null;
    const isActive = !["delivered", "cancelled"].includes(order.status);
    const summary = service
      ? `${svcType ? svcType.charAt(0).toUpperCase() + svcType.slice(1) : "Service"} request`
      : order.order_items?.map(i => `${i.item_name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ") || "Order";

    return (
      <button
        onClick={() => isActive ? navigate(`/track/${order.id}?type=${service ? "service" : "food"}`) : undefined}
        className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-all ${
          isActive ? "hover:shadow-md active:scale-[0.99] cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              {service
                ? <Package className="h-4 w-4 shrink-0 text-primary" />
                : <ClipboardList className="h-4 w-4 shrink-0 text-primary" />}
              <p className="truncate text-sm font-semibold text-foreground">{summary}</p>
            </div>
            <p className="text-xs text-muted-foreground">{fmt(order.created_at)}</p>
            <div className={`mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
              <Icon className="h-3 w-3" />
              {cfg.label}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-sm font-bold text-foreground">GH₵{Number(order.total_amount).toFixed(2)}</span>
            {order.payment_status === "paid" && (
              <span className="text-[10px] font-semibold text-green-600">Paid</span>
            )}
            {isActive && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center px-4">
          <h1 className="text-lg font-black text-foreground">My Orders</h1>
        </div>
      </header>

      <div className="container mx-auto max-w-lg flex-1 space-y-6 px-4 py-5 pb-24">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ClipboardList className="h-8 w-8 text-primary" />
            </div>
            <p className="text-base font-bold text-foreground">No orders yet</p>
            <p className="text-sm text-muted-foreground">Place your first order and it'll show up here.</p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 rounded-2xl bg-primary px-6 py-2.5 text-sm font-bold text-white"
            >
              Order Now 🏍️
            </button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Active · {active.length}
                </h2>
                <div className="space-y-3">
                  {active.map(o => <OrderCard key={o.id} order={o} />)}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Past orders · {past.length}
                </h2>
                <div className="space-y-3">
                  {past.map(o => <OrderCard key={o.id} order={o} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default OrdersPage;
