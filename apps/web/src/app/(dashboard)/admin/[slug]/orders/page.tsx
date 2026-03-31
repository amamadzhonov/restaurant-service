import { getAdminOrdersServer } from "@/lib/server-api";
import { formatCurrencyForLocale, translateSource, translateStatus } from "@/lib/i18n";
import { getTranslatorServer } from "@/lib/i18n-server";

export default async function AdminOrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { locale, t } = await getTranslatorServer();
  const { slug } = await params;
  const orders = await getAdminOrdersServer(slug);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">{t("admin.orders_eyebrow")}</span>
        <h1 className="display">{t("admin.orders_title")}</h1>
        <p className="lede">{t("admin.orders_description")}</p>
      </section>
      <section className="stack">
        {orders.map((order) => (
          <article className="content-card stack" key={order.id}>
            <div className="section-header">
              <div>
                <h2 className="section-title">
                  {t("common.table", { table: order.table_number })}
                  {order.guest_name ? ` · ${order.guest_name}` : ""}
                </h2>
                <p className="section-subtitle">{order.notes ?? t("common.no_note")}</p>
              </div>
              <div className="inline-meta">
                <span className={`status-pill ${order.status}`}>{translateStatus(locale, order.status)}</span>
                <span className="tag">{translateSource(locale, order.source)}</span>
                <strong>{formatCurrencyForLocale(locale, order.total_price)}</strong>
              </div>
            </div>
            <div className="tag-row">
              {order.items.map((item) => (
                <span className="tag" key={item.id}>
                  {item.quantity} × {item.menu_item_name}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
