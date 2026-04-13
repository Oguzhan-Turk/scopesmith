import { useState, useCallback, createContext, useContext, type ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast["type"] = "error") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      {/* Toast container — aria-live for screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-card border border-border rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-start gap-3 px-4 py-3 cursor-pointer animate-in slide-in-from-bottom-2 min-w-[280px] max-w-sm"
            style={{
              borderLeft: `3px solid ${
                toast.type === "error" ? "#ef4444"
                : toast.type === "success" ? "#10b981"
                : "#6366f1"
              }`
            }}
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          >
            <span
              className="material-icons-outlined text-[18px] flex-shrink-0 mt-px"
              style={{
                color: toast.type === "error" ? "#ef4444"
                  : toast.type === "success" ? "#10b981"
                  : "#6366f1"
              }}
            >
              {toast.type === "error" ? "error_outline"
                : toast.type === "success" ? "check_circle"
                : "info"}
            </span>
            <span className="text-[0.8rem] text-foreground leading-relaxed flex-1">{toast.message}</span>
            <span className="material-icons-outlined text-[16px] text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0 mt-px transition-colors">close</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
