import { authClient } from "@/features/auth/lib/better-auth-client";
import { tokenStore } from "@/features/auth/stores/token-store";

export async function signOut() {
  await authClient.signOut();
  await tokenStore.clear();
}
