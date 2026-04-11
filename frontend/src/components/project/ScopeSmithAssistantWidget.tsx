import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { askSelfAssistant, type SelfAssistantAction } from "@/api/client";
import { Button } from "@/components/ui/button";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  actions?: SelfAssistantAction[];
};

interface ScopeSmithAssistantWidgetProps {
  projectId: number;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export default function ScopeSmithAssistantWidget({ projectId, showToast }: ScopeSmithAssistantWidgetProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
      {
        id: "welcome",
        role: "assistant",
        text: "Merhaba! ScopeSmith hakkında aklına takılan bir şey var mı? Bağlam güncelliği, Jira/GitHub eşitleme veya ScopeSmith'in nasıl çalıştığı gibi konularda yardımcı olabilirim.",
      },
    ]);

  const quickPrompts = useMemo(
    () => [
      "Jira ile eşitlemeyi nasıl yapabilirim?",
      "Bağlam güncelliği durumunu nasıl yorumlamalıyım?",
      "ScopeSmith ne işe yarıyor?",
    ],
    []
  );

  async function handleSend(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text || loading) return;

    setInput("");
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const reply = await askSelfAssistant({ question: text, projectId });
      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: reply.answer,
        actions: reply.actions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Assistant yanıt veremedi.";
      showToast(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `aerr-${Date.now()}`,
          role: "assistant",
          text: "Şu an yanıt üretirken hata aldım. Biraz daha spesifik bir soru ile tekrar deneyelim.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: SelfAssistantAction) {
    const target = action.target.replace(":id", String(projectId));
    if (action.actionType === "NAVIGATE" && target.startsWith("/")) {
      navigate(target);
      setOpen(false);
      return;
    }

    try {
      await navigator.clipboard.writeText(target);
      showToast(`Aksiyon hedefi kopyalandı: ${target}`, "info");
    } catch {
      showToast(`Aksiyon: ${target}`, "info");
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-background shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-muted/40 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <p className="text-sm font-semibold">ScopeSmith Assistant</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-[390px] overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground border border-border/60"
                  }`}
                >
                  <p>{message.text}</p>
                  {message.role === "assistant" && (
                    <div className="mt-2">
                      {!!message.actions?.length && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {message.actions
                            .filter((action) => action.actionType === "NAVIGATE")
                            .slice(0, 2)
                            .map((action, i) => (
                            <button
                              key={`${message.id}-act-${i}`}
                              onClick={() => handleAction(action)}
                              className="px-2 py-1 rounded-md border border-border text-[11px] hover:bg-background"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-xs text-muted-foreground px-1">Yazıyor...</div>
            )}
          </div>

          <div className="border-t border-border/70 p-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void handleSend(prompt)}
                  className="px-2 py-1 text-[11px] rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Sorunu yaz..."
                className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" onClick={() => void handleSend()} disabled={loading}>
                <Send className="w-3.5 h-3.5 mr-1" />
                Gönder
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
        aria-label="ScopeSmith Assistant"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  );
}
