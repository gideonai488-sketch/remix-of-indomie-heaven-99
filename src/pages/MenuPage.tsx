import { useState, useMemo } from "react";
import { menuItems, categories } from "@/data/menu";
import MenuGrid from "@/components/MenuGrid";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import BottomNav from "@/components/BottomNav";
import { Search, X, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MenuPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    let items = menuItems;

    if (activeCategory !== "all") {
      items = items.filter((i) => i.category === activeCategory);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }

    return items;
  }, [query, activeCategory]);

  const newBowls = menuItems.filter((i) =>
    ["s6", "s7", "s8", "s9", "s10", "s11"].includes(i.id)
  );
  const classicBowls = menuItems.filter((i) =>
    ["s1", "s2", "s3", "s4", "s5"].includes(i.id)
  );
  const sides = menuItems.filter((i) => i.category === "sides");

  const isSearching = query.trim() || activeCategory !== "all";

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16">
      <Header />

      {/* Page header */}
      <div className="bg-gradient-hero pt-20 pb-8">
        <div className="container mx-auto px-4">
          <button
            onClick={() => navigate("/")}
            className="mb-4 flex items-center gap-1.5 text-sm font-medium text-primary-foreground/60 transition-colors hover:text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <h1 className="font-display text-3xl font-black uppercase text-primary-foreground md:text-5xl">
            Full <span className="text-gradient">Menu</span>
          </h1>
          <p className="mt-2 max-w-lg text-primary-foreground/60">
            Every bowl, every vibe. Pick your fighter.
          </p>

          {/* Search */}
          <div className="relative mt-5 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bowls..."
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-warm"
                    : "bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20"
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu content */}
      <div className="py-8">
        {isSearching ? (
          filtered.length > 0 ? (
            <MenuGrid
              title={`${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
              items={filtered}
              icon="🔍"
            />
          ) : (
            <div className="py-16 text-center">
              <span className="text-5xl">🥣</span>
              <p className="mt-3 text-muted-foreground">
                No bowls match your search
              </p>
            </div>
          )
        ) : (
          <>
            <MenuGrid title="New Bowls" items={newBowls} icon="✨" />
            <MenuGrid title="Classic Bowls" items={classicBowls} icon="👑" />
            <MenuGrid title="Sides & Drinks" items={sides} icon="🍦" />
          </>
        )}
      </div>

      <CartDrawer />
      <BottomNav />
    </div>
  );
};

export default MenuPage;
