import { Separator } from "@/components/ui/separator";
import type { ReactNode } from "react";

/**
 * Lightweight markdown renderer for AI-generated content.
 * Handles: # h1, ## h2 section headings, - bullet lists, **bold**, plain paragraphs.
 * Renders each ## section with a left border, matching the Teknik Analiz visual style.
 */
export default function MarkdownBody({ text }: { text: string }) {
  const lines = text.split("\n");
  const sections: { heading: string | null; body: string[] }[] = [];
  let current: { heading: string | null; body: string[] } = { heading: null, body: [] };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current.heading !== null || current.body.some((l) => l.trim())) {
        sections.push(current);
      }
      current = { heading: line.replace(/^## /, "").trim(), body: [] };
    } else if (line.startsWith("# ")) {
      if (current.body.some((l) => l.trim())) sections.push(current);
      current = { heading: line.replace(/^# /, "").trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.heading !== null || current.body.some((l) => l.trim())) {
    sections.push(current);
  }

  if (sections.length === 0) {
    return <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">{text}</div>;
  }

  const renderInline = (raw: string): ReactNode[] => {
    const parts = raw.split(/(\*\*.*?\*\*)/g);
    return parts.filter(Boolean).map((part, idx) => {
      const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
      if (boldMatch) {
        return <strong key={idx}>{boldMatch[1]}</strong>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <>
      {sections.map((sec, i) => {
        const bodyLines = sec.body.filter((l, idx, arr) => {
          if (l.trim()) return true;
          const hasContentBefore = arr.slice(0, idx).some((x) => x.trim());
          const hasContentAfter = arr.slice(idx + 1).some((x) => x.trim());
          return hasContentBefore && hasContentAfter;
        });
        const isFirst = i === 0;

        return (
          <div key={i}>
            {i > 0 && <Separator />}
            <div className={`border-l-2 pl-4 py-3 ${isFirst ? "border-primary/40" : "border-primary/20"}`}>
              {sec.heading && (
                <h4 className={`text-sm font-semibold mb-1.5 ${isFirst ? "text-primary/80" : "text-primary/60"}`}>
                  {sec.heading}
                </h4>
              )}
              <div className="text-sm leading-relaxed space-y-1">
                {bodyLines.map((line, j) => {
                  const bulletMatch = line.match(/^[-*]\s+(.*)/);
                  if (bulletMatch) {
                    return (
                      <div key={j} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-foreground/40 flex-shrink-0" />
                        <span>{renderInline(bulletMatch[1])}</span>
                      </div>
                    );
                  }
                  if (!line.trim()) return <div key={j} className="h-1" />;
                  return <p key={j}>{renderInline(line)}</p>;
                })}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
