import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getToken } from "@/lib/auth";
export const Route = createFileRoute("/")({
    component: Index,
});
function Index() {
    if (typeof window === "undefined")
        return null;
    const token = getToken();
    return token ? <Navigate to="/chat" search={{ channelId: undefined }}/> : <Navigate to="/login"/>;
}
