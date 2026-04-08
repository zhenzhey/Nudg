import { cn } from "@/lib/utils";
import type { DeliverableStatus } from "@/types";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "accent";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variantClasses = {
    default: "bg-surface-3 text-text-secondary border-border",
    primary: "bg-primary-muted text-primary-light border-primary/30",
    success: "bg-success-muted text-success border-success/30",
    warning: "bg-warning-muted text-warning border-warning/30",
    danger: "bg-danger-muted text-danger border-danger/30",
    accent: "bg-accent-muted text-accent border-accent/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Status-specific badge for deliverable statuses
export function StatusBadge({ status }: { status: DeliverableStatus }) {
  const config: Record<
    DeliverableStatus,
    { label: string; variant: BadgeProps["variant"]; dot: string }
  > = {
    pending: { label: "Pending", variant: "default", dot: "bg-text-muted" },
    submitted: { label: "Submitted", variant: "primary", dot: "bg-primary" },
    verified: { label: "Verified", variant: "success", dot: "bg-success" },
    missed: { label: "Missed", variant: "danger", dot: "bg-danger" },
  };

  const { label, variant, dot } = config[status];

  return (
    <Badge variant={variant}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {label}
    </Badge>
  );
}
