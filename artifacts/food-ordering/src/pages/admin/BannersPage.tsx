import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, X, Upload } from "lucide-react";

interface Banner {
  id: string;
  label: string;
  subtitle: string;
  cta: string;
  media_url: string;
  media_type: "video" | "image";
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const BannersPage = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("banners")
      .select("*")
      .order("sort_order", { ascending: true });
    setBanners((data as Banner[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.label?.trim()) { toast.error("Label is required"); return; }
    if (!editing?.media_url?.trim()) { toast.error("Media URL is required"); return; }

    const payload = {
      label: editing.label!,
      subtitle: editing.subtitle || "",
      cta: editing.cta || "Order Now",
      media_url: editing.media_url!,
      media_type: editing.media_type || "video",
      is_active: editing.is_active ?? true,
      sort_order: Number(editing.sort_order) || 0,
    };

    if (isNew) {
      const { error } = await supabase.from("banners").insert(payload);
      if (error) { toast.error("Failed to create banner"); return; }
      toast.success("Banner created!");
    } else {
      const { error } = await supabase.from("banners").update(payload).eq("id", editing.id!);
      if (error) { toast.error("Failed to update banner"); return; }
      toast.success("Banner updated!");
    }
    setEditing(null);
    setIsNew(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Banner deleted");
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("banners").update({ is_active: !current }).eq("id", id);
    if (error) { toast.error("Failed to toggle"); return; }
    setBanners((prev) => prev.map((b) => b.id === id ? { ...b, is_active: !current } : b));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split(".").pop() || "mp4";
    const path = `banners/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("media")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      toast.error("Upload failed: " + upErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("media").getPublicUrl(path);
    if (editing) {
      setEditing({ ...editing, media_url: data.publicUrl, media_type: file.type.startsWith("video") ? "video" : "image" });
    }
    toast.success("Media uploaded!");
    setUploading(false);
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
          <h1 className="font-display text-2xl font-bold text-foreground">Banners</h1>
          <p className="text-sm text-muted-foreground">{banners.length} slides in the hero carousel</p>
        </div>
        <Button
          onClick={() => { setEditing({ label: "", subtitle: "", cta: "Order Now", media_url: "", media_type: "video", is_active: true, sort_order: banners.length }); setIsNew(true); }}
          className="gap-1 bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add Banner
        </Button>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">{isNew ? "New Banner" : "Edit Banner"}</h2>
              <button onClick={() => { setEditing(null); setIsNew(false); }}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Label / Headline</label>
                <input value={editing.label || ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Subtitle</label>
                <input value={editing.subtitle || ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">CTA Button Text</label>
                <input value={editing.cta || ""} onChange={(e) => setEditing({ ...editing, cta: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Media URL</label>
                <input value={editing.media_url || ""} onChange={(e) => setEditing({ ...editing, media_url: e.target.value })} placeholder="https://..." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Upload Video or Image</label>
                <input ref={fileRef} type="file" accept="video/*,image/*" className="hidden" onChange={handleUpload} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Choose file"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Media Type</label>
                  <select value={editing.media_type || "video"} onChange={(e) => setEditing({ ...editing, media_type: e.target.value as "video" | "image" })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Sort Order</label>
                  <input type="number" value={editing.sort_order || 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="rounded border-border" />
                Active (visible in carousel)
              </label>
            </div>
            <Button onClick={save} className="w-full gap-1 bg-primary text-primary-foreground font-bold">Save</Button>
          </div>
        </div>
      )}

      {/* Banners list */}
      {banners.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">No banners yet. Add your first slide!</div>
      ) : (
        <div className="space-y-2">
          {banners.map((b, i) => (
            <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                {b.media_type === "video" ? (
                  <video src={b.media_url} className="h-full w-full object-cover" muted />
                ) : (
                  <img src={b.media_url} alt={b.label} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{b.label}</p>
                  {!b.is_active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Hidden</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{b.subtitle || "No subtitle"}</p>
                <p className="text-[10px] text-muted-foreground/60">{b.media_type} · sort {b.sort_order}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(b.id, b.is_active)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title={b.is_active ? "Hide" : "Show"}>
                  {b.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => { setEditing(b); setIsNew(false); }} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button onClick={() => remove(b.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10" title="Delete">
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

export default BannersPage;
