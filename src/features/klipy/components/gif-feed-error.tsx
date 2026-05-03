import { getKlipyErrorMessage } from "@/features/klipy/utils/klipy-error-message";

type GifFeedErrorProps = {
  error: unknown;
};

export function GifFeedError({ error }: GifFeedErrorProps) {
  return (
    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm px-4 text-center">
      {getKlipyErrorMessage(error)}
    </div>
  );
}
