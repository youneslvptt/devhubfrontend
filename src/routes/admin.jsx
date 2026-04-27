// admin.jsx (updated with Create Account modal)
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Hash,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceChannels } from "@/hooks/useWorkspaceChannels";
import { isAdmin } from "@/lib/auth";
import { fetchWorkspaceMembers, inviteWorkspaceMember } from "@/lib/members";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api"; // ✅ NEW import

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard - Devhub" },
      {
        name: "description",
        content: "Manage workspace users, channels and activity.",
      },
    ],
  }),
  component: AdminPage,
});

function roleBadge(role) {
  const map = {
    founder: "bg-primary/15 text-primary border-primary/30",
    admin: "bg-warning/15 text-warning border-warning/30",
    developer: "bg-muted text-muted-foreground border-border",
  };
  return map[role] ?? map.developer;
}

function statusDot(status) {
  const map = {
    online: "bg-success",
    away: "bg-warning",
    offline: "bg-muted-foreground/40",
    invited: "bg-primary/60",
  };
  return map[status] ?? map.offline;
}

function AdminPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { channels, addChannel, loading: loadingChannels } = useWorkspaceChannels();

  const [members, setMembers] = useState([]);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [memberIdentifier, setMemberIdentifier] = useState("");
  const [inviteChannelId, setInviteChannelId] = useState("");
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [isInvitingMember, setIsInvitingMember] = useState(false);

  // ✅ NEW state for Create Account modal
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("developer");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated) {
      navigate({ to: "/login" });
      return;
    }
    if (!isAdmin(user)) {
      navigate({ to: "/chat", search: { channelId: undefined } });
    }
  }, [isAuthenticated, navigate, user]);

  // Fetch real members from backend
  useEffect(() => {
    let cancelled = false;
    async function loadMembers() {
      try {
        const fetchedMembers = await fetchWorkspaceMembers();
        if (!cancelled) setMembers(fetchedMembers);
      } catch (error) {
        console.error("[admin] failed to load members", error);
        toast.error("Failed to load members");
      }
    }
    loadMembers();
    return () => {
      cancelled = true;
    };
  }, []);

  // Set default channel for invite
  useEffect(() => {
    if (!inviteChannelId && channels.length > 0) {
      setInviteChannelId(channels[0]._id);
    }
  }, [channels, inviteChannelId]);

  // Statistics using real data
  const statCards = useMemo(() => [
    {
      label: "Active members",
      value: String(members.length),
      delta: `${members.filter((member) => member.status === "online").length} online now`,
      icon: Users,
    },
    {
      label: "Channels",
      value: String(channels.length),
      delta: loadingChannels ? "Syncing..." : "Ready for chat",
      icon: Hash,
    },
    {
      label: "Messages today",
      value: "—",
      delta: "",
      icon: MessageSquare,
    },
    {
      label: "Engagement",
      value: "—",
      delta: "comming soon",
      icon: TrendingUp,
    },
  ], [channels.length, loadingChannels, members]);

  if (!isAuthenticated || !isAdmin(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking permissions...
      </div>
    );
  }

  async function handleCreateChannel(event) {
    event.preventDefault();
    setIsCreatingChannel(true);
    console.log("[admin] create channel requested", {
      name: channelName,
      description: channelDescription,
    });
    try {
      const result = await addChannel({
        name: channelName,
        description: channelDescription,
      });
      setChannelName("");
      setChannelDescription("");
      setIsCreateChannelOpen(false);
      if (result.persisted) {
        toast.success(`Channel #${result.channel.name} created`);
      } else {
        toast.warning(`Channel #${result.channel.name} saved locally`, {
          description:
            "Backend POST /api/channels was unavailable, so this is a frontend fallback.",
        });
      }
    } catch (error) {
      console.error("[admin] create channel failed", error);
      toast.error("Could not create channel", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsCreatingChannel(false);
    }
  }

  async function handleInviteMember(event) {
    event.preventDefault();
    setIsInvitingMember(true);
    console.log("[admin] invite member requested", {
      identifier: memberIdentifier,
      channelId: inviteChannelId,
    });
    try {
      const result = await inviteWorkspaceMember({
        identifier: memberIdentifier,
        channelId: inviteChannelId,
      });
      const updatedMembers = await fetchWorkspaceMembers();
      setMembers(updatedMembers);
      setMemberIdentifier("");
      setInviteChannelId(channels[0]?._id ?? "");
      setIsInviteMemberOpen(false);
      if (result.persisted) {
        toast.success(`Invite sent for ${result.member.username}`);
      } else {
        toast.warning(`Invite queued for ${result.member.username}`, {
          description:
            "If the backend is unavailable, the invite is stored locally for preview purposes.",
        });
      }
    } catch (error) {
      console.error("[admin] invite member failed", error);
      toast.error("Could not invite member", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsInvitingMember(false);
    }
  }

  // ✅ NEW handler for creating a user
  async function handleCreateUser(event) {
    event.preventDefault();
    setIsCreatingUser(true);
    try {
      await api.post("http://localhost:4000/api/auth/create-user", {
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
      });
      toast.success(`Account for ${newUserEmail} created`);
      setIsCreateUserOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("developer");
      // Refresh members list
      const updatedMembers = await fetchWorkspaceMembers();
      setMembers(updatedMembers);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to create user"
      );
    } finally {
      setIsCreatingUser(false);
    }
  }

  function handleChannelClick(channelId) {
    console.log("[admin] opening channel from dashboard", { channelId });
    navigate({
      to: "/chat",
      search: { channelId },
    });
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Link
                to="/chat"
                search={{ channelId: undefined }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Back to chat"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-semibold tracking-tight">
                    Admin Dashboard
                  </h1>
                </div>
                <p className="text-xs text-muted-foreground">
                  Manage users, channels and workspace activity.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* ✅ NEW Create Account button */}
              <button
                type="button"
                onClick={() => setIsCreateUserOpen(true)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Create Account
              </button>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium capitalize ${roleBadge(
                  user?.role ?? "developer"
                )}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* ... rest of main content unchanged ... */}
          {/* (stat cards, members list, channels list, etc.) */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft"
              >
                <div className="absolute inset-0 bg-gradient-glow opacity-40" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {card.label}
                    </span>
                    <card.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-3 font-display text-3xl font-semibold text-foreground">
                    {card.value}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{card.delta}</div>
                </div>
              </div>
            ))}
          </section>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Workspace members section unchanged */}
            <section className="lg:col-span-2 rounded-2xl border border-border bg-surface shadow-soft">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Workspace members</h2>
                  <p className="text-xs text-muted-foreground">{members.length} accounts</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInviteMemberOpen(true)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Invite member
                </button>
              </div>
              <ul className="divide-y divide-border">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-surface-elevated/60"
                  >
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-[11px] font-semibold text-primary-foreground">
                        {member.username.slice(0, 2).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${statusDot(
                          member.status
                        )}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {member.username}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                    </div>
                    <span
                      className={`hidden rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:inline-flex ${roleBadge(
                        member.role
                      )}`}
                    >
                      {member.role}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Channels section unchanged */}
            <section className="rounded-2xl border border-border bg-surface shadow-soft">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Channels</h2>
                  <p className="text-xs text-muted-foreground">{channels.length} active</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateChannelOpen(true)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  New
                </button>
              </div>
              <ul className="divide-y divide-border">
                {channels.map((channel) => (
                  <li key={channel._id}>
                    <button
                      type="button"
                      onClick={() => handleChannelClick(channel._id)}
                      className="flex w-full items-center gap-3 px-6 py-3.5 text-left transition-colors hover:bg-surface-elevated/60"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated">
                        <Hash className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {channel.name}
                        </div>
                        {channel.description && (
                          <div className="truncate text-xs text-muted-foreground">
                            {channel.description}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>
      </div>

      {/* Existing Create Channel Dialog unchanged ... */}
      <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
        {/* ... same as before ... */}
      </Dialog>

      {/* Existing Invite Member Dialog unchanged ... */}
      <Dialog open={isInviteMemberOpen} onOpenChange={setIsInviteMemberOpen}>
        {/* ... same as before ... */}
      </Dialog>

      {/* ✅ NEW Create User Dialog */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="border-border bg-surface">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              An email with a temporary password will be sent automatically.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateUser}>
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Name</Label>
              <Input
                id="new-user-name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email</Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-role">Role</Label>
              <select
                id="new-user-role"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="developer">Developer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsCreateUserOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingUser}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingUser ? "Creating..." : "Create Account"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}