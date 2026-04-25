import { create } from "zustand";

type GifSearchQueryState = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

export const useGifSearchQueryStore = create<GifSearchQueryState>()((set) => ({
  searchQuery: "",
  setSearchQuery: (query: string) => set({ searchQuery: query }),
}));
