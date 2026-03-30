import Link from "next/link";
import { redirect } from "next/navigation";

import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer } from "@/lib/server-api";

export default async function HomePage() {
  const session = await getAuthSessionServer();
  if (session) {
    redirect(routeForSession(session) as any);
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <span className="eyebrow">Restaurant SaaS MVP</span>
        <h1 className="display">QR guest ordering stays public. Restaurant operations stay behind login.</h1>
        <p className="lede">
          Guests can scan a table QR and order without an account. Admin, waiter, kitchen, and platform users must sign
          in before the app routes them to their own workspace.
        </p>
        <div className="chip-row section">
          <Link className="button" href="/login">
            Sign in
          </Link>
          <Link className="ghost-button" href="/r/harbor-bistro/t/table-a1">
            Open guest ordering
          </Link>
        </div>
      </section>

      <section className="section grid three">
        <article className="metric-card">
          <h3>Guest flow</h3>
          <div className="metric-value">Public QR</div>
          <p className="muted">Guests browse, order, and track status without logging in.</p>
        </article>
        <article className="metric-card">
          <h3>Role routing</h3>
          <div className="metric-value">Login required</div>
          <p className="muted">Admins, waiters, kitchen staff, and super admins are routed only after authentication.</p>
        </article>
        <article className="metric-card">
          <h3>Tenant safety</h3>
          <div className="metric-value">Protected</div>
          <p className="muted">Protected pages redirect unauthenticated users to sign in instead of rendering internal data.</p>
        </article>
      </section>
    </main>
  );
}
