import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Filter } from "lucide-react";

const STATUS_OPTIONS = ["pending", "confirmed", "preparing", "delivering", "delivered", "cancelled"] as const;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  confirmed: "bg-blue-500/10 text-blue-500",
  preparing: "bg-orange-500/10 text-orange-500",
  delivering: "bg-purple-500/10 text-purple-500",
  delivered: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
};

const OrdersPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Order updated to ${status}`);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    }
  };

  const filtered = orders.filter((o) => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (search && !o.id.toLowerCase().includes(search.toLowerCase()) && !o.momo_phone?.includes(search)) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID or phone..."
            className="w-full rounded-lg border border-border bg-card pl-10 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-border bg-card pl-10 pr-8 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No orders found</div>
        ) : (
          filtered.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">#{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()} · {o.payment_method}
                    {o.momo_phone && ` · ${o.momo_phone}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">GH₵{Number(o.total_amount).toFixed(2)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[o.status]}`}>
                    {o.status}
                  </span>
                </div>
              </button>

              {expandedId === o.id && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  {/* Items */}
                  <div className="space-y-1">
                    {o.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-foreground">{item.quantity}x {item.item_name}</span>
                        <span className="text-muted-foreground">GH₵{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-1 text-sm font-bold">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary">GH₵{Number(o.total_amount).toFixed(2)}</span>
                    </div>
                  </div>

                  {o.notes && (
                    <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                      📝 {o.notes}
                    </p>
                  )}

                  {/* Status update */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Update Status</label>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          disabled={o.status === s}
                          onClick={() => updateStatus(o.id, s)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            o.status === s
                              ? "bg-primary text-primary-foreground"
                              : "border border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
