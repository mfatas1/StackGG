import { getPool, queryOne } from "@crewstats/shared";
import { JoinForm } from "@/components/forms";
import { Card } from "@/components/primitives";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const crew = await queryOne<{ name: string }>(`SELECT name FROM crews WHERE invite_code = $1`, [code], getPool());

  if (!crew) {
    return (
      <div className="mx-auto max-w-md pt-10 text-center">
        <h1 className="text-xl font-semibold">Invalid invite</h1>
        <p className="mt-2 text-ink-dim">That invite code is invalid or has been regenerated.</p>
        <Link href="/" className="btn-ghost mt-4 inline-flex">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 pt-6">
      <h1 className="text-2xl font-bold">
        Join <span className="text-accent">{crew.name}</span>
      </h1>
      <Card>
        <p className="mb-4 text-sm text-ink-dim">
          Enter your Riot ID to join. We&apos;ll pull your recent games right away and unlock the crew
          stats. No Riot sign-in needed — all data is public match data.
        </p>
        <JoinForm inviteCode={code} />
      </Card>
    </div>
  );
}
