import { Home, UtensilsCrossed, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const BottomNav = () => {
  const { totalItems, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const tab = (active: boolean) =>
    `flex flex-1 flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
      active ? "text-primary" : "text-muted-foreground"
    }`;

  const servicesActive =
    isActive("/services") || isActive("/service-request") || isActive("/track");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-around px-1">

        <button onClick={() => navigate("/")} className={tab(location.pathname === "/")}>
          <Home className="h-5 w-5" />
          Home
        </button>

        <button onClick={() => navigate("/menu")} className={tab(isActive("/menu"))}>
          <UtensilsCrossed className="h-5 w-5" />
          Food
        </button>

        {/* Services — centre pill */}
        <button
          onClick={() => navigate("/services")}
          className="flex flex-1 flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors"
        >
          <div className={`relative flex h-9 w-9 items-center justify-center rounded-full mb-[-2px] transition-colors overflow-hidden ${
            servicesActive ? "bg-primary shadow-warm ring-2 ring-primary/30" : "bg-primary/10"
          }`}>
            <img src="/owl-icon.png" alt="" className="h-6 w-6 object-cover" />
          </div>
          <span className={servicesActive ? "text-primary" : "text-muted-foreground"}>
            Services
          </span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className={`relative flex flex-1 flex-col items-center gap-0.5 text-[10px] font-semibold text-muted-foreground transition-colors`}
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white animate-scale-in">
                {totalItems}
              </span>
            )}
          </div>
          Cart
        </button>

        <button
          onClick={() => navigate(user ? "/profile" : "/auth")}
          className={tab(isActive("/profile") || isActive("/auth"))}
        >
          <User className="h-5 w-5" />
          {user ? "Profile" : "Sign In"}
        </button>

      </div>
    </nav>
  );
};

export default BottomNav;
