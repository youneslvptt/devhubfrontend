// lib/members.js
import { api } from "./api";

const MEMBERS_STORAGE_KEY = "devhub.workspace-members";

// ---------- Local cache helpers ----------
function parseMembers(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistMembers(members) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
}

function normalizeMember(payload) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload;
  const rawEmail = typeof record.email === "string" ? record.email.trim() : "";
  const rawUsername = typeof record.username === "string"
    ? record.username.trim()
    : rawEmail.includes("@")
      ? rawEmail.split("@")[0]
      : "";
  if (!rawUsername) return null;

  const role =
    record.role === "founder" || record.role === "admin" ? record.role : "developer";

  const status =
    record.status === "online" ||
    record.status === "away" ||
    record.status === "offline" ||
    record.status === "invited"
      ? record.status
      : "offline";

  return {
    id: typeof record._id === "string"
      ? record._id
      : typeof record.id === "string"
        ? record.id
        : `temp-${Date.now()}`,
    username: rawUsername,
    email: rawEmail || `${rawUsername}@pending.devhub.local`,
    role,
    status,
  };
}

// ---------- Public API ----------

/**
 * Fetch all workspace members from the backend.
 * Requires admin/founder role – handled by the backend endpoint itself.
 */
export async function fetchWorkspaceMembers() {
  try {
    console.log("[members] fetching workspace members");
    const response = await api.get("/api/auth/users");
    const data = Array.isArray(response.data) ? response.data : [];
    const members = data.map(normalizeMember).filter(Boolean);
    persistMembers(members);
    return members;
  } catch (error) {
    console.warn("[members] API call failed – using cached members", error);
    return getCachedMembers();
  }
}

/**
 * Returns locally cached members (no mock data).
 */
export function getCachedMembers() {
  if (typeof window === "undefined") return [];
  return parseMembers(localStorage.getItem(MEMBERS_STORAGE_KEY));
}

/**
 * Kept for backward compatibility – returns cached members.
 */
export function getWorkspaceMembers() {
  return getCachedMembers();
}

// ---------- Real member invite ----------
const ADD_MEMBER_API_PATH = "/api/chat/channel/add-member";

/**
 * Invite (add) a user to a channel using the real backend.
 * @param {object} params
 * @param {string} params.identifier - user ID or email
 * @param {string} params.channelId - channel ID
 * @returns {Promise<{ member: object, persisted: true, requiresBackend: false }>}
 */
export async function inviteWorkspaceMember({ identifier, channelId }) {
  const cleaned = identifier.trim();
  
  console.log("[members] inviting member via backend", {
    channelId,
    userId: cleaned,
  });
  
  try {
    const response = await api.post(ADD_MEMBER_API_PATH, {
      channelId,
      userId: cleaned,
    });
    
    const member = normalizeMember(
      response.data?.member ?? response.data?.data ?? response.data
    );
    
    if (!member) {
      throw new Error("Backend did not return a valid member");
    }
    
    // Refresh local cache with a fresh fetch
    await fetchWorkspaceMembers();
    
    return { member, persisted: true, requiresBackend: false };
  } catch (error) {
    const serverMessage =
      error.response?.data?.message || error.message || "Unknown error";
    console.error("[members] invite failed:", serverMessage);
    throw new Error(serverMessage);
  }
}