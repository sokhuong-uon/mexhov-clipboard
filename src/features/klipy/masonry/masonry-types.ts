import { type Klipy } from "@/features/klipy/schema/klipy";

export type MasonryCell = {
  item: Klipy;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MasonryLayout = {
  cells: MasonryCell[];
  totalHeight: number;
};

export type MasonryOptions = {
  containerWidth: number;
  columns: number;
  gap: number;
};
