import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { menuItems as staticMenu, MenuItem } from "@/data/menu";

export const useMenuItems = () => {
  const [items, setItems] = useState<MenuItem[]>(staticMenu);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const mapped: MenuItem[] = data.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description || "",
            price: item.price,
            category:
              item.category === "sides" ? "sides" : "signature",
            spiceLevel: (Math.min(item.spice_level ?? 0, 3)) as 0 | 1 | 2 | 3,
            popular: item.is_popular ?? false,
            image: item.image_url || staticMenu[0]?.image || "",
            orders: 0,
          }));
          setItems(mapped);
        }
        setLoading(false);
      });
  }, []);

  return { items, loading };
};
