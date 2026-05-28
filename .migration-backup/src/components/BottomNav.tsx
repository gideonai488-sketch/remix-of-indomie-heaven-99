import { Home, UtensilsCrossed, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const BottomNav = () => {
  const { totalItems, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/30 bg-primary/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] shadow-warm">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-around px-2">
        <button
          onClick={() => navigate("/")}
          className={`flex flex-1 flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            isActive("/") ? "text-accent" : "text-primary-foreground/60"
          }`}
        >
          <Home className="h-5 w-5" />
          Home
        </button>

        <button
          onClick={() => navigate("/menu")}
          className={`flex flex-1 flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            isActive("/menu") ? "text-accent" : "text-primary-foreground/60"
          }`}
        >
          <UtensilsCrossed className="h-5 w-5" />
          Menu
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-1 flex-col items-center gap-0.5 text-[10px] font-semibold text-primary-foreground/60 transition-colors"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground animate-scale-in">
                {totalItems}
              </span>
            )}
          </div>
          Cart
        </button>

        <button
          onClick={() => navigate(user ? "/profile" : "/auth")}
          className={`flex flex-1 flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            isActive("/profile") || isActive("/auth") ? "text-accent" : "text-primary-foreground/60"
          }`}
        >
          <User className="h-5 w-5" />
          {user ? "Profile" : "Sign In"}
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
