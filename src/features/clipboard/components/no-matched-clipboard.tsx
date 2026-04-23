import { ArrowUpRightIcon, CopyMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function NoMatchedClipboard() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CopyMinus />
        </EmptyMedia>

        <EmptyTitle>No Matched Clipboard</EmptyTitle>

        <EmptyDescription>Try other search terms</EmptyDescription>
      </EmptyHeader>

      <Button
        variant="link"
        className="text-muted-foreground"
        size="sm"
        nativeButton={false}
        render={
          <a href="https://mexboard.com">
            Learn About Mexboard <ArrowUpRightIcon />
          </a>
        }
      />
    </Empty>
  );
}
