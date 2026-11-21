import type { ReactNode } from "react";

const INLINE_PATTERN =
  /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE_PATTERN).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={key}
          className="border-2 border-line bg-paper px-1 py-0.5 text-[0.9em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    if (link) {
      return (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="pixel-link font-semibold"
        >
          {link[1]} ↗
        </a>
      );
    }
    return part;
  });
}

function isBlockStart(line: string): boolean {
  return (
    !line.trim() ||
    /^#{1,3}\s+/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^>\s?/.test(line)
  );
}

export function RichText({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]!;
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      const key = `h-${index}`;
      const content = renderInline(heading[2]!, key);
      blocks.push(
        level === 1 ? (
          <h2 key={key} className="mt-2 text-[21px] leading-snug">
            {content}
          </h2>
        ) : level === 2 ? (
          <h3 key={key} className="mt-1 text-[19px] leading-snug">
            {content}
          </h3>
        ) : (
          <h4 key={key} className="mt-1 text-[17px] leading-snug">
            {content}
          </h4>
        ),
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index]!)) {
        items.push(lines[index]!.replace(/^[-*]\s+/, ""));
        index += 1;
      }
      const key = `ul-${index}`;
      blocks.push(
        <ul key={key} className="ml-5 list-disc space-y-1">
          {items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>
              {renderInline(item, `${key}-${itemIndex}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index]!)) {
        items.push(lines[index]!.replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      const key = `ol-${index}`;
      blocks.push(
        <ol key={key} className="ml-5 list-decimal space-y-1">
          {items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>
              {renderInline(item, `${key}-${itemIndex}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index]!)) {
        quote.push(lines[index]!.replace(/^>\s?/, ""));
        index += 1;
      }
      const key = `quote-${index}`;
      blocks.push(
        <blockquote
          key={key}
          className="border-l-4 border-orange bg-paper px-4 py-2 italic"
        >
          {renderInline(quote.join(" "), key)}
        </blockquote>,
      );
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && !isBlockStart(lines[index]!)) {
      paragraph.push(lines[index]!);
      index += 1;
    }
    const key = `p-${index}`;
    blocks.push(<p key={key}>{renderInline(paragraph.join(" "), key)}</p>);
  }

  return <div className="space-y-4 text-[19px] leading-relaxed">{blocks}</div>;
}
