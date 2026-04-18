import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowLeft,
  Hash,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/auth";
import { DEFAULT_CHANNELS } from "@/lib/channels";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Devhub" },
      {
        name: "description",
        content: "Manage workspace users, channels and activity.",
      },
    ],
  }),
  component: AdminPage,
});

const MOCK_USERS = [
  { id: "1", username: "ada.lovelace", email: "ada@devhub.io", role: "founder", status: "online" },
  { id: "2", username: "linus.t", email: "linus@devhub.io", role: "admin", status: "online" },
  { id: "3", username: "grace.h", email: "grace@devhub.io", role: "developer", status: "online" },
  { id: "4", username: "alan.k", email: "alan@devhub.io", role: "developer", status: "away" },
  { id: "5", username: "tim.b", email: "tim@devhub.io", role: "developer", status: "offline" },
  { id: "6", username: "margaret.h", email: "margaret@devhub.io", role: "developer", status: "online" },
] as const;

const STAT_CARDS = [
  { label: "Active members", value: "24", delta: "+3 this week", icon: Users },
  { label: "Channels", value: String(DEFAULT_CHANNELS.length), delta: "All healthy", icon: Hash },
  { label: "Messages today", value: "1,284", delta: "+18%", icon: MessageSquare },
  { label: "Engagement", value: "92%", delta: "Above target", icon: TrendingUp },
];

function roleBadge(role: string) {
  const map: Record<string, string> = {
    founder: "bg-primary/15 text-primary border-primary/30",
    admin: "bg-warning/15 text-warning border-warning/30",
    developer: "bg-muted text-muted-foreground border-border",
  };
  return map[role] ?? map.developer;
}

function statusDot(status: string) {
  const map: Record<string, string> = {
    online: "bg-success",
    away: "bg-warning",
    offline: "bg-muted-foreground/40",
  };
  return map[status] ?? map.offline;
}

function AdminPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated) {
      navigate({ to: "/login" });
      return;
    }
    if (!isAdmin(user)) {
      navigate({ to: "/chat" });
    }
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated || !isAdmin(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking permissions…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/chat"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Back to chat"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h1 className="font-display text-xl font-semibold tracking-tight">
                  Admin Dashboard
                </h1>
              </div>
              <p className="text-xs text-muted-foreground">
                Manage users, channels and workspace activity.
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium capitalize ${roleBadge(user?.role ?? "developer")}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {user?.role}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((s) => (
            <div
              key={s.label}
              className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft"
            >
              <div className="absolute inset-0 bg-gradient-glow opacity-40" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </span>
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-3 font-display text-3xl font-semibold text-foreground">
                  {s.value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{s.delta}</div>
              </div>
            </div>
          ))}
        </section>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Users */}
          <section className="lg:col-span-2 rounded-2xl border border-border bg-surface shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Workspace members</h2>
                <p className="text-xs text-muted-foreground">{MOCK_USERS.length} accounts</p>
              </div>
              <button className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                Invite member
              </button>
            </div>
            <ul className="divide-y divide-border">
              {MOCK_USERS.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-surface-elevated/60"
                >
                  <div className="relative">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-[11px] font-semibold text-primary-foreground">
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${statusDot(u.status)}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {u.username}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </div>
                  </div>
                  <span
                    className={`hidden rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:inline-flex ${roleBadge(u.role)}`}
                  >
                    {u.role}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Channels */}
          <section className="rounded-2xl border border-border bg-surface shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Channels</h2>
                <p className="text-xs text-muted-foreground">
                  {DEFAULT_CHANNELS.length} active
                </p>
              </div>
              <button className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                New
              </button>
            </div>
            <ul className="divide-y divide-border">
              {DEFAULT_CHANNELS.map((c) => (
                <li
                  key={c._id}
                  className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-surface-elevated/60"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated">
                    <Hash className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {c.name}
                    </div>
                    {c.description && (
                      <div className="truncate text-xs text-muted-foreground">
                        {c.description}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
