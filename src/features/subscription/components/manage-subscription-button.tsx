import { openUrl } from "@tauri-apps/plugin-opener";
import { authClient } from "@/features/auth/lib/better-auth-client";
import { Button } from "@/components/ui/button";
import { PropsWithChildren } from "react";
import { useState } from "react";

export function ManageSubscriptionButton({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(false);

  const onOpenPortal = async () => {
    setIsLoading(true);

    const { data: portal } = await authClient.customer.portal({
      redirect: false,
    });

    if (portal.url) {
      await openUrl(portal.url);
    }

    setIsLoading(false);
  };

  return (
    <Button
      variant="outline"
      onClick={onOpenPortal}
      disabled={isLoading}
      className="cursor-pointer"
    >
      {children ?? "Manage subscription"}
    </Button>
  );
}
