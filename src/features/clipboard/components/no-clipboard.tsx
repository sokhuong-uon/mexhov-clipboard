import { CopyMinus } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function NoClipboard() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CopyMinus />
        </EmptyMedia>

        <EmptyTitle>No Clipboard Yet</EmptyTitle>

        <EmptyDescription>Try copying something!</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
