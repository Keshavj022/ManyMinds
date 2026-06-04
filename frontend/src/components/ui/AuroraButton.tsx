"use client";

import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { councilColors } from "@/lib/design-tokens";

type Variant = "primary" | "ghost" | "soft" | "member";
type Size = "sm" | "md" | "lg";

interface CommonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  href?: string;
  className?: string;
  memberColor?: keyof typeof councilColors;
  fullWidth?: boolean;
}

type Props = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps>;

const sizeClass: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-[15px]",
};

export default function AuroraButton({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  href,
  className = "",
  memberColor,
  fullWidth,
  ...rest
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-colors duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:ring-offset-2 focus:ring-offset-[#0a0910]";
  const sizing = sizeClass[size];
  const width = fullWidth ? "w-full" : "";

  let variantClass = "";
  let memberStyle: React.CSSProperties | undefined;

  if (variant === "primary") {
    // Single solid lilac — no animated gradient, no chromatic shadow
    variantClass =
      "bg-[var(--color-accent)] text-[#15121d] hover:bg-[var(--color-accent-strong)] shadow-[0_4px_14px_-4px_rgba(155,135,216,0.5)]";
  } else if (variant === "ghost") {
    variantClass =
      "border border-white/10 bg-white/[0.025] backdrop-blur-sm text-white/85 hover:bg-white/[0.05] hover:text-white hover:border-white/20";
  } else if (variant === "soft") {
    variantClass =
      "bg-white/[0.04] text-white/85 border border-white/[0.06] hover:bg-white/[0.07] hover:text-white";
  } else if (variant === "member" && memberColor) {
    const c = councilColors[memberColor];
    variantClass = "border hover:brightness-110 transition-all";
    memberStyle = {
      background: c.soft,
      color: c.hex,
      borderColor: c.hex + "55",
    };
  }

  const cls = `${base} ${sizing} ${variantClass} ${width} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls} style={memberStyle}>
        {icon}
        <span>{children}</span>
        {iconRight}
      </Link>
    );
  }
  return (
    <button className={cls} style={memberStyle} {...rest}>
      {icon}
      <span>{children}</span>
      {iconRight}
    </button>
  );
}
