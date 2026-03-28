import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, MapPin, Package, Plus, Trash2, Heart, LogOut, Save, Clock, Shield } from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { isNativePlatform } from "@/lib/platform";

type Tab = "profile" | "addresses" | "orders" | "favorites";

const getEstimatedTime = (status: string, createdAt: string) => {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const elapsedMin = Math.round((now - created) / 60000);

  switch (status) {
    case "pending": return "~30-45 min";
    case "confirmed": return `~${Math.max(25 - elapsedMin, 5)}-${Math.max(35 - elapsedMin, 10)} min`;
    case "preparing": return `~${Math.max(15 - elapsedMin, 5)}-${Math.max(20 - elapsedMin, 8)} min`;
    case "delivering": return "~5-10 min";
    case "delivered": return "Delivered";
    case "cancelled": return "Cancelled";
    default: return "";
  }
};

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminRole();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<{ name: string; phone: string; email: string }>({ name: "", phone: "", email: "" });
  const [addresses, setAddresses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // New address form
  const [newAddr, setNewAddr] = useState({ label: "Home", address_line1: "", city: "Accra" });
  const [showAddrForm, setShowAddrForm] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate("/auth", { replace: true });
  }, [user, navigate]);

  // Load data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [profileRes, addrRes, ordersRes, favRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).single(),
          supabase.from("delivery_addresses").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("orders").select("*, order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("favorites").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        ]);
        if (profileRes.data) setProfile({ name: profileRes.data.name || "", phone: profileRes.data.phone || "", email: profileRes.data.email || "" });
        setAddresses(addrRes.data || []);
        setOrders(ordersRes.data || []);
        setFavorites(favRes.data || []);
      } catch (e) {
        console.error("Failed to load profile data", e);
        toast.error("Failed to load data");
      }
      setDataLoaded(true);
    };
    load();
  }, [user]);

  // Real-time order status updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("my-orders")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
          );
          const status = (payload.new as any).status;
          const msgs: Record<string, string> = {
            confirmed: "Your order has been confirmed! ✅",
            preparing: "Your Indomie is being prepared! 🍳",
            delivering: "Your order is on its way! 🛵",
            delivered: "Your order has been delivered! 🎉",
            cancelled: "Your order was cancelled ❌",
          };
          if (msgs[status]) toast(msgs[status]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (!user) return null;

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ name: profile.name, phone: profile.phone }).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  const addAddress = async () => {
    if (!newAddr.address_line1.trim()) { toast.error("Enter an address"); return; }
    try {
      const { error } = await supabase.from("delivery_addresses").insert({ ...newAddr, user_id: user.id });
      if (error) throw error;
      toast.success("Address added!");
      setShowAddrForm(false);
      setNewAddr({ label: "Home", address_line1: "", city: "Accra" });
      const { data } = await supabase.from("delivery_addresses").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setAddresses(data || []);
    } catch {
      toast.error("Failed to add address");
    }
  };

  const deleteAddress = async (id: string) => {
    await supabase.from("delivery_addresses").delete().eq("id", id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    toast.success("Address removed");
  };

  const removeFavorite = async (id: string) => {
    await supabase.from("favorites").delete().eq("id", id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    toast.success("Removed from favorites");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600",
    confirmed: "bg-blue-500/10 text-blue-600",
    preparing: "bg-orange-500/10 text-orange-600",
    delivering: "bg-purple-500/10 text-purple-600",
    delivered: "bg-green-500/10 text-green-600",
    cancelled: "bg-red-500/10 text-red-600",
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
    { id: "addresses", label: "Addresses", icon: <MapPin className="h-4 w-4" /> },
    { id: "orders", label: "Orders", icon: <Package className="h-4 w-4" /> },
    { id: "favorites", label: "Favorites", icon: <Heart className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Menu
          </button>
          <h1 className="font-bold text-foreground">My Account</h1>
          <div className="flex items-center gap-3">
            {isAdmin && !isNativePlatform() && (
              <button onClick={() => navigate("/admin")} className="flex items-center gap-1 text-sm text-primary font-semibold">
                <Shield className="h-4 w-4" /> Admin
              </button>
            )}
            <button onClick={handleSignOut} className="flex items-center gap-1 text-sm text-destructive">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto flex gap-1 overflow-x-auto px-4 scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-lg flex-1 px-4 py-6">
        {tab === "profile" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Full Name</label>
              <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Your name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Phone</label>
              <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="+233 XX XXX XXXX" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Email</label>
              <input value={profile.email} disabled className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground" />
            </div>
            <Button onClick={saveProfile} disabled={saving} className="w-full bg-gradient-warm font-bold text-primary-foreground shadow-warm">
              <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        )}

        {tab === "addresses" && (
          <div className="space-y-4">
            {addresses.map((a) => (
              <div key={a.id} className="flex items-start justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <span className="text-xs font-semibold text-primary">{a.label}</span>
                  <p className="mt-1 text-sm text-foreground">{a.address_line1}</p>
                  <p className="text-xs text-muted-foreground">{a.city}</p>
                </div>
                <button onClick={() => deleteAddress(a.id)} className="text-destructive hover:bg-destructive/10 rounded-full p-1.5">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {showAddrForm ? (
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <input value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} placeholder="Label (Home, Work...)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={newAddr.address_line1} onChange={(e) => setNewAddr({ ...newAddr, address_line1: e.target.value })} placeholder="Address" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <select value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {["Accra", "Kumasi", "Tema", "Takoradi", "Tamale", "Cape Coast"].map((c) => <option key={c}>{c}</option>)}
                </select>
                <div className="flex gap-2">
                  <Button onClick={addAddress} className="flex-1 bg-gradient-warm text-primary-foreground font-bold">Save</Button>
                  <Button variant="outline" onClick={() => setShowAddrForm(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowAddrForm(true)} variant="outline" className="w-full gap-1">
                <Plus className="h-4 w-4" /> Add Address
              </Button>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-muted-foreground">No orders yet</p>
                <Button onClick={() => navigate("/")} variant="outline" className="mt-4">Browse Menu</Button>
              </div>
            ) : orders.map((o) => {
              const statusSteps = ["pending", "confirmed", "preparing", "delivering", "delivered"];
              const currentStep = statusSteps.indexOf(o.status);
              const isCancelled = o.status === "cancelled";
              const isActive = !isCancelled && o.status !== "delivered";
              const eta = getEstimatedTime(o.status, o.created_at);

              return (
                <div key={o.id} className={`rounded-xl border bg-card p-4 space-y-3 ${isActive ? "border-primary/30 shadow-warm" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[o.status] || ""}`}>
                      {o.status}
                    </span>
                  </div>

                  {/* Estimated delivery time */}
                  {isActive && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-2">
                      <Clock className="h-4 w-4 text-primary animate-pulse" />
                      <span className="text-sm font-semibold text-primary">ETA: {eta}</span>
                    </div>
                  )}

                  {/* Order progress tracker */}
                  {!isCancelled && (
                    <div className="flex items-center gap-1">
                      {statusSteps.map((step, i) => (
                        <div key={step} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className={`h-2 w-full rounded-full transition-colors ${
                              i <= currentStep ? "bg-primary" : "bg-border"
                            }`}
                          />
                          <span className={`text-[10px] ${i <= currentStep ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                            {step === "pending" ? "📋" : step === "confirmed" ? "✅" : step === "preparing" ? "🍳" : step === "delivering" ? "🛵" : "🎉"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isCancelled && (
                    <div className="rounded-lg bg-destructive/5 px-3 py-2 text-center text-sm font-medium text-destructive">
                      This order was cancelled
                    </div>
                  )}

                  <div className="space-y-1">
                    {o.order_items?.map((item: any) => (
                      <p key={item.id} className="text-sm text-foreground">{item.quantity}x {item.item_name} — GH₵{Number(item.price * item.quantity).toFixed(2)}</p>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
                    <span className="font-bold text-primary">GH₵{Number(o.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "favorites" && (
          <div className="space-y-3">
            {favorites.length === 0 ? (
              <div className="py-16 text-center">
                <Heart className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-muted-foreground">No favorites yet</p>
                <Button onClick={() => navigate("/")} variant="outline" className="mt-4">Browse Menu</Button>
              </div>
            ) : favorites.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <span className="text-sm font-medium text-foreground">Item #{f.item_id}</span>
                <button onClick={() => removeFavorite(f.id)} className="text-destructive hover:bg-destructive/10 rounded-full p-1.5">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
