import { getTranslatorServer } from "@/lib/i18n-server";

export default async function AdminSettingsPage() {
  const { t } = await getTranslatorServer();

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">{t("admin.settings_eyebrow")}</span>
        <h1 className="display">{t("admin.settings_title")}</h1>
        <p className="lede">{t("admin.settings_description")}</p>
      </section>
      <section className="content-card stack">
        <div className="tag-row">
          <span className="tag">{t("admin.tag.single_location")}</span>
          <span className="tag">{t("admin.tag.usd_default")}</span>
          <span className="tag">{t("admin.tag.internal_onboarding")}</span>
          <span className="tag">{t("admin.tag.no_online_payment")}</span>
          <span className="tag">{t("admin.tag.no_modifiers")}</span>
        </div>
      </section>
    </>
  );
}
