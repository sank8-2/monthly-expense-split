"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal content - slides up from bottom on mobile */}
      <div
        className={cn(
          "relative w-full sm:max-w-md bg-surface border border-border",
          "rounded-t-3xl sm:rounded-2xl p-6",
          "animate-slide-up max-h-[85vh] overflow-y-auto",
          className
        )}
      >
        {/* Handle bar (mobile indicator) */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-surface-elevated transition-colors"
            >
              <X size={20} className="text-text-muted" />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
