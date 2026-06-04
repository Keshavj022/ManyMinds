import { HTMLAttributes } from "react";

type GlassVariant = "default" | "strong" | "soft" | "aurora";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: GlassVariant;
}

const variantClass: Record<GlassVariant, string> = {
  default: "glass",
  strong: "glass-strong",
  soft: "glass-soft",
  aurora: "glass border-aurora",
};

export default function GlassCard({
  children,
  className = "",
  variant = "default",
  ...props
}: GlassCardProps) {
  return (
    <div className={`${variantClass[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
