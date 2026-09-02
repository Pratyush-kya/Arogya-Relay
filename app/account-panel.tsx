"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, type Profile } from "@/lib/supabase/client";

type StatusTone = "idle" | "good" | "error";

type AccountPanelProps = {
  open: boolean;
  onToggle: () => void;
};

const ROLES = [
  { id: "health_worker", label: "Health Worker / ASHA", icon: "🩺", desc: "Screenings & referrals" },
  { id: "doctor", label: "Doctor / Clinician", icon: "👨‍⚕️", desc: "Review triage & care plans" },
  { id: "admin", label: "Administrator", icon: "🛡️", desc: "System & user management" },
  { id: "reviewer", label: "Clinical Reviewer", icon: "📋", desc: "Source & guideline audits" },
] as const;

export function AccountPanel({ open, onToggle }: AccountPanelProps) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"health_worker" | "doctor" | "admin" | "reviewer">("health_worker");
  const [status, setStatus] = useState<{ tone: StatusTone; text: string }>({ tone: "idle", text: "" });

  useEffect(() => {
    let alive = true;

    async function loadSession() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!alive) return;
        setUser(data.user);
      } catch {
        if (!alive) return;
        setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadSession();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setAuthModalOpen(false);
      }
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
      if (error && error.code !== "PGRST116") {
        setStatus({ tone: "error", text: `Profile read failed: ${error.message}` });
      }
    }

    void loadProfile();
    return () => {
      alive = false;
    };
  }, [supabase, user]);

  useEffect(() => {
    if (!authModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAuthModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authModalOpen]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setStatus({ tone: "error", text: "Please enter your email and password." });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: "" });

    const result = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (result.error) {
      setStatus({ tone: "error", text: result.error.message });
      return;
    }

    setStatus({ tone: "good", text: "Signed in successfully." });
    setAuthModalOpen(false);
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const facilityName = String(form.get("facilityName") ?? "").trim();

    if (!email || !password) {
      setStatus({ tone: "error", text: "Please fill in all required fields." });
      return;
    }

    if (password.length < 6) {
      setStatus({ tone: "error", text: "Password must be at least 6 characters long." });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: "" });

    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
          role: selectedRole,
          facility_name: facilityName || undefined,
        },
      },
    });

    if (result.error) {
      setBusy(false);
      setStatus({ tone: "error", text: result.error.message });
      return;
    }

    if (result.data.user) {
      const cleanName = displayName || email.split("@")[0];
      const pseudoId = `${selectedRole.slice(0, 3)}-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10)}`;
      await supabase.from("profiles").upsert({
        id: result.data.user.id,
        role: selectedRole,
        display_name: cleanName,
        pseudo_id: pseudoId,
        facility_name: facilityName || null,
      }).catch(() => null);
    }

    setBusy(false);
    setStatus({
      tone: "good",
      text: "Account registered successfully. If email confirmation is enabled, check your inbox.",
    });
    setAuthModalOpen(false);
  }

  async function signOut() {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) {
      setStatus({ tone: "error", text: error.message });
      return;
    }
    setUser(null);
    setProfile(null);
    setStatus({ tone: "good", text: "Signed out of session." });
  }

  const displayName = profile?.display_name || user?.email || (loading ? "Checking session..." : "Field Guest");
  const roleLabel = profile?.role ? profile.role.replace("_", " ").toUpperCase() : user ? "ACCOUNT ACTIVE" : "FIELD DEMO";
  const initials = (displayName.match(/\b[A-Za-z]/g) ?? ["A", "R"]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <div className="worker-card">
        <div className={`avatar ${!user ? "guest-avatar" : ""}`}>{initials}</div>
        <div>
          <strong>{displayName}</strong>
          <span className={`role-badge ${profile?.role || "guest"}`}>{roleLabel}</span>
        </div>
        <button
          type="button"
          aria-label={user ? "Open account menu" : "Sign in to Arogya Relay"}
          aria-expanded={open}
          onClick={user ? onToggle : () => { setAuthModalOpen(true); setAuthMode("signin"); }}
          title={user ? "Account Settings" : "Click to Sign In"}
        >
          {user ? "•••" : "🔑"}
        </button>

        {open && user && (
          <div className="account-popover account-popover-auth" role="region" aria-label="Account menu">
            <div className="account-popover-header">
              <div className="avatar">{initials}</div>
              <div>
                <strong>{displayName}</strong>
                <span>{user.email}</span>
              </div>
            </div>

            <div className="account-popover-details">
              <div className="profile-chip">
                <small>Role</small>
                <strong>{profile?.role ? profile.role.replace("_", " ") : "Not assigned"}</strong>
              </div>
              <div className="profile-chip">
                <small>User ID</small>
                <code>{profile?.pseudo_id || user.id.slice(0, 10)}</code>
              </div>
            </div>

            <div className="account-status-badge">
              <i className="status-dot synced" /> Supabase Backend Connected
            </div>

            <button type="button" className="account-action logout-button" onClick={signOut} disabled={busy}>
              {busy ? "Signing out..." : "Sign out"}
            </button>

            {status.text && <small className={`account-status ${status.tone}`}>{status.text}</small>}
          </div>
        )}
      </div>

      {authModalOpen && (
        <div className="auth-modal-backdrop" onClick={() => setAuthModalOpen(false)}>
          <div
            className="auth-modal-window"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="auth-modal-header">
              <div className="auth-brand">
                <div className="auth-brand-icon">AR</div>
                <div>
                  <h2 id="auth-modal-title">Arogya Relay</h2>
                  <p>Clinical & Field Surveillance Portal</p>
                </div>
              </div>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setAuthModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "signin"}
                className={`auth-tab ${authMode === "signin" ? "active" : ""}`}
                onClick={() => { setAuthMode("signin"); setStatus({ tone: "idle", text: "" }); }}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "signup"}
                className={`auth-tab ${authMode === "signup" ? "active" : ""}`}
                onClick={() => { setAuthMode("signup"); setStatus({ tone: "idle", text: "" }); }}
              >
                Create Account
              </button>
            </div>

            {status.text && (
              <div className={`auth-alert ${status.tone}`} role="alert">
                {status.tone === "error" ? "⚠️ " : "✓ "} {status.text}
              </div>
            )}

            {authMode === "signin" ? (
              <form className="auth-body-form" onSubmit={handleSignIn}>
                <div className="auth-field">
                  <label htmlFor="auth-email">Email Address</label>
                  <input
                    id="auth-email"
                    type="email"
                    name="email"
                    placeholder="doctor@health.gov.in"
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </div>

                <div className="auth-field">
                  <div className="auth-field-header">
                    <label htmlFor="auth-password">Password</label>
                    <button
                      type="button"
                      className="auth-peek-btn"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <div className="auth-submit-row">
                  <button type="submit" className="auth-primary-submit" disabled={busy}>
                    {busy ? "Signing in..." : "Sign In to Workspace"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="auth-body-form" onSubmit={handleSignUp}>
                <div className="auth-field">
                  <label htmlFor="reg-name">Full Name / Title</label>
                  <input
                    id="reg-name"
                    type="text"
                    name="displayName"
                    placeholder="e.g. Dr. Sneha Sharma"
                    required
                    autoFocus
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="reg-email">Email Address</label>
                  <input
                    id="reg-email"
                    type="email"
                    name="email"
                    placeholder="practitioner@health.gov.in"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="auth-field">
                  <label>Clinical Role</label>
                  <div className="role-selector-grid">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className={`role-option-card ${selectedRole === r.id ? "selected" : ""}`}
                        onClick={() => setSelectedRole(r.id)}
                      >
                        <span className="role-icon">{r.icon}</span>
                        <div className="role-copy">
                          <strong>{r.label}</strong>
                          <small>{r.desc}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="reg-facility">Health Center / Facility (Optional)</label>
                  <input
                    id="reg-facility"
                    type="text"
                    name="facilityName"
                    placeholder="e.g. Pynursla CHC, Meghalaya"
                  />
                </div>

                <div className="auth-field">
                  <div className="auth-field-header">
                    <label htmlFor="reg-password">Create Password</label>
                    <button
                      type="button"
                      className="auth-peek-btn"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </div>

                <div className="auth-submit-row">
                  <button type="submit" className="auth-primary-submit" disabled={busy}>
                    {busy ? "Creating account..." : "Complete Registration"}
                  </button>
                </div>
              </form>
            )}

            <div className="auth-modal-footer">
              <span className="auth-lock-note">🔒 Encrypted Clinical Session & Local SQLite Fallback</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

