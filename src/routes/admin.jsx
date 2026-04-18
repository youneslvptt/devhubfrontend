import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Hash, MessageSquare, Shield, TrendingUp, Users, } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceChannels } from "@/hooks/useWorkspaceChannels";
import { isAdmin } from "@/lib/auth";
import { getWorkspaceMembers, inviteWorkspaceMember, } from "@/lib/members";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    const [members, setMembers] = useState(() => getWorkspaceMembers());
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
    const [channelName, setChannelName] = useState("");
    const [channelDescription, setChannelDescription] = useState("");
    const [memberIdentifier, setMemberIdentifier] = useState("");
    const [isCreatingChannel, setIsCreatingChannel] = useState(false);
    const [isInvitingMember, setIsInvitingMember] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined")
            return;
        if (!isAuthenticated) {
            navigate({ to: "/login" });
            return;
        }
        if (!isAdmin(user)) {
            navigate({ to: "/chat", search: { channelId: undefined } });
        }
    }, [isAuthenticated, navigate, user]);
    useEffect(() => {
        const syncMembers = () => {
            setMembers(getWorkspaceMembers());
        };
        window.addEventListener("storage", syncMembers);
        syncMembers();
        return () => {
            window.removeEventListener("storage", syncMembers);
        };
    }, []);
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
        { label: "Messages today", value: "1,284", delta: "+18%", icon: MessageSquare },
        { label: "Engagement", value: "92%", delta: "Above target", icon: TrendingUp },
    ], [channels.length, loadingChannels, members]);
    if (!isAuthenticated || !isAdmin(user)) {
        return (<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking permissions...
      </div>);
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
            }
            else {
                toast.warning(`Channel #${result.channel.name} saved locally`, {
                    description: "Backend POST /api/channels was unavailable, so this is a frontend fallback.",
                });
            }
        }
        catch (error) {
            console.error("[admin] create channel failed", error);
            toast.error("Could not create channel", {
                description: error instanceof Error ? error.message : "Please try again.",
            });
        }
        finally {
            setIsCreatingChannel(false);
        }
    }
    async function handleInviteMember(event) {
        event.preventDefault();
        setIsInvitingMember(true);
        console.log("[admin] invite member requested", { identifier: memberIdentifier });
        try {
            const result = await inviteWorkspaceMember({ identifier: memberIdentifier });
            const nextMembers = getWorkspaceMembers();
            setMembers(nextMembers);
            setMemberIdentifier("");
            setIsInviteMemberOpen(false);
            if (result.persisted && !result.requiresBackend) {
                toast.success(`Member ${result.member.username} added to the workspace`);
            }
            else {
                toast.warning(`Invite saved for ${result.member.username}`, {
                    description: "Set VITE_INVITE_MEMBER_API_PATH and a backend invite endpoint to send real invitations.",
                });
            }
        }
        catch (error) {
            console.error("[admin] invite member failed", error);
            toast.error("Could not invite member", {
                description: error instanceof Error ? error.message : "Please try again.",
            });
        }
        finally {
            setIsInvitingMember(false);
        }
    }
    function handleChannelClick(channelId) {
        console.log("[admin] opening channel from dashboard", { channelId });
        navigate({
            to: "/chat",
            search: { channelId },
        });
    }
    return (<>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Link to="/chat" search={{ channelId: undefined }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground" aria-label="Back to chat">
                <ArrowLeft className="h-4 w-4"/>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary"/>
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
              <span className="h-1.5 w-1.5 rounded-full bg-current"/>
              {user?.role}
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (<div key={card.label} className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="absolute inset-0 bg-gradient-glow opacity-40"/>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {card.label}
                    </span>
                    <card.icon className="h-4 w-4 text-primary"/>
                  </div>
                  <div className="mt-3 font-display text-3xl font-semibold text-foreground">
                    {card.value}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{card.delta}</div>
                </div>
              </div>))}
          </section>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2 rounded-2xl border border-border bg-surface shadow-soft">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Workspace members</h2>
                  <p className="text-xs text-muted-foreground">{members.length} accounts</p>
                </div>
                <button type="button" onClick={() => setIsInviteMemberOpen(true)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                  Invite member
                </button>
              </div>
              <ul className="divide-y divide-border">
                {members.map((member) => (<li key={member.id} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-surface-elevated/60">
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-[11px] font-semibold text-primary-foreground">
                        {member.username.slice(0, 2).toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${statusDot(member.status)}`}/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {member.username}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                    </div>
                    <span className={`hidden rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:inline-flex ${roleBadge(member.role)}`}>
                      {member.role}
                    </span>
                  </li>))}
              </ul>
            </section>

            <section className="rounded-2xl border border-border bg-surface shadow-soft">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Channels</h2>
                  <p className="text-xs text-muted-foreground">{channels.length} active</p>
                </div>
                <button type="button" onClick={() => setIsCreateChannelOpen(true)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                  New
                </button>
              </div>
              <ul className="divide-y divide-border">
                {channels.map((channel) => (<li key={channel._id}>
                    <button type="button" onClick={() => handleChannelClick(channel._id)} className="flex w-full items-center gap-3 px-6 py-3.5 text-left transition-colors hover:bg-surface-elevated/60">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated">
                        <Hash className="h-4 w-4 text-primary"/>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {channel.name}
                        </div>
                        {channel.description && (<div className="truncate text-xs text-muted-foreground">
                            {channel.description}
                          </div>)}
                      </div>
                    </button>
                  </li>))}
              </ul>
            </section>
          </div>
        </main>
      </div>

      <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
        <DialogContent className="border-border bg-surface">
          <DialogHeader>
            <DialogTitle>Create channel</DialogTitle>
            <DialogDescription>
              Add a new room for your team without changing the current layout.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateChannel}>
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel name</Label>
              <Input id="channel-name" value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="frontend-platform" required/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-description">Description</Label>
              <Input id="channel-description" value={channelDescription} onChange={(event) => setChannelDescription(event.target.value)} placeholder="Discuss UI architecture and shared components"/>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setIsCreateChannelOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                Cancel
              </button>
              <button type="submit" disabled={isCreatingChannel} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
                {isCreatingChannel ? "Creating..." : "Create channel"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteMemberOpen} onOpenChange={setIsInviteMemberOpen}>
        <DialogContent className="border-border bg-surface">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              Enter an email or username to add a developer to the workspace.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleInviteMember}>
            <div className="space-y-2">
              <Label htmlFor="member-identifier">Email or username</Label>
              <Input id="member-identifier" value={memberIdentifier} onChange={(event) => setMemberIdentifier(event.target.value)} placeholder="new.dev@company.com" required/>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setIsInviteMemberOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                Cancel
              </button>
              <button type="submit" disabled={isInvitingMember} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
                {isInvitingMember ? "Inviting..." : "Send invite"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>);
}
