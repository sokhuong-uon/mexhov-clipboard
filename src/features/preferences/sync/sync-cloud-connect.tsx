import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "@/components/ui/button";

const SIGN_UP_URL = `${import.meta.env.VITE_BROWSER_AUTH_URL}/sign-up?callbackURL=mexboard://`;
const SIGN_IN_URL = `${import.meta.env.VITE_BROWSER_AUTH_URL}/sign-in?callbackURL=mexboard://`;

export function SyncCloudConnect() {
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={() => openUrl(SIGN_UP_URL)}>
        Sign Up
      </Button>

      <Button type="button" onClick={() => openUrl(SIGN_IN_URL)}>
        Log in
      </Button>
    </div>
  );
}
