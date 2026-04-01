import { useState } from "react";
import { Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SyncCloudConnectProps = {
  loading: boolean;
  onConnect: (relayUrl: string, authToken: string) => void;
};

export function SyncCloudConnect({
  loading,
  onConnect,
}: SyncCloudConnectProps) {
  const [relayUrl, setRelayUrl] = useState("");
  const [authToken, setAuthToken] = useState("");

  const handleConnect = () => {
    if (relayUrl.trim() && authToken.trim()) {
      onConnect(relayUrl.trim(), authToken.trim());
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Relay URL (wss://...)"
        value={relayUrl}
        onChange={(e) => setRelayUrl(e.target.value)}
        className="h-8 text-xs"
      />
      <Input
        type="password"
        placeholder="Auth token"
        value={authToken}
        onChange={(e) => setAuthToken(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleConnect()}
        className="h-8 text-xs"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleConnect}
        disabled={loading || !relayUrl.trim() || !authToken.trim()}
        className="h-8"
      >
        <Cloud className="size-3.5 mr-1.5" />
        Connect
      </Button>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Sync clipboard over the internet via a cloud relay. End-to-end
        encrypted.
      </p>
    </div>
  );
}
