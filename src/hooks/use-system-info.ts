import { useQuery } from "@tanstack/react-query";
import { commands } from "@/bindings";
import { SystemInfo } from "@/types/clipboard";

const DEFAULT_SYSTEM_INFO: SystemInfo = {
  isWayland: false,
  isCosmicDataControlEnabled: false,
};

export const useSystemInfo = (): SystemInfo => {
  const { data = DEFAULT_SYSTEM_INFO } = useQuery({
    queryKey: ["system-info"],
    queryFn: async (): Promise<SystemInfo> => {
      try {
        const [isWayland, isCosmicDataControlEnabled] = await Promise.all([
          commands.isWaylandSession(),
          commands.isCosmicDataControlEnabled(),
        ]);
        return { isWayland, isCosmicDataControlEnabled };
      } catch {
        return DEFAULT_SYSTEM_INFO;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data;
};
