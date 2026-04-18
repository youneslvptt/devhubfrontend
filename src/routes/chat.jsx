import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Hash, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceChannels } from "@/hooks/useWorkspaceChannels";
import { api } from "@/lib/api";
import { CHAT_MESSAGES_API_PATH } from "@/lib/config";
import { getSocket } from "@/lib/socket";
import { ChannelSidebar } from "@/components/chat/ChannelSidebar";
import { MessageList, } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { OnlineUsersPanel, } from "@/components/chat/OnlineUsersPanel";
export const Route = createFileRoute("/chat")({
    validateSearch: (search) => ({
        channelId: typeof search.channelId === "string" ? search.channelId : undefined,
    }),
    head: () => ({
        meta: [
            { title: "Chat - Devhub" },
            { name: "description", content: "Real-time team chat workspace." },
        ],
    }),
    component: ChatPage,
});
function ChatPage() {
    const navigate = useNavigate();
    const search = Route.useSearch();
    const { user, isAuthenticated, logout } = useAuth();
    const { channels, loading: loadingChannels } = useWorkspaceChannels();
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const typingTimers = useRef({});
    const stopTypingTimer = useRef(null);
    const isTypingRef = useRef(false);
    const activeChannelId = useMemo(() => {
        if (search.channelId && channels.some((channel) => channel._id === search.channelId)) {
            return search.channelId;
        }
        return channels[0]?._id ?? "";
    }, [channels, search.channelId]);
    const activeChannel = useMemo(() => channels.find((channel) => channel._id === activeChannelId) ?? channels[0], [activeChannelId, channels]);
    useEffect(() => {
        if (typeof window !== "undefined" && !isAuthenticated) {
            navigate({ to: "/login" });
        }
    }, [isAuthenticated, navigate]);
    useEffect(() => {
        if (!channels.length || !activeChannelId)
            return;
        if (search.channelId === activeChannelId)
            return;
        console.log("[chat] normalizing selected channel", {
            requested: search.channelId,
            resolved: activeChannelId,
        });
        navigate({
            to: "/chat",
            search: { channelId: activeChannelId },
            replace: true,
        });
    }, [activeChannelId, channels.length, navigate, search.channelId]);
    useEffect(() => {
        if (!isAuthenticated || !activeChannel)
            return;
        const socket = getSocket();
        console.log("[chat] joining socket room", { channelId: activeChannel._id });
        socket.emit("joinChannel", activeChannel._id);
        const onReceive = (message) => {
            if (!message.channel || message.channel === activeChannel._id) {
                setMessages((current) => [...current, message]);
            }
        };
        const onTyping = (payload) => {
            if (payload.channel && payload.channel !== activeChannel._id)
                return;
            const username = payload.user;
            if (!username || username === user?.username)
                return;
            setTypingUsers((current) => (current.includes(username) ? current : [...current, username]));
            if (typingTimers.current[username]) {
                clearTimeout(typingTimers.current[username]);
            }
            typingTimers.current[username] = setTimeout(() => {
                setTypingUsers((current) => current.filter((entry) => entry !== username));
                delete typingTimers.current[username];
            }, 2000);
        };
        const onStopTyping = (payload) => {
            if (payload.channel && payload.channel !== activeChannel._id)
                return;
            const username = payload.user;
            if (!username)
                return;
            setTypingUsers((current) => current.filter((entry) => entry !== username));
            if (typingTimers.current[username]) {
                clearTimeout(typingTimers.current[username]);
                delete typingTimers.current[username];
            }
        };
        const onOnlineUsers = (payload) => {
            const nextUsers = Array.isArray(payload) ? payload : payload.users ?? [];
            setOnlineUsers(nextUsers);
        };
        const onUserJoined = (onlineUser) => {
            if (!onlineUser?.username)
                return;
            setOnlineUsers((current) => current.some((entry) => entry.username === onlineUser.username)
                ? current
                : [...current, onlineUser]);
        };
        const onUserLeft = (onlineUser) => {
            const username = typeof onlineUser === "string" ? onlineUser : onlineUser?.username;
            if (!username)
                return;
            setOnlineUsers((current) => current.filter((entry) => entry.username !== username));
        };
        socket.on("receiveMessage", onReceive);
        socket.on("typing", onTyping);
        socket.on("stopTyping", onStopTyping);
        socket.on("onlineUsers", onOnlineUsers);
        socket.on("userJoined", onUserJoined);
        socket.on("userLeft", onUserLeft);
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
    }, [activeChannel, isAuthenticated, user?.role, user?.username]);
    useEffect(() => {
        if (!isAuthenticated || !activeChannel)
            return;
        let cancelled = false;
        setLoadingMessages(true);
        setMessages([]);
        console.log("[chat] fetching channel messages", {
            channelId: activeChannel._id,
            endpoint: `${CHAT_MESSAGES_API_PATH}/${activeChannel._id}`,
        });
        api
            .get(`${CHAT_MESSAGES_API_PATH}/${activeChannel._id}`)
            .then((response) => {
            if (cancelled)
                return;
            const data = response.data;
            const nextMessages = Array.isArray(data)
                ? data
                : Array.isArray(data?.messages)
                    ? data.messages
                    : Array.isArray(data?.data)
                        ? data.data
                        : [];
            setMessages(nextMessages);
        })
            .catch((error) => {
            if (cancelled)
                return;
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                logout();
                return;
            }
            console.error("[chat] failed to fetch messages", error);
        })
            .finally(() => {
            if (!cancelled) {
                setLoadingMessages(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [activeChannel, isAuthenticated, logout]);
    function handleSend(content, attachments) {
        if (!user || !activeChannel)
            return;
        if (!content && attachments.length === 0)
            return;
        const socket = getSocket();
        const payload = {
            sender: user.username,
            channel: activeChannel._id,
            content,
            attachments,
        };
        console.log("[chat] sending message", {
            channelId: activeChannel._id,
            hasAttachments: attachments.length > 0,
        });
        socket.emit("sendMessage", payload);
        setMessages((current) => [
            ...current,
            {
                ...payload,
                _id: `local-${Date.now()}`,
                createdAt: new Date().toISOString(),
            },
        ]);
        if (isTypingRef.current) {
            socket.emit("stopTyping", { channel: activeChannel._id, user: user.username });
            isTypingRef.current = false;
        }
    }
    function handleTyping() {
        if (!user || !activeChannel)
            return;
        const socket = getSocket();
        if (!isTypingRef.current) {
            socket.emit("typing", { channel: activeChannel._id, user: user.username });
            isTypingRef.current = true;
        }
        if (stopTypingTimer.current) {
            clearTimeout(stopTypingTimer.current);
        }
        stopTypingTimer.current = setTimeout(() => {
            socket.emit("stopTyping", { channel: activeChannel._id, user: user.username });
            isTypingRef.current = false;
        }, 1500);
    }
    function handleChannelSelect(channelId) {
        console.log("[chat] channel selected", { channelId });
        navigate({
            to: "/chat",
            search: { channelId },
        });
    }
    if (!isAuthenticated) {
        return (<div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Redirecting...
      </div>);
    }
    return (<div className="flex h-screen overflow-hidden bg-background">
      <ChannelSidebar channels={channels} activeChannelId={activeChannelId} onSelect={handleChannelSelect} user={user} onLogout={logout}/>

      <main className="flex h-full flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated">
              <Hash className="h-4 w-4 text-primary"/>
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-foreground">
                {activeChannel?.name ?? "Select a channel"}
              </h1>
              {activeChannel?.description && (<p className="text-[11px] text-muted-foreground">{activeChannel.description}</p>)}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-4 w-4"/>
            <span>Live</span>
            <span className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-success"/>
          </div>
        </header>

        {loadingChannels ? (<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading channels...
          </div>) : loadingMessages ? (<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading messages...
          </div>) : !activeChannel ? (<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            No channels available yet.
          </div>) : (<MessageList messages={messages} currentUsername={user?.username}/>)}

        <TypingIndicator users={typingUsers}/>

        <MessageInput channelName={activeChannel?.name ?? ""} onSend={handleSend} onTyping={handleTyping} disabled={!activeChannel}/>
      </main>

      <OnlineUsersPanel users={onlineUsers} currentUsername={user?.username}/>
    </div>);
}
