import { redirect } from "next/navigation";

import { SessionPanel } from "@/components/session-panel";
import { WaiterConsole } from "@/components/staff-console";
import { getPublicMenu } from "@/lib/api";
import { getTranslatorServer } from "@/lib/i18n-server";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer, getWaiterOrdersServer, getWaiterTablesServer } from "@/lib/server-api";

export default async function WaiterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = await getTranslatorServer();
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
        <span className="eyebrow">{t("waiter.page_eyebrow")}</span>
        <h1 className="display">{t("waiter.page_title")}</h1>
        <p className="lede">{t("waiter.page_description")}</p>
      </section>
      <section className="grid two section">
        <SessionPanel
          contextLabel={`waiter for ${slug}`}
          defaultEmail="waiter@harbor.local"
          demoRole="waiter"
          title={t("waiter.session_title")}
        />
        <div className="content-card stack">
          <div className="inline-meta">
            <strong>{t("waiter.primary_actions")}</strong>
          </div>
          <div className="tag-row">
            <span className="tag">{t("waiter.tag.ready")}</span>
            <span className="tag">{t("waiter.tag.assist")}</span>
            <span className="tag">{t("waiter.tag.served")}</span>
            <span className="tag">{t("waiter.tag.close")}</span>
          </div>
        </div>
      </section>
      <section className="section">
        <WaiterConsole initialOrders={orders} initialTables={tables} menu={menu} slug={slug} />
      </section>
    </main>
  );
}
