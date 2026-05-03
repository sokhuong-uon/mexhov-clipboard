type GifFeedEmptyProps = {
  isSearching: boolean;
};

export function GifFeedEmpty({ isSearching }: GifFeedEmptyProps) {
  return (
    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
      {isSearching ? "No GIFs found" : "No trending GIFs"}
    </div>
  );
}
