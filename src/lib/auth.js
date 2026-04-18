const TOKEN_KEY = "token";
const USER_KEY = "user";
export function saveAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getToken() {
    if (typeof window === "undefined")
        return null;
    return localStorage.getItem(TOKEN_KEY);
}
export function getUser() {
    if (typeof window === "undefined")
        return null;
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}
export function isAdmin(user) {
    return user?.role === "admin" || user?.role === "founder";
}
