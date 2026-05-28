import { Minus, Plus, Trash2, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CartDrawer = () => {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, totalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    if (!user) {
      navigate("/auth");
    } else {
      navigate("/checkout");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-card shadow-2xl animate-slide-in-right">
        <div className="flex items-center justify-between bg-primary px-5 py-4">
          <h3 className="text-lg font-bold text-primary-foreground">🛒 Your Cart</h3>
          <button onClick={() => setIsCartOpen(false)} className="rounded-full p-2 text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <span className="text-6xl">🥣</span>
              <p className="text-lg font-medium text-muted-foreground">Your bowl is empty</p>
              <p className="text-sm text-muted-foreground">Build your bowl — add something!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((ci) => (
                <div key={ci.item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <img src={ci.item.image} alt={ci.item.name} className="h-14 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-semibold text-card-foreground">{ci.item.name}</h4>
                    <p className="text-sm font-bold text-primary">GH₵{(ci.item.price * ci.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(ci.item.id, ci.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-foreground">{ci.quantity}</span>
                    <button onClick={() => updateQuantity(ci.item.id, ci.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <Plus className="h-3 w-3" />
                    </button>
                    <button onClick={() => removeItem(ci.item.id)} className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom)+3.5rem)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">Subtotal</span>
              <span className="text-xl font-extrabold text-primary">GH₵{totalPrice.toFixed(2)}</span>
            </div>
            <Button onClick={handleCheckout} className="w-full rounded-full bg-gradient-warm py-5 text-base font-bold text-primary-foreground shadow-warm transition-transform hover:scale-[1.02] active:scale-95">
              {user ? "Checkout 🚀" : "Sign In to Order 🚀"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
