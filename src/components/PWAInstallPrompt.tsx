"use client";

import React, { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePwaInstall, setPwaPrompt, getPwaPrompt } from "@/lib/pwaStore";

export default function PWAInstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const { isInstalled, install } = usePwaInstall();

  useEffect(() => {
    // Show banner only if app is not installed and prompt is available
    const prompt = getPwaPrompt();
    if (prompt && !isInstalled) {
      setShowBanner(true);
    }
  }, [isInstalled]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      // Set the prompt in the store
      setPwaPrompt(e as any);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowBanner(false);
    }
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <Card className="p-4 shadow-2xl border-primary/20 bg-gradient-to-br from-surface to-primary/5">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary shrink-0">
            <Download size={24} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-bold text-text">Install SplitKaro</h3>
            <p className="text-xs text-text-muted">
              Get the best experience by installing our app!
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={handleInstall} className="rounded-xl px-4 py-2 text-sm">
              Install
            </Button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-text-muted hover:text-text p-1 self-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
