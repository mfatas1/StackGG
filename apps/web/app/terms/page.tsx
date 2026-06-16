import Link from "next/link";
import { RoutePose } from "@/components/rift/RoutePose";

export const metadata = { title: "Terms of Service — StackGG", alternates: { canonical: "/terms" } };

// NOTE: Plain-language terms of service. Not legal advice. Confirm the contact address
// and the governing-law jurisdiction below before relying on these.
const UPDATED = "16 June 2026";
const CONTACT = "contact@stackgg.app";
const JURISDICTION = "[your country / jurisdiction]";

export default function Terms() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-12 text-sm leading-relaxed text-ink-dim sm:px-6">
      <RoutePose name="surface" />
      <h1 className="font-display text-2xl font-bold text-ink">Terms of Service</h1>
      <p className="text-2xs text-ink-faint">Last updated: {UPDATED}</p>

      <p>
        These Terms govern your use of StackGG (&ldquo;StackGG&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), a stats site for
        League of Legends groups. By using StackGG you agree to these Terms and to our{" "}
        <Link href="/privacy" className="text-gold hover:underline">Privacy Policy</Link>. If you don&apos;t agree, please
        don&apos;t use the service.
      </p>

      <h2 className="text-lg font-semibold text-ink">Eligibility</h2>
      <p>
        You must meet the minimum age required to hold a Riot Games account in your country, and you must comply with
        Riot Games&apos; Terms of Service. When you link or search a Riot account, you confirm that you own it or are
        authorised to view it.
      </p>

      <h2 className="text-lg font-semibold text-ink">The service</h2>
      <p>
        StackGG displays public League of Legends statistics retrieved from Riot Games&apos; official API and lets groups
        (&ldquo;stacks&rdquo;) see how they play together. Stats may be incomplete, delayed, or inaccurate, and the service
        may change or be unavailable at any time.
      </p>

      <h2 className="text-lg font-semibold text-ink">Accounts and linking</h2>
      <p>
        Sign-in uses a link sent to your email. You&apos;re responsible for activity on your account. Linking a Riot
        account is based on trust — you represent that it is yours or that you&apos;re permitted to link it. We may remove
        links, accounts, or content that we believe are fraudulent, abusive, or violate these Terms.
      </p>

      <h2 className="text-lg font-semibold text-ink">Acceptable use</h2>
      <p>You agree not to:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>scrape, bulk-download, resell, or redistribute data from StackGG;</li>
        <li>overload, probe, or interfere with the service, or attempt to bypass rate limits or security;</li>
        <li>use StackGG for any unlawful purpose, or to harass, dox, or harm others;</li>
        <li>misrepresent your identity or another person&apos;s account.</li>
      </ul>

      <h2 className="text-lg font-semibold text-ink">Riot Games</h2>
      <p>
        StackGG isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone
        officially involved in producing or managing Riot Games properties. Riot Games and League of Legends are trademarks
        or registered trademarks of Riot Games, Inc. Your use of Riot&apos;s game and data is also subject to Riot&apos;s
        own terms and policies. See our <Link href="/legal" className="text-gold hover:underline">Legal &amp; Riot policy</Link> page.
      </p>

      <h2 className="text-lg font-semibold text-ink">Intellectual property</h2>
      <p>
        Riot-owned content and marks belong to Riot Games. The StackGG name, site design, and original content belong to
        us. You may not copy or reuse them without permission.
      </p>

      <h2 className="text-lg font-semibold text-ink">Disclaimers</h2>
      <p>
        StackGG is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind, to the
        fullest extent permitted by law. We don&apos;t guarantee that stats are accurate or that the service will be
        uninterrupted or error-free.
      </p>

      <h2 className="text-lg font-semibold text-ink">Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, StackGG and its operators won&apos;t be liable for any indirect,
        incidental, or consequential damages, or for any loss arising from your use of (or inability to use) the service.
      </p>

      <h2 className="text-lg font-semibold text-ink">Termination</h2>
      <p>
        You can stop using StackGG at any time and ask us to delete your account. We may suspend or end access if you
        breach these Terms or to protect the service.
      </p>

      <h2 className="text-lg font-semibold text-ink">Changes</h2>
      <p>We may update these Terms; the &ldquo;last updated&rdquo; date above shows when. Continued use means you accept the changes.</p>

      <h2 className="text-lg font-semibold text-ink">Governing law</h2>
      <p>These Terms are governed by the laws of {JURISDICTION}, without regard to conflict-of-laws rules.</p>

      <h2 className="text-lg font-semibold text-ink">Contact</h2>
      <p>Questions: {CONTACT}.</p>
    </div>
  );
}
