import Link from "next/link";
import { notFound } from "next/navigation";
import { getPool, query, env } from "@crewstats/shared";
import { getCrewBySlug, isCrewOwner } from "@/lib/crews";
import { getCurrentUser } from "@/lib/session";
import { SettingsPanel } from "@/components/SettingsPanel";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const crew = await getCrewBySlug(slug);
  if (!crew) notFound();

  const user = await getCurrentUser();
  const owner = user ? await isCrewOwner(crew.id, user.id) : false;

  const members = await query<{ puuid: string; riot_id: string; tag: string; role: string }>(
    `SELECT cm.puuid, ra.riot_id, ra.tag, cm.role
       FROM crew_members cm JOIN riot_accounts ra ON ra.puuid = cm.puuid
      WHERE cm.crew_id = $1 ORDER BY cm.role DESC, cm.joined_at ASC`,
    [crew.id],
    getPool(),
  );

  const baseUrl = env().NEXT_PUBLIC_BASE_URL;

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-8 sm:px-6">
      <div className="text-sm text-ink-dim">
        <Link href={`/stack/${slug}`} className="hover:text-ink">
          ← {crew.name}
        </Link>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Stack settings</h1>
      <SettingsPanel
        slug={slug}
        initialName={crew.name}
        inviteUrl={`${baseUrl}/join/${crew.invite_code}`}
        members={members.map((m) => ({ puuid: m.puuid, riotId: `${m.riot_id}#${m.tag}`, role: m.role }))}
        isOwner={owner}
        baseUrl={baseUrl}
      />
    </div>
  );
}
