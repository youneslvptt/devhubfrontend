import { CHANNELS_API_PATH } from "./config";
import { api } from "./api";
export const DEFAULT_CHANNELS = [
    { _id: "general", name: "general", description: "Company-wide announcements" },
    { _id: "frontend", name: "frontend", description: "React, UI, design systems" },
    { _id: "backend", name: "backend", description: "APIs, databases, infra" },
    { _id: "devops", name: "devops", description: "CI/CD, deploys, incidents" },
    { _id: "design", name: "design", description: "Product & visual design" },
    { _id: "random", name: "random", description: "Off-topic chatter" },
];
const CHANNELS_STORAGE_KEY = "devhub.channels";
function slugifyChannelName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function parseStoredChannels(raw) {
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(isChannel) : [];
    }
    catch {
        return [];
    }
}
function isChannel(value) {
    return !!value && typeof value === "object" && typeof value._id === "string" && typeof value.name === "string";
}
function normalizeChannel(payload) {
    if (!payload || typeof payload !== "object")
        return null;
    const record = payload;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name)
        return null;
    const id = typeof record._id === "string"
        ? record._id
        : typeof record.id === "string"
            ? record.id
            : slugifyChannelName(name);
    return {
        _id: id,
        name,
        description: typeof record.description === "string" ? record.description.trim() : undefined,
    };
}
function mergeChannels(channels) {
    const byId = new Map();
    [...DEFAULT_CHANNELS, ...channels].forEach((channel) => {
        byId.set(channel._id, channel);
    });
    return Array.from(byId.values());
}
function persistChannels(channels) {
    if (typeof window === "undefined")
        return;
    const merged = mergeChannels(channels);
    localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("channels:updated", { detail: merged }));
}
export function getStoredChannels() {
    if (typeof window === "undefined")
        return DEFAULT_CHANNELS;
    const stored = parseStoredChannels(localStorage.getItem(CHANNELS_STORAGE_KEY));
    const merged = mergeChannels(stored);
    persistChannels(merged);
    return merged;
}
export async function fetchChannels() {
    try {
        console.log("[channels] fetching channel list", { endpoint: CHANNELS_API_PATH });
        const response = await api.get(CHANNELS_API_PATH);
        const payload = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data?.channels)
                ? response.data.channels
                : Array.isArray(response.data?.data)
                    ? response.data.data
                    : [];
        const channels = payload
            .map(normalizeChannel)
            .filter((channel) => !!channel);
        if (channels.length > 0) {
            persistChannels(channels);
            return mergeChannels(channels);
        }
    }
    catch (error) {
        console.warn("[channels] failed to fetch channels from backend, using local state", error);
    }
    return getStoredChannels();
}
export async function createChannel({ name, description, }) {
    const trimmedName = name.trim();
    const trimmedDescription = description?.trim();
    const slug = slugifyChannelName(trimmedName);
    const existingChannel = getStoredChannels().find((channel) => channel._id.toLowerCase() === slug.toLowerCase() ||
        channel.name.toLowerCase() === trimmedName.toLowerCase());
    if (!trimmedName) {
        throw new Error("Channel name is required");
    }
    if (existingChannel) {
        throw new Error(`Channel #${existingChannel.name} already exists`);
    }
    try {
        console.log("[channels] creating channel", { endpoint: CHANNELS_API_PATH, name: trimmedName });
        const response = await api.post(CHANNELS_API_PATH, {
            name: trimmedName,
            description: trimmedDescription,
        });
        const channel = normalizeChannel(response.data?.channel ?? response.data?.data ?? response.data);
        if (!channel) {
            throw new Error("Backend did not return a valid channel payload");
        }
        persistChannels([...getStoredChannels(), channel]);
        return { channel, persisted: true, requiresBackend: false };
    }
    catch (error) {
        console.error("[channels] backend channel creation failed, using local fallback", error);
        const fallbackChannel = {
            _id: slug || `channel-${Date.now()}`,
            name: trimmedName,
            description: trimmedDescription,
        };
        persistChannels([...getStoredChannels(), fallbackChannel]);
        return { channel: fallbackChannel, persisted: false, requiresBackend: true };
    }
}
