import { redirect } from "next/navigation";

import { PlatformConsole } from "@/components/platform-console";
import { SessionPanel } from "@/components/session-panel";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer, getPlatformRestaurantsServer } from "@/lib/server-api";

export default async function PlatformPage() {
  const session = await getAuthSessionServer();
  if (!session) {
    redirect("/");
  }
  if (session.user.role !== "super_admin") {
    redirect(routeForSession(session) as any);
  }
  const restaurants = await getPlatformRestaurantsServer();

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <span className="eyebrow">Super Admin</span>
        <h1 className="display">Every restaurant in one table, then one click into support detail.</h1>
        <p className="lede">
          Platform operators need a narrow surface: restaurant access state, billing health, tenant users, device
          footprint, and today’s operating pulse.
        </p>
      </section>
      <section className="grid two section">
        <SessionPanel
          contextLabel="platform"
          defaultEmail="owner@platform.local"
          demoRole="super_admin"
          title="Super admin session"
        />
        <div className="content-card stack">
          <div className="tag-row">
            <span className="tag">Restaurant table index</span>
            <span className="tag">Support detail pages</span>
            <span className="tag">Access recovery</span>
            <span className="tag">Password reset initiation</span>
          </div>
        </div>
      </section>
      <section className="section">
        <PlatformConsole initialRestaurants={restaurants} />
      </section>
    </main>
  );
}
