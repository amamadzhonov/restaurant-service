import { getAdminSummaryServer } from "@/lib/server-api";
import { formatCurrencyForLocale } from "@/lib/i18n";
import { getTranslatorServer } from "@/lib/i18n-server";

export default async function AdminReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { locale, t } = await getTranslatorServer();
  const { slug } = await params;
  const summary = await getAdminSummaryServer(slug);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">{t("admin.reports_eyebrow")}</span>
        <h1 className="display">{t("admin.reports_title")}</h1>
        <p className="lede">{t("admin.reports_description")}</p>
      </section>
      <section className="grid three">
        <article className="metric-card">
          <h3>{t("admin.orders_today")}</h3>
          <div className="metric-value">{summary.orders_today}</div>
        </article>
        <article className="metric-card">
          <h3>{t("admin.ready_backlog")}</h3>
          <div className="metric-value">{summary.ready_backlog}</div>
        </article>
        <article className="metric-card">
          <h3>{t("admin.closed_today")}</h3>
          <div className="metric-value">{summary.closed_today}</div>
        </article>
        <article className="metric-card">
          <h3>{t("admin.open_orders")}</h3>
          <div className="metric-value">{summary.active_orders}</div>
        </article>
        <article className="metric-card">
          <h3>{t("admin.active_tables")}</h3>
          <div className="metric-value">{summary.active_tables}</div>
        </article>
        <article className="metric-card">
          <h3>{t("admin.gross_sales_today")}</h3>
          <div className="metric-value">{formatCurrencyForLocale(locale, summary.gross_sales_today)}</div>
        </article>
      </section>
    </>
  );
}
