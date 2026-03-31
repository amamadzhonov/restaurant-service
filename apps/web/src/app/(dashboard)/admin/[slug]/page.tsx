import {
  getAdminOrdersServer,
  getAdminSummaryServer,
  getDevicesServer,
  getMenusServer,
  getUsersServer,
  getSubscriptionServer,
} from "@/lib/server-api";
import { formatCurrencyForLocale, translateStatus } from "@/lib/i18n";
import { getTranslatorServer } from "@/lib/i18n-server";

export default async function AdminOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { locale, t } = await getTranslatorServer();
  const { slug } = await params;
  const [menus, summary, orders, devices, subscription, users] = await Promise.all([
    getMenusServer(slug),
    getAdminSummaryServer(slug),
    getAdminOrdersServer(slug),
    getDevicesServer(slug),
    getSubscriptionServer(slug),
    getUsersServer(slug),
  ]);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">{t("admin.overview_eyebrow")}</span>
        <h1 className="display">{t("admin.overview_title")}</h1>
        <p className="lede">{t("admin.overview_description")}</p>
      </section>

      <section className="grid three">
        <article className="metric-card">
          <h3>{t("admin.orders_today")}</h3>
          <div className="metric-value">{summary.orders_today}</div>
          <p className="muted">{t("admin.orders_today_description")}</p>
        </article>
        <article className="metric-card">
          <h3>{t("admin.ready_backlog")}</h3>
          <div className="metric-value">{summary.ready_backlog}</div>
          <p className="muted">{t("admin.ready_backlog_description")}</p>
        </article>
        <article className="metric-card">
          <h3>{t("admin.gross_sales_today")}</h3>
          <div className="metric-value">{formatCurrencyForLocale(locale, summary.gross_sales_today)}</div>
          <p className="muted">{t("admin.gross_sales_description")}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="content-card stack">
          <div className="section-header">
            <div>
              <h2 className="section-title">{t("admin.tenant_health")}</h2>
              <p className="section-subtitle">{t("admin.tenant_health_description")}</p>
            </div>
          </div>
          <div className="inline-meta">
            <strong>{t("admin.subscription")}</strong>
            <span className={`status-pill ${subscription.status}`}>{translateStatus(locale, subscription.status)}</span>
          </div>
          <div className="inline-meta">
            <strong>{t("admin.protected_access")}</strong>
            <span className={`status-pill ${subscription.is_accessible ? "active" : "cancelled"}`}>
              {subscription.is_accessible ? t("common.enabled") : t("common.suspended")}
            </span>
          </div>
          <div className="inline-meta">
            <strong>{t("admin.tenant_users")}</strong>
            <span>{t("admin.managed_users", { count: users.length })}</span>
          </div>
          <div className="inline-meta">
            <strong>{t("platform.header.devices")}</strong>
            <span>{t("admin.devices_registered", { count: devices.length })}</span>
          </div>
        </article>

        <article className="content-card stack">
          <div className="section-header">
            <div>
              <h2 className="section-title">{t("admin.current_workload")}</h2>
              <p className="section-subtitle">{t("admin.current_workload_description")}</p>
            </div>
          </div>
          <div className="inline-meta">
            <strong>{t("admin.open_orders")}</strong>
            <span>{summary.active_orders}</span>
          </div>
          <div className="inline-meta">
            <strong>{t("admin.active_tables")}</strong>
            <span>{summary.active_tables}</span>
          </div>
          <div className="inline-meta">
            <strong>{t("admin.menus_live")}</strong>
            <span>{menus.length}</span>
          </div>
          <div className="inline-meta">
            <strong>{t("admin.tickets_visible")}</strong>
            <span>{orders.length}</span>
          </div>
        </article>
      </section>
    </>
  );
}
