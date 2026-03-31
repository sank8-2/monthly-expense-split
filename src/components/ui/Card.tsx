"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "gradient";
  noPadding?: boolean;
}

export function Card({
  children,
  variant = "default",
  noPadding = false,
  className,
  ...props
}: CardProps) {
  const variantClasses = {
    default: "bg-surface border border-border",
    glass: "glass",
    gradient:
      "bg-gradient-to-br from-primary/20 via-surface to-accent/10 border border-primary/20",
  };

  return (
    <div
      className={cn(
        "rounded-2xl transition-all duration-200",
        variantClasses[variant],
        !noPadding && "p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
