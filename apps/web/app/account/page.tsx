import Link from "next/link";
import { Plus, Crown, Users2 } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getUserCrews } from "@/lib/crews";
import { getClaimedAccounts } from "@/lib/account";
import { SignInForm, LinkRiotForm, UnlinkButton } from "@/components/forms";
import { Frame, Empty, PanelHead } from "@/components/kit/Frame";
import { Button } from "@/components/kit/Button";
import { ProfileIcon, RankCrest } from "@/components/kit/Avatar";
import { RoutePose } from "@/components/rift/RoutePose";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-5 px-4 py-14 sm:px-6">
        <RoutePose name="surface" />
        <h1 className="font-display text-3xl font-bold tracking-tight">Your stacks</h1>
        <Frame>
          <div className="p-5">
            <p className="mb-4 text-sm text-ink-dim">Sign in to see the stacks you own and belong to.</p>
            <SignInForm redirectTo="/account" />
          </div>
        </Frame>
      </div>
    );
  }

  const [crews, accounts] = await Promise.all([getUserCrews(user.id), getClaimedAccounts(user.id)]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6">
      <RoutePose name="surface" />
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Your account</h1>
        <p className="mt-1 text-sm text-ink-dim">{user.email}</p>
      </div>

      {/* Linked Riot accounts */}
      <Frame>
        <PanelHead title="Riot accounts" />
        <div className="space-y-4 p-4 pt-3">
          {accounts.length === 0 ? (
            <p className="text-sm text-ink-dim">
              Connect your Riot account to claim your profile and stats. This is what tells StackGG which player is you.
            </p>
          ) : (
            <ul className="space-y-2">
              {accounts.map((a) => (
                <li key={a.puuid} className="notch notch-sm flex items-center gap-3 border border-line/60 bg-surface-2/40 px-3 py-2">
                  <ProfileIcon id={a.profileIcon} name={a.riotId} size={32} />
                  <Link href={`/player/${a.region}/${encodeURIComponent(`${a.riotId}#${a.tag}`)}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-gold">
                    {a.riotId}
                    <span className="text-ink-faint">#{a.tag}</span>
                  </Link>
                  <RankCrest rank={a.rankSolo} size={18} />
                  <span className="text-2xs uppercase text-ink-faint">{a.region}</span>
                  <UnlinkButton puuid={a.puuid} />
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line/40 pt-4">
            <p className="mb-3 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
              {accounts.length === 0 ? "Connect an account" : "Link another account"}
            </p>
            <LinkRiotForm />
          </div>
        </div>
      </Frame>

      <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <h2 className="font-display text-2xl font-bold tracking-tight">Your stacks</h2>
        <Link href="/stack/new">
          <Button>
            <Plus className="h-4 w-4" /> New stack
          </Button>
        </Link>
      </div>

      {crews.length === 0 ? (
        <Frame>
          <div className="p-5">
            <Empty icon={<Users2 className="h-6 w-6" />}>You&apos;re not in any stacks yet. Create one and drop the invite link in your Discord.</Empty>
          </div>
        </Frame>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {crews.map((c) => (
            <li key={c.slug}>
              <Link href={`/stack/${c.slug}`} className="block">
                <Frame className="h-full transition-transform hover:-translate-y-0.5">
                  <div className="flex h-full flex-col justify-between p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-display text-lg font-bold">{c.name}</span>
                      {c.isOwner && (
                        <span className="inline-flex items-center gap-1 bg-gold/15 px-1.5 py-0.5 text-2xs text-gold">
                          <Crown className="h-3 w-3" /> owner
                        </span>
                      )}
                    </div>
                    <span className="mt-3 text-sm text-ink-dim">{c.memberCount} members</span>
                  </div>
                </Frame>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
