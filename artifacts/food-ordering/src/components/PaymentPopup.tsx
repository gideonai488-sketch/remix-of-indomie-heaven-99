import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { CreditCard, X, Loader2, CheckCircle2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PaymentRequest {
  id: string;
  order_id?: string;
  errand_order_id?: string;
  parcel_order_id?: string;
  items_amount: number;
  delivery_fee: number;
  total_amount: number;
  status: string;
}

export const PaymentPopup = () => {
  const { user } = useAuth();
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Subscribe to payment_requests
    const channel = supabase
      .channel(`payment-requests:${user.id}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "payment_requests", 
          filter: `customer_id=eq.${user.id}` 
        },
        (payload: any) => {
          const newReq = payload.new as PaymentRequest;
          if (newReq.status === "pending") {
            setRequest(newReq);
            // Play a sound if needed (handled in useNotifications or here)
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleConfirm = async () => {
    if (!request) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("confirm-payment", {
        body: { payment_request_id: request.id },
      });

      if (error) throw error;
      
      toast.success("Payment confirmed! Thank you.");
      setRequest(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm payment");
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <DollarSign className="h-6 w-6"/>
            </div>
            <button onClick={() => setRequest(null)} className="p-1 hover:bg-muted rounded-full">
              <X className="h-5 w-5 text-muted-foreground"/>
            </button>
          </div>

          <h3 className="text-xl font-bold text-foreground mb-1">Payment Request</h3>
          <p className="text-sm text-muted-foreground mb-6">Rider has arrived and is requesting payment for your order.</p>

          <div className="bg-muted/30 rounded-2xl p-4 space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items / Expense</span>
              <span className="font-semibold text-foreground">GH₵{request.items_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span className="font-semibold text-foreground">GH₵{request.delivery_fee.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-border flex justify-between items-center">
              <span className="font-bold text-foreground">Total to Pay</span>
              <span className="text-2xl font-black text-primary">GH₵{request.total_amount.toFixed(2)}</span>
            </div>
          </div>

          <Button 
            onClick={handleConfirm} 
            disabled={loading}
            className="w-full py-6 rounded-2xl bg-primary text-white font-bold text-lg shadow-warm"
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <CreditCard className="mr-2 h-5 w-5"/>}
            Confirm & Pay Cash
          </Button>
          
          <p className="mt-4 text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Hand over cash to rider after confirming
          </p>
        </div>
      </div>
    </div>
  );
};
