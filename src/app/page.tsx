"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import {
  Sparkles,
  ArrowRight,
  Receipt,
  Users,
  ArrowLeftRight,
  Shield,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const features = [
    {
      icon: Receipt,
      title: "Track Everything",
      desc: "Log rent, groceries, utilities & more with ease.",
      gradient: "from-purple-500 to-indigo-600",
    },
    {
      icon: Users,
      title: "Split Fairly",
      desc: "Equal splits calculated automatically among roommates.",
      gradient: "from-teal-400 to-emerald-500",
    },
    {
      icon: ArrowLeftRight,
      title: "Settle Smartly",
      desc: "Minimized transactions — fewer payments, less hassle.",
      gradient: "from-pink-400 to-rose-500",
    },
    {
      icon: Shield,
      title: "Free Forever",
      desc: "No subscriptions, no hidden charges, no ads.",
      gradient: "from-blue-400 to-cyan-500",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent animate-pulse-glow" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/10 blur-[100px]" />

      <div className="relative z-10 max-w-md mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16 pt-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent mb-6 shadow-2xl shadow-primary/30 animate-pulse-glow">
            <Sparkles size={36} className="text-white" />
          </div>
          <h1 className="text-5xl font-black gradient-text mb-3 leading-tight">
            SplitKaro
          </h1>
          <p className="text-text-muted text-lg leading-relaxed max-w-xs mx-auto">
            Split expenses with your roommates —{" "}
            <span className="text-primary-light font-semibold">
              effortlessly
            </span>
            .
          </p>
        </div>

        {/* Feature cards */}
        <div className="space-y-3 mb-12 stagger-children">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="glass rounded-2xl p-4 flex items-center gap-4"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shrink-0`}
                >
                  <Icon size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-text-muted">{feature.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="space-y-3 animate-slide-up">
          <Link href="/login" className="block">
            <Button fullWidth size="lg" className="gap-2 text-base">
              Get Started
              <ArrowRight size={20} />
            </Button>
          </Link>
          <p className="text-center text-xs text-text-dim">
            No sign-up friction — just enter your email.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-text-dim text-xs">
            Built with ❤️ for roommates everywhere
          </p>
        </div>
      </div>
    </div>
  );
}
