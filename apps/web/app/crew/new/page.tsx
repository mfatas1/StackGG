import { getCurrentUser } from "@/lib/session";
import { CreateCrewForm, SignInForm } from "@/components/forms";
import { Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewCrew() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-12 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Create a crew</h1>
        <p className="mt-2 text-sm text-ink-dim">
          One shared page for your squad. We&apos;ll pull your recent games right away.
        </p>
      </div>
      <Panel className="p-5">
        {user ? (
          <>
            <p className="mb-4 text-sm text-ink-dim">
              Signed in as <span className="text-ink">{user.email}</span>. Name your crew and link your
              Riot ID.
            </p>
            <CreateCrewForm />
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-ink-dim">
              Creating a crew is the one place we ask you to sign in, so you own and manage it. Enter your
              email for a magic link, then you&apos;ll come right back here.
            </p>
            <SignInForm redirectTo="/crew/new" />
          </>
        )}
      </Panel>
    </div>
  );
}
