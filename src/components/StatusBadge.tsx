import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "PENDENTE") {
    return (
      <Badge className="bg-status-pending text-status-pending-foreground border-none font-semibold text-xs tracking-wide">
        PENDENTE
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="font-semibold text-xs tracking-wide">
      {status}
    </Badge>
  );
}
