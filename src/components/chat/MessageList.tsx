import { useEffect, useMemo, useRef, useState } from "react";

export interface ChatMessage {
  _id?: string;
  id?: string;
  sender: string | { username?: string; _id?: string };
  channel?: string;
  content: string;
  createdAt?: string;
  timestamp?: string;
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
                  <div className="mt-0.5 space-y-1">
                    {g.items.map((m, i) => (
                      <p
                        key={m._id ?? m.id ?? i}
                        className="break-words text-[14px] leading-relaxed text-foreground/90"
                      >
                        {m.content}
                      </p>
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
