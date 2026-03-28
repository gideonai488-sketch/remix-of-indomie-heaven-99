import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Star, Send, Bot, User, Loader2, Heart } from "lucide-react";
import { MenuItem } from "@/data/menu";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface FoodDetailModalProps {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ChatMsg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/food-chat`;

const FoodDetailModal = ({ item, open, onOpenChange }: FoodDetailModalProps) => {
  const { addItem } = useCart();
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const [isFav, setIsFav] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setQty(1);
      setChatMessages([]);
      setChatInput("");
      // Check favorite status
      if (user) {
        supabase.from("favorites").select("id").eq("user_id", user.id).eq("item_id", item.id).maybeSingle().then(({ data }) => {
          setIsFav(!!data);
        });
      } else {
        setIsFav(false);
      }
    }
  }, [item?.id, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (!item) return null;

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) addItem(item);
    toast.success(`${qty}x ${item.name} added to cart!`, { duration: 1500 });
    onOpenChange(false);
  };

  const toggleFav = async () => {
    if (!user) { toast.error("Sign in to save favorites"); return; }
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("item_id", item.id);
      setIsFav(false);
      toast.success("Removed from favorites");
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, item_id: item.id });
      setIsFav(true);
      toast.success("Added to favorites ❤️");
    }
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || isAiLoading) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setIsAiLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          foodName: item.name,
          foodDescription: item.description,
          foodPrice: item.price,
          foodCategory: item.category,
          foodSpiceLevel: item.spiceLevel,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI unavailable" }));
        toast.error(err.error || "AI unavailable");
        setIsAiLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setChatMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to get AI response");
    }

    setIsAiLoading(false);
  };

  const suggestedQuestions = [
    "What's in this dish?",
    "How spicy is it?",
    "What pairs well with this?",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-card border-border">
        {/* Hero image */}
        <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          {item.popular && (
            <div className="absolute left-3 top-3 rounded-md bg-spicy-red px-2.5 py-1 text-xs font-bold text-spicy-red-foreground">
              🔥 Popular
            </div>
          )}
          <button onClick={toggleFav} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/40 backdrop-blur-sm transition-colors hover:bg-foreground/60">
            <Heart className={`h-5 w-5 ${isFav ? "fill-spicy-red text-spicy-red" : "text-primary-foreground"}`} />
          </button>
          <div className="absolute bottom-3 right-3 rounded-lg bg-foreground/80 px-4 py-1.5 text-lg font-extrabold text-primary-foreground backdrop-blur-sm">
            GH₵{item.price.toFixed(2)}
          </div>
        </div>

        {/* Details */}
        <div className="p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-card-foreground">{item.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-base leading-relaxed">
              {item.description}
            </DialogDescription>
          </DialogHeader>

          {/* Meta */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1 font-semibold text-success">
              <Star className="h-4 w-4 fill-current" /> 4.9
            </span>
            {item.orders && (
              <span className="text-muted-foreground">{item.orders.toLocaleString()} orders</span>
            )}
            <span className="text-muted-foreground">
              {"🌶️".repeat(item.spiceLevel) || "😊 Mild"}
            </span>
            <span className="rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground capitalize">
              {item.category}
            </span>
          </div>

          {/* Quantity + Add */}
          <div className="mt-5 flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(Math.max(1, qty - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-bold text-foreground">{qty}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(qty + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleAdd} className="flex-1 bg-gradient-warm text-primary-foreground font-bold shadow-warm hover:opacity-90">
              <Plus className="h-4 w-4 mr-1" />
              Add {qty}x — GH₵{(item.price * qty).toFixed(2)}
            </Button>
          </div>
        </div>

        {/* AI Chat section */}
        <div className="border-t border-border p-5">
          <h4 className="mb-3 flex items-center gap-2 font-bold text-card-foreground">
            <Bot className="h-5 w-5 text-primary" />
            Ask AI about this dish
          </h4>

          {/* Suggested questions */}
          {chatMessages.length === 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => { setChatInput(q); }}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Chat messages */}
          {chatMessages.length > 0 && (
            <div className="mb-3 max-h-48 space-y-3 overflow-y-auto rounded-lg bg-background p-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-card-foreground"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isAiLoading && chatMessages[chatMessages.length - 1]?.role === "user" && (
                <div className="flex gap-2">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Ask anything about this dish..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={sendChat} disabled={isAiLoading || !chatInput.trim()} size="icon" className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FoodDetailModal;
