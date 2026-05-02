import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { GalleryVerticalEnd } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/features/auth/lib/better-auth-client";
import {
  MagicLinkSignInSchema,
  magicLinkSignInSchema,
} from "@/features/auth/schema/magic-link-sign-in-schema";

export function MagicLinkSignInForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const form = useForm<MagicLinkSignInSchema>({
    resolver: zodResolver(magicLinkSignInSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: MagicLinkSignInSchema) => {
    try {
      const { data, error } = await authClient.signIn.magicLink(
        {
          email: values.email,
          callbackURL: "mexboard://api/auth/",
        },
        {
          headers: {
            platform: "desktop",
          },
        },
      );

      if (error) {
        throw error;
      }

      console.log("magic link status:", data.status);

      form.reset();
    } catch (error) {}
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="https://mexboard.com"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Mexboard Connect</span>
            </a>

            <h1 className="text-xl font-bold">Sign in to Mexboard</h1>
          </div>

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  {...field}
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Field>
            <Button type="submit">Send Magic Link</Button>
          </Field>
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center">
        By creating an account, you agree to our{" "}
        <a href="https://mexboard.com/terms-of-service">Terms of Service</a> and{" "}
        <a href="https://mexboard.com/privacy-policy">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
