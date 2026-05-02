import { Button } from "@/components/ui/button";
import { MagicLinkSignInForm } from "@/features/auth/components/magic-link-sign-in-form";
import { authClient } from "@/features/auth/lib/better-auth-client";
import { signOut } from "@/features/auth/lib/sign-out";
import { PricingAndPlans } from "@/features/subscription/components/pricing-and-plans";
import { useEffect, useState } from "react";

export function SyncCloudConnect() {
  const { data: session, isPending } = authClient.useSession();

  const [subscriptions, setSubscriptions] = useState<readonly any[]>([]);

  useEffect(() => {
    async function fetchSubs() {
      if (!session) return;
      try {
        const res = await authClient.customer.subscriptions.list();
        const data = res?.data;
        setSubscriptions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to list subscriptions", err);
        setSubscriptions([]);
      }
    }

    fetchSubs();
  }, [session]);

  if (isPending) {
    return (
      <div className="w-full h-[calc(100vh-9rem)] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (session) {
    return (
      <div className="w-full min-h-[calc(100vh-9rem)] flex flex-col items-center justify-center gap-8 p-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="font-medium">{session.user.email}</p>
        </div>

        {/* Subscriptions list */}
        <div className="w-full max-w-md space-y-2">
          <p className="text-sm font-medium">Your subscriptions:</p>
          {subscriptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No active subscriptions.
            </p>
          ) : (
            <ul className="space-y-1">
              {subscriptions.map((sub) => (
                <li key={sub.id} className="text-xs text-muted-foreground">
                  {sub.plan.name} ({sub.status})
                </li>
              ))}
            </ul>
          )}
        </div>

        <PricingAndPlans />

        <div className="mt-4">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const res = await authClient.customer.portal();
                if (res.url) {
                  window.location.href = res.url;
                }
              } catch (err) {
                console.error("Failed to open portal", err);
              }
            }}
          >
            Manage subscription
          </Button>
        </div>

        <div className="mt-6">
          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-9rem)] flex items-center">
      <MagicLinkSignInForm />
    </div>
  );
}
