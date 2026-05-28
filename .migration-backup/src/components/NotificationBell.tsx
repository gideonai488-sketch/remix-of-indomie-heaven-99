import { Bell, Check, CheckCheck, Package, Megaphone, ShieldAlert } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/context/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const typeIcon = (type: string) => {
  switch (type) {
    case "order_update": return <Package className="h-4 w-4 text-accent" />;
    case "promo": return <Megaphone className="h-4 w-4 text-green-400" />;
    case "admin_alert": return <ShieldAlert className="h-4 w-4 text-destructive" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const NotificationItem = ({
  notification,
  onRead,
  onNavigate,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onNavigate: (n: Notification) => void;
}) => (
  <button
    onClick={() => {
      if (!notification.is_read) onRead(notification.id);
      onNavigate(notification);
    }}
    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-secondary/60 ${
      notification.is_read ? "opacity-60" : ""
    }`}
  >
    <div className="mt-0.5 shrink-0">{typeIcon(notification.type)}</div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-foreground leading-tight">{notification.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notification.body}</p>
      <p className="mt-1 text-[10px] text-muted-foreground/70">
        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
      </p>
    </div>
    {!notification.is_read && (
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
    )}
  </button>
);

const NotificationBell = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!user) return null;

  const handleNavigate = (n: Notification) => {
    if (n.type === "order_update" && n.data?.order_id) {
      navigate("/profile?tab=orders");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-1.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground animate-scale-in">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 border-border bg-card p-0 shadow-xl"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-bold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Bell className="h-8 w-8 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50 p-1">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
