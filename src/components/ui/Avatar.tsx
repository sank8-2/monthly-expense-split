"use client";

import React from "react";
import { cn, getInitials } from "@/lib/utils";

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const AVATAR_COLORS = [
  "from-purple-500 to-indigo-600",
  "from-teal-400 to-emerald-500",
  "from-pink-400 to-rose-500",
  "from-orange-400 to-red-500",
  "from-blue-400 to-cyan-500",
];

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          "rounded-full object-cover",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  const gradient = AVATAR_COLORS[getColorIndex(name)];

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br",
        gradient,
        sizeClasses[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
