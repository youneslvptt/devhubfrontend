import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getToken } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  if (typeof window === "undefined") return null;
  const token = getToken();
  return <Navigate to={token ? "/chat" : "/login"} />;
}
