import { io } from "socket.io-client";
import { SOCKET_URL } from "./config";
let socket = null;
export function getSocket() {
    if (!socket) {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        socket = io(SOCKET_URL, {
            autoConnect: true,
            transports: ["websocket", "polling"],
            auth: token ? { token } : undefined,
        });
    }
    return socket;
}
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
