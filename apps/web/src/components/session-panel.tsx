"use client";

import { useEffect, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import { routeForSession } from "@/lib/session-routing";
import type { AuthSession, UserRole } from "@/lib/types";

interface SessionPanelProps {
  contextLabel?: string;
  title?: string;
  description?: string;
  defaultEmail?: string;
  defaultPassword?: string;
  demoRole?: UserRole;
}

export function SessionPanel({
  contextLabel = "this surface",
  title = "Session",
  description = "Seeded demo credentials are prefilled to speed up the first run.",
  defaultEmail = "admin@harbor.local",
  defaultPassword = "ChangeMe123!",
  demoRole = "admin",
}: SessionPanelProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch(`${apiBaseUrl}/auth/me`, {
          credentials: "include",
        });
        if (!response.ok) {
          if (!cancelled) {
            setSession(null);
          }
          return;
        }
        const payload = (await response.json()) as AuthSession;
        if (!cancelled) {
          setSession(payload);
        }
      } catch {
        if (!cancelled) {
          setSession(null);
          setMessage("Authentication service unavailable.");
        }
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [demoRole]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Signing in...");
    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ detail: "Login failed" }))) as { detail?: string };
        setMessage(payload.detail ?? "Login failed");
        return;
      }
      const payload = (await response.json()) as AuthSession;
      setSession(payload);
      setMessage(`Signed in for ${contextLabel}. Redirecting...`);
      window.location.href = routeForSession(payload);
    } catch {
      setSession(null);
      setMessage("Authentication service unavailable.");
    }
  }

  async function handleLogout() {
    await fetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    setSession(null);
    setMessage("Signed out. Redirecting...");
    window.location.href = "/";
  }

  return (
    <section className="form-card stack">
      <div>
        <h3>{title}</h3>
        <p className="muted">{description}</p>
      </div>
      {session ? (
        <>
          <div className="inline-meta">
            <strong>{session.user.full_name}</strong>
            <span className={`status-pill ${session.user.role}`}>{session.user.role}</span>
          </div>
          <div className="muted">{session.user.email}</div>
          <button className="ghost-button" onClick={handleLogout} type="button">
            Sign out
          </button>
        </>
      ) : (
        <form className="stack" onSubmit={handleLogin}>
          <label className="field">
            <span>Email</span>
            <input onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
          </label>
          <label className="field">
            <span>Password</span>
            <input onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
          </label>
          <button className="button" type="submit">
            Sign in
          </button>
        </form>
      )}
      {message ? <div className="muted">{message}</div> : null}
    </section>
  );
}
