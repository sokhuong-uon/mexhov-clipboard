import { authClient } from "@/features/auth/lib/better-auth-client";
import { commands } from "@/bindings";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function ConnectToServerButton() {
  const { data: session } = authClient.useSession();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);

    const result = await commands.connectWebsocket(
      `${import.meta.env.VITE_WEBSOCKET_BASE_URL}/ws/${session?.session.userId}`,
      session?.session.token ?? "",
    );
    if (result.status === "ok") {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    const result = await commands.disconnectWebsocket();
    if (result.status === "ok") {
      setIsConnected(false);
    }
  };

  if (!session) return null;

  return (
    <div className="flex flex-col gap-2">
      <Button disabled={isConnecting || isConnected} onClick={handleConnect}>
        {isConnected ? "Connected" : "Connect"}
      </Button>
      {isConnected && <Button onClick={handleDisconnect}>Disconnect</Button>}
    </div>
  );
}
