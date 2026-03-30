import { redirect } from "next/navigation";

import { SessionPanel } from "@/components/session-panel";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer } from "@/lib/server-api";

export default async function LoginPage() {
  const session = await getAuthSessionServer();
  if (session) {
    redirect(routeForSession(session) as any);
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <span className="eyebrow">Sign In</span>
        <h1 className="display">Authenticate first, then route by role.</h1>
        <p className="lede">
          Admins, waiters, kitchen staff, and super admins each have their own protected workspace. Sign in here and
          the app will send you to the correct page automatically.
        </p>
      </section>

      <section className="section" style={{ maxWidth: 520 }}>
        <SessionPanel
          contextLabel="the platform"
          title="Account login"
          description="Use your seeded or real account. Successful login redirects to the correct role-specific page."
          defaultEmail="admin@harbor.local"
          defaultPassword="ChangeMe123!"
          demoRole="admin"
        />
      </section>
    </main>
  );
}
