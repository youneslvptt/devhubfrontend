export interface Channel {
  _id: string;
  name: string;
  description?: string;
}

export const DEFAULT_CHANNELS: Channel[] = [
  { _id: "general", name: "general", description: "Company-wide announcements" },
  { _id: "frontend", name: "frontend", description: "React, UI, design systems" },
  { _id: "backend", name: "backend", description: "APIs, databases, infra" },
  { _id: "devops", name: "devops", description: "CI/CD, deploys, incidents" },
  { _id: "design", name: "design", description: "Product & visual design" },
  { _id: "random", name: "random", description: "Off-topic chatter" },
];
