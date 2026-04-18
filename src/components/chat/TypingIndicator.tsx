interface Props {
  users: string[];
}

export function TypingIndicator({ users }: Props) {
  if (users.length === 0) return <div className="h-5" />;

  const label =
    users.length === 1
      ? `${users[0]} is typing`
      : users.length === 2
        ? `${users[0]} and ${users[1]} are typing`
        : `${users.length} people are typing`;

  return (
    <div className="flex h-5 items-center gap-2 px-6 text-xs text-muted-foreground">
      <span className="flex items-end gap-0.5">
        <span className="typing-dot inline-block h-1 w-1 rounded-full bg-primary" />
        <span className="typing-dot inline-block h-1 w-1 rounded-full bg-primary" />
        <span className="typing-dot inline-block h-1 w-1 rounded-full bg-primary" />
      </span>
      <span>{label}…</span>
    </div>
  );
}
