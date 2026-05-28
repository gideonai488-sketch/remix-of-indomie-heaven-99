import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_DEFS, ServiceType } from "@/types/services";
import {
  ArrowLeft, MapPin, User, Phone, Loader2, StickyNote, Zap, Clock, Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Pricing constants
const BASE_FARE = 5;
const PER_KM_RATE = 2.0;
const PER_MIN_RATE = 0.3;
const MIN_FARE = 10;

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

const ServiceRequestPage = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const serviceType = type as ServiceType;
  const svcDef = SERVICE_DEFS.find((s) => s.type === serviceType);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Errand
  const [errandTask, setErrandTask] = useState("");
  const [errandBudget, setErrandBudget] = useState("");
  // Parcel
  const [parcelDesc, setParcelDesc] = useState("");
  const [parcelWeight, setParcelWeight] = useState("light");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  // Package
  const [packageDesc, setPackageDesc] = useState("");
  const [packageSize, setPackageSize] = useState("small");
  const [isFragile, setIsFragile] = useState(false);
  // Pharmacy
  const [pharmacyName, setPharmacyName] = useState("");
  const [medications, setMedications] = useState("");

  useEffect(() => {
    if (!user) navigate("/auth", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!svcDef) navigate("/services", { replace: true });
  }, [svcDef, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name, phone").eq("user_id", user.id).single().then(({ data }) => {
      if (data) { setCustomerName(data.name || ""); setCustomerPhone(data.phone || ""); }
    });
    supabase.from("delivery_addresses").select("address_line1, city").eq("user_id", user.id).eq("is_default", true).single().then(({ data }) => {
      if (data) setDeliveryAddress(`${data.address_line1}, ${data.city}`);
    });
  }, [user]);

  if (!svcDef || !user) return null;

  const buildDetails = () => {
    if (serviceType === "errand") return { task: errandTask, budget: errandBudget };
    if (serviceType === "parcel") return { description: parcelDesc, weight: parcelWeight, recipient_name: recipientName, recipient_phone: recipientPhone };
    if (serviceType === "package") return { description: packageDesc, size: packageSize, fragile: isFragile, recipient_name: recipientName, recipient_phone: recipientPhone };
    if (serviceType === "pharmacy") return { pharmacy: pharmacyName, medications };
    return {};
  };

  const validate = () => {
    if (!customerName.trim()) { toast.error("Enter your name"); return false; }
    if (!customerPhone.trim()) { toast.error("Enter your phone"); return false; }
    if (!pickupAddress.trim()) { toast.error("Enter pickup / task location"); return false; }
    if (!deliveryAddress.trim()) { toast.error("Enter delivery address"); return false; }
    if (serviceType === "errand" && !errandTask.trim()) { toast.error("Describe the errand"); return false; }
    if (serviceType === "parcel" && !parcelDesc.trim()) { toast.error("Describe what you're sending"); return false; }
    if (serviceType === "package" && !packageDesc.trim()) { toast.error("Describe the package"); return false; }
    if (serviceType === "pharmacy" && !medications.trim()) { toast.error("List the medications"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const notesPayload = JSON.stringify({
        service_type: serviceType,
        pickup_address: pickupAddress,
        delivery_address: deliveryAddress,
        customer_name: customerName,
        customer_phone: customerPhone,
        details: buildDetails(),
        extra_notes: notes || null,
      });

      // total_amount = BASE_FARE as starting value; rider app updates final on delivery
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          address_id: null,
          total_amount: BASE_FARE,
          delivery_fee: 0,
          payment_method: "cash_on_delivery",
          notes: notesPayload,
          status: "pending",
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      await supabase.from("order_items").insert({
        order_id: order.id,
        item_id: `service-${serviceType}`,
        item_name: `${svcDef.label} ${svcDef.icon}`,
        quantity: 1,
        price: BASE_FARE,
      });

      toast.success("Request submitted! Finding you a rider… 🏍️");
      navigate(`/track/${order.id}?type=service`);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit request");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-2xl">{svcDef.icon}</span>
          <h1 className="text-lg font-bold text-foreground">{svcDef.label} Request</h1>
        </div>
      </header>

      <div className="container mx-auto max-w-lg flex-1 space-y-4 px-4 py-5 pb-32">

        {/* Service badge */}
        <div className={`flex items-center gap-3 rounded-2xl p-4 ${svcDef.color}`}>
          <span className="text-4xl">{svcDef.icon}</span>
          <div className="flex-1">
            <p className={`font-bold ${svcDef.accent}`}>{svcDef.label}</p>
            <p className="text-xs text-muted-foreground">{svcDef.tagline}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Pricing</p>
            <p className="text-xs font-bold text-foreground">Dynamic</p>
          </div>
        </div>

        {/* Dynamic pricing card */}
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary fill-primary" />
            <p className="text-sm font-bold text-primary">How pricing works</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white p-3 shadow-card">
              <p className="text-lg font-extrabold text-foreground">GH₵{BASE_FARE}</p>
              <p className="text-[10px] text-muted-foreground">Base fare</p>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-card">
              <div className="flex items-center justify-center gap-1">
                <Route className="h-3 w-3 text-primary" />
                <p className="text-lg font-extrabold text-foreground">GH₵{PER_KM_RATE}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">per km</p>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-card">
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                <p className="text-lg font-extrabold text-foreground">GH₵{PER_MIN_RATE}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">per min</p>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Min. GH₵{MIN_FARE} · Meter runs from pickup to delivery · Pay cash on arrival
          </p>
        </div>

        {/* Your details */}
        <SectionCard>
          <SectionTitle icon={User}>Your Details</SectionTitle>
          <div className="space-y-3">
            <Field label="Full Name" value={customerName} onChange={setCustomerName} placeholder="Kwame Asante" icon={User} />
            <Field label="Phone Number" value={customerPhone} onChange={setCustomerPhone} placeholder="024 XXX XXXX" type="tel" icon={Phone} />
          </div>
        </SectionCard>

        {/* Addresses */}
        <SectionCard>
          <SectionTitle icon={MapPin}>Locations</SectionTitle>
          <div className="space-y-3">
            <Field
              label={serviceType === "errand" ? "Task location (where to go)" : serviceType === "pharmacy" ? "Pharmacy / pickup location" : "Pickup Address"}
              value={pickupAddress} onChange={setPickupAddress}
              placeholder="e.g. Accra Mall, East Legon" icon={MapPin}
            />
            <div className="flex justify-center">
              <div className="h-6 w-px border-l-2 border-dashed border-border" />
            </div>
            <Field
              label={serviceType === "errand" ? "Deliver to (your location)" : "Delivery Address"}
              value={deliveryAddress} onChange={setDeliveryAddress}
              placeholder="e.g. 12 Oxford St, Osu" icon={MapPin}
            />
          </div>
        </SectionCard>

        {/* Service-specific */}
        {serviceType === "errand" && (
          <SectionCard>
            <SectionTitle icon={StickyNote}>Errand Details</SectionTitle>
            <div className="space-y-3">
              <Field label="What do you need done?" value={errandTask} onChange={setErrandTask}
                placeholder="e.g. Buy 2kg tomatoes, 1 onion and 500ml oil from the market…" rows={3} />
              <Field label="Budget (GH₵) — how much to spend on items" value={errandBudget} onChange={setErrandBudget} placeholder="e.g. 50" type="number" />
            </div>
          </SectionCard>
        )}

        {serviceType === "parcel" && (
          <SectionCard>
            <SectionTitle icon={StickyNote}>Parcel Details</SectionTitle>
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
        )}

        {serviceType === "package" && (
          <SectionCard>
            <SectionTitle icon={StickyNote}>Package Details</SectionTitle>
            <div className="space-y-3">
              <Field label="What's in the package?" value={packageDesc} onChange={setPackageDesc}
                placeholder="e.g. Laptop in box, bedside table…" rows={2} />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Size</label>
                <div className="flex gap-2">
                  {["small", "medium", "large"].map((s) => (
                    <button key={s} onClick={() => setPackageSize(s)}
                      className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all ${packageSize === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      {s === "small" ? "Small" : s === "medium" ? "Medium" : "Large"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <input type="checkbox" id="fragile" checked={isFragile} onChange={(e) => setIsFragile(e.target.checked)} className="h-4 w-4 accent-primary cursor-pointer" />
                <label htmlFor="fragile" className="text-sm font-medium cursor-pointer">⚠️ Fragile — handle with care</label>
              </div>
              <Field label="Recipient Name" value={recipientName} onChange={setRecipientName} placeholder="Who receives it?" icon={User} />
              <Field label="Recipient Phone" value={recipientPhone} onChange={setRecipientPhone} placeholder="024 XXX XXXX" type="tel" icon={Phone} />
            </div>
          </SectionCard>
        )}

        {serviceType === "pharmacy" && (
          <SectionCard>
            <SectionTitle icon={StickyNote}>Pharmacy Details</SectionTitle>
            <div className="space-y-3">
              <Field label="Pharmacy name (optional — leave blank for nearest)" value={pharmacyName} onChange={setPharmacyName} placeholder="e.g. Ernest Chemist, Osu" icon={MapPin} />
              <Field label="Medications / Items needed" value={medications} onChange={setMedications}
                placeholder="e.g. Paracetamol 500mg x2, Amoxicillin 250mg x1…" rows={4} />
            </div>
          </SectionCard>
        )}

        {/* Notes */}
        <SectionCard>
          <SectionTitle icon={StickyNote}>Additional Notes</SectionTitle>
          <Field label="" value={notes} onChange={setNotes} placeholder="Any extra instructions for the rider…" rows={2} />
        </SectionCard>

      </div>

      {/* CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="container mx-auto max-w-lg">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-6 text-base font-bold text-white shadow-warm hover:scale-[1.01] active:scale-95 disabled:opacity-60"
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <span className="mr-2">{svcDef.icon}</span>}
            {loading ? "Submitting…" : `Find a Rider`}
          </Button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Price runs from pickup — pay cash on delivery
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceRequestPage;
