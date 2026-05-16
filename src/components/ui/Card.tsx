import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <section
      className={`rounded-[2rem] border border-[#E6EAF0] bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}