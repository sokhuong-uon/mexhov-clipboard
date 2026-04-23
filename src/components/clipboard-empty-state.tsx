import { NoMatchedClipboard } from "@/features/clipboard/components/no-matched-clipboard";
import { NoClipboard } from "@/features/clipboard/components/no-clipboard";

export const EmptyState = ({
  isSearching = false,
}: {
  isSearching?: boolean;
}) => {
  return (
    <div className="flex items-center justify-center w-full h-full">
      {isSearching && <NoMatchedClipboard />}
      {!isSearching && <NoClipboard />}
    </div>
  );
};
