import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LocationPicker } from "@/components/LocationPicker";
import { usePriceCalculator } from "@/hooks/usePriceCalculator";
import {
  ArrowLeft, MapPin, User, Phone, Loader2, StickyNote, Zap, Clock, Route, Package,
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

const ParcelOrderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [parcelDesc, setParcelDesc] = useState("");
  const [parcelWeight, setParcelWeight] = useState("light");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
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
    if (!pickupLocation) { toast.error("Select pickup location"); return false; }
    if (!dropoffLocation) { toast.error("Select dropoff location"); return false; }
    if (!parcelDesc.trim()) { toast.error("Describe what you're sending"); return false; }
    if (!recipientName.trim()) { toast.error("Enter recipient name"); return false; }
    if (!recipientPhone.trim()) { toast.error("Enter recipient phone"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !user || !pickupLocation || !dropoffLocation) return;
    setLoading(true);
    try {
      const totalFee = estimate?.fee || 10;

      // Create parcel order
      const { data: parcelOrder, error: parcelErr } = await supabase
        .from("parcel_orders")
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
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          description: parcelDesc,
          weight: parcelWeight,
          delivery_fee: totalFee,
          total_amount: totalFee,
          payment_method: "cash",
          status: "searching_rider",
        })
        .select()
        .single();

      if (parcelErr) throw parcelErr;

      // Dispatch rider
      await supabase.functions.invoke("dispatch-rider", {
        body: { parcel_order_id: parcelOrder.id },
      }).catch(() => {});

      toast.success("Parcel order created! Finding you a rider… 🏍️");
      navigate(`/track/${parcelOrder.id}?type=parcel`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create parcel order");
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
          <Package className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Send a Parcel</h1>
        </div>
      </header>

      <div className="container mx-auto max-w-lg flex-1 space-y-4 px-4 py-5 pb-32">

        {/* Service badge */}
        <div className="flex items-center gap-3 rounded-2xl bg-blue-50 p-4">
          <span className="text-4xl">📦</span>
          <div className="flex-1">
            <p className="font-bold text-blue-900">Send a Parcel</p>
            <p className="text-xs text-blue-700">Fast and secure delivery</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-blue-700">Pricing</p>
            <p className="text-xs font-bold text-blue-900">Dynamic</p>
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
              label="Pickup Location"
              value={pickupLocation}
              onChange={setPickupLocation}
              placeholder="Where to pick up from?"
            />
            <div className="flex justify-center">
              <div className="h-6 w-px border-l-2 border-dashed border-border" />
            </div>
            <LocationPicker
              label="Dropoff Location"
              value={dropoffLocation}
              onChange={setDropoffLocation}
              placeholder="Where to deliver to?"
            />
          </div>
        </SectionCard>

        {/* Parcel details */}
        <SectionCard>
          <SectionTitle icon={Package}>Parcel Details</SectionTitle>
          <div className="space-y-3">
            <Field label="What are you sending?" value={parcelDesc} onChange={setParcelDesc}
              placeholder="e.g. Documents in envelope, small gift…" rows={2} />
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Weight estimate</label>
              <div className="flex gap-2">
                {["light", "medium", "heavy"].map((w) => (
                  <button key={w} onClick={() => setParcelWeight(w)}
                    className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all ${parcelWeight === w ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                    {w === "light" ? "<1kg" : w === "medium" ? "1–5kg" : "5kg+"}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Recipient Name" value={recipientName} onChange={setRecipientName} placeholder="Who receives it?" icon={User} />
            <Field label="Recipient Phone" value={recipientPhone} onChange={setRecipientPhone} placeholder="024 XXX XXXX" type="tel" icon={Phone} />
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
              <>🏍️ Send Parcel — GH₵{(estimate?.fee || 10).toFixed(2)}</>
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

export default ParcelOrderPage;
