"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "./ui/Button";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if the user hasn't dismissed it recently
      const dismissedStatus = localStorage.getItem("pwaPromptDismissed");
      if (!dismissedStatus || Date.now() - parseInt(dismissedStatus) > 7 * 24 * 60 * 60 * 1000) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwaPromptDismissed", Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-5">
      <div className="bg-surface-elevated/95 backdrop-blur-md border border-border shadow-2xl shadow-black/50 p-4 pl-5 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-text mb-0.5">Install SplitKaro</h3>
          <p className="text-xs text-text-muted">Add to home screen for quick access</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleInstallClick} className="rounded-xl px-4 py-2">
            <Download size={14} className="mr-1.5" />
            Install
          </Button>
          <button 
            onClick={handleDismiss}
            className="p-1.5 rounded-full text-text-muted hover:text-text hover:bg-surface-highlight transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
