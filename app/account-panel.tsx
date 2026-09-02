"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, type Profile } from "@/lib/supabase/client";

type StatusTone = "idle" | "good" | "error";

type AccountPanelProps = {
  open: boolean;
  onToggle: () => void;
};

export function AccountPanel({ open, onToggle }: AccountPanelProps) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; text: string }>({ tone: "idle", text: "" });

  useEffect(() => {
    let alive = true;

    async function loadSession() {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setUser(data.user);
      setLoading(false);
    }

    void loadSession();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, display_name, pseudo_id")
        .eq("id", user.id)
        .maybeSingle<Profile>();

      if (!alive) return;
      setProfile(data ?? null);
      if (error) setStatus({ tone: "error", text: `Profile read failed: ${error.message}` });
    }

    void loadProfile();
    return () => {
      alive = false;
    };
  }, [supabase, user]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const intent = String(form.get("intent"));
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setStatus({ tone: "error", text: "Enter email and password." });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: "" });

    const result =
      intent === "sign-up"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);
    if (result.error) {
      setStatus({ tone: "error", text: result.error.message });
      return;
    }

    setStatus({
      tone: "good",
      text: intent === "sign-up" ? "Account created. Check email if confirmation is enabled." : "Signed in.",
    });
  }

  async function signOut() {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) {
      setStatus({ tone: "error", text: error.message });
      return;
    }
    setStatus({ tone: "good", text: "Signed out. You can use another account now." });
  }

  const displayName = profile?.display_name || user?.email || "Not signed in";
  const role = profile?.role ? profile.role.replace("_", " ") : user ? "profile missing" : "Supabase account";
  const initials = (displayName.match(/\b[A-Za-z]/g) ?? ["A", "R"]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="worker-card">
      <div className="avatar">{initials}</div>
      <div><strong>{displayName}</strong><span>{role}</span></div>
      <button type="button" aria-label="Open account menu" aria-expanded={open} onClick={onToggle}>•••</button>
      {open && (
        <div className="account-popover account-popover-auth" role="region" aria-label="Account menu">
          {loading ? (
            <small>Checking Supabase session...</small>
          ) : user ? (
            <>
              <strong>{displayName}</strong>
              <span>{user.email}</span>
              <small>{profile ? `Profile: ${profile.pseudo_id}` : "No profile row for this user yet."}</small>
              <button type="button" className="account-action" onClick={signOut} disabled={busy}>Sign out</button>
            </>
          ) : (
            <form className="account-form" onSubmit={submitAuth}>
              <label>Email<input type="email" name="email" autoComplete="email" required /></label>
              <label>Password<input type="password" name="password" autoComplete="current-password" required minLength={6} /></label>
              <div className="account-form-actions">
                <button type="submit" name="intent" value="sign-in" disabled={busy}>Sign in</button>
                <button type="submit" name="intent" value="sign-up" disabled={busy}>Sign up</button>
              </div>
            </form>
          )}
          {status.text && <small className={`account-status ${status.tone}`}>{status.text}</small>}
        </div>
      )}
    </div>
  );
}
