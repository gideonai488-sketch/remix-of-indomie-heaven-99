import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, User, Package } from "lucide-react";

interface Customer {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  orderCount: number;
  totalSpent: number;
}

const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("user_id, total_amount"),
      ]);

      const profiles = profilesRes.data || [];
      const orders = ordersRes.data || [];

      // Aggregate orders per user
      const orderMap: Record<string, { count: number; total: number }> = {};
      orders.forEach((o) => {
        if (!orderMap[o.user_id]) orderMap[o.user_id] = { count: 0, total: 0 };
        orderMap[o.user_id].count++;
        orderMap[o.user_id].total += Number(o.total_amount);
      });

      const merged: Customer[] = profiles.map((p) => ({
        user_id: p.user_id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        created_at: p.created_at,
        orderCount: orderMap[p.user_id]?.count || 0,
        totalSpent: orderMap[p.user_id]?.total || 0,
      }));

      // Sort by total spent desc
      merged.sort((a, b) => b.totalSpent - a.totalSpent);
      setCustomers(merged);
      setLoading(false);
    };
    load();
  }, []);

  const viewOrders = async (userId: string) => {
    if (expandedId === userId) {
      setExpandedId(null);
      return;
    }
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    setCustomerOrders(data || []);
    setExpandedId(userId);
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
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
        <h1 className="font-display text-2xl font-bold text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">{customers.length} registered customers</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="w-full rounded-lg border border-border bg-card pl-10 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">No customers found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.user_id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => viewOrders(c.user_id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{c.email || "No email"} {c.phone && `· ${c.phone}`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">GH₵{c.totalSpent.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{c.orderCount} orders</p>
                </div>
              </button>

              {expandedId === c.user_id && (
                <div className="border-t border-border px-4 py-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Joined {new Date(c.created_at).toLocaleDateString()}
                  </p>
                  {customerOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders</p>
                  ) : (
                    customerOrders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-foreground">#{o.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {o.order_items?.length} items · {new Date(o.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-primary">GH₵{Number(o.total_amount).toFixed(2)}</p>
                          <span className="text-[10px] capitalize text-muted-foreground">{o.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
