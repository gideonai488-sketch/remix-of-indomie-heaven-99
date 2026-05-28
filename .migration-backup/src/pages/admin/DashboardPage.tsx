import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingCart,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  pendingOrders: number;
  recentOrders: any[];
  statusCounts: Record<string, number>;
  dailyRevenue: { date: string; revenue: number }[];
}

const COLORS = ["hsl(38,90%,50%)", "hsl(0,78%,50%)", "hsl(142,72%,42%)", "hsl(220,70%,50%)", "hsl(280,60%,50%)", "hsl(0,40%,40%)"];

const DashboardPage = () => {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    recentOrders: [],
    statusCounts: {},
    dailyRevenue: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [ordersRes, customersRes] = await Promise.all([
        supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id"),
      ]);

      const orders = ordersRes.data || [];
      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const pendingOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;

      // Status counts for pie chart
      const statusCounts: Record<string, number> = {};
      orders.forEach((o) => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      });

      // Daily revenue for last 7 days
      const dailyMap: Record<string, number> = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dailyMap[d.toISOString().slice(0, 10)] = 0;
      }
      orders.forEach((o) => {
        const day = o.created_at.slice(0, 10);
        if (dailyMap[day] !== undefined) dailyMap[day] += Number(o.total_amount);
      });
      const dailyRevenue = Object.entries(dailyMap).map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString("en-GB", { weekday: "short" }),
        revenue,
      }));

      setStats({
        totalOrders: orders.length,
        totalRevenue,
        totalCustomers: customersRes.data?.length || 0,
        pendingOrders,
        recentOrders: orders.slice(0, 5),
        statusCounts,
        dailyRevenue,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, color: "text-primary" },
    { label: "Revenue", value: `GH₵${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-accent" },
    { label: "Customers", value: stats.totalCustomers, icon: Users, color: "text-success" },
    { label: "Active Orders", value: stats.pendingOrders, icon: Clock, color: "text-primary" },
  ];

  const pieData = Object.entries(stats.statusCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your business</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="mt-2 text-xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Revenue (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.dailyRevenue}>
              <XAxis dataKey="date" tick={{ fill: "hsl(0,10%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(0,10%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(0,60%,14%)", border: "1px solid hsl(0,50%,20%)", borderRadius: 8, color: "#fff" }}
              />
              <Bar dataKey="revenue" fill="hsl(0,78%,50%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Order Status</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-muted-foreground">No orders yet</div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
        </div>
        {stats.recentOrders.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No orders yet</div>
        ) : (
          <div className="divide-y divide-border">
            {stats.recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">#{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.order_items?.length || 0} items · {new Date(o.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">GH₵{Number(o.total_amount).toFixed(2)}</p>
                  <span className="text-xs capitalize text-muted-foreground">{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
