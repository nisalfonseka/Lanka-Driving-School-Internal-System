import { Badge } from "@/components/ui/badge";
import { humanise } from "@/lib/format";

type Tone = "neutral" | "success" | "danger" | "warning" | "info";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  danger: "bg-destructive/10 text-destructive",
  warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  info: "bg-accent text-accent-foreground",
};

const TONE_BY_VALUE: Record<string, Tone> = {
  ACTIVE: "success",
  COMPLETED: "info",
  INACTIVE: "neutral",
  PRESENT: "success",
  ABSENT: "warning",
  PASS: "success",
  FAIL: "danger",
  PENDING: "neutral",
  OWNER: "info",
  EMPLOYEE: "neutral",
};

export function StatusBadge({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const tone = TONE_BY_VALUE[value] ?? "neutral";

  return (
    <Badge variant="secondary" className={TONE_CLASS[tone]}>
      {label ?? humanise(value)}
    </Badge>
  );
}
