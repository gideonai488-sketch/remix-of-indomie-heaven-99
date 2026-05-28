import { useNavigate } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-primary/20 bg-primary/95 backdrop-blur-md shadow-warm">
      {/* Top bar — Genesis Holdings */}
      <div className="border-b border-primary-foreground/10 bg-primary-foreground/5">
        <div className="container mx-auto flex items-center justify-center gap-2 px-4 py-1">
          <img src="/falcon-icon.png" alt="" className="h-4 w-4 rounded-sm object-cover" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-primary-foreground/70">
            Genesis Holdings Inc, USA
          </span>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto flex h-12 items-center justify-between px-4 md:h-14">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
          <img src="/falcon-icon.png" alt="Highest Bowls" className="h-8 w-8 rounded-md object-cover md:h-9 md:w-9" />
          <h1 className="font-display text-lg font-bold md:text-xl">
            <span className="text-primary-foreground">Highest</span>{" "}
            <span className="text-accent">Bowls</span>
          </h1>
        </button>
        <NotificationBell />
      </div>
    </header>
  );
};

export default Header;
