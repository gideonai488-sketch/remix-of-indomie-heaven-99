import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LocationPicker } from "@/components/LocationPicker";
import { usePriceCalculator } from "@/hooks/usePriceCalculator";
import {
  ArrowLeft, MapPin, User, Phone, Loader2, StickyNote, Zap, Route, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Location {
  name: string;
  lat: number;
  lng: number;
}

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border bg-card p-5 shadow-card ${className}`}>{children}</div>
);

const SectionTitle = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
    <Icon className="h-4 w-4 text-primary" />
    {children}
  </h3>
);

const Field = ({
  label, value, onChange, placeholder, type = "text", icon: Icon, rows,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ElementType; rows?: number;
}) => (
  <div>
    {label ? <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label> : null}
    <div className="relative">
      {Icon && !rows && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
      {rows ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          className={`w-full rounded-xl border border-border bg-background py-2.5 ${Icon ? "pl-10" : "pl-4"} pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring`}
        />
      )}
    </div>
  </div>
);

const ErrandOrderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [errandTask, setErrandTask] = useState("");
  const [errandBudget, setErrandBudget] = useState("");
  const [category, setCategory] = useState("errand");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { estimate, loading: calcLoading, calculateFare } = usePriceCalculator();

  useEffect(() => {
    if (!user) navigate("/auth", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name, phone").eq("user_id", user.id).single().then(({ data }) => {
      if (data) { setCustomerName(data.name || ""); setCustomerPhone(data.phone || ""); }
    });
  }, [user]);

  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      calculateFare(pickupLocation, dropoffLocation);
    }
  }, [pickupLocation, dropoffLocation, calculateFare]);

  const validate = () => {
    if (!customerName.trim()) { toast.error("Enter your name"); return false; }
    if (!customerPhone.trim()) { toast.error("Enter your phone"); return false; }
    if (!pickupLocation) { toast.error("Select task location"); return false; }
    if (!dropoffLocation) { toast.error("Select delivery location"); return false; }
    if (!errandTask.trim()) { toast.error("Describe the errand"); return false; }
    if (!errandBudget.trim()) { toast.error("Enter budget"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !user || !pickupLocation || !dropoffLocation) return;
    setLoading(true);
    try {
      const totalFee = estimate?.fee || 10;

      // Create errand order
      const { data: errandOrder, error: errandErr } = await supabase
        .from("errand_orders")
        .insert({
          user_id: user.id,
          customer_id: user.id,
          pickup_latitude: pickupLocation!.lat,
          pickup_longitude: pickupLocation!.lng,
          dropoff_latitude: dropoffLocation!.lat,
          dropoff_longitude: dropoffLocation!.lng,
          pickup_address: pickupLocation.name,
          delivery_address: dropoffLocation.name,
          customer_name: customerName,
          customer_phone: customerPhone,
          task_description: errandTask,
          budget: parseFloat(errandBudget),
          category: category as "pharmacy" | "shop" | "errand",
          delivery_fee: totalFee,
          total_amount: totalFee,
          payment_method: "cash",
          status: "searching_rider",
        })
        .select()
        .single();

      if (errandErr) throw errandErr;

      // Dispatch rider
      await supabase.functions.invoke("dispatch-rider", {
        body: { errand_order_id: errandOrder.id },
      }).catch(() => {});

      toast.success("Errand request created! Finding you a rider… 🏍️");
      navigate(`/track/${errandOrder.id}?type=errand`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create errand order");
    }
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Briefcase className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Run an Errand</h1>
        </div>
      </header>

      <div className="container mx-auto max-w-lg flex-1 space-y-4 px-4 py-5 pb-32">

        {/* Service badge */}
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4">
          <span className="text-4xl">🛍️</span>
          <div className="flex-1">
            <p className="font-bold text-amber-900">Run an Errand</p>
            <p className="text-xs text-amber-700">Shop, pharmacy, or custom task</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-amber-700">Pricing</p>
            <p className="text-xs font-bold text-amber-900">Dynamic</p>
          </div>
        </div>

        {/* Price estimate */}
        {estimate && (
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary fill-primary" />
              <p className="text-sm font-bold text-primary">Fare Estimate</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white p-3 shadow-card">
                <div className="flex items-center justify-center gap-1">
                  <Route className="h-3 w-3 text-primary" />
                  <p className="text-lg font-extrabold text-foreground">{estimate.distance_km.toFixed(1)}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">km</p>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-card">
                <p className="text-lg font-extrabold text-foreground">GH₵{estimate.fee.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">delivery</p>
              </div>
              <div className="rounded-xl bg-primary p-3 shadow-warm">
                <p className="text-lg font-extrabold text-white">GH₵{estimate.fee.toFixed(2)}</p>
                <p className="text-[10px] text-white/70">total</p>
              </div>
            </div>
          </div>
        )}

        {/* Your details */}
        <SectionCard>
          <SectionTitle icon={User}>Your Details</SectionTitle>
          <div className="space-y-3">
            <Field label="Full Name" value={customerName} onChange={setCustomerName} placeholder="Kwame Asante" icon={User} />
            <Field label="Phone Number" value={customerPhone} onChange={setCustomerPhone} placeholder="024 XXX XXXX" type="tel" icon={Phone} />
          </div>
        </SectionCard>

        {/* Locations */}
        <SectionCard>
          <SectionTitle icon={MapPin}>Locations</SectionTitle>
          <div className="space-y-3">
            <LocationPicker
              label="Task Location (where to go)"
              value={pickupLocation}
              onChange={setPickupLocation}
              placeholder="e.g. Accra Mall, East Legon"
            />
            <div className="flex justify-center">
              <div className="h-6 w-px border-l-2 border-dashed border-border" />
            </div>
            <LocationPicker
              label="Delivery Location (your location)"
              value={dropoffLocation}
              onChange={setDropoffLocation}
              placeholder="e.g. 12 Oxford St, Osu"
            />
          </div>
        </SectionCard>

        {/* Errand details */}
        <SectionCard>
          <SectionTitle icon={Briefcase}>Errand Details</SectionTitle>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Type of errand</label>
              <div className="flex gap-2">
                {["pharmacy", "shop", "errand"].map((c) => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all ${category === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                    {c === "pharmacy" ? "💊 Pharmacy" : c === "shop" ? "🛒 Shop" : "📋 Custom"}
                  </button>
                ))}
              </div>
            </div>
            <Field label="What do you need done?" value={errandTask} onChange={setErrandTask}
              placeholder="e.g. Buy 2kg tomatoes, 1 onion and 500ml oil from the market…" rows={3} />
            <Field label="Budget (GH₵) — how much to spend on items" value={errandBudget} onChange={setErrandBudget} placeholder="e.g. 50" type="number" />
          </div>
        </SectionCard>

        {/* Notes */}
        <SectionCard>
          <SectionTitle icon={StickyNote}>Delivery Notes</SectionTitle>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Gate code, landmark, special instructions…" rows={2}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </SectionCard>
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="container mx-auto max-w-lg">
          <Button
            onClick={handleSubmit}
            disabled={loading || !pickupLocation || !dropoffLocation || !customerName.trim() || !customerPhone.trim()}
            className="w-full rounded-2xl bg-primary py-6 text-base font-bold text-white shadow-warm"
          >
            {loading || calcLoading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating order…</>
            ) : (
              <>🏍️ Run Errand — GH₵{(estimate?.fee || 10).toFixed(2)}</>
            )}
          </Button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Pay cash to rider on delivery
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrandOrderPage;
