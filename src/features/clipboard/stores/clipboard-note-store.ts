import { create } from "zustand";

type ClipboardNoteState = {
  isEditingNote: boolean;
  setIsEditingNote: (editing: boolean) => void;
};

export const useClipboardNoteStore = create<ClipboardNoteState>()((set) => ({
  isEditingNote: false,
  setIsEditingNote: (editing) => set({ isEditingNote: editing }),
}));
