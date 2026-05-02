import { Button } from "@/components/ui/button";
import { MagicLinkSignInForm } from "@/features/auth/components/magic-link-sign-in-form";
import { authClient } from "@/features/auth/lib/better-auth-client";
import { signOut } from "@/features/auth/lib/sign-out";

export function SyncCloudConnect() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="w-full h-[calc(100vh-9rem)] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (session) {
    return (
      <div className="w-full h-[calc(100vh-9rem)] flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="font-medium">{session.user.email}</p>
        </div>
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-9rem)] flex items-center">
      <MagicLinkSignInForm />
    </div>
  );
}
