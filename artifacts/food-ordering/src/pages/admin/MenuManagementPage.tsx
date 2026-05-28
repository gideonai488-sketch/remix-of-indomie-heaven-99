import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MenuItemRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  spice_level: number;
  image_url: string | null;
  is_available: boolean;
  is_popular: boolean;
  sort_order: number;
}

const emptyItem: Omit<MenuItemRow, "id"> = {
  name: "",
  description: "",
  price: 0,
  category: "signature",
  spice_level: 0,
  image_url: "",
  is_available: true,
  is_popular: false,
  sort_order: 0,
};

const MenuManagementPage = () => {
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<MenuItemRow> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .order("sort_order", { ascending: true });
    setItems((data as MenuItemRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name?.trim()) {
      toast.error("Name is required");
      return;
    }

    const payload = {
      name: editing.name!,
      description: editing.description || null,
      price: Number(editing.price) || 0,
      category: editing.category || "signature",
      spice_level: Number(editing.spice_level) || 0,
      image_url: editing.image_url || null,
      is_available: editing.is_available ?? true,
      is_popular: editing.is_popular ?? false,
      sort_order: Number(editing.sort_order) || 0,
    };

    if (isNew) {
      const { error } = await supabase.from("menu_items").insert(payload);
      if (error) { toast.error("Failed to create item"); return; }
      toast.success("Item created!");
    } else {
      const { error } = await supabase.from("menu_items").update(payload).eq("id", editing.id!);
      if (error) { toast.error("Failed to update item"); return; }
      toast.success("Item updated!");
    }
    setEditing(null);
    setIsNew(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Item deleted");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Menu</h1>
          <p className="text-sm text-muted-foreground">{items.length} items</p>
        </div>
        <Button
          onClick={() => { setEditing({ ...emptyItem }); setIsNew(true); }}
          className="gap-1 bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">
                {isNew ? "New Item" : "Edit Item"}
              </h2>
              <button onClick={() => { setEditing(null); setIsNew(false); }}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
                <input
                  value={editing.name || ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Price (GH₵)</label>
                  <input
                    type="number"
                    value={editing.price || 0}
                    onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Spice Level (0-3)</label>
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={editing.spice_level || 0}
                    onChange={(e) => setEditing({ ...editing, spice_level: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
                  <select
                    value={editing.category || "signature"}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="signature">Signature Bowls</option>
                    <option value="sides">Sides & Drinks</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Sort Order</label>
                  <input
                    type="number"
                    value={editing.sort_order || 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Image URL</label>
                <input
                  value={editing.image_url || ""}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={editing.is_available ?? true}
                    onChange={(e) => setEditing({ ...editing, is_available: e.target.checked })}
                    className="rounded border-border"
                  />
                  Available
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={editing.is_popular ?? false}
                    onChange={(e) => setEditing({ ...editing, is_popular: e.target.checked })}
                    className="rounded border-border"
                  />
                  Popular
                </label>
              </div>
            </div>

            <Button onClick={save} className="w-full gap-1 bg-primary text-primary-foreground font-bold">
              <Save className="h-4 w-4" /> {isNew ? "Create" : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">No menu items yet. Add your first item!</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  {!item.is_available && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">Unavailable</span>
                  )}
                  {item.is_popular && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Popular</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{item.category} · 🌶️{item.spice_level} · GH₵{Number(item.price).toFixed(2)}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditing(item); setIsNew(false); }}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuManagementPage;
