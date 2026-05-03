import { authClient } from "@/features/auth/lib/better-auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useState } from "react";

const plans = [
  {
    slug: "Focus-month",
    name: "Focus Monthly",
    price: "0.99",
    interval: "month",
    description: "Billed monthly, cancel anytime.",
  },
  {
    slug: "Focus-year",
    name: "Focus Yearly",
    price: "9.99",
    interval: "year",
    description: "Save ~20% by paying yearly.",
  },
] as const;

export function PricingAndPlans() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleCheckout(slug: string) {
    setIsLoading(true);

    const { data: checkout } = await authClient.checkout({
      slug,
      successUrl: "/success?checkout_id={CHECKOUT_ID}",
      redirect: false,
    });

    if (checkout.url) {
      await openUrl(checkout.url);
    }

    setIsLoading(false);
  }

  return (
    <div className="w-full max-w-2xl grid gap-6 sm:grid-cols-2">
      {plans.map((plan) => (
        <Card key={plan.slug} className="relative flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{plan.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {plan.description}
            </p>
          </CardHeader>

          <CardContent className="flex-1">
            <div className="text-lg font-semibold">
              ${plan.price}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                /{plan.interval}
              </span>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full cursor-pointer"
              variant="default"
              onClick={() => handleCheckout(plan.slug)}
              disabled={isLoading}
            >
              Get {plan.name}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
