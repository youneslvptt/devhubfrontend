import { useEffect, useState, useCallback } from "react";
import { getUser, getToken, clearAuth, type AuthUser } from "@/lib/auth";
import { disconnectSocket } from "@/lib/socket";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => getUser());
  const [token, setToken] = useState<string | null>(() => getToken());

  useEffect(() => {
    const handler = () => {
      setUser(getUser());
      setToken(getToken());
    };
    window.addEventListener("storage", handler);
    window.addEventListener("auth-change", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("auth-change", handler);
    };
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    disconnectSocket();
    window.dispatchEvent(new Event("auth-change"));
    window.location.href = "/login";
  }, []);

  return { user, token, isAuthenticated: !!token, logout };
}
