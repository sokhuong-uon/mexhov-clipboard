import { create } from 'zustand'

type ClipboardSearchQueryState = {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const useClipboardSearchQueryStore = create<ClipboardSearchQueryState>()((set) => ({
  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),
}))
