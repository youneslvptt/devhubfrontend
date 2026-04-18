import { INVITE_MEMBER_API_PATH } from "./config";
import { api } from "./api";
const MEMBERS_STORAGE_KEY = "devhub.workspace-members";
const DEFAULT_MEMBERS = [
    { id: "1", username: "ada.lovelace", email: "ada@devhub.io", role: "founder", status: "online" },
    { id: "2", username: "linus.t", email: "linus@devhub.io", role: "admin", status: "online" },
    { id: "3", username: "grace.h", email: "grace@devhub.io", role: "developer", status: "online" },
    { id: "4", username: "alan.k", email: "alan@devhub.io", role: "developer", status: "away" },
    { id: "5", username: "tim.b", email: "tim@devhub.io", role: "developer", status: "offline" },
    { id: "6", username: "margaret.h", email: "margaret@devhub.io", role: "developer", status: "online" },
];
function parseMembers(raw) {
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function persistMembers(members) {
    if (typeof window === "undefined")
        return;
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
}
function normalizeMember(payload) {
    if (!payload || typeof payload !== "object")
        return null;
    const record = payload;
    const rawEmail = typeof record.email === "string" ? record.email.trim() : "";
    const rawUsername = typeof record.username === "string"
        ? record.username.trim()
        : rawEmail.includes("@")
            ? rawEmail.split("@")[0]
            : "";
    if (!rawUsername)
        return null;
    const role = record.role === "founder" || record.role === "admin" ? record.role : "developer";
    const status = record.status === "online" ||
        record.status === "away" ||
        record.status === "offline" ||
        record.status === "invited"
        ? record.status
        : "invited";
    return {
        id: typeof record.id === "string"
            ? record.id
            : typeof record._id === "string"
                ? record._id
                : `${rawUsername}-${Date.now()}`,
        username: rawUsername,
        email: rawEmail || `${rawUsername}@pending.devhub.local`,
        role,
        status,
    };
}
function mergeMembers(nextMembers) {
    const byId = new Map();
    [...DEFAULT_MEMBERS, ...nextMembers].forEach((member) => {
        byId.set(member.id, member);
    });
    return Array.from(byId.values());
}
export function getWorkspaceMembers() {
    if (typeof window === "undefined")
        return DEFAULT_MEMBERS;
    const stored = parseMembers(localStorage.getItem(MEMBERS_STORAGE_KEY));
    const merged = mergeMembers(stored);
    persistMembers(merged);
    return merged;
}
export async function inviteWorkspaceMember({ identifier, }) {
    const cleaned = identifier.trim();
    const currentMembers = getWorkspaceMembers();
    const existing = currentMembers.find((member) => member.username.toLowerCase() === cleaned.toLowerCase() ||
        member.email.toLowerCase() === cleaned.toLowerCase());
    if (existing) {
        return { member: existing, persisted: true, requiresBackend: false };
    }
    if (INVITE_MEMBER_API_PATH) {
        try {
            console.log("[admin] inviting member via backend", {
                endpoint: INVITE_MEMBER_API_PATH,
                identifier: cleaned,
            });
            const response = await api.post(INVITE_MEMBER_API_PATH, { identifier: cleaned });
            const member = normalizeMember(response.data?.member ?? response.data?.data ?? response.data);
            if (member) {
                const nextMembers = mergeMembers([member, ...currentMembers]);
                persistMembers(nextMembers);
                return { member, persisted: true, requiresBackend: false };
            }
        }
        catch (error) {
            console.error("[admin] backend invite failed, falling back to local invite", error);
        }
    }
    else {
        console.warn("[admin] VITE_INVITE_MEMBER_API_PATH is not configured. Falling back to a local invite preview.");
    }
    const username = cleaned.includes("@") ? cleaned.split("@")[0] : cleaned;
    const fallbackMember = {
        id: `invited-${Date.now()}`,
        username,
        email: cleaned.includes("@") ? cleaned : `${cleaned}@pending.devhub.local`,
        role: "developer",
        status: "invited",
    };
    const nextMembers = mergeMembers([fallbackMember, ...currentMembers]);
    persistMembers(nextMembers);
    return {
        member: fallbackMember,
        persisted: false,
        requiresBackend: !INVITE_MEMBER_API_PATH,
    };
}
