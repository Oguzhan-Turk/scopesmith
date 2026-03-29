import { useState } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "right";
}

export function Tooltip({ content, children, className, side = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const positionClass = side === "right"
    ? "left-full top-1/2 -translate-y-1/2 ml-2"
    : "bottom-full left-1/2 -translate-x-1/2 mb-2";

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50",
            positionClass,
            "w-64 px-3 py-2 text-xs rounded-md shadow-md",
            "bg-popover text-popover-foreground border",
            "whitespace-pre-wrap pointer-events-none",
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
