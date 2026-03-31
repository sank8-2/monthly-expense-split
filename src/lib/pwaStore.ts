"use client";

import { useEffect, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// The singleton to hold the prompt event
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listeners: Array<(prompt: BeforeInstallPromptEvent | null) => void> = [];

export function setPwaPrompt(prompt: BeforeInstallPromptEvent | null) {
  deferredPrompt = prompt;
  listeners.forEach((listener) => listener(prompt));
}

export function getPwaPrompt() {
  return deferredPrompt;
}

export function usePwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(deferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      setTimeout(() => setIsInstalled(true), 0);
    }

    const onChange = (newPrompt: BeforeInstallPromptEvent | null) => {
      setPrompt(newPrompt);
    };

    listeners.push(onChange);
    return () => {
      listeners = listeners.filter((l) => l !== onChange);
    };
  }, []);

  const install = async () => {
    if (!prompt) return false;
    
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      
      if (outcome === "accepted") {
        setPwaPrompt(null);
        return true;
      }
    } catch (err) {
      console.error("PWA install error:", err);
    }
    return false;
  };

  return { prompt, isInstalled, install };
}
