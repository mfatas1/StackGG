import type { Metadata } from "next";

// Stack pages show people's League data and are infinite/dynamic — keep them out of
// search (robots.ts also disallows /stack/). Children inherit this unless they override.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function StackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
