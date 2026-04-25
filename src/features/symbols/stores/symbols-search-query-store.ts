import { create } from "zustand";

type SymbolsSearchQueryState = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

export const useSymbolsSearchQueryStore = create<SymbolsSearchQueryState>()(
  (set) => ({
    searchQuery: "",
    setSearchQuery: (query: string) => set({ searchQuery: query }),
  }),
);
