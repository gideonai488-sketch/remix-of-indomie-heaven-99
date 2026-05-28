import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { Plus, Play, Star, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import FoodDetailModal from "@/components/FoodDetailModal";
import { useMenuItems } from "@/hooks/useMenuItems";
import { MenuItem } from "@/data/menu";

const taglines = [
  "Slurp to the Top.",
  "Stack It Your Way.",
  "Own Your Bowl.",
  "Choose Your Heat.",
  "Level Up Your Craving.",
];

const NetflixHero = () => {
  const { addItem } = useCart();
  const { items } = useMenuItems();
  const trending = [...items].sort((a, b) => (b.orders ?? 0) - (a.orders ?? 0));
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const featured = trending[activeIndex] ?? trending[0];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % Math.min(5, trending.length));
    }, 6000);
    return () => clearInterval(interval);
  }, [trending.length]);

  if (!featured) return null;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(featured);
    toast.success(`${featured.name} added to cart!`, { duration: 1500 });
  };

  return (
    <section
      className="relative overflow-hidden bg-gradient-hero"
      onClick={() => setSelectedItem(featured)}
      role="button"
      tabIndex={0}
    >
      <div className="absolute inset-0">
        <img
          src={featured.image}
          alt={featured.name}
          className="h-full w-full object-cover transition-all duration-1000 ease-out"
          key={featured.id}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="container relative z-10 mx-auto flex min-h-[400px] flex-col justify-end px-4 pb-8 pt-20 sm:min-h-[460px] sm:pb-10 md:min-h-[560px] md:pb-14 md:pt-24">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-0.5 text-xs font-bold text-white sm:px-3 sm:py-1 sm:text-sm">
            <TrendingUp className="h-3.5 w-3.5" />
            #1 Most Ordered Today
          </span>
        </div>

        <p className="mb-1.5 font-display text-sm font-bold uppercase tracking-wider text-primary sm:text-base md:mb-2 md:text-xl">
          {taglines[activeIndex % taglines.length]}
        </p>

        <h1 className="mb-2 max-w-2xl font-display text-3xl font-black uppercase leading-none text-white sm:text-4xl md:mb-3 md:text-6xl lg:text-7xl">
          {featured.name}
        </h1>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-white/70 sm:gap-4 sm:text-sm md:mb-4">
          <span className="flex items-center gap-1 font-semibold text-green-400">
            <Star className="h-3.5 w-3.5 fill-current" /> 4.9
          </span>
          {(featured.orders ?? 0) > 0 && <span>{(featured.orders ?? 0).toLocaleString()} orders</span>}
          <span>{"🌶️".repeat(featured.spiceLevel) || "Mild"}</span>
          <span className="hidden rounded bg-white/10 px-2 py-0.5 text-white/90 sm:inline capitalize">{featured.category}</span>
        </div>

        <p className="mb-4 max-w-xl text-sm text-white/60 line-clamp-2 sm:line-clamp-none sm:text-base md:mb-6 md:text-lg">
          {featured.description}
        </p>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-warm transition-transform hover:scale-105 active:scale-95 sm:gap-2 sm:px-8 sm:py-3.5 sm:text-lg"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            Add — GH₵{featured.price.toFixed(2)}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedItem(featured); }}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:gap-2 sm:px-6 sm:py-3.5 sm:text-lg"
          >
            <Play className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
            Details
          </button>
        </div>

        <div className="mt-5 flex gap-1.5 sm:mt-8 sm:gap-2">
          {trending.slice(0, 5).map((item, i) => (
            <button
              key={item.id}
              onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
              className={`relative h-12 w-16 overflow-hidden rounded-lg border-2 transition-all sm:h-16 sm:w-24 md:h-20 md:w-32 ${
                i === activeIndex
                  ? "border-primary shadow-warm scale-105"
                  : "border-white/20 opacity-60 hover:opacity-100"
              }`}
            >
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              {i === activeIndex && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      <FoodDetailModal
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      />
    </section>
  );
};

export default NetflixHero;
