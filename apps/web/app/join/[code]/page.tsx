import Link from "next/link";
import { getPool, queryOne } from "@crewstats/shared";
import { JoinForm } from "@/components/forms";
import { Panel, Button } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const crew = await queryOne<{ name: string }>(`SELECT name FROM crews WHERE invite_code = $1`, [code], getPool());

  if (!crew) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-xl font-bold">Invalid invite</h1>
        <p className="mt-2 text-ink-dim">That invite code is invalid or has been regenerated.</p>
        <Link href="/" className="mt-5 inline-block">
          <Button variant="ghost">Go home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-12 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Join <span className="text-primary">{crew.name}</span>
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          Enter your Riot ID to unlock the crew stats. No Riot sign-in needed, all data is public match data.
        </p>
      </div>
      <Panel className="p-5">
        <JoinForm inviteCode={code} />
      </Panel>
    </div>
  );
}
