import { getCurrentUser } from "@/lib/session";
import { CreateCrewForm, SignInForm } from "@/components/forms";
import { Frame } from "@/components/kit/Frame";
import { RoutePose } from "@/components/rift/RoutePose";

export const dynamic = "force-dynamic";

export default async function NewCrew() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-14 sm:px-6">
      <RoutePose name="join" />
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Create a stack</h1>
        <p className="mt-2 text-sm text-ink-dim">One shared page for your squad. We&apos;ll pull your recent games right away.</p>
      </div>
      <Frame>
        <div className="p-5">
          {user ? (
            <>
              <p className="mb-4 text-sm text-ink-dim">
                Signed in as <span className="text-ink">{user.email}</span>. Name your stack and link your Riot ID.
              </p>
              <CreateCrewForm />
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-ink-dim">
                Creating a stack is the one place we ask you to sign in, so you own and manage it. Enter your email for a magic link, then you&apos;ll come right back here.
              </p>
              <SignInForm redirectTo="/stack/new" />
            </>
          )}
        </div>
      </Frame>
    </div>
  );
}
