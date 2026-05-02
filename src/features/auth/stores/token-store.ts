import { create } from "zustand";
import { commands } from "@/bindings";

type TokenState = {
  token: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: (token: string) => Promise<void>;
  clear: () => Promise<void>;
};

export const useTokenStore = create<TokenState>()((set) => ({
  token: null,
  hydrated: false,

  hydrate: async () => {
    const token = await commands.getSessionToken();
    set({ token, hydrated: true });
  },

  set: async (token) => {
    await commands.saveSessionToken(token);
    set({ token });
  },

  clear: async () => {
    await commands.deleteSessionToken();
    set({ token: null });
  },
}));

export const tokenStore = {
  get: () => useTokenStore.getState().token,
  set: (token: string) => useTokenStore.getState().set(token),
  clear: () => useTokenStore.getState().clear(),
  hydrate: () => useTokenStore.getState().hydrate(),
};
