import { redirect } from "next/navigation";

import { SessionPanel } from "@/components/session-panel";
import { WaiterConsole } from "@/components/staff-console";
import { getPublicMenu } from "@/lib/api";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer, getWaiterOrdersServer, getWaiterTablesServer } from "@/lib/server-api";

export default async function WaiterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getAuthSessionServer();
  if (!session) {
    redirect("/");
  }
  if (session.user.role !== "waiter" || session.tenant?.slug !== slug) {
    redirect(routeForSession(session) as any);
  }
  const [menu, orders, tables] = await Promise.all([
    getPublicMenu(slug),
    getWaiterOrdersServer(slug),
    getWaiterTablesServer(slug),
  ]);

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <span className="eyebrow">Waiter PWA</span>
        <h1 className="display">Deliver the ready board, assist edits, and close the table.</h1>
        <p className="lede">
          Waiters work from the live order list rather than creating every order by hand. The surface is tuned for
          table service, not admin overhead.
        </p>
      </section>
      <section className="grid two section">
        <SessionPanel
          contextLabel={`waiter for ${slug}`}
          defaultEmail="waiter@harbor.local"
          demoRole="waiter"
          title="Waiter session"
        />
        <div className="content-card stack">
          <div className="inline-meta">
            <strong>Primary actions</strong>
          </div>
          <div className="tag-row">
            <span className="tag">Review ready orders</span>
            <span className="tag">Assist ticket edits</span>
            <span className="tag">Mark served</span>
            <span className="tag">Close after payment</span>
          </div>
        </div>
      </section>
      <section className="section">
        <WaiterConsole initialOrders={orders} initialTables={tables} menu={menu} slug={slug} />
      </section>
    </main>
  );
}
