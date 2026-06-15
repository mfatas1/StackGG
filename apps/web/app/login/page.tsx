import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { SignInForm } from "@/components/forms";
import { Frame } from "@/components/kit/Frame";
import { RoutePose } from "@/components/rift/RoutePose";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect: r } = await searchParams;
  // Only allow internal redirect targets.
  const dest = r && r.startsWith("/") && !r.startsWith("//") ? r : "/account";

  const user = await getCurrentUser();
  if (user) redirect(dest);

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-14 sm:px-6">
      <RoutePose name="surface" />
      <h1 className="font-display text-3xl font-bold tracking-tight">Sign in</h1>
      <Frame>
        <div className="p-5">
          <p className="mb-4 text-sm text-ink-dim">
            Enter your email and we&apos;ll send you a one-time magic link — no password to remember.
          </p>
          <SignInForm redirectTo={dest} />
        </div>
      </Frame>
    </div>
  );
}
