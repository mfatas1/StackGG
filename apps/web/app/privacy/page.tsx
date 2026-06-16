import Link from "next/link";
import { RoutePose } from "@/components/rift/RoutePose";

export const metadata = { title: "Privacy Policy — StackGG", alternates: { canonical: "/privacy" } };

// NOTE: This is a plain-language privacy policy describing how StackGG handles data.
// It is not legal advice. Confirm the contact address and governing jurisdiction below.
const UPDATED = "16 June 2026";
const CONTACT = "contact@stackgg.app";

export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-12 text-sm leading-relaxed text-ink-dim sm:px-6">
      <RoutePose name="surface" />
      <h1 className="font-display text-2xl font-bold text-ink">Privacy Policy</h1>
      <p className="text-2xs text-ink-faint">Last updated: {UPDATED}</p>

      <p>
        StackGG (&ldquo;StackGG&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a stats site for League of Legends groups.
        This policy explains what information we collect, how we use it, and the choices you have. By using StackGG you
        agree to this policy.
      </p>

      <h2 className="text-lg font-semibold text-ink">Information we collect</h2>
      <p className="font-medium text-ink">Information you give us</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Your email address, if you sign in. We use passwordless &ldquo;magic link&rdquo; sign-in, so we never collect a password.</li>
        <li>The Riot ID(s) you search for or link to your account.</li>
        <li>Stacks (groups) you create or join, and your role in them.</li>
      </ul>
      <p className="font-medium text-ink">Information from Riot Games</p>
      <p>
        When you view a profile or stack, we request public game data from Riot Games&apos; official API. This can include
        a player&apos;s Riot ID and region, encrypted account identifier (PUUID), profile icon, ranked tier and LP, and
        match history (champions, results, KDA, and related in-game statistics, including the full match record). Because
        match records describe a whole game, they may include public data about the other players in those matches. This
        is the same category of public data that sites like op.gg use.
      </p>
      <p className="font-medium text-ink">Information collected automatically</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>A session cookie to keep you signed in. We do not use advertising or cross-site tracking cookies.</li>
        <li>Your IP address, used transiently to rate-limit requests and protect the service from abuse.</li>
        <li>Standard server logs (e.g. request times and errors) for reliability and security.</li>
      </ul>

      <h2 className="text-lg font-semibold text-ink">How we use information</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>To provide the service — show profiles, compute stack statistics, and keep your history up to date.</li>
        <li>To sign you in and remember your session.</li>
        <li>To protect the service (rate limiting, abuse prevention, debugging).</li>
      </ul>
      <p>We do not sell your personal information, and we do not use it for advertising.</p>

      <h2 className="text-lg font-semibold text-ink">Who we share it with</h2>
      <p>We share data only with the service providers that run StackGG:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li><span className="text-ink">Riot Games</span> — the source of the game data, via the Riot Games API.</li>
        <li><span className="text-ink">Resend</span> — sends your sign-in emails.</li>
        <li><span className="text-ink">Railway</span> — hosting and database.</li>
        <li><span className="text-ink">Cloudflare</span> — DNS, content delivery, and security.</li>
      </ul>
      <p>We may also disclose information if required by law.</p>

      <h2 className="text-lg font-semibold text-ink">Data retention</h2>
      <p>
        We keep game data and account information for as long as your account or stacks are active, so the service can show
        your history. You can remove data at any time (see below); we may keep limited records where required for security
        or legal reasons.
      </p>

      <h2 className="text-lg font-semibold text-ink">Your choices and rights</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li><span className="text-ink">Unlink an account</span> — remove a linked Riot account from your account page at any time.</li>
        <li><span className="text-ink">Leave a stack</span> — a stack owner can remove any member, which deletes that member&apos;s participation in the stack.</li>
        <li><span className="text-ink">Access or delete your data</span> — email us at {CONTACT} to request a copy of, or deletion of, your account and associated data.</li>
      </ul>
      <p>
        Depending on where you live, you may have rights to access, correct, delete, or restrict the use of your personal
        data, and to object to certain processing. To exercise any of these, contact us at {CONTACT}.
      </p>

      <h2 className="text-lg font-semibold text-ink">Riot Games data</h2>
      <p>
        StackGG isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone
        officially involved in producing or managing Riot Games properties. We access Riot data under Riot&apos;s developer
        terms and policies. See our <Link href="/legal" className="text-gold hover:underline">Legal &amp; Riot policy</Link> page.
      </p>

      <h2 className="text-lg font-semibold text-ink">Children</h2>
      <p>
        StackGG is not directed to children, and you must meet the minimum age required to hold a Riot Games account in your
        country to use it. We do not knowingly collect data from anyone below that age.
      </p>

      <h2 className="text-lg font-semibold text-ink">Security &amp; international transfers</h2>
      <p>
        We use reputable providers and reasonable measures to protect your data, but no service is perfectly secure. Our
        providers may process data in countries other than yours; we rely on their safeguards for such transfers.
      </p>

      <h2 className="text-lg font-semibold text-ink">Changes</h2>
      <p>We may update this policy; we&apos;ll change the &ldquo;last updated&rdquo; date above when we do.</p>

      <h2 className="text-lg font-semibold text-ink">Contact</h2>
      <p>Questions or requests: {CONTACT}.</p>
    </div>
  );
}
