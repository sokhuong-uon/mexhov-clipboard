import { AlertCircle } from "lucide-react";
import { ClipboardError } from "@/types/clipboard";
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ErrorBannerProps = {
  error: ClipboardError;
  onRetry?: () => void;
  onDismiss: () => void;
};

export const ErrorBanner = ({
  error,
  onRetry,
  onDismiss,
}: ErrorBannerProps) => {
  return (
    <div className="mx-4 mb-4">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{error.message}</AlertTitle>
        <AlertDescription>
          {error.timestamp.toLocaleTimeString()}
        </AlertDescription>
        <AlertAction className="flex items-center gap-2">
          {error.retryable && onRetry && (
            <Button variant="destructive" size="xs" onClick={onRetry}>
              Retry
            </Button>
          )}
          <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
            <span className="sr-only">Dismiss</span>✕
          </Button>
        </AlertAction>
      </Alert>
    </div>
  );
};
