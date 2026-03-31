import { notFound, redirect } from "next/navigation";

import { PlatformRestaurantDetail } from "@/components/platform-restaurant-detail";
import { SessionPanel } from "@/components/session-panel";
import { getTranslatorServer } from "@/lib/i18n-server";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer, getPlatformRestaurantDetailServer } from "@/lib/server-api";

export default async function PlatformRestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = await getTranslatorServer();
  const { slug } = await params;
  const session = await getAuthSessionServer();
  if (!session) {
    redirect("/");
  }
  if (session.user.role !== "super_admin") {
    redirect(routeForSession(session) as any);
  }
  const restaurant = await getPlatformRestaurantDetailServer(slug);
  if (!restaurant) {
    notFound();
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <span className="eyebrow">{t("platform_detail.page_eyebrow")}</span>
        <h1 className="display">{t("platform_detail.page_title")}</h1>
        <p className="lede">{t("platform_detail.page_description")}</p>
      </section>
      <section className="grid two section">
        <SessionPanel
          contextLabel={`platform support for ${slug}`}
          defaultEmail="owner@platform.local"
          demoRole="super_admin"
          title={t("platform.session_title")}
        />
      </section>
      <section className="section">
        <PlatformRestaurantDetail initialRestaurant={restaurant} />
      </section>
    </main>
  );
}
