import { redirect } from "next/navigation";

import { KitchenBoard } from "@/components/kitchen-board";
import { SessionPanel } from "@/components/session-panel";
import { getTranslatorServer } from "@/lib/i18n-server";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer, getKitchenOrdersServer } from "@/lib/server-api";

export default async function KitchenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = await getTranslatorServer();
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
        <span className="eyebrow">{t("kitchen.page_eyebrow")}</span>
        <h1 className="display">{t("kitchen.page_title")}</h1>
        <p className="lede">{t("kitchen.page_description")}</p>
      </section>
      <section className="grid two section">
        <SessionPanel
          contextLabel={`kitchen for ${slug}`}
          defaultEmail="kitchen@harbor.local"
          demoRole="kitchen"
          title={t("kitchen.session_title")}
        />
        <div className="content-card stack">
          <div className="tag-row">
            <span className="tag">{t("kitchen.tag.poll")}</span>
            <span className="tag">{t("kitchen.tag.placed_preparing")}</span>
            <span className="tag">{t("kitchen.tag.preparing_ready")}</span>
            <span className="tag">{t("kitchen.tag.no_waiter")}</span>
          </div>
        </div>
      </section>
      <section className="section">
        <KitchenBoard initialOrders={orders} slug={slug} />
      </section>
    </main>
  );
}
