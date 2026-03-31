import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "right" | "left";
}

export function Tooltip({ content, children, className, side = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!visible || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    if (side === "right") {
      setPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    } else if (side === "left") {
      setPos({ top: rect.top + rect.height / 2, left: rect.left - 8 });
    } else {
      setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    }
  }, [visible, side]);

  const positionClass =
    side === "right"
      ? "-translate-y-1/2"
      : side === "left"
      ? "-translate-y-1/2 -translate-x-full"
      : "-translate-x-1/2 -translate-y-full";

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible &&
        createPortal(
          <div
            role="tooltip"
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
            className={cn(
              positionClass,
              "max-w-xs px-3 py-2 text-xs rounded-md shadow-md",
              "bg-popover text-popover-foreground border",
              "whitespace-pre-wrap pointer-events-none",
              className
            )}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
