import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Terminal, User } from "lucide-react";
import axios from "axios";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import { tryMockLogin } from "@/lib/mockUsers";
import heroImage from "@/assets/login-hero.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — GlobalTech Devhub" },
      {
        name: "description",
        content: "Sign in to GlobalTech Devhub, the real-time chat platform for engineering teams.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordHelp, setShowForgotPasswordHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 1) Frontend-only mock accounts (e.g. founder youneslvptt) — bypass backend
    const mock = tryMockLogin(identifier, password);
    if (mock) {
      saveAuth(mock.token, mock.user);
      window.dispatchEvent(new Event("auth-change"));
      setLoading(false);
      navigate({ to: "/chat", search: { channelId: undefined } });
      return;
    }

    try {
      const payload = {
        email: identifier,
        password,
      };

      const { data } = await api.post("/api/auth/login", payload);
      const token = data.token;

      // Build user object, mapping backend "name" -> frontend "username"
      const user = {
        _id: data._id,
        username: data.name,
        email: data.email,
        role: data.role,
        mustChangePassword: data.mustChangePassword, 
      };

      if (!token || !user) {
        throw new Error("Invalid response from server");
      }

      saveAuth(token, user);
      window.dispatchEvent(new Event("auth-change"));

      // ✅ Redirect based on mustChangePassword flag
      console.log("Login successful. User data:", user, user.mustChangePassword);
      if (user.mustChangePassword) {
        navigate({ to: "/changePassword" });
      } else {
        navigate({ to: "/chat", search: { channelId: undefined } });
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ??
          err.response?.data?.error ??
          "Invalid credentials. Please try again."
        );
      } else {
        console.error("Login error", err);
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* LEFT — form */}
      <div className="flex w-full flex-col justify-between px-6 py-10 sm:px-12 lg:w-1/2 lg:px-20">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Terminal className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            GlobalTech devhub
          </span>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your team workspace to keep shipping.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="identifier"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Username or Email
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="ada.lovelace"
                className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordHelp(true)}
                  className="text-xs font-medium text-primary hover:text-primary-glow transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              {showForgotPasswordHelp && (
                <p className="text-xs text-muted-foreground">
                  if you have problems signing up please contact your workspace admin
                </p>
              )}
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="h-12 w-full rounded-xl border border-border bg-surface px-4 pr-11 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:shadow-[0_0_50px_-6px_oklch(0.78_0.16_215/0.7)] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Access is invite-only. Please contact your workspace admin for an account.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} GloboTech Departement of devolopment.
        </p>
      </div>

      {/* RIGHT — hero */}
      <div className="relative hidden lg:block lg:w-1/2">
        <img
          src={heroImage}
          alt=""
          width={1080}
          height={1920}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-background/90 via-background/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <div className="max-w-md rounded-2xl border border-white/10 bg-background/40 p-6 backdrop-blur-xl shadow-elegant">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Live workspace
            </div>
            <h2 className="font-display text-2xl font-semibold leading-tight text-foreground">
              Ship faster with conversations that keep pace with your codebase.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Real-time channels, role-based admin tooling, and a workspace built for the
              way engineering teams actually communicate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}