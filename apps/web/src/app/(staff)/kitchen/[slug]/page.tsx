import { redirect } from "next/navigation";

import { KitchenBoard } from "@/components/kitchen-board";
import { SessionPanel } from "@/components/session-panel";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer, getKitchenOrdersServer } from "@/lib/server-api";

export default async function KitchenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getAuthSessionServer();
  if (!session) {
    redirect("/");
  }
  if (session.user.role !== "kitchen" || session.tenant?.slug !== slug) {
    redirect(routeForSession(session) as any);
  }
  const orders = await getKitchenOrdersServer(slug);

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <span className="eyebrow">Kitchen board</span>
        <h1 className="display">New tickets appear fast, then move cleanly from placed to ready.</h1>
        <p className="lede">
          The kitchen surface is intentionally blunt: large cards, minimal chrome, and just enough context to keep the
          line moving.
        </p>
      </section>
      <section className="grid two section">
        <SessionPanel
          contextLabel={`kitchen for ${slug}`}
          defaultEmail="kitchen@harbor.local"
          demoRole="kitchen"
          title="Kitchen session"
        />
        <div className="content-card stack">
          <div className="tag-row">
            <span className="tag">Poll every 5s</span>
            <span className="tag">Placed to preparing</span>
            <span className="tag">Preparing to ready</span>
            <span className="tag">No waiter controls</span>
          </div>
        </div>
      </section>
      <section className="section">
        <KitchenBoard initialOrders={orders} slug={slug} />
      </section>
    </main>
  );
}
