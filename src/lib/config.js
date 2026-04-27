export const API_URL = "http://localhost:4000";
export const SOCKET_URL = "http://localhost:4000";
export const CHAT_CHANNELS_API_PATH = "/api/chat/channels";
export const CHAT_CHANNEL_CREATE_API_PATH = "/api/chat/channel";
export const CHAT_MESSAGES_API_PATH = "/api/chat/messages";
export const ADMIN_CREATE_USER_API_PATH = "/api/admin/create-user";
export const CHAT_INVITE_API_PATH = import.meta.env.VITE_INVITE_MEMBER_API_PATH?.trim() || "/api/chat/invite";
