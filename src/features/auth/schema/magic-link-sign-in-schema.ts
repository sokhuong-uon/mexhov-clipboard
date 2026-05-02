import { z } from "zod";

export const magicLinkSignInSchema = z.object({
  email: z.email(),
});

export type MagicLinkSignInSchema = z.infer<typeof magicLinkSignInSchema>;
