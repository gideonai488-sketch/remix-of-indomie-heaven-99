import { useNavigate } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";
import { Zap } from "lucide-react";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white shadow-sm">
      <div className="border-b border-border bg-gray-50">
        <div className="container mx-auto flex items-center justify-center gap-2 px-4 py-1">
          <img src="/falcon-icon.png" alt="" className="h-4 w-4 rounded-sm object-cover" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Genesis Holdings Inc, USA
          </span>
        </div>
      </div>

      <div className="container mx-auto flex h-12 items-center justify-between px-4 md:h-14">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary md:h-9 md:w-9">
            <Zap className="h-5 w-5 fill-current text-white" />
          </div>
          <h1 className="font-display text-lg font-bold md:text-xl">
            <span className="text-foreground">Speed</span><span className="text-primary">Up</span>
          </h1>
        </button>
        <NotificationBell />
      </div>
    </header>
  );
};

export default Header;
