"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-purple-600 text-white border-2 border-purple-600 hover:bg-purple-700 hover:border-purple-700",
  secondary:
    "bg-yellow-400 text-black border-2 border-yellow-400 hover:bg-yellow-500 hover:border-yellow-500",
  outline: "bg-transparent text-purple-700 border-2 border-purple-600 hover:bg-purple-50",
  danger: "bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 hover:border-red-700",
} as const;

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-md",
  md: "px-5 py-2.5 text-base rounded-lg",
  lg: "px-8 py-3 text-lg rounded-xl",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  href?: string;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const classes = [base, sizes[size], variants[variant], className].join(" ");

  const inner = (
    <>
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {icon && iconPosition === "left" && !loading && <span className="mr-2 shrink-0">{icon}</span>}
      {children}
      {icon && iconPosition === "right" && <span className="ml-2 shrink-0">{icon}</span>}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {inner}
    </button>
  );
}
