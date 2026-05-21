import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type FlashMessageProps = {
  message?: string;
  error?: string;
  info?: string;
  className?: string;
};

function sanitizeFlashText(value?: string) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase().includes("stack trace")) {
    return "Something went wrong. Please try again.";
  }
  return trimmed;
}

export function FlashMessage({ message, error, info, className = "" }: FlashMessageProps) {
  const safeMessage = sanitizeFlashText(message);
  const safeError = sanitizeFlashText(error);
  const safeInfo = sanitizeFlashText(info);

  if (!safeMessage && !safeError && !safeInfo) {
    return null;
  }

  const variants = [
    safeMessage
      ? {
          key: "success",
          label: "Success",
          body: safeMessage,
          badgeVariant: "success" as const,
          cardClass: "border-[#12B76A]/40 bg-[#EAFBF3]",
          textClass: "text-[#101828]",
          role: "status",
        }
      : null,
    safeError
      ? {
          key: "error",
          label: "Error",
          body: safeError,
          badgeVariant: "danger" as const,
          cardClass: "border-[#FF3F4D]/40 bg-[#FFF6F7]",
          textClass: "text-[#B42318]",
          role: "alert",
        }
      : null,
    safeInfo
      ? {
          key: "info",
          label: "Notice",
          body: safeInfo,
          badgeVariant: "info" as const,
          cardClass: "border-[#2E90FA]/30 bg-[#EAF3FF]",
          textClass: "text-[#175CD3]",
          role: "status",
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: "Success" | "Error" | "Notice";
    body: string;
    badgeVariant: "success" | "danger" | "info";
    cardClass: string;
    textClass: string;
    role: "status" | "alert";
  }>;

  return (
    <div className={`space-y-3 ${className}`}>
      {variants.map((variant) => (
        <Card key={variant.key} className={variant.cardClass} role={variant.role}>
          <Badge variant={variant.badgeVariant}>{variant.label}</Badge>
          <p className={`mt-3 text-sm font-bold leading-6 ${variant.textClass}`}>{variant.body}</p>
        </Card>
      ))}
    </div>
  );
}
