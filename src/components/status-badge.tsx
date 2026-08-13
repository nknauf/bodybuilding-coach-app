import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "COMPLETED"
      ? "secondary"
      : status === "MISSED"
        ? "destructive"
        : "outline";
  return <Badge variant={variant}>{status.toLowerCase()}</Badge>;
}
