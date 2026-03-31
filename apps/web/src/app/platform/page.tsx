import { redirect } from "next/navigation";

import { PlatformConsole } from "@/components/platform-console";
import { SessionPanel } from "@/components/session-panel";
import { getTranslatorServer } from "@/lib/i18n-server";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer, getPlatformRestaurantsServer } from "@/lib/server-api";

export default async function PlatformPage() {
  const { t } = await getTranslatorServer();
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
        <span className="eyebrow">{t("platform.page_eyebrow")}</span>
        <h1 className="display">{t("platform.page_title")}</h1>
        <p className="lede">{t("platform.page_description")}</p>
      </section>
      <section className="grid two section">
        <SessionPanel
          contextLabel="platform"
          defaultEmail="owner@platform.local"
          demoRole="super_admin"
          title={t("platform.session_title")}
        />
        <div className="content-card stack">
          <div className="tag-row">
            <span className="tag">{t("platform.tag.index")}</span>
            <span className="tag">{t("platform.tag.support")}</span>
            <span className="tag">{t("platform.tag.recovery")}</span>
            <span className="tag">{t("platform.tag.reset")}</span>
          </div>
        </div>
      </section>
      <section className="section">
        <PlatformConsole initialRestaurants={restaurants} />
      </section>
    </main>
  );
}
