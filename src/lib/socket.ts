import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "./config";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
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
