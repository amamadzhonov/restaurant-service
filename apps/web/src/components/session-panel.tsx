"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { apiBaseUrl } from "@/lib/api";
import { translateRole } from "@/lib/i18n";
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
  title,
  description,
  defaultEmail = "admin@harbor.local",
  defaultPassword = "ChangeMe123!",
  demoRole = "admin",
}: SessionPanelProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [message, setMessage] = useState("");
  const { locale, t } = useI18n();

  const resolvedTitle = title || t("session.default_title");
  const resolvedDescription = description || t("session.default_description");

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
          setMessage(t("session.auth_unavailable"));
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
    setMessage(t("session.signing_in"));
    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ detail: t("session.login_failed") }))) as {
          detail?: string;
        };
        setMessage(payload.detail ?? t("session.login_failed"));
        return;
      }
      const payload = (await response.json()) as AuthSession;
      setSession(payload);
      setMessage(t("session.signed_in", { context: contextLabel }));
      window.location.href = routeForSession(payload);
    } catch {
      setSession(null);
      setMessage(t("session.auth_unavailable"));
    }
  }

  async function handleLogout() {
    await fetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    setSession(null);
    setMessage(t("session.signed_out"));
    window.location.href = "/";
  }

  return (
    <section className="form-card stack">
      <div>
        <h3>{resolvedTitle}</h3>
        <p className="muted">{resolvedDescription}</p>
      </div>
      {session ? (
        <>
          <div className="inline-meta">
            <strong>{session.user.full_name}</strong>
            <span className={`status-pill ${session.user.role}`}>{translateRole(locale, session.user.role)}</span>
          </div>
          <div className="muted">{session.user.email}</div>
          <button className="ghost-button" onClick={handleLogout} type="button">
            {t("common.sign_out")}
          </button>
        </>
      ) : (
        <form className="stack" onSubmit={handleLogin}>
          <label className="field">
            <span>{t("common.email")}</span>
            <input onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
          </label>
          <label className="field">
            <span>{t("common.password")}</span>
            <input onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
          </label>
          <button className="button" type="submit">
            {t("common.sign_in")}
          </button>
        </form>
      )}
      {message ? <div className="muted">{message}</div> : null}
    </section>
  );
}
