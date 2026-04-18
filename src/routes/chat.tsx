import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Hash, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { DEFAULT_CHANNELS, type Channel } from "@/lib/channels";
import { ChannelSidebar } from "@/components/chat/ChannelSidebar";
import { MessageList, type ChatMessage, type MessageAttachment } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { OnlineUsersPanel, type OnlineUser } from "@/components/chat/OnlineUsersPanel";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Devhub" },
      { name: "description", content: "Real-time team chat workspace." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [channels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>(DEFAULT_CHANNELS[0]._id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const activeChannel = useMemo(
    () => channels.find((c) => c._id === activeChannelId) ?? channels[0],
    [channels, activeChannelId],
  );

  // Redirect unauthenticated users
  useEffect(() => {
    if (typeof window !== "undefined" && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, navigate]);

  // Socket lifecycle + listeners
  useEffect(() => {
    if (!isAuthenticated || !activeChannel) return;
    const socket = getSocket();

    socket.emit("joinChannel", activeChannel._id);

    const onReceive = (msg: ChatMessage) => {
      // Only append if it belongs to current channel (or no channel info)
      if (!msg.channel || msg.channel === activeChannel._id) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const onTyping = (payload: { channel?: string; user?: string }) => {
      if (payload?.channel && payload.channel !== activeChannel._id) return;
      const u = payload?.user;
      if (!u || u === user?.username) return;
      setTypingUsers((prev) => (prev.includes(u) ? prev : [...prev, u]));
      if (typingTimers.current[u]) clearTimeout(typingTimers.current[u]);
      typingTimers.current[u] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((x) => x !== u));
        delete typingTimers.current[u];
      }, 2000);
    };

    const onStopTyping = (payload: { channel?: string; user?: string }) => {
      if (payload?.channel && payload.channel !== activeChannel._id) return;
      const u = payload?.user;
      if (!u) return;
      setTypingUsers((prev) => prev.filter((x) => x !== u));
      if (typingTimers.current[u]) {
        clearTimeout(typingTimers.current[u]);
        delete typingTimers.current[u];
      }
    };

    socket.on("receiveMessage", onReceive);
    socket.on("typing", onTyping);
    socket.on("stopTyping", onStopTyping);

    // Online users — backend should emit one of these
    const onOnlineUsers = (payload: OnlineUser[] | { users?: OnlineUser[] }) => {
      const list = Array.isArray(payload) ? payload : (payload?.users ?? []);
      setOnlineUsers(list);
    };
    const onUserJoined = (u: OnlineUser) => {
      if (!u?.username) return;
      setOnlineUsers((prev) =>
        prev.some((x) => x.username === u.username) ? prev : [...prev, u],
      );
    };
    const onUserLeft = (u: OnlineUser | string) => {
      const username = typeof u === "string" ? u : u?.username;
      if (!username) return;
      setOnlineUsers((prev) => prev.filter((x) => x.username !== username));
    };
    socket.on("onlineUsers", onOnlineUsers);
    socket.on("userJoined", onUserJoined);
    socket.on("userLeft", onUserLeft);

    // Announce ourselves so backend can include us in the list
    if (user?.username) {
      socket.emit("userOnline", { username: user.username, role: user.role });
    }

    return () => {
      socket.off("receiveMessage", onReceive);
      socket.off("typing", onTyping);
      socket.off("stopTyping", onStopTyping);
      socket.off("onlineUsers", onOnlineUsers);
      socket.off("userJoined", onUserJoined);
      socket.off("userLeft", onUserLeft);
      Object.values(typingTimers.current).forEach(clearTimeout);
      typingTimers.current = {};
      setTypingUsers([]);
    };
  }, [isAuthenticated, activeChannel, user?.username, user?.role]);

  // Load messages on channel change
  useEffect(() => {
    if (!isAuthenticated || !activeChannel) return;
    let cancelled = false;
    setLoadingMessages(true);
    setMessages([]);
    api
      .get(`/api/chat/${activeChannel._id}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        const list: ChatMessage[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.messages)
            ? data.messages
            : Array.isArray(data?.data)
              ? data.data
              : [];
        setMessages(list);
      })
      .catch((err) => {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          logout();
        }
        // Otherwise silently keep empty list
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, activeChannel, logout]);

  function handleSend(content: string, attachments: MessageAttachment[]) {
    if (!user || !activeChannel) return;
    if (!content && attachments.length === 0) return;
    const socket = getSocket();
    const payload = {
      sender: user.username,
      channel: activeChannel._id,
      content,
      attachments,
    };
    socket.emit("sendMessage", payload);
    // Optimistic local append
    setMessages((prev) => [
      ...prev,
      {
        ...payload,
        _id: `local-${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
    ]);
    // Stop typing
    if (isTypingRef.current) {
      socket.emit("stopTyping", { channel: activeChannel._id, user: user.username });
      isTypingRef.current = false;
    }
  }

  function handleTyping() {
    if (!user || !activeChannel) return;
    const socket = getSocket();
    if (!isTypingRef.current) {
      socket.emit("typing", { channel: activeChannel._id, user: user.username });
      isTypingRef.current = true;
    }
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => {
      socket.emit("stopTyping", { channel: activeChannel._id, user: user.username });
      isTypingRef.current = false;
    }, 1500);
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ChannelSidebar
        channels={channels}
        activeChannelId={activeChannelId}
        onSelect={setActiveChannelId}
        user={user}
        onLogout={logout}
      />

      <main className="flex h-full flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated">
              <Hash className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-foreground">
                {activeChannel?.name}
              </h1>
              {activeChannel?.description && (
                <p className="text-[11px] text-muted-foreground">
                  {activeChannel.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Live</span>
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          </div>
        </header>

        {loadingMessages ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading messages…
          </div>
        ) : (
          <MessageList messages={messages} currentUsername={user?.username} />
        )}

        <TypingIndicator users={typingUsers} />

        <MessageInput
          channelName={activeChannel?.name ?? ""}
          onSend={handleSend}
          onTyping={handleTyping}
        />
      </main>
    </div>
  );
}
