import { redirect } from "next/navigation";

import { SessionPanel } from "@/components/session-panel";
import { getTranslatorServer } from "@/lib/i18n-server";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer } from "@/lib/server-api";

export default async function LoginPage() {
  const { t } = await getTranslatorServer();
  const session = await getAuthSessionServer();
  if (session) {
    redirect(routeForSession(session) as any);
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <span className="eyebrow">{t("login.eyebrow")}</span>
        <h1 className="display">{t("login.title")}</h1>
        <p className="lede">{t("login.description")}</p>
      </section>

      <section className="section" style={{ maxWidth: 520 }}>
        <SessionPanel
          contextLabel="the platform"
          title={t("login.session_title")}
          description={t("login.session_description")}
          defaultEmail="admin@harbor.local"
          defaultPassword="ChangeMe123!"
          demoRole="admin"
        />
      </section>
    </main>
  );
}
