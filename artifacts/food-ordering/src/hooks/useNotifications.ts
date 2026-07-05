import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, string> | null;
  is_read: boolean;
  created_at: string;
  user_id: string | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as unknown as Notification[]);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
    setLoading(false);
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true } as any)
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true } as any)
      .eq("is_read", false as any);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload: any) => {
          const newNotif = payload.new as unknown as Notification;
          // Only add if it's for this user or broadcast (null user_id)
          if (newNotif.user_id === user.id || newNotif.user_id === null) {
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((c) => c + 1);
            
            // Handle sound
            const soundFile = newNotif.data?.sound || "message.caf";
            const audio = new Audio(`/sounds/${soundFile.replace(".caf", ".mp3")}`);
            audio.play().catch(e => console.log("Sound play failed", e));

            toast(newNotif.title, { 
              description: newNotif.body,
              action: newNotif.data?.order_id ? {
                label: "View",
                onClick: () => window.location.href = `#/track/${newNotif.data?.order_id}`
              } : undefined
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
};
