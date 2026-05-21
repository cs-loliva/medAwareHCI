import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <section
      {...rest}
      className={`overflow-hidden rounded-[2rem] border border-[#E6EAF0] bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
