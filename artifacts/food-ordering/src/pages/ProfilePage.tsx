import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, MapPin, Package, Plus, Trash2, LogOut, Save,
  Clock, Wallet, Settings, ChevronRight, Phone, Mail,
  Star, Bike, Box, Pill, ShoppingBag, CheckCircle2, XCircle,
  Eye, EyeOff, Lock,
} from "lucide-react";

type Tab = "account" | "orders" | "addresses" | "wallet" | "settings";

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700",
  confirmed:  "bg-blue-100 text-blue-700",
  preparing:  "bg-orange-100 text-orange-700",
  delivering: "bg-purple-100 text-purple-700",
  delivered:  "bg-green-100 text-green-700",
  completed:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-600",
  searching:  "bg-yellow-100 text-yellow-700",
  accepted:   "bg-blue-100 text-blue-700",
};

const ORDER_STEPS = ["pending", "confirmed", "preparing", "delivering", "delivered"];
const ORDER_EMOJIS: Record<string, string> = {
  pending: "📋", confirmed: "✅", preparing: "🍳", delivering: "🛵", delivered: "🎉",
};

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  errand:   <ShoppingBag className="h-4 w-4" />,
  parcel:   <Box className="h-4 w-4" />,
  package:  <Package className="h-4 w-4" />,
  pharmacy: <Pill className="h-4 w-4" />,
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";

const Field = ({
  label, value, onChange, type = "text", disabled, placeholder, icon: Icon,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; disabled?: boolean; placeholder?: string; icon?: React.ElementType;
}) => (
  <div>
    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
      <input
        type={type} value={value} disabled={disabled} placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full rounded-xl border border-border px-3 py-3 text-sm text-foreground
          focus:outline-none focus:ring-2 focus:ring-primary/30 transition
          ${Icon ? "pl-10" : ""}
          ${disabled ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-card"}`}
      />
    </div>
  </div>
);

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("account");
  const [profile, setProfile] = useState({ name: "", phone: "", email: "" });
  const [addresses, setAddresses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; transactions: any[] }>({ balance: 0, transactions: [] });
  const [saving, setSaving] = useState(false);
  const [memberSince, setMemberSince] = useState("");

  // Address form
  const [newAddr, setNewAddr] = useState({ label: "Home", address_line1: "", city: "Accra" });
  const [showAddrForm, setShowAddrForm] = useState(false);

  // Password change
  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => { if (!user) navigate("/auth", { replace: true }); }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, addrRes, ordersRes, bookingsRes, walletRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("delivery_addresses").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("orders").select("*, order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
        (supabase as any).from("service_bookings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("wallets").select("*").eq("user_id", user.id).single(),
      ]);
      if (profileRes.data) {
        setProfile({ name: profileRes.data.name || "", phone: profileRes.data.phone || "", email: profileRes.data.email || "" });
        setMemberSince(new Date(profileRes.data.created_at || user.created_at || "").toLocaleDateString("en-US", { month: "long", year: "numeric" }));
      }
      setAddresses(addrRes.data || []);
      setOrders(ordersRes.data || []);
      setBookings(bookingsRes.data || []);
      if (walletRes.data) {
        const txRes = await supabase.from("wallets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
        setWallet({ balance: walletRes.data.balance ?? 0, transactions: txRes.data || [] });
      }
    };
    load();
  }, [user]);

  // Realtime order updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("profile-orders")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        (p) => setOrders((prev) => prev.map((o) => o.id === p.new.id ? { ...o, ...p.new } : o)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!user) return null;

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name: profile.name, phone: profile.phone }).eq("user_id", user.id);
    if (error) toast.error("Failed to save"); else toast.success("Profile updated!");
    setSaving(false);
  };

  const changePassword = async () => {
    if (newPw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) toast.error(error.message); else { toast.success("Password changed!"); setShowPwSection(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
    setSavingPw(false);
  };

  const addAddress = async () => {
    if (!newAddr.address_line1.trim()) { toast.error("Enter an address"); return; }
    const { error } = await supabase.from("delivery_addresses").insert({ ...newAddr, user_id: user.id });
    if (error) { toast.error("Failed to add address"); return; }
    toast.success("Address saved!");
    setShowAddrForm(false);
    setNewAddr({ label: "Home", address_line1: "", city: "Accra" });
    const { data } = await supabase.from("delivery_addresses").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setAddresses(data || []);
  };

  const deleteAddress = async (id: string) => {
    await supabase.from("delivery_addresses").delete().eq("id", id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    toast.success("Address removed");
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "account",   label: "Account",   icon: <User className="h-4 w-4" /> },
    { id: "orders",    label: "Orders",    icon: <Package className="h-4 w-4" /> },
    { id: "addresses", label: "Addresses", icon: <MapPin className="h-4 w-4" /> },
    { id: "wallet",    label: "Wallet",    icon: <Wallet className="h-4 w-4" /> },
    { id: "settings",  label: "Settings",  icon: <Settings className="h-4 w-4" /> },
  ];

  const allActivity = [
    ...orders.map((o) => ({ ...o, _type: "order" })),
    ...bookings.map((b) => ({ ...b, _type: "booking" })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </button>
          <h1 className="font-bold text-foreground">My Account</h1>
          <button onClick={async () => { await signOut(); navigate("/"); }}
            className="flex items-center gap-1.5 text-sm font-medium text-destructive hover:text-destructive/80">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Profile hero */}
      <div className="bg-gradient-to-br from-primary to-primary/80 px-4 pb-6 pt-5 text-white">
        <div className="container mx-auto flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-xl font-bold backdrop-blur">
            {getInitials(profile.name || user.email || "U")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-lg font-bold leading-tight">{profile.name || "SpeedUp User"}</p>
            <p className="truncate text-sm text-white/75">{profile.email || user.email}</p>
            {profile.phone && <p className="text-sm text-white/60">{profile.phone}</p>}
          </div>
          {memberSince && <p className="shrink-0 text-right text-xs text-white/50">Member<br />{memberSince}</p>}
        </div>
        {/* Quick stats */}
        <div className="container mx-auto mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "Orders", value: orders.length },
            { label: "Services", value: bookings.length },
            { label: "Addresses", value: addresses.length },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/10 py-2.5 text-center backdrop-blur">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-white/70">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-14 z-40 border-b border-border bg-card shadow-sm">
        <div className="container mx-auto flex gap-0 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors ${
                tab === t.id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-lg flex-1 px-4 py-5 pb-24">

        {/* ── ACCOUNT ── */}
        {tab === "account" && (
          <div className="space-y-5">
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
              <h3 className="font-bold text-foreground">Personal Information</h3>
              <Field label="Full Name" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} icon={User} placeholder="Your full name" />
              <Field label="Email Address" value={profile.email} disabled icon={Mail} />
              <Field label="Phone Number" value={profile.phone} onChange={(v) => setProfile({ ...profile, phone: v })} icon={Phone} placeholder="+1 XXX XXX XXXX" type="tel" />
              <Button onClick={saveProfile} disabled={saving}
                className="w-full rounded-xl bg-primary py-5 font-bold text-white shadow-warm">
                <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>

            {/* Change Password */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <button onClick={() => setShowPwSection(!showPwSection)}
                className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-full bg-primary/10 p-2"><Lock className="h-4 w-4 text-primary" /></div>
                  <span className="font-semibold text-foreground">Change Password</span>
                </div>
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showPwSection ? "rotate-90" : ""}`} />
              </button>
              {showPwSection && (
                <div className="mt-4 space-y-3">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type={showPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)}
                      placeholder="New password (min. 6 chars)"
                      className="w-full rounded-xl border border-border bg-background pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type={showPw ? "text" : "password"} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full rounded-xl border border-border bg-background pl-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <Button onClick={changePassword} disabled={savingPw}
                    className="w-full rounded-xl bg-primary py-5 font-bold text-white">
                    {savingPw ? "Updating…" : "Update Password"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === "orders" && (
          <div className="space-y-4">
            {allActivity.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 font-medium text-muted-foreground">No activity yet</p>
                <Button onClick={() => navigate("/")} variant="outline" className="mt-4 rounded-xl">Browse Menu</Button>
              </div>
            ) : allActivity.map((item) => {
              if (item._type === "order") {
                const step = ORDER_STEPS.indexOf(item.status);
                const active = item.status !== "delivered" && item.status !== "cancelled";
                return (
                  <div key={item.id} className={`rounded-2xl border bg-card p-4 space-y-3 ${active ? "border-primary/30 shadow-sm" : "border-border"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-primary/10 p-1.5"><Bike className="h-3.5 w-3.5 text-primary" /></div>
                        <span className="text-xs font-bold text-muted-foreground">Food Order #{item.id.slice(0, 8)}</span>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[item.status] || ""}`}>
                        {item.status}
                      </span>
                    </div>

                    {item.status !== "cancelled" && (
                      <div className="flex items-center gap-1">
                        {ORDER_STEPS.map((s, i) => (
                          <div key={s} className="flex flex-1 flex-col items-center gap-0.5">
                            <div className={`h-1.5 w-full rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
                            <span className="text-[10px]">{ORDER_EMOJIS[s]}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-0.5">
                      {item.order_items?.map((oi: any) => (
                        <p key={oi.id} className="text-sm text-foreground">{oi.quantity}× {oi.item_name}</p>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <span className="font-bold text-primary">GH₵{Number(item.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                );
              }

              // Service booking
              return (
                <div key={item.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                        {SERVICE_ICONS[item.service_type] || <Box className="h-3.5 w-3.5" />}
                      </div>
                      <span className="text-xs font-bold capitalize text-muted-foreground">{item.service_type} Request</span>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[item.status] || ""}`}>
                      {item.status}
                    </span>
                  </div>
                  {item.description && <p className="text-sm text-foreground line-clamp-2">{item.description}</p>}
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    {item.total_amount ? (
                      <span className="font-bold text-primary">GH₵{Number(item.total_amount).toFixed(2)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Pending quote</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ADDRESSES ── */}
        {tab === "addresses" && (
          <div className="space-y-4">
            {addresses.length === 0 && !showAddrForm && (
              <div className="py-12 text-center">
                <MapPin className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-2 text-muted-foreground">No saved addresses</p>
              </div>
            )}

            {addresses.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">{a.label}</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">{a.address_line1}</p>
                  <p className="text-xs text-muted-foreground">{a.city}</p>
                </div>
                <button onClick={() => deleteAddress(a.id)}
                  className="rounded-full p-1.5 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {showAddrForm ? (
              <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
                <h4 className="font-semibold text-foreground">New Address</h4>
                <select value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {["Home", "Work", "Other"].map((l) => <option key={l}>{l}</option>)}
                </select>
                <input value={newAddr.address_line1} onChange={(e) => setNewAddr({ ...newAddr, address_line1: e.target.value })}
                  placeholder="Street address" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                  placeholder="City" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="flex gap-2">
                  <Button onClick={addAddress} className="flex-1 rounded-xl bg-primary font-bold text-white">Save Address</Button>
                  <Button variant="outline" onClick={() => setShowAddrForm(false)} className="rounded-xl">Cancel</Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowAddrForm(true)} variant="outline"
                className="w-full rounded-2xl border-dashed py-5 text-sm font-semibold hover:border-primary hover:text-primary">
                <Plus className="mr-2 h-4 w-4" /> Add New Address
              </Button>
            )}
          </div>
        )}

        {/* ── WALLET ── */}
        {tab === "wallet" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-white">
              <p className="text-sm font-medium text-white/70">Available Balance</p>
              <p className="mt-1 text-4xl font-bold">GH₵{Number(wallet.balance).toFixed(2)}</p>
              <p className="mt-3 text-xs text-white/60">SpeedUp Wallet</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-4 font-bold text-foreground">Transaction History</h3>
              {wallet.transactions.length === 0 ? (
                <div className="py-8 text-center">
                  <Wallet className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">No transactions yet</p>
                </div>
              ) : wallet.transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{tx.type || "Transaction"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`font-bold ${(tx.amount ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {(tx.amount ?? 0) >= 0 ? "+" : ""}GH₵{Math.abs(Number(tx.amount)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <div className="space-y-3">

            {[
              { label: "Order History", sub: "View all past orders", icon: <Package className="h-5 w-5 text-muted-foreground" />, action: () => setTab("orders") },
              { label: "Saved Addresses", sub: "Manage delivery locations", icon: <MapPin className="h-5 w-5 text-muted-foreground" />, action: () => setTab("addresses") },
              { label: "My Wallet", sub: "Check balance & history", icon: <Wallet className="h-5 w-5 text-muted-foreground" />, action: () => setTab("wallet") },
            ].map((item) => (
              <button key={item.label} onClick={item.action}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 hover:bg-muted/40">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-2.5">{item.icon}</div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}

            <div className="pt-2">
              <button onClick={async () => { await signOut(); navigate("/"); }}
                className="flex w-full items-center justify-between rounded-2xl border border-destructive/20 bg-destructive/5 p-4 hover:bg-destructive/10">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-destructive/10 p-2.5"><LogOut className="h-5 w-5 text-destructive" /></div>
                  <div className="text-left">
                    <p className="font-semibold text-destructive">Sign Out</p>
                    <p className="text-xs text-muted-foreground">You can sign back in anytime</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-destructive/50" />
              </button>
            </div>

            <p className="pt-4 text-center text-xs text-muted-foreground">
              SpeedUp v1.0 · Genesis Holdings Inc, USA<br />
              <span className="text-primary">support@speedup.app</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
