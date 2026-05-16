import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <section
      className={`overflow-hidden rounded-[2rem] border border-[#E6EAF0] bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}