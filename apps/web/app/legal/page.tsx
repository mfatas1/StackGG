import { RoutePose } from "@/components/rift/RoutePose";

export const metadata = { title: "Legal — StackGG", alternates: { canonical: "/legal" } };

export default function Legal() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-12 text-sm leading-relaxed text-ink-dim sm:px-6">
      <RoutePose name="surface" />
      <h1 className="font-display text-2xl font-bold text-ink">Legal &amp; Riot policy</h1>
      <p>
        StackGG isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone
        officially involved in producing or managing Riot Games properties. Riot Games and League of Legends are
        trademarks or registered trademarks of Riot Games, Inc.
      </p>
      <h2 className="text-lg font-semibold text-ink">What data we show</h2>
      <p>
        StackGG displays public match data retrieved from Riot&apos;s official API — the same basis on which sites like
        op.gg operate. Stack pages are private, invite-only views; you can only see stacks you belong to.
      </p>
      <h2 className="text-lg font-semibold text-ink">Arena</h2>
      <p>
        In line with Riot&apos;s developer policy, StackGG never displays win rates for Arena augments or items. We only
        show player- and duo-level stats such as placements and head-to-head records, which are permitted.
      </p>
      <h2 className="text-lg font-semibold text-ink">Removing your data</h2>
      <p>A stack owner can remove any member from the stack settings, which deletes that member&apos;s participation rows for the stack.</p>
    </div>
  );
}
