import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Tag, Loader2, Phone, Banknote,
  Smartphone, User, ShoppingBag, StickyNote, ChevronRight, Plus,
} from "lucide-react";

type PaymentMethod = "momo" | "cash_on_delivery";

const momoProviders = [
  { id: "mtn", label: "MTN MoMo", color: "bg-yellow-500" },
  { id: "vodafone", label: "Vodafone Cash", color: "bg-red-500" },
  { id: "airteltigo", label: "AirtelTigo Money", color: "bg-blue-500" },
];

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}>{children}</div>
);

const SectionTitle = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
    <Icon className="h-4 w-4 text-primary" />
    {children}
  </h3>
);

const CheckoutPage = () => {
  const { user } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [promoValid, setPromoValid] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("momo");
  const [momoProvider, setMomoProvider] = useState("mtn");
  const [momoPhone, setMomoPhone] = useState("");

  const deliveryFee = 10;
  const discountAmount = totalPrice * (discount / 100);
  const finalTotal = totalPrice + deliveryFee - discountAmount;

  // Redirect if not authed
  useEffect(() => {
    if (!user) navigate("/auth", { replace: true });
  }, [user, navigate]);

  // Redirect if cart empty
  useEffect(() => {
    if (user && items.length === 0) navigate("/", { replace: true });
  }, [user, items.length, navigate]);

  // Load user data
  useEffect(() => {
    if (!user || dataLoaded) return;
    const load = async () => {
      const [addrRes, profileRes] = await Promise.all([
        supabase.from("delivery_addresses").select("*").eq("user_id", user.id),
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

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    const { data } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", promoCode.toUpperCase())
      .single();
    if (data) {
      setDiscount(data.discount_percent);
      setPromoValid(true);
      toast.success(`${data.discount_percent}% discount applied!`);
    } else {
      setPromoValid(false);
      setDiscount(0);
      toast.error("Invalid promo code");
    }
  };

  const placeOrder = async () => {
    if (!customerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    if (paymentMethod === "momo" && !momoPhone.trim()) {
      toast.error("Enter your MoMo phone number");
      return;
    }
    if (!selectedAddr) {
      toast.error("Select a delivery address");
      return;
    }

    setLoading(true);
    try {
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          address_id: selectedAddr,
          total_amount: finalTotal,
          delivery_fee: deliveryFee,
          promo_code: promoValid ? promoCode.toUpperCase() : null,
          discount_amount: discountAmount,
          notes,
          payment_method: paymentMethod,
          momo_phone: paymentMethod === "momo" ? momoPhone : null,
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

      clearCart();
      toast.success(
        paymentMethod === "momo"
          ? "Order placed! 🎉 You'll receive a MoMo prompt shortly."
          : "Order placed! 🎉 Pay on delivery."
      );
      navigate("/profile");
    } catch (e: any) {
      toast.error(e.message || "Failed to place order");
    }
    setLoading(false);
  };

  const activePhone = paymentMethod === "momo" ? momoPhone : customerPhone;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Checkout</h1>
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {items.length} item{items.length !== 1 && "s"}
          </span>
        </div>
      </header>

      <div className="container mx-auto max-w-lg flex-1 space-y-4 px-4 py-5 pb-32">

        {/* 1 — Order summary */}
        <SectionCard>
          <SectionTitle icon={ShoppingBag}>Order Summary</SectionTitle>
          <div className="divide-y divide-border">
            {items.map((ci) => (
              <div key={ci.item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <img
                  src={ci.item.image}
                  alt={ci.item.name}
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

        {/* 2 — Customer details */}
        <SectionCard>
          <SectionTitle icon={User}>Your Details</SectionTitle>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Kwame Asante"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="024 XXX XXXX"
                  type="tel"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 3 — Delivery address */}
        <SectionCard>
          <SectionTitle icon={MapPin}>Delivery Address</SectionTitle>
          {!dataLoaded ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading addresses…
            </div>
          ) : addresses.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="mb-3 text-sm text-muted-foreground">No saved addresses yet</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Address
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAddr(a.id)}
                  className={`group flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                    selectedAddr === a.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    selectedAddr === a.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{a.label || "Address"}</span>
                    <p className="truncate text-xs text-muted-foreground">{a.address_line1}, {a.city}</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 transition-colors ${
                    selectedAddr === a.id ? "text-primary" : "text-muted-foreground/40"
                  }`} />
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        {/* 4 — Payment method */}
        <SectionCard>
          <SectionTitle icon={Banknote}>Payment Method</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod("momo")}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                paymentMethod === "momo"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Smartphone className={`h-7 w-7 ${paymentMethod === "momo" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-semibold ${paymentMethod === "momo" ? "text-primary" : "text-foreground"}`}>
                Mobile Money
              </span>
              <span className="text-[10px] text-muted-foreground">MTN, Vodafone, AT</span>
            </button>

            <button
              onClick={() => setPaymentMethod("cash_on_delivery")}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                paymentMethod === "cash_on_delivery"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Banknote className={`h-7 w-7 ${paymentMethod === "cash_on_delivery" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-semibold ${paymentMethod === "cash_on_delivery" ? "text-primary" : "text-foreground"}`}>
                Cash on Delivery
              </span>
              <span className="text-[10px] text-muted-foreground">Pay when it arrives</span>
            </button>
          </div>

          {/* MoMo details */}
          {paymentMethod === "momo" && (
            <div className="mt-4 space-y-3 rounded-xl bg-muted/50 p-4">
              <div className="flex gap-2">
                {momoProviders.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setMomoProvider(p.id)}
                    className={`flex-1 rounded-lg border-2 px-2 py-2.5 text-center text-xs font-semibold transition-all ${
                      momoProvider === p.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">MoMo Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    placeholder="024 XXX XXXX"
                    type="tel"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                You'll receive a prompt on this number to approve payment
              </p>
            </div>
          )}
        </SectionCard>

        {/* 5 — Promo code */}
        <SectionCard>
          <SectionTitle icon={Tag}>Promo Code</SectionTitle>
          <div className="flex gap-2">
            <input
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value); setPromoValid(null); }}
              placeholder="Enter code (e.g. GHANA10)"
              className={`flex-1 rounded-xl border px-3.5 py-2.5 text-sm text-foreground uppercase placeholder:text-muted-foreground placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-ring ${
                promoValid === true ? "border-[hsl(var(--success))]" : promoValid === false ? "border-destructive" : "border-border"
              } bg-background`}
            />
            <Button variant="outline" onClick={applyPromo} className="rounded-xl">
              Apply
            </Button>
          </div>
        </SectionCard>

        {/* 6 — Notes */}
        <SectionCard>
          <SectionTitle icon={StickyNote}>Order Notes</SectionTitle>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests? Extra shito, no egg…"
            rows={2}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </SectionCard>

        {/* 7 — Totals */}
        <SectionCard className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">GH₵{totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery</span>
            <span className="text-foreground">GH₵{deliveryFee.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--success))]">Discount ({discount}%)</span>
              <span className="text-[hsl(var(--success))]">−GH₵{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment</span>
            <span className="text-foreground font-medium">
              {paymentMethod === "momo"
                ? `📱 ${momoProviders.find((p) => p.id === momoProvider)?.label}`
                : "💵 Cash on Delivery"}
            </span>
          </div>
          <div className="flex items-end justify-between border-t border-border pt-3">
            <span className="font-bold text-foreground">Total</span>
            <span className="text-2xl font-extrabold text-primary">GH₵{finalTotal.toFixed(2)}</span>
          </div>
        </SectionCard>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="container mx-auto max-w-lg">
          <Button
            onClick={placeOrder}
            disabled={loading || !selectedAddr || !customerName.trim() || !customerPhone.trim() || (paymentMethod === "momo" && !momoPhone.trim())}
            className="w-full rounded-2xl bg-gradient-warm py-6 text-base font-bold text-primary-foreground shadow-warm transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-60"
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {loading
              ? "Placing Order…"
              : paymentMethod === "momo"
                ? `Pay GH₵${finalTotal.toFixed(2)} via MoMo`
                : `Order — Pay GH₵${finalTotal.toFixed(2)} on Delivery`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
