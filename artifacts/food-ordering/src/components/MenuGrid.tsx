import { useState } from "react";
import { Plus, Star, Flame, ShoppingBag, Zap } from "lucide-react";
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
    className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-primary/20 animate-fade-in"
    style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
  >
    {/* Image */}
    <div className="relative aspect-[4/3] overflow-hidden">
      <img
        src={item.image}
        alt={item.name}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />

      {/* Top badges */}
      <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
        {item.popular && (
          <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-warm">
            <Flame className="h-2.5 w-2.5 fill-white" /> Hot
          </span>
        )}
        {item.spiceLevel > 0 && (
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] backdrop-blur-sm">
            {"🌶️".repeat(item.spiceLevel)}
          </span>
        )}
      </div>
    </div>

    {/* Content */}
    <div className="flex flex-1 flex-col p-3.5">
      <div className="flex-1">
        <h4 className="truncate text-sm font-bold leading-tight text-foreground md:text-[15px]">
          {item.name}
        </h4>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
          {item.description}
        </p>
      </div>

      {/* Meta row */}
      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-0.5 font-semibold text-green-600">
          <Star className="h-3 w-3 fill-current" /> 4.9
        </span>
        {item.orders && (
          <span className="ml-auto flex items-center gap-1 tabular-nums">
            <ShoppingBag className="h-3 w-3" />
            {item.orders.toLocaleString()}
          </span>
        )}
      </div>

      {/* Price + Add */}
      <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2.5">
        <span className="font-display text-base font-extrabold text-foreground">
          GH₵{item.price.toFixed(2)}
        </span>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
          aria-label={`Add ${item.name} to cart`}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
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
    toast.success(`${item.name} added!`, { duration: 1500 });
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="mb-5 flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-lg">
              {icon}
            </div>
          )}
          <h3 className="font-display text-xl font-extrabold text-foreground md:text-2xl">
            {title}
          </h3>
          <div className="ml-auto h-px flex-1 bg-gray-100" />
        </div>

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
