import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BannerRow {
  id: string;
  title: string;
  subtitle: string | null;
  cta: string | null;
  file_path: string;
  bucket: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const emptyBanner: Omit<BannerRow, "id" | "created_at"> = {
  title: "",
  subtitle: "",
  cta: "Order Now",
  file_path: "",
  bucket: "promo-videos",
  is_active: true,
  sort_order: 0,
};

const PromoBannersPage = () => {
  const [items, setItems] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<BannerRow> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("promo_banners")
      .select("*")
      .order("sort_order", { ascending: true });
    setItems((data as BannerRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("promo-videos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return null;
    }
    toast.success("Video uploaded!");
    setUploading(false);
    return path;
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await handleUpload(file);
    if (path && editing) {
      setEditing({ ...editing, file_path: path });
    }
  };

  const save = async () => {
    if (!editing?.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!editing?.file_path?.trim()) {
      toast.error("A video file is required");
      return;
    }

    const payload = {
      title: editing.title!,
      subtitle: editing.subtitle || null,
      cta: editing.cta || null,
      file_path: editing.file_path!,
      bucket: editing.bucket || "promo-videos",
      is_active: editing.is_active ?? true,
      sort_order: Number(editing.sort_order) || 0,
    };

    if (isNew) {
      const { error } = await supabase.from("promo_banners").insert(payload);
      if (error) { toast.error("Failed to create: " + error.message); return; }
      toast.success("Banner created!");
    } else {
      const { error } = await supabase.from("promo_banners").update(payload).eq("id", editing.id!);
      if (error) { toast.error("Failed to update: " + error.message); return; }
      toast.success("Banner updated!");
    }
    setEditing(null);
    setIsNew(false);
    load();
  };

  const remove = async (id: string, file_path: string) => {
    const { error } = await supabase.from("promo_banners").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    // Also delete from storage
    await supabase.storage.from("promo-videos").remove([file_path]);
    toast.success("Banner deleted");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("promo_banners").update({ is_active: !current }).eq("id", id);
    if (!error) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: !current } : i)));
    }
  };

  const getVideoUrl = (path: string) => {
    const { data } = supabase.storage.from("promo-videos").getPublicUrl(path);
    return data.publicUrl;
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
          <h1 className="font-display text-2xl font-bold text-foreground">Promo Banners</h1>
          <p className="text-sm text-muted-foreground">{items.length} banners</p>
        </div>
        <Button
          onClick={() => { setEditing({ ...emptyBanner }); setIsNew(true); }}
          className="gap-1 bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add Banner
        </Button>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">
                {isNew ? "New Banner" : "Edit Banner"}
              </h2>
              <button onClick={() => { setEditing(null); setIsNew(false); }}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
                <input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. New Jollof Special"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Subtitle</label>
                <input
                  value={editing.subtitle || ""}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                  placeholder="e.g. Buy 1 get 1 free this week"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">CTA Button</label>
                <input
                  value={editing.cta || ""}
                  onChange={(e) => setEditing({ ...editing, cta: e.target.value })}
                  placeholder="e.g. Order Now"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Sort Order</label>
                  <input
                    type="number"
                    value={editing.sort_order || 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={editing.is_active ?? true}
                      onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                      className="rounded border-border"
                    />
                    Active
                  </label>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Video File</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    ref={fileRef}
                    onChange={onFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {uploading ? "Uploading..." : editing.file_path ? "Replace Video" : "Upload Video"}
                  </button>
                  <span className="text-xs text-muted-foreground truncate">
                    {editing.file_path || "No file"}
                  </span>
                </div>
                {editing.file_path && (
                  <video
                    src={getVideoUrl(editing.file_path)}
                    className="mt-2 h-32 w-full rounded-lg object-cover"
                    controls
                    muted
                    playsInline
                  />
                )}
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
        <div className="py-16 text-center text-muted-foreground">No banners yet. Add your first promo!</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  {!item.is_active && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">Hidden</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{item.subtitle || "No subtitle"} · #{item.sort_order}</p>
                {item.file_path && (
                  <p className="text-[10px] text-muted-foreground truncate">{item.file_path}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(item.id, item.is_active)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title={item.is_active ? "Hide" : "Show"}
                >
                  {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => { setEditing(item); setIsNew(false); }}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(item.id, item.file_path)}
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

export default PromoBannersPage;
