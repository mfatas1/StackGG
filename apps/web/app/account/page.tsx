import Link from "next/link";
import { Plus, Crown, Users2 } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getUserCrews } from "@/lib/crews";
import { SignInForm } from "@/components/forms";
import { Frame, Empty } from "@/components/kit/Frame";
import { Button } from "@/components/kit/Button";
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

  const crews = await getUserCrews(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6">
      <RoutePose name="surface" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Your stacks</h1>
          <p className="mt-1 text-sm text-ink-dim">{user.email}</p>
        </div>
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
