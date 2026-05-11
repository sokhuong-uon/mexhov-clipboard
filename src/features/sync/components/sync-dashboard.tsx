import { authClient } from "@/features/auth/lib/better-auth-client";
import { PricingAndPlans } from "@/features/subscription/components/pricing-and-plans";
import { useEffect, useState } from "react";
import { CustomerState } from "@polar-sh/sdk/models/components/customerstate";
import { ManageSubscriptionButton } from "@/features/subscription/components/manage-subscription-button";
import { RectangularProfileCard } from "@/features/profile/components/rectangular-profile-card";
import { ConnectToServerButton } from "@/features/sync/components/connect-to-server-button";

export function SyncDashboard() {
  const { data: session } = authClient.useSession();

  const [customerState, setCustomerState] = useState<CustomerState | null>(
    null,
  );

  useEffect(() => {
    async function getCustomerState() {
      if (!session) return;

      const { data: state } = await authClient.customer.state();
      console.log("state", state);
      //@ts-ignore
      setCustomerState(state);
    }

    console.log("session", session);
    getCustomerState();
  }, [session]);

  return (
    <div className="w-full min-h-[calc(100vh-9rem)] flex flex-col items-center gap-8 ">
      <RectangularProfileCard />

      {(customerState?.activeSubscriptions.length ?? 0) === 0 && (
        <PricingAndPlans />
      )}

      {!!customerState?.activeSubscriptions.length && (
        <>
          <div className="w-full max-w-md space-y-2">
            <p className="text-sm font-medium">Your subscriptions:</p>
            {customerState?.activeSubscriptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active subscriptions.
              </p>
            ) : (
              <ul className="space-y-1">
                {customerState?.activeSubscriptions.map((sub) => (
                  <li key={sub.id} className="text-xs text-muted-foreground">
                    {sub.productId} ({sub.status})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <ConnectToServerButton />
          </div>

          <div className="mt-4">
            <ManageSubscriptionButton />
          </div>
        </>
      )}
    </div>
  );
}
