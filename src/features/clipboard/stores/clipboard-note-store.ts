import { create } from 'zustand'

type ClipboardNoteState = {
  isEditingNote: string
  setIsEditingNote: (query: string) => void
}

export const useClipboardNoteStore = create<ClipboardNoteState>()((set) => ({
  isEditingNote: '',
  setIsEditingNote: (query: string) => set({ isEditingNote: query }),
}))
