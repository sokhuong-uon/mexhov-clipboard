import { Copy, ImagePlay, SquarePercent } from "lucide-react";

export function useTabs() {
  return [
    {
      label: 'Clipboard',
      value: 'clipboard',
      icon: Copy
    },
    {
      label: 'GIF',
      value: 'gif',
      icon: ImagePlay
    },
    {
      label: 'Symbols',
      value: 'symbols',
      icon: SquarePercent
    }
  ]
}
