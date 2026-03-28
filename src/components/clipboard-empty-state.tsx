import { Card, CardContent } from "@/components/ui/card";

export const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            No clipboard history yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Copy something to start tracking your clipboard!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
