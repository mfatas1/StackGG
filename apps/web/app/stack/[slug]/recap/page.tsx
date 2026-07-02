import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPool } from "@crewstats/shared";
import { getCrewMemberPuuids } from "@crewstats/stats";
import { getCrewBySlug } from "@/lib/crews";
import { getStackRecap } from "@/lib/recap/resolve";
import { RecapStory } from "@/components/recap/RecapStory";
import type { RecapWindow } from "@/lib/recap/types";

export const dynamic = "force-dynamic";

function readWindow(value: string | string[] | undefined): RecapWindow {
  return value === "week" ? "week" : "season";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const crew = await getCrewBySlug(slug);
  return {
    title: crew ? `${crew.name} — Recap` : "Recap",
    robots: { index: false, follow: false },
  };
}

export default async function RecapPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string | string[] }>;
}) {
  const { slug } = await params;
  const window = readWindow((await searchParams).window);

  const crew = await getCrewBySlug(slug);
  if (!crew) notFound();

  const puuids = await getCrewMemberPuuids(getPool(), crew.id);
  const recap = await getStackRecap(crew.name, crew.slug, puuids, window);

  return <RecapStory recap={recap} />;
}
