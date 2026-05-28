import { useState, useMemo } from "react";
import { menuItems } from "@/data/menu";
import MenuGrid from "@/components/MenuGrid";
import { Search, X } from "lucide-react";

const MenuSection = () => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return menuItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
    );
  }, [query]);

  const trending = [...menuItems].sort((a, b) => (b.orders ?? 0) - (a.orders ?? 0));
  const signature = menuItems.filter((i) => i.category === "signature");
  const sides = menuItems.filter((i) => i.category === "sides");

  return (
    <section id="menu" className="py-12">
      <div className="container mx-auto px-4 mb-8">
        <h2 className="font-display text-3xl font-extrabold uppercase text-foreground md:text-4xl">
          The <span className="text-gradient">Menu</span>
        </h2>
        <p className="mt-2 text-muted-foreground">
          Pick your base. Stack your toppings. Own it.
        </p>

        {/* Search bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu..."
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
      </div>

      {filtered ? (
        filtered.length > 0 ? (
          <MenuGrid title={`Results for "${query}"`} items={filtered} icon="🔍" />
        ) : (
          <div className="py-16 text-center">
            <span className="text-5xl">🥣</span>
            <p className="mt-3 text-muted-foreground">No bowls match "{query}"</p>
          </div>
        )
      ) : (
        <>
          <MenuGrid title="Trending — Most Stacked" items={trending} icon="🔥" />
          <MenuGrid title="Signature Bowls" items={signature} icon="👑" />
          <MenuGrid title="Sides & Drinks" items={sides} icon="🍦" />
        </>
      )}
    </section>
  );
};

export default MenuSection;
