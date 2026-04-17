import { useEffect, useState } from "react";
import { commands } from "@/bindings";
import { listen } from "@tauri-apps/api/event";

export type DiscoveredDevice = {
  hostname: string;
  address: string;
  instanceName: string;
};

export function useDiscoveredDevices(active: boolean) {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);

  useEffect(() => {
    if (!active) {
      setDevices([]);
      return;
    }

    commands.mdnsStartDiscovery().catch(console.error);

    const unlistenFound = listen<DiscoveredDevice>("mdns-device-found", (e) => {
      setDevices((prev) => {
        if (prev.some((d) => d.address === e.payload.address)) return prev;
        return [...prev, e.payload];
      });
    });

    const unlistenLost = listen<string>("mdns-device-lost", (e) => {
      setDevices((prev) =>
        prev.filter((d) => d.instanceName !== e.payload),
      );
    });

    return () => {
      commands.mdnsStopDiscovery().catch(console.error);
      unlistenFound.then((fn) => fn());
      unlistenLost.then((fn) => fn());
    };
  }, [active]);

  return devices;
}
