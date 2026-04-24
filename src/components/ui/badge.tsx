import { cn } from "@/lib/utils";
import type { DeliverableStatus } from "@/types";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "accent";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variantClasses = {
    default:  "bg-surface-container text-on-surface-variant border border-outline/40",
    primary:  "bg-primary/10 text-primary border border-primary/20",
    success:  "bg-success-muted text-success border border-success/20",
    warning:  "bg-warning-muted text-warning border border-warning/20",
    danger:   "bg-error-container text-danger border border-danger/20",
    accent:   "bg-tertiary-container text-tertiary border border-tertiary/20",
  };

  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full", variantClasses[variant], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: DeliverableStatus }) {
  const config: Record<DeliverableStatus, { label: string; variant: BadgeProps["variant"]; dot: string }> = {
    pending:   { label: "Pending",   variant: "default",  dot: "bg-on-surface-variant/50" },
    submitted: { label: "Submitted", variant: "primary",  dot: "bg-primary" },
    verified:  { label: "Verified",  variant: "success",  dot: "bg-success" },
    missed:    { label: "Missed",    variant: "danger",   dot: "bg-danger" },
  };

  const { label, variant, dot } = config[status];

  return (
    <Badge variant={variant}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {label}
    </Badge>
  );
}
