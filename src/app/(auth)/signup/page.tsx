"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Some Supabase configs auto-confirm; try redirecting directly
    const { data: session } = await supabase.auth.getSession();
    if (session.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="w-full max-w-sm animate-fade-in text-center">
        <div className="text-4xl mb-4">📬</div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Check your email</h2>
        <p className="text-sm text-text-muted">
          We sent a confirmation link to <strong className="text-text-secondary">{email}</strong>.
          Click it to activate your account.
        </p>
        <Link href="/login">
          <Button variant="secondary" className="mt-6">
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Start shipping</h1>
        <p className="text-sm text-text-muted mt-2">
          Turn your goal into weekly deliverables
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            label="Name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

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
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
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
            Create account
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-text-muted mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary-light hover:text-primary transition-colors font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
