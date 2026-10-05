"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Sparkle } from "@/components/Shapes";
import { Button, ErrorBox, Eyebrow } from "@/components/ui";
import { browserSupabase, isCloudConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "That sign-in link expired or was already used. Request a new one." : null
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await browserSupabase().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hero-bg relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <Sparkle className="absolute left-10 top-16 h-10 w-10 text-cream/70" />
      <Sparkle className="absolute bottom-16 right-10 h-14 w-14 text-cream/60" />
      <div className="glass flex aspect-square w-full max-w-[26rem] flex-col items-center justify-center rounded-full p-10 text-center sm:p-14">
        <Eyebrow>Private & personal</Eyebrow>
        <h1 className="display mt-3 text-5xl text-kombu">
          Soul <em>health</em>
        </h1>
        {!isCloudConfigured() ? (
          <p className="mt-4 text-sm text-noir/70">
            Cloud sign-in isn&apos;t configured. <Link href="/" className="font-semibold text-kombu underline">Continue in demo mode</Link>.
          </p>
        ) : sent ? (
          <p className="mt-4 text-sm text-noir/75">
            Check <strong>{email}</strong> — we sent you a sign-in link.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-5 flex w-full max-w-xs flex-col gap-3">
            <input type="email" required className="field text-center" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
            <Button type="submit" loading={busy}>
              Send magic link
            </Button>
          </form>
        )}
        {error && (
          <div className="mt-3 w-full max-w-xs">
            <ErrorBox>{error}</ErrorBox>
          </div>
        )}
      </div>
    </div>
  );
}
