import { Users, Circle } from "lucide-react";

export interface OnlineUser {
  _id?: string;
  id?: string;
  username: string;
  role?: string;
  avatar?: string;
}

interface Props {
  users: OnlineUser[];
  currentUsername?: string;
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

export function OnlineUsersPanel({ users, currentUsername }: Props) {
  // Dedupe by username, current user first
  const seen = new Set<string>();
  const sorted = [...users]
    .filter((u) => {
      if (!u?.username || seen.has(u.username)) return false;
      seen.add(u.username);
      return true;
    })
    .sort((a, b) => {
      if (a.username === currentUsername) return -1;
      if (b.username === currentUsername) return 1;
      return a.username.localeCompare(b.username);
    });

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-l border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-elevated">
          <Users className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">Members</div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Circle className="h-1.5 w-1.5 fill-success text-success" />
            {sorted.length} online
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
        {sorted.length === 0 ? (
          <p className="px-3 text-xs text-muted-foreground">No one online yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {sorted.map((u) => {
              const isMe = u.username === currentUsername;
              return (
                <li
                  key={u._id ?? u.id ?? u.username}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent/60"
                >
                  <div className="relative">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-background"
                      style={{ backgroundColor: colorFor(u.username) }}
                    >
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-sidebar bg-success" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-foreground">
                        {u.username}
                      </span>
                      {isMe && (
                        <span className="rounded-sm bg-primary/15 px-1 py-0 text-[9px] font-semibold uppercase tracking-wide text-primary">
                          you
                        </span>
                      )}
                    </div>
                    {u.role && (
                      <div className="truncate text-[10px] capitalize text-muted-foreground">
                        {u.role}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
