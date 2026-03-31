"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, Sparkles, ArrowRight, Check } from "lucide-react";

export default function LoginPage() {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    const { error: err } = await signInWithMagicLink(email.trim());
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* Background gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/20 blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/15 blur-[100px]" />

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent mb-6 animate-pulse-glow shadow-2xl">
            <Sparkles size={36} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold gradient-text mb-2">
            SplitKaro
          </h1>
          <p className="text-text-muted text-base">
            Split expenses with your roommates, effortlessly.
          </p>
        </div>

        {sent ? (
          /* Success state */
          <div className="glass rounded-3xl p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-success" />
            </div>
            <h2 className="text-xl font-bold text-text mb-2">
              Check your email
            </h2>
            <p className="text-text-muted text-sm mb-6">
              We sent a magic link to{" "}
              <span className="text-primary-light font-semibold">{email}</span>.
              <br />
              Click it to sign in.
            </p>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
            >
              Use a different email
            </Button>
          </div>
        ) : (
          /* Login form */
          <form
            onSubmit={handleSubmit}
            className="glass rounded-3xl p-8 space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-text mb-1">
                Welcome back
              </h2>
              <p className="text-text-muted text-sm">
                Sign in with your email — no password needed.
              </p>
            </div>

            <Input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={18} />}
              error={error ?? undefined}
              autoFocus
              required
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={loading}
            >
              <span>Send Magic Link</span>
              <ArrowRight size={18} className="ml-2" />
            </Button>

            <p className="text-center text-xs text-text-dim">
              By continuing, you agree to our Terms of Service.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
