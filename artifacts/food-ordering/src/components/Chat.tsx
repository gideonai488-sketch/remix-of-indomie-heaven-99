import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Send, Loader2, User, Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Message {
  id: string;
  order_id?: string;
  parcel_order_id?: string;
  errand_order_id?: string;
  service_booking_id?: string;
  sender_id: string;
  sender_role: "customer" | "rider" | "system" | "admin";
  content: string;
  created_at: string;
  read_at?: string | null;
}

interface ChatProps {
  orderId: string;
  orderType: "food" | "parcel" | "errand" | "service";
  onClose?: () => void;
}

export const Chat = ({ orderId, orderType, onClose }: ChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getRefColumn = () => {
    if (orderType === "parcel") return "parcel_order_id";
    if (orderType === "errand") return "errand_order_id";
    if (orderType === "service") return "service_booking_id";
    return "order_id";
  };

  const fetchMessages = async () => {
    const col = getRefColumn();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq(col, orderId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
      // Mark as read
      const unread = data.filter(m => m.sender_role !== "customer" && !m.read_at && m.sender_id !== user?.id);
      if (unread.length > 0) {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() } as any)
          .in("id", unread.map(m => m.id))
          .eq("receiver_id" as any, user?.id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    const col = getRefColumn();
    const channel = supabase
      .channel(`chat:${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `${col}=eq.${orderId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const msg = payload.new as Message;
            setMessages(prev => [...prev, msg]);
            if (msg.sender_role !== "customer" && msg.sender_id !== user?.id) {
              // Mark read
              supabase.from("messages").update({ read_at: new Date().toISOString() } as any).eq("id", msg.id).eq("receiver_id" as any, user?.id);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId, orderType]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user) return;

    setSending(true);
    const col = getRefColumn();
    try {
      const { error } = await supabase.functions.invoke("send-message", {
        body: {
          [col]: orderId,
          content: newMessage.trim(),
        },
      });

      if (error) throw error;
      setNewMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>;

  return (
    <div className="flex flex-col h-[500px] bg-background rounded-2xl border border-border overflow-hidden shadow-xl">
      <div className="p-4 border-b border-border bg-card flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User className="h-4 w-4"/>
          </div>
          <div>
            <p className="text-sm font-bold">Chat with Rider</p>
            <p className="text-[10px] text-muted-foreground">Active Order</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X className="h-4 w-4 text-muted-foreground"/>
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No messages yet. Say hi to your rider!
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_role === "customer";
          const isSystem = msg.sender_role === "system";

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-muted px-3 py-1 rounded-full text-[10px] text-muted-foreground flex items-center gap-1">
                  <Bot className="h-3 w-3"/> {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none border border-border"}`}>
                <p>{msg.content}</p>
                <p className={`text-[9px] mt-1 ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-card flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-muted/50 border-none rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim() || sending} className="rounded-xl h-9 w-9">
          {sending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
        </Button>
      </form>
    </div>
  );
};
