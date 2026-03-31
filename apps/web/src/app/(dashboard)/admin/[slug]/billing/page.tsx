import { BillingSummaryCard } from "@/components/billing-actions";
import { getTranslatorServer } from "@/lib/i18n-server";
import { getSubscriptionServer } from "@/lib/server-api";

export default async function AdminBillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = await getTranslatorServer();
  const { slug } = await params;
  const subscription = await getSubscriptionServer(slug);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">{t("admin.billing_eyebrow")}</span>
        <h1 className="display">{t("admin.billing_title")}</h1>
        <p className="lede">{t("admin.billing_description")}</p>
      </section>
      <BillingSummaryCard subscription={subscription} />
    </>
  );
}
