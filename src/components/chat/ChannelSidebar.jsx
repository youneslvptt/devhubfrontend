import { Link, useNavigate } from "@tanstack/react-router";
import { Hash, LogOut, Shield, Terminal } from "lucide-react";
import { isAdmin } from "@/lib/auth";
export function ChannelSidebar({ channels, activeChannelId, onSelect, user, onLogout, }) {
    const navigate = useNavigate();
    const admin = isAdmin(user);
    return (<aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
          <Terminal className="h-4 w-4 text-primary-foreground"/>
        </div>
        <span className="font-display text-base font-semibold tracking-tight">
          GlobalTech - devhub
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Channels
        </div>
        <nav className="space-y-0.5">
          {channels.map((c) => {
            const active = c._id === activeChannelId;
            return (<button key={c._id} onClick={() => onSelect(c._id)} className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-all ${active
                    ? "bg-sidebar-accent text-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"}`}>
                <Hash className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`}/>
                <span className="truncate">{c.name}</span>
              </button>);
        })}
        </nav>

        {admin && (<>
            <div className="mt-6 mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Administration
            </div>
            <Link to="/admin" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-sidebar-accent/60 hover:text-foreground">
              <Shield className="h-4 w-4 text-primary"/>
              Admin Dashboard
            </Link>
          </>)}
      </div>

      {/* User card */}
      <div className="border-t border-sidebar-border bg-sidebar p-3">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/60 p-2">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
              {user?.username?.slice(0, 2).toUpperCase() ?? "U"}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-success"/>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">
              {user?.username ?? "User"}
            </div>
            <div className="truncate text-[11px] capitalize text-muted-foreground">
              {user?.role ?? "developer"}
            </div>
          </div>
          <button onClick={() => {
            onLogout();
            navigate({ to: "/login" });
        }} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive" aria-label="Sign out">
            <LogOut className="h-4 w-4"/>
          </button>
        </div>
      </div>
    </aside>);
}
