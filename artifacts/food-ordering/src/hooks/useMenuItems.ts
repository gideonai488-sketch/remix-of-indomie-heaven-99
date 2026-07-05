import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { menuItems as staticMenu, MenuItem } from "@/data/menu";

export const useMenuItems = () => {
  const [items, setItems] = useState<MenuItem[]>(staticMenu);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const { data, error: err } = await supabase
          .from("menu_items")
          .select("*")
          .eq("available", true)
          .order("sort_order", { ascending: true });

        if (err) {
          console.warn("Error fetching menu from DB, using static:", err);
          setError(err.message);
          setItems(staticMenu);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const mapped: MenuItem[] = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description || "",
            price: item.price,
            category: item.category === "sides" ? "sides" : "signature",
            spiceLevel: (Math.min(item.spice_level ?? 0, 3)) as 0 | 1 | 2 | 3,
            popular: item.is_popular ?? false,
            image: item.image_url || staticMenu.find(m => m.category === item.category)?.image || staticMenu[0]?.image || "",
            orders: item.order_count ?? 0,
          }));
          setItems(mapped);
          setError(null);
        } else {
          console.log("No menu items in DB, using static menu");
          setItems(staticMenu);
        }
      } catch (e: any) {
        console.error("Unexpected error fetching menu:", e);
        setError(e.message);
        setItems(staticMenu);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("menu-items-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        (payload: any) => {
          console.log("Menu item update:", payload);
          if (payload.eventType === "INSERT") {
            setItems((prev) => [...prev, payload.new as MenuItem]);
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((item) =>
                item.id === (payload.new as any).id ? (payload.new as MenuItem) : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((item) => item.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { items, loading, error };
};
