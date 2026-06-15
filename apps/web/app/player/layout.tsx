import type { Metadata } from "next";

// Individual player profiles are private/dynamic and hit the Riot API on load — keep
// them out of search (robots.ts also disallows /player/).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
