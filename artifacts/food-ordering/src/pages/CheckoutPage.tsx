import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Loader2, Phone, User,
  ShoppingBag, StickyNote, ChevronRight, Plus, CreditCard, Banknote, CheckCircle2, X,
} from "lucide-react";

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border bg-card p-5 shadow-card ${className}`}>{children}</div>
);
const SectionTitle = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
    <Icon className="h-4 w-4 text-primary" />
    {children}
  </h3>
);

type PaymentMethod = "paystack" | "cash_on_delivery";

// Paystack inline checkout modal
const PaystackModal = ({
  authorizationUrl,
  onClose,
}: {
  authorizationUrl: string;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-[100] flex flex-col bg-white">
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <p className="font-bold text-foreground">Complete Payment</p>
      <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
        <X className="h-5 w-5" />
      </button>
    </div>
    <iframe
      src={authorizationUrl}
      className="flex-1 w-full border-0"
      title="Paystack Payment"
    />
    <p className="py-2 text-center text-[10px] text-muted-foreground">
      Secured by Paystack · Do not close until payment completes
    </p>
  </div>
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paystack");
  const [paystackUrl, setPaystackUrl] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const deliveryFee = 10;
  const finalTotal = totalPrice + deliveryFee;

  useEffect(() => {
    if (!user) navigate("/auth", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (user && items.length === 0) navigate("/", { replace: true });
  }, [user, items.length, navigate]);

  useEffect(() => {
    if (!user || dataLoaded) return;
    const load = async () => {
      const [addrRes, profileRes] = await Promise.all([
        supabase.from("delivery_addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
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

  // Watch for Paystack payment confirmation via realtime
  useEffect(() => {
    if (!pendingOrderId) return;
    const ch = supabase.channel(`payment-watch-${pendingOrderId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "orders",
        filter: `id=eq.${pendingOrderId}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.payment_status === "paid") {
          clearCart();
          toast.success("Payment confirmed! Finding your rider… 🏍️");
          setPaystackUrl(null);
          navigate(`/track/${pendingOrderId}?type=food`);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pendingOrderId]);

  if (!user || items.length === 0) return null;

  const hasAddress = selectedAddr || manualAddress.trim().length > 0;

  const handleFindRider = async () => {
    if (!customerName.trim()) { toast.error("Enter your name"); return; }
    if (!customerPhone.trim()) { toast.error("Enter your phone number"); return; }
    if (!hasAddress) { toast.error("Add a delivery address"); return; }

    setLoading(true);
    try {
      const deliveryAddress = selectedAddr
        ? addresses.find(a => a.id === selectedAddr)?.address_line1 || "Saved address"
        : manualAddress.trim();

      if (paymentMethod === "cash_on_delivery") {
        // Direct DB insert for cash orders
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            address_id: selectedAddr || null,
            total_amount: finalTotal,
            delivery_fee: deliveryFee,
            payment_method: "cash_on_delivery",
            notes: JSON.stringify({
              delivery_note: notes.trim() || undefined,
              manual_address: !selectedAddr ? manualAddress.trim() : undefined,
              customer_name: customerName,
              customer_phone: customerPhone,
            }),
            status: "pending",
          })
          .select()
          .single();

        if (orderErr) throw orderErr;

        const orderItems = items.map((ci) => ({
          order_id: order.id,
          item_id: ci.item.id,
          item_name: ci.item.name,
          quantity: ci.quantity,
          price: ci.item.price,
        }));
        const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
        if (itemsErr) throw itemsErr;

        // Trigger rider dispatch (finds nearest verified riders within 15km)
        await supabase.functions.invoke("dispatch-rider", {
          body: { order_id: order.id },
        });

        clearCart();
        toast.success("Order placed! Finding you a rider… 🏍️");
        navigate(`/track/${order.id}?type=food`);
      } else {
        // Paystack flow: call create-order edge function
        const { data, error } = await supabase.functions.invoke("create-order", {
          body: {
            items: items.map(ci => ({
              id: ci.item.id,
              name: ci.item.name,
              quantity: ci.quantity,
              price: ci.item.price,
            })),
            delivery_address: deliveryAddress,
            delivery_note: notes.trim() || undefined,
            address_id: selectedAddr || undefined,
            customer_name: customerName,
            customer_phone: customerPhone,
          },
        });

        if (error) throw new Error(error.message);
        if (!data?.order_id) throw new Error("Order creation failed");

        const orderId = data.order_id;
        setPendingOrderId(orderId);

        // Initialize Paystack payment
        const { data: payData, error: payErr } = await supabase.functions.invoke("initialize-payment", {
          body: {
            order_id: orderId,
            order_type: "food",
            callback_url: `${window.location.origin}/track/${orderId}?type=food`,
          },
        });

        if (payErr || !payData?.authorization_url) {
          throw new Error(payErr?.message || "Failed to initialize payment");
        }

        setPaystackUrl(payData.authorization_url);
        toast.success("Redirecting to payment…");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to place order");
      setPendingOrderId(null);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {paystackUrl && (
        <PaystackModal
          authorizationUrl={paystackUrl}
          onClose={() => { setPaystackUrl(null); setPendingOrderId(null); }}
        />
      )}

      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Your Order</h1>
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {items.length} item{items.length !== 1 && "s"}
          </span>
        </div>
      </header>

      <div className="container mx-auto max-w-lg flex-1 space-y-4 px-4 py-5 pb-36">

        {/* Order summary */}
        <SectionCard>
          <SectionTitle icon={ShoppingBag}>Order Summary</SectionTitle>
          <div className="divide-y divide-border">
            {items.map((ci) => (
              <div key={ci.item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <img src={ci.item.image} alt={ci.item.name}
                  className="h-12 w-12 rounded-xl object-cover ring-1 ring-border"
                />
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
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 XXX XXX XXXX" type="tel"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Delivery address */}
        <SectionCard>
          <SectionTitle icon={MapPin}>Delivery Address</SectionTitle>
          {!dataLoaded ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((a) => (
                <button key={a.id}
                  onClick={() => { setSelectedAddr(a.id); setManualAddress(""); }}
                  className={`group flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                    selectedAddr === a.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${selectedAddr === a.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{a.label || "Address"}</span>
                    <p className="truncate text-xs text-muted-foreground">{a.address_line1}, {a.city}</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${selectedAddr === a.id ? "text-primary" : "text-muted-foreground/40"}`} />
                </button>
              ))}
              <div className={addresses.length > 0 ? "pt-1" : ""}>
                {addresses.length > 0 && (
                  <p className="mb-2 text-center text-xs text-muted-foreground">— or type a new address —</p>
                )}
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={manualAddress}
                    onChange={(e) => { setManualAddress(e.target.value); if (e.target.value) setSelectedAddr(null); }}
                    placeholder="Type delivery address…"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              {addresses.length === 0 && (
                <button onClick={() => navigate("/profile")}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border p-3 text-xs font-semibold text-primary hover:border-primary/50 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Save address to profile
                </button>
              )}
            </div>
          )}
        </SectionCard>

        {/* Payment method */}
        <SectionCard>
          <SectionTitle icon={CreditCard}>Payment Method</SectionTitle>
          <div className="space-y-2">
            {([
              { id: "paystack", label: "Card / Mobile Money", sub: "Visa, Mastercard, MTN MoMo, Vodafone Cash…", icon: <CreditCard className="h-5 w-5" /> },
              { id: "cash_on_delivery", label: "Cash on Delivery", sub: "Pay cash when your order arrives", icon: <Banknote className="h-5 w-5" /> },
            ] as const).map((m) => (
              <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                  paymentMethod === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  paymentMethod === m.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {paymentMethod === m.id ? <CheckCircle2 className="h-5 w-5" /> : m.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Notes */}
        <SectionCard>
          <SectionTitle icon={StickyNote}>Delivery Notes</SectionTitle>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Gate code, landmark, special instructions…" rows={2}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </SectionCard>

        {/* Totals */}
        <SectionCard className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground">GH₵{totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className="font-medium text-foreground">GH₵{deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment</span>
            <span className="font-medium text-foreground">
              {paymentMethod === "paystack" ? "💳 Card / MoMo" : "💵 Cash on Delivery"}
            </span>
          </div>
          <div className="flex items-end justify-between border-t border-border pt-3">
            <span className="font-bold text-foreground">Total</span>
            <span className="text-2xl font-extrabold text-primary">GH₵{finalTotal.toFixed(2)}</span>
          </div>
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
            ) : paymentMethod === "paystack" ? (
              <>💳 Pay GH₵{finalTotal.toFixed(2)}</>
            ) : (
              <>🏍️ Find a Rider — GH₵{finalTotal.toFixed(2)}</>
            )}
          </Button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            {paymentMethod === "paystack"
              ? "You'll be redirected to Paystack to complete payment"
              : "Pay cash when your order arrives"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
