import { useState, useMemo } from "react";
import { useMenuItems } from "@/hooks/useMenuItems";
import MenuGrid from "@/components/MenuGrid";
import { Search, X, Loader2 } from "lucide-react";

const MenuSection = () => {
  const { items, loading } = useMenuItems();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
    );
  }, [query, items]);

  const trending = [...items].sort((a, b) => (b.orders ?? 0) - (a.orders ?? 0));
  const signature = items.filter((i) => i.category === "signature");
  const sides = items.filter((i) => i.category === "sides");

  return (
    <section id="menu" className="py-10">
      <div className="container mx-auto px-4 mb-8">
        <h2 className="font-display text-3xl font-extrabold uppercase text-foreground md:text-4xl">
          The <span className="text-gradient">Menu</span>
        </h2>
        <p className="mt-2 text-muted-foreground">
          Pick your base. Stack your toppings. Own it.
        </p>

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

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading menu…
        </div>
      ) : filtered ? (
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
          <MenuGrid title="Trending — Most Ordered" items={trending} icon="🔥" />
          {signature.length > 0 && <MenuGrid title="Signature Bowls" items={signature} icon="👑" />}
          {sides.length > 0 && <MenuGrid title="Sides & Drinks" items={sides} icon="🍦" />}
        </>
      )}
    </section>
  );
};

export default MenuSection;
