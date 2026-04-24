"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DemoLoginButton } from "@/components/demo-login-button";
import type { Metadata } from "next";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
        <p className="text-sm text-text-muted mt-2">Sign in to keep shipping</p>
      </div>

      <div className="card">
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="text-sm text-danger bg-danger-muted border border-danger/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            fullWidth
            className="mt-2"
          >
            Sign in
          </Button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface px-2 text-xs text-text-muted">or</span>
          </div>
        </div>

        <DemoLoginButton
          fullWidth
          className="w-full inline-flex items-center justify-center gap-2 bg-surface-2 hover:bg-surface-3 border border-border hover:border-border-2 text-text-primary text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
        />
      </div>

      <p className="text-center text-sm text-text-muted mt-6">
        No account yet?{" "}
        <Link
          href="/signup"
          className="text-primary-light hover:text-primary transition-colors font-medium"
        >
          Start building
        </Link>
      </p>
    </div>
  );
}
