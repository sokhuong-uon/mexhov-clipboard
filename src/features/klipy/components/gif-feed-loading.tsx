import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_COUNT = 8;

export function GifFeedLoading() {
  return (
    <div className="grid grid-cols-3 gap-2 p-4 pt-2">
      {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <Skeleton key={index} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}
