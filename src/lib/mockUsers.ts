import type { AuthUser } from "./auth";

/**
 * Frontend-only test accounts. These bypass the backend entirely.
 * Useful for previewing the app without a running Node/Mongo server.
 *
 * ⚠️ DO NOT use in production — credentials are in client-side code.
 */
interface MockAccount {
  identifiers: string[]; // username and/or email matches (case-insensitive)
  password: string;
  user: AuthUser;
  token: string;
}

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    identifiers: ["youneslvptt", "youneslvptt@devhub.local"],
    password: "younes123",
    user: {
      _id: "mock-founder-youneslvptt",
      username: "youneslvptt",
      email: "youneslvptt@devhub.local",
      role: "founder",
    },
    token: "mock-token-youneslvptt",
  },
];

export function tryMockLogin(
  identifier: string,
  password: string,
): { token: string; user: AuthUser } | null {
  const id = identifier.trim().toLowerCase();
  const match = MOCK_ACCOUNTS.find(
    (a) => a.identifiers.some((x) => x.toLowerCase() === id) && a.password === password,
  );
  if (!match) return null;
  return { token: match.token, user: match.user };
}

export function isMockToken(token: string | null): boolean {
  return !!token && token.startsWith("mock-token-");
}
