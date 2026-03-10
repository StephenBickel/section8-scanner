"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Enter your email first");
      return;
    }
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  };

  if (magicLinkSent) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-full max-w-sm p-8">
          <div className="text-center">
            <div className="text-4xl mb-4 opacity-40">&#9993;</div>
            <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
            <p className="text-sm text-[#777]">
              We sent a magic link to <span className="text-white">{email}</span>
            </p>
            <button
              onClick={() => setMagicLinkSent(false)}
              className="mt-6 text-xs text-[#00ff88] hover:underline"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-sm p-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-sm text-[#777]">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-[#777] uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs text-[#777] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none transition-colors"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="bg-[rgba(255,68,68,0.1)] border border-[#ff4444] rounded-lg p-3 text-xs text-[#ff4444]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all bg-[#00ff88] text-black hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 border-t border-[#222]" />
          <span className="text-[10px] text-[#555] uppercase">or</span>
          <div className="flex-1 border-t border-[#222]" />
        </div>

        <button
          onClick={handleMagicLink}
          disabled={loading}
          className="w-full mt-4 py-2.5 rounded-lg text-sm text-[#777] border border-[#222] hover:border-[#00ff88] hover:text-[#00ff88] transition-colors disabled:opacity-50"
        >
          Send magic link
        </button>

        <p className="mt-6 text-center text-xs text-[#555]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#00ff88] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
