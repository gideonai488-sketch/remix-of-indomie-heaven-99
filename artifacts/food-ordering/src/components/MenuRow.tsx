import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Star, Flame, ShoppingBag } from "lucide-react";
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
    className="group/card relative flex min-w-[200px] max-w-[220px] flex-shrink-0 cursor-pointer flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-primary/20 md:min-w-[240px] md:max-w-[260px]"
  >
    {/* Image */}
    <div className="relative aspect-[4/3] overflow-hidden">
      <img
        src={item.image}
        alt={item.name}
        className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
        loading="lazy"
      />
      {item.popular && (
        <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-warm">
          <Flame className="h-2.5 w-2.5 fill-white" /> Hot
        </span>
      )}
    </div>

    {/* Content */}
    <div className="flex flex-1 flex-col p-3.5">
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="truncate text-sm font-bold leading-tight text-foreground md:text-base">
            {item.name}
          </h4>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
          {item.description}
        </p>
      </div>

      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-0.5 font-semibold text-green-600">
          <Star className="h-3 w-3 fill-current" /> 4.9
        </span>
        <span>{"🌶️".repeat(item.spiceLevel) || "Mild"}</span>
        {item.orders && (
          <span className="ml-auto tabular-nums">
            {item.orders.toLocaleString()} sold
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2.5">
        <span className="font-display text-base font-extrabold text-foreground">
          GH₵{item.price.toFixed(2)}
        </span>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
          aria-label={`Add ${item.name}`}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
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
      scrollRef.current.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
    }
  };

  const handleAdd = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation();
    addItem(item);
    toast.success(`${item.name} added!`, { duration: 1500 });
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="container mx-auto px-4">
        <div className="mb-5 flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-lg">
              {icon}
            </div>
          )}
          <h3 className="font-display text-xl font-extrabold text-foreground md:text-2xl">{title}</h3>
          <div className="ml-auto h-px flex-1 bg-gray-100" />
        </div>
      </div>

      <div className="group relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-1 top-0 z-20 hidden h-full w-10 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 md:flex"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/10">
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </div>
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-1 top-0 z-20 hidden h-full w-10 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 md:flex"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/10">
            <ChevronRight className="h-5 w-5 text-foreground" />
          </div>
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide md:container md:mx-auto"
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
