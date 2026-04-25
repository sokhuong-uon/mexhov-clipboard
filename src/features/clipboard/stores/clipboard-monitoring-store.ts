import { create } from "zustand";

type ClipboardMonitoringState = {
  isMonitoring: boolean;
  toggleMonitoring: () => void;
};

export const useClipboardMonitoringStore = create<ClipboardMonitoringState>()(
  (set) => ({
    isMonitoring: true,
    toggleMonitoring: () =>
      set((state) => ({ isMonitoring: !state.isMonitoring })),
  }),
);
