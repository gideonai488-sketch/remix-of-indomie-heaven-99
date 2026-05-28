import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_DEFS, ServiceType } from "@/types/services";
import {
  ArrowLeft, MapPin, User, Phone, Banknote, Smartphone,
  Loader2, StickyNote, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const momoProviders = [
  { id: "mtn", label: "MTN MoMo" },
  { id: "vodafone", label: "Vodafone Cash" },
  { id: "airteltigo", label: "AirtelTigo" },
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

const Input = ({
  label, value, onChange, placeholder, type = "text", icon: Icon,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ElementType;
}) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className={`w-full rounded-xl border border-border bg-background py-2.5 ${Icon ? "pl-10" : "pl-4"} pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring`}
      />
    </div>
  </div>
);

const ServiceRequestPage = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const serviceType = type as ServiceType;
  const svcDef = SERVICE_DEFS.find((s) => s.type === serviceType);

  // Common
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "cash">("cash");
  const [momoProvider, setMomoProvider] = useState("mtn");
  const [momoPhone, setMomoPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Errand-specific
  const [errandTask, setErrandTask] = useState("");
  const [errandBudget, setErrandBudget] = useState("");

  // Parcel-specific
  const [parcelDesc, setParcelDesc] = useState("");
  const [parcelWeight, setParcelWeight] = useState("light");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // Package-specific
  const [packageDesc, setPackageDesc] = useState("");
  const [packageSize, setPackageSize] = useState("small");
  const [isFragile, setIsFragile] = useState(false);

  // Pharmacy-specific
  const [pharmacyName, setPharmacyName] = useState("");
  const [medications, setMedications] = useState("");

  useEffect(() => {
    if (!user) navigate("/auth", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!svcDef) navigate("/services", { replace: true });
  }, [svcDef, navigate]);

  // Pre-fill from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name, phone").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setCustomerName(data.name || "");
        setCustomerPhone(data.phone || "");
      }
    });
    supabase.from("delivery_addresses").select("*").eq("user_id", user.id).eq("is_default", true).single().then(({ data }) => {
      if (data) setDeliveryAddress(`${data.address_line1}, ${data.city}`);
    });
  }, [user]);

  if (!svcDef || !user) return null;

  const serviceFee = 20;

  const buildDetails = () => {
    if (serviceType === "errand") return { task: errandTask, budget: errandBudget };
    if (serviceType === "parcel") return { description: parcelDesc, weight: parcelWeight, recipient_name: recipientName, recipient_phone: recipientPhone };
    if (serviceType === "package") return { description: packageDesc, size: packageSize, fragile: isFragile, recipient_name: recipientName, recipient_phone: recipientPhone };
    if (serviceType === "pharmacy") return { pharmacy: pharmacyName, medications };
    return {};
  };

  const validateForm = () => {
    if (!customerName.trim()) { toast.error("Enter your name"); return false; }
    if (!customerPhone.trim()) { toast.error("Enter your phone number"); return false; }
    if (!pickupAddress.trim()) { toast.error("Enter pickup address"); return false; }
    if (!deliveryAddress.trim()) { toast.error("Enter delivery address"); return false; }
    if (serviceType === "errand" && !errandTask.trim()) { toast.error("Describe the errand task"); return false; }
    if (serviceType === "parcel" && !parcelDesc.trim()) { toast.error("Describe what you're sending"); return false; }
    if (serviceType === "package" && !packageDesc.trim()) { toast.error("Describe the package"); return false; }
    if (serviceType === "pharmacy" && !medications.trim()) { toast.error("List the medications needed"); return false; }
    if (paymentMethod === "momo" && !momoPhone.trim()) { toast.error("Enter your MoMo number"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_requests" as any)
        .insert({
          user_id: user.id,
          service_type: serviceType,
          status: "searching",
          pickup_address: pickupAddress,
          delivery_address: deliveryAddress,
          customer_name: customerName,
          customer_phone: customerPhone,
          payment_method: paymentMethod,
          momo_phone: paymentMethod === "momo" ? momoPhone : null,
          service_fee: serviceFee,
          details: buildDetails(),
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Request sent! Finding you a rider…");
      navigate(`/track/${(data as any).id}?type=service`);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit request");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
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
          <div>
            <p className={`font-bold ${svcDef.accent}`}>{svcDef.label}</p>
            <p className="text-xs text-muted-foreground">{svcDef.tagline}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Service fee</p>
            <p className="font-bold text-foreground">GH₵{serviceFee}</p>
          </div>
        </div>

        {/* Your details */}
        <SectionCard>
          <SectionTitle icon={User}>Your Details</SectionTitle>
          <div className="space-y-3">
            <Input label="Full Name" value={customerName} onChange={setCustomerName} placeholder="Kwame Asante" icon={User} />
            <Input label="Phone Number" value={customerPhone} onChange={setCustomerPhone} placeholder="024 XXX XXXX" type="tel" icon={Phone} />
          </div>
        </SectionCard>

        {/* Addresses */}
        <SectionCard>
          <SectionTitle icon={MapPin}>Locations</SectionTitle>
          <div className="space-y-3">
            <Input
              label={serviceType === "errand" ? "Where to go (task location)" : serviceType === "pharmacy" ? "Pharmacy location (or 'any nearby')" : "Pickup Address"}
              value={pickupAddress} onChange={setPickupAddress}
              placeholder="e.g. Accra Mall, East Legon"
              icon={MapPin}
            />
            <Input
              label={serviceType === "errand" ? "Deliver to (your location)" : "Delivery Address"}
              value={deliveryAddress} onChange={setDeliveryAddress}
              placeholder="e.g. 12 Oxford St, Osu"
              icon={MapPin}
            />
          </div>
        </SectionCard>

        {/* Service-specific fields */}
        {serviceType === "errand" && (
          <SectionCard>
            <SectionTitle icon={StickyNote}>Errand Details</SectionTitle>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">What do you need done?</label>
                <textarea
                  value={errandTask} onChange={(e) => setErrandTask(e.target.value)}
                  placeholder="e.g. Buy 2kg tomatoes, 1 onion and 500ml vegetable oil from the market..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <Input label="Budget (GH₵) — how much to spend" value={errandBudget} onChange={setErrandBudget} placeholder="e.g. 50" type="number" />
            </div>
          </SectionCard>
        )}

        {serviceType === "parcel" && (
          <SectionCard>
            <SectionTitle icon={StickyNote}>Parcel Details</SectionTitle>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">What are you sending?</label>
                <textarea
                  value={parcelDesc} onChange={(e) => setParcelDesc(e.target.value)}
                  placeholder="e.g. Documents in an envelope, small gift box..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Weight estimate</label>
                <div className="flex gap-2">
                  {["light", "medium", "heavy"].map((w) => (
                    <button key={w} onClick={() => setParcelWeight(w)}
                      className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold capitalize transition-all ${parcelWeight === w ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      {w === "light" ? "Light (<1kg)" : w === "medium" ? "Medium (1–5kg)" : "Heavy (5kg+)"}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Recipient Name" value={recipientName} onChange={setRecipientName} placeholder="Who receives it?" icon={User} />
              <Input label="Recipient Phone" value={recipientPhone} onChange={setRecipientPhone} placeholder="024 XXX XXXX" type="tel" icon={Phone} />
            </div>
          </SectionCard>
        )}

        {serviceType === "package" && (
          <SectionCard>
            <SectionTitle icon={StickyNote}>Package Details</SectionTitle>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">What's in the package?</label>
                <textarea
                  value={packageDesc} onChange={(e) => setPackageDesc(e.target.value)}
                  placeholder="e.g. Laptop in original box, bedside table..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Package size</label>
                <div className="flex gap-2">
                  {["small", "medium", "large"].map((s) => (
                    <button key={s} onClick={() => setPackageSize(s)}
                      className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold capitalize transition-all ${packageSize === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      {s === "small" ? "Small (shoe box)" : s === "medium" ? "Medium (suitcase)" : "Large (furniture)"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <input type="checkbox" id="fragile" checked={isFragile} onChange={(e) => setIsFragile(e.target.checked)}
                  className="h-4 w-4 accent-primary cursor-pointer" />
                <label htmlFor="fragile" className="text-sm font-medium text-foreground cursor-pointer">
                  ⚠️ Fragile — handle with care
                </label>
              </div>
              <Input label="Recipient Name" value={recipientName} onChange={setRecipientName} placeholder="Who receives it?" icon={User} />
              <Input label="Recipient Phone" value={recipientPhone} onChange={setRecipientPhone} placeholder="024 XXX XXXX" type="tel" icon={Phone} />
            </div>
          </SectionCard>
        )}

        {serviceType === "pharmacy" && (
          <SectionCard>
            <SectionTitle icon={StickyNote}>Pharmacy Details</SectionTitle>
            <div className="space-y-3">
              <Input label="Pharmacy name (optional — leave blank for nearest)" value={pharmacyName} onChange={setPharmacyName} placeholder="e.g. Ernest Chemist, Osu" icon={MapPin} />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Medications / Items needed
                </label>
                <textarea
                  value={medications} onChange={(e) => setMedications(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg x2, Amoxicillin 250mg x1 capsules (prescription attached if needed)..."
                  rows={4}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>
          </SectionCard>
        )}

        {/* Notes */}
        <SectionCard>
          <SectionTitle icon={StickyNote}>Additional Notes</SectionTitle>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Any extra instructions for the rider…"
            rows={2}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </SectionCard>

        {/* Payment */}
        <SectionCard>
          <SectionTitle icon={Banknote}>Payment</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPaymentMethod("cash")}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border"}`}>
              <Banknote className={`h-7 w-7 ${paymentMethod === "cash" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-semibold ${paymentMethod === "cash" ? "text-primary" : "text-foreground"}`}>Cash</span>
              <span className="text-[10px] text-muted-foreground">Pay on delivery</span>
            </button>
            <button onClick={() => setPaymentMethod("momo")}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${paymentMethod === "momo" ? "border-primary bg-primary/5" : "border-border"}`}>
              <Smartphone className={`h-7 w-7 ${paymentMethod === "momo" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-semibold ${paymentMethod === "momo" ? "text-primary" : "text-foreground"}`}>Mobile Money</span>
              <span className="text-[10px] text-muted-foreground">MTN, Vodafone, AT</span>
            </button>
          </div>

          {paymentMethod === "momo" && (
            <div className="mt-4 space-y-3 rounded-xl bg-muted/50 p-4">
              <div className="flex gap-2">
                {momoProviders.map((p) => (
                  <button key={p.id} onClick={() => setMomoProvider(p.id)}
                    className={`flex-1 rounded-lg border-2 px-1 py-2 text-center text-[11px] font-semibold transition-all ${momoProvider === p.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <Input label="MoMo Number" value={momoPhone} onChange={setMomoPhone} placeholder="024 XXX XXXX" type="tel" icon={Phone} />
            </div>
          )}
        </SectionCard>

        {/* Summary */}
        <SectionCard>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Service fee</span>
            <span className="text-lg font-extrabold text-primary">GH₵{serviceFee}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Final amount confirmed before payment
          </p>
        </SectionCard>
      </div>

      {/* CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="container mx-auto max-w-lg">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-warm py-6 text-base font-bold text-primary-foreground shadow-warm hover:scale-[1.01] active:scale-95 disabled:opacity-60"
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <span className="mr-2">{svcDef.icon}</span>}
            {loading ? "Submitting…" : `Request ${svcDef.label} — GH₵${serviceFee}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ServiceRequestPage;
