type BadgeVariant = "default" | "danger" | "warning" | "success" | "info";

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[#F6F8FB] text-[#667085]",
  danger: "bg-[#FFE8EC] text-[#FF3F4D]",
  warning: "bg-[#FFF3DD] text-[#F59E0B]",
  success: "bg-[#EAFBF3] text-[#12B76A]",
  info: "bg-[#EAF3FF] text-[#2E90FA]",
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}