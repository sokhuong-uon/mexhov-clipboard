import { Button } from "@/components/ui/button";
import { MagicLinkSignInForm } from "@/features/auth/components/magic-link-sign-in-form";
import { authClient } from "@/features/auth/lib/better-auth-client";
import { signOut } from "@/features/auth/lib/sign-out";
import { PricingAndPlans } from "@/features/subscription/components/pricing-and-plans";
import { useEffect, useState } from "react";
import { CustomerState } from "@polar-sh/sdk/models/components/customerstate";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { ManageSubscriptionButton } from "@/features/subscription/components/manage-subscription-button";

export function SyncCloudConnect() {
  const { data: session, isPending } = authClient.useSession();

  const [customerState, setCustomerState] = useState<CustomerState | null>(
    null,
  );

  useEffect(() => {
    async function getCustomerState() {
      if (!session) return;

      const { data: state } = await authClient.customer.state();
      //@ts-ignore
      setCustomerState(state);
    }

    getCustomerState();
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
      <div className="w-full min-h-[calc(100vh-9rem)] flex flex-col items-center gap-8 ">
        <div className="flex items-center gap-2 w-full p-2 bg-muted/50">
          <Avatar size="lg">
            <AvatarImage
              src={customerState?.avatarUrl}
              alt={customerState?.name ?? session.user.name}
            />
            <AvatarFallback>{session.user.name.slice(0, 1)}</AvatarFallback>
          </Avatar>

          <div>
            <p className="font-medium">
              {customerState?.name ?? session.user.name}
            </p>
            <p className="text-muted-foreground">{customerState?.email}</p>
          </div>

          <Button variant="ghost" onClick={signOut} className="ml-auto">
            <LogOut className="w-10" />
          </Button>
        </div>

        {customerState?.activeSubscriptions.length === 0 && <PricingAndPlans />}

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

            <div className="mt-4">
              <ManageSubscriptionButton />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-9rem)] flex items-center">
      <MagicLinkSignInForm />
    </div>
  );
}
