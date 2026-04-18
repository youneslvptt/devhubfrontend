import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Download } from "lucide-react";

export interface MessageAttachment {
  url: string;
  name?: string;
  type?: string; // mime type
  size?: number;
}

export interface ChatMessage {
  _id?: string;
  id?: string;
  sender: string | { username?: string; _id?: string };
  channel?: string;
  content: string;
  createdAt?: string;
  timestamp?: string;
  attachments?: MessageAttachment[];
}

interface Props {
  messages: ChatMessage[];
  currentUsername?: string;
}

function getSenderName(m: ChatMessage): string {
  if (typeof m.sender === "string") return m.sender;
  return m.sender?.username ?? "Unknown";
}

function formatTime(m: ChatMessage): string {
  const ts = m.createdAt ?? m.timestamp;
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatBytes(n?: number) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const COLORS = [
  "oklch(0.78 0.16 215)",
  "oklch(0.74 0.16 155)",
  "oklch(0.82 0.16 80)",
  "oklch(0.72 0.18 320)",
  "oklch(0.7 0.2 25)",
  "oklch(0.76 0.16 260)",
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function isImage(att: MessageAttachment) {
  if (att.type?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(att.url);
}

export function MessageList({ messages, currentUsername }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  const grouped = useMemo(() => {
    const out: Array<{ key: string; sender: string; ts?: string; items: ChatMessage[] }> = [];
    let last: (typeof out)[number] | null = null;
    for (const m of messages) {
      const sender = getSenderName(m);
      if (last && last.sender === sender) {
        last.items.push(m);
      } else {
        last = { key: `${m._id ?? m.id ?? Math.random()}`, sender, ts: m.createdAt ?? m.timestamp, items: [m] };
        out.push(last);
      }
    }
    return out;
  }, [messages]);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(atBottom);
  }

  return (
    <div
      onScroll={onScroll}
      className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6"
    >
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated">
              <span className="font-mono text-2xl text-primary">#</span>
            </div>
            <p className="text-sm text-muted-foreground">
              No messages yet. Be the first to say hi 👋
            </p>
          </div>
        </div>
      ) : (
        <ul className="mx-auto max-w-3xl space-y-5">
          {grouped.map((g) => {
            const isMe = g.sender === currentUsername;
            return (
              <li key={g.key} className="group flex gap-3">
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-background"
                  style={{ backgroundColor: colorFor(g.sender) }}
                >
                  {g.sender.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {g.sender}
                      {isMe && (
                        <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                          you
                        </span>
                      )}
                    </span>
                    {g.items[0] && (
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(g.items[0])}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 space-y-2">
                    {g.items.map((m, i) => (
                      <div key={m._id ?? m.id ?? i} className="space-y-2">
                        {m.content && (
                          <p className="break-words text-[14px] leading-relaxed text-foreground/90">
                            {m.content}
                          </p>
                        )}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {m.attachments.map((att, idx) => (
                              <Attachment key={idx} att={att} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function Attachment({ att }: { att: MessageAttachment }) {
  if (isImage(att)) {
    return (
      <a
        href={att.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-sm overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-primary/40 hover:shadow-glow"
      >
        <img
          src={att.url}
          alt={att.name ?? "attachment"}
          className="max-h-80 w-full object-cover"
          loading="lazy"
        />
      </a>
    );
  }
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      download={att.name}
      className="flex max-w-sm items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-all hover:border-primary/40 hover:bg-surface-elevated"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {att.name ?? "Attachment"}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {[att.type, formatBytes(att.size)].filter(Boolean).join(" · ")}
        </div>
      </div>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  );
}
