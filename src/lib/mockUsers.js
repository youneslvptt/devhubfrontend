const MOCK_ACCOUNTS = [
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
export function tryMockLogin(identifier, password) {
    const id = identifier.trim().toLowerCase();
    const match = MOCK_ACCOUNTS.find((a) => a.identifiers.some((x) => x.toLowerCase() === id) && a.password === password);
    if (!match)
        return null;
    return { token: match.token, user: match.user };
}
export function isMockToken(token) {
    return !!token && token.startsWith("mock-token-");
}
