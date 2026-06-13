import { getCurrentUser } from "@/lib/session";
import { CreateCrewForm, SignInForm } from "@/components/forms";
import { Card } from "@/components/primitives";

export const dynamic = "force-dynamic";

export default async function NewCrew() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-md space-y-4 pt-6">
      <h1 className="text-2xl font-bold">Create a crew</h1>
      {user ? (
        <Card>
          <p className="mb-4 text-sm text-ink-dim">
            Signed in as <span className="text-ink">{user.email}</span>. Name your crew and link your
            Riot ID — we&apos;ll backfill your recent games immediately and the rest in the background.
          </p>
          <CreateCrewForm />
        </Card>
      ) : (
        <Card>
          <p className="mb-4 text-sm text-ink-dim">
            Creating a crew is the one place we ask you to sign in (so you own and manage it). Enter
            your email for a magic link, then you&apos;ll come right back here.
          </p>
          <SignInForm redirectTo="/crew/new" />
        </Card>
      )}
    </div>
  );
}
