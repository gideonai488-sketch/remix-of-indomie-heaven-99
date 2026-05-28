import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Loader2, Phone, User,
  ShoppingBag, StickyNote, CheckCircle2,
} from "lucide-react";

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}>{children}</div>
);
const SectionTitle = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
    <Icon className="h-4 w-4 text-primary" /> {children}
  </h3>
);

const CheckoutPage = () => {
  const { user } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [deliveryFee] = useState(10);
  const finalTotal = totalPrice + deliveryFee;

  useEffect(() => { if (!user) navigate("/auth", { replace: true }); }, [user, navigate]);
  useEffect(() => { if (user && items.length === 0) navigate("/", { replace: true }); }, [user, items.length, navigate]);

  useEffect(() => {
    if (!user || dataLoaded) return;
    const load = async () => {
      const [addrRes, profileRes] = await Promise.all([
        supabase.from("delivery_addresses").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      ]);
      const addrs = addrRes.data || [];
      setAddresses(addrs);
      if (addrs.length > 0) setSelectedAddr(addrs[0].id);
      if (profileRes.data) {
        setCustomerName(profileRes.data.name || "");
        setCustomerPhone(profileRes.data.phone || "");
      }
      setDataLoaded(true);
    };
    load();
  }, [user, dataLoaded]);

  if (!user || items.length === 0) return null;

  const resolvedAddress = selectedAddr
    ? addresses.find((a) => a.id === selectedAddr)
    : null;

  const deliveryAddressText = resolvedAddress
    ? `${resolvedAddress.address_line1}, ${resolvedAddress.city}`
    : manualAddress.trim();

  const hasAddress = !!deliveryAddressText;

  const handleFindRider = async () => {
    if (!customerName.trim()) { toast.error("Enter your name"); return; }
    if (!customerPhone.trim()) { toast.error("Enter your phone number"); return; }
    if (!hasAddress) { toast.error("Add a delivery address"); return; }

    setLoading(true);
    try {
      // 1. Create the order with all details as proper columns
      const { data: order, error: orderErr } = await (supabase as any)
        .from("orders")
        .insert({
          user_id: user.id,
          customer_id: user.id,
          delivery_address: deliveryAddressText,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          total_amount: finalTotal,
          delivery_fee: deliveryFee,
          payment_method: "paystack",
          notes: notes.trim() || null,
          status: "pending",
          payment_status: "pending",
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Insert order items
      const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
      const orderItems = items.map((ci) => ({
        order_id: order.id,
        ...(isUuid(ci.item.id) ? { item_id: ci.item.id } : {}),
        item_name: ci.item.name,
        quantity: ci.quantity,
        price: ci.item.price,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      // 3. Dispatch rider — finds nearest verified rider
      await supabase.functions.invoke("dispatch-rider", {
        body: { order_id: order.id },
      }).catch(() => {}); // non-fatal if edge fn fails

      clearCart();
      toast.success("Order placed! Finding you a rider… 🏍️");
      navigate(`/track/${order.id}?type=food`);
    } catch (e: any) {
      toast.error(e.message || "Failed to place order");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Your Order</h1>
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {items.length} item{items.length !== 1 && "s"}
          </span>
        </div>
      </header>

      <div className="container mx-auto max-w-lg flex-1 space-y-4 px-4 py-5 pb-40">

        {/* Order summary */}
        <SectionCard>
          <SectionTitle icon={ShoppingBag}>Order Summary</SectionTitle>
          <div className="divide-y divide-border">
            {items.map((ci) => (
              <div key={ci.item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <img src={ci.item.image} alt={ci.item.name}
                  className="h-12 w-12 rounded-xl object-cover ring-1 ring-border" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{ci.item.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {ci.quantity}</p>
                </div>
                <span className="text-sm font-bold text-foreground">
                  GH₵{(ci.item.price * ci.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Customer details */}
        <SectionCard>
          <SectionTitle icon={User}>Your Details</SectionTitle>
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full Name"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone Number" type="tel"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </SectionCard>

        {/* Delivery address */}
        <SectionCard>
          <SectionTitle icon={MapPin}>Delivery Address</SectionTitle>
          <div className="space-y-3">
            {/* Saved address quick-pick (compact chips) */}
            {addresses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <button key={a.id}
                    onClick={() => { setSelectedAddr(a.id); setManualAddress(""); }}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedAddr === a.id
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}>
                    <MapPin className="h-3 w-3" /> {a.label}
                  </button>
                ))}
                {selectedAddr && (
                  <button onClick={() => setSelectedAddr(null)}
                    className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40">
                    Type instead
                  </button>
                )}
              </div>
            )}

            {/* Show selected address or free-text input */}
            {selectedAddr ? (
              <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  {(() => { const a = addresses.find(x => x.id === selectedAddr); return (
                    <>
                      <p className="text-sm font-semibold text-foreground">{a?.address_line1}</p>
                      <p className="text-xs text-muted-foreground">{a?.city}</p>
                    </>
                  ); })()}
                </div>
              </div>
            ) : (
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Enter street, area, landmark…"
                  className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
          </div>
        </SectionCard>

        {/* Notes */}
        <SectionCard>
          <SectionTitle icon={StickyNote}>Delivery Notes</SectionTitle>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Gate code, landmark, special instructions…" rows={2}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </SectionCard>

        {/* Totals */}
        <SectionCard className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal ({items.length} item{items.length !== 1 && "s"})</span>
            <span className="font-medium">GH₵{totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className="font-medium">GH₵{deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex items-end justify-between border-t border-border pt-3">
            <span className="font-bold text-foreground">Total</span>
            <span className="text-2xl font-extrabold text-primary">GH₵{finalTotal.toFixed(2)}</span>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            💳 Payment collected by Paystack when rider completes delivery
          </p>
        </SectionCard>
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="container mx-auto max-w-lg">
          <Button
            onClick={handleFindRider}
            disabled={loading || !hasAddress || !customerName.trim() || !customerPhone.trim()}
            className="w-full rounded-2xl bg-primary py-6 text-base font-bold text-white shadow-warm hover:scale-[1.01] active:scale-95 disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Placing order…</>
            ) : (
              <>🏍️ Find a Rider — GH₵{finalTotal.toFixed(2)}</>
            )}
          </Button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Paystack payment requested when rider completes delivery
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
