import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Star, Flame } from "lucide-react";
import { MenuItem } from "@/data/menu";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import FoodDetailModal from "@/components/FoodDetailModal";

interface MenuRowProps {
  title: string;
  items: MenuItem[];
  icon?: string;
}

const MenuCard = ({
  item,
  onSelect,
  onAdd,
}: {
  item: MenuItem;
  onSelect: () => void;
  onAdd: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={onSelect}
    className="group/card relative min-w-[220px] max-w-[260px] flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-warm md:min-w-[260px] md:max-w-[300px]"
  >
    {/* Image */}
    <div className="relative aspect-[4/3] overflow-hidden">
      <img
        src={item.image}
        alt={item.name}
        className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
        loading="lazy"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />

      {/* Popular badge */}
      {item.popular && (
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-spicy-red/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-spicy-red-foreground backdrop-blur-sm">
          <Flame className="h-3 w-3" />
          Popular
        </div>
      )}

      {/* Quick-add floating button */}
      <button
        onClick={onAdd}
        className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-warm opacity-0 transition-all duration-300 hover:scale-110 active:scale-95 group-hover/card:opacity-100"
        aria-label={`Add ${item.name} to cart`}
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>

    {/* Content */}
    <div className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-display text-base font-bold leading-tight text-card-foreground truncate">
          {item.name}
        </h4>
        <span className="shrink-0 font-display text-base font-extrabold text-primary">
          GH₵{item.price}
        </span>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {item.description}
      </p>

      {/* Footer meta */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-0.5 font-semibold text-success">
          <Star className="h-3 w-3 fill-current" /> 4.9
        </span>
        <span>{"🌶️".repeat(item.spiceLevel) || "Mild"}</span>
        {item.orders && (
          <span className="ml-auto tabular-nums">
            {item.orders.toLocaleString()} sold
          </span>
        )}
      </div>
    </div>
  </div>
);

const MenuRow = ({ title, items, icon }: MenuRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      const amount = dir === "left" ? -400 : 400;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const handleAdd = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation();
    addItem(item);
    toast.success(`${item.name} added to cart!`, { duration: 1500 });
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="container mx-auto px-4">
        <h3 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-foreground md:text-2xl">
          {icon && <span className="text-2xl">{icon}</span>}
          {title}
        </h3>
      </div>

      <div className="group relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 z-20 hidden h-full w-12 items-center justify-center bg-gradient-to-r from-background to-transparent opacity-0 transition-opacity group-hover:opacity-100 md:flex"
        >
          <ChevronLeft className="h-8 w-8 text-foreground" />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 z-20 hidden h-full w-12 items-center justify-center bg-gradient-to-l from-background to-transparent opacity-0 transition-opacity group-hover:opacity-100 md:flex"
        >
          <ChevronRight className="h-8 w-8 text-foreground" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide md:container md:mx-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              onSelect={() => setSelectedItem(item)}
              onAdd={(e) => handleAdd(e, item)}
            />
          ))}
        </div>
      </div>

      <FoodDetailModal
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      />
    </div>
  );
};

export default MenuRow;
