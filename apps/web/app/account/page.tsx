import Link from "next/link";
import { Plus, Crown, Users2 } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getUserCrews } from "@/lib/crews";
import { SignInForm } from "@/components/forms";
import { Panel, Button, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-5 px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Your crews</h1>
        <Panel className="p-5">
          <p className="mb-4 text-sm text-ink-dim">Sign in to see the crews you own and belong to.</p>
          <SignInForm redirectTo="/account" />
        </Panel>
      </div>
    );
  }

  const crews = await getUserCrews(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Your crews</h1>
          <p className="mt-1 text-sm text-ink-dim">{user.email}</p>
        </div>
        <Link href="/crew/new">
          <Button>
            <Plus className="h-4 w-4" /> New crew
          </Button>
        </Link>
      </div>

      {crews.length === 0 ? (
        <Panel className="p-5">
          <Empty icon={<Users2 className="h-6 w-6" />}>
            You&apos;re not in any crews yet. Create one and drop the invite link in your Discord.
          </Empty>
        </Panel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {crews.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/crew/${c.slug}`}
                className="hex-corners flex h-full flex-col justify-between rounded-lg border border-line bg-surface-2/60 p-4 transition-colors hover:border-line-strong hover:bg-surface-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-lg font-bold">{c.name}</span>
                  {c.isOwner && (
                    <span className="inline-flex items-center gap-1 rounded bg-gold/15 px-1.5 py-0.5 text-2xs text-gold">
                      <Crown className="h-3 w-3" /> owner
                    </span>
                  )}
                </div>
                <span className="mt-3 text-sm text-ink-dim">{c.memberCount} members</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
