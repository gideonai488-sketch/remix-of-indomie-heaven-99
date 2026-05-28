import { useState } from "react";
import { Plus, Star, Flame, ShoppingBag } from "lucide-react";
import { MenuItem } from "@/data/menu";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import FoodDetailModal from "@/components/FoodDetailModal";

interface MenuCardProps {
  item: MenuItem;
  onSelect: () => void;
  onAdd: (e: React.MouseEvent) => void;
  index: number;
}

const MenuCard = ({ item, onSelect, onAdd, index }: MenuCardProps) => (
  <div
    onClick={onSelect}
    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-warm animate-fade-in"
    style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
  >
    {/* Image */}
    <div className="relative aspect-[4/3] overflow-hidden">
      <img
        src={item.image}
        alt={item.name}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />

      {/* Popular badge */}
      {item.popular && (
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-spicy-red/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-spicy-red-foreground backdrop-blur-sm">
          <Flame className="h-3 w-3" />
          Popular
        </div>
      )}

      {/* Spice indicator */}
      {item.spiceLevel > 0 && (
        <div className="absolute right-2.5 top-2.5 rounded-full bg-foreground/50 px-2 py-0.5 text-xs backdrop-blur-sm">
          {"🌶️".repeat(item.spiceLevel)}
        </div>
      )}

      {/* Quick-add overlay — appears on hover */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <span className="font-display text-xl font-extrabold text-primary-foreground drop-shadow-lg">
          GH₵{item.price}
        </span>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-warm transition-transform hover:scale-105 active:scale-95"
          aria-label={`Add ${item.name} to cart`}
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </div>

    {/* Content */}
    <div className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-display text-sm font-bold leading-tight text-card-foreground md:text-base">
          {item.name}
        </h4>
        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-extrabold text-primary md:text-sm">
          GH₵{item.price}
        </span>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {item.description}
      </p>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-0.5 font-semibold text-success">
          <Star className="h-3 w-3 fill-current" /> 4.9
        </span>
        {item.spiceLevel === 0 && <span>Mild</span>}
        {item.orders && (
          <span className="ml-auto flex items-center gap-1 tabular-nums">
            <ShoppingBag className="h-3 w-3" />
            {item.orders.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  </div>
);

interface MenuGridProps {
  title: string;
  items: MenuItem[];
  icon?: string;
}

const MenuGrid = ({ title, items, icon }: MenuGridProps) => {
  const { addItem } = useCart();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const handleAdd = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation();
    addItem(item);
    toast.success(`${item.name} added to cart!`, { duration: 1500 });
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="container mx-auto px-4">
        <h3 className="mb-5 flex items-center gap-2 font-display text-xl font-bold text-foreground md:text-2xl">
          {icon && <span className="text-2xl">{icon}</span>}
          {title}
        </h3>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <MenuCard
              key={item.id}
              item={item}
              index={i}
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

export default MenuGrid;
