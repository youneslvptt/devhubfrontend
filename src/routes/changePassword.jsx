import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { getToken, saveAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";

export const Route = createFileRoute("/changePassword")({
  head: () => ({
    meta: [{ title: "Set New Password – Devhub" }],
  }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if user is logged in (redirect if not)
  const token = getToken();
  if (typeof window !== "undefined" && !token) {
    navigate({ to: "/login" });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.post(
        "/api/auth/change-password",
        { password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update local user data (remove mustChangePassword flag)
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.mustChangePassword = false;
      saveAuth(token, user);
      toast.success("Password changed! Redirecting...");
      setTimeout(() => {
        navigate({ to: "/chat", search: { channelId: undefined } });
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Set your new password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This is required before you can access the workspace.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min. 6 characters)"
            required
            minLength={6}
            className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Password"}
          </button>
        </form>
      </div>
    </div>
  );
}