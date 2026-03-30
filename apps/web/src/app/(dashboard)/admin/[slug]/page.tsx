import {
  getAdminOrdersServer,
  getAdminSummaryServer,
  getDevicesServer,
  getMenusServer,
  getUsersServer,
  getSubscriptionServer,
} from "@/lib/server-api";

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

export default async function AdminOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
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
        <span className="eyebrow">Operations overview</span>
        <h1 className="display">Run QR ordering, kitchen flow, and table service from one admin shell.</h1>
        <p className="lede">
          The dashboard now centers on operational clarity: what guests are ordering, what the kitchen owes, who is on
          the floor, and whether the tenant is healthy enough to keep protected access online.
        </p>
      </section>

      <section className="grid three">
        <article className="metric-card">
          <h3>Orders today</h3>
          <div className="metric-value">{summary.orders_today}</div>
          <p className="muted">Guest and waiter-originated orders created since the start of the day.</p>
        </article>
        <article className="metric-card">
          <h3>Ready backlog</h3>
          <div className="metric-value">{summary.ready_backlog}</div>
          <p className="muted">Orders waiting on the floor to be delivered and marked served.</p>
        </article>
        <article className="metric-card">
          <h3>Gross sales today</h3>
          <div className="metric-value">{formatCurrency(summary.gross_sales_today)}</div>
          <p className="muted">Closed tickets only, with payment still handled off-app in v1.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="content-card stack">
          <div className="section-header">
            <div>
              <h2 className="section-title">Tenant health</h2>
              <p className="section-subtitle">Protected access stays open only while billing and tenant access are healthy.</p>
            </div>
          </div>
          <div className="inline-meta">
            <strong>Subscription</strong>
            <span className={`status-pill ${subscription.status}`}>{subscription.status}</span>
          </div>
          <div className="inline-meta">
            <strong>Protected access</strong>
            <span className={`status-pill ${subscription.is_accessible ? "active" : "cancelled"}`}>
              {subscription.is_accessible ? "enabled" : "suspended"}
            </span>
          </div>
          <div className="inline-meta">
            <strong>Tenant users</strong>
            <span>{users.length} managed users</span>
          </div>
          <div className="inline-meta">
            <strong>Devices</strong>
            <span>{devices.length} registered</span>
          </div>
        </article>

        <article className="content-card stack">
          <div className="section-header">
            <div>
              <h2 className="section-title">Current workload</h2>
              <p className="section-subtitle">A quick read on what the restaurant team is handling right now.</p>
            </div>
          </div>
          <div className="inline-meta">
            <strong>Open orders</strong>
            <span>{summary.active_orders}</span>
          </div>
          <div className="inline-meta">
            <strong>Active tables</strong>
            <span>{summary.active_tables}</span>
          </div>
          <div className="inline-meta">
            <strong>Menus live</strong>
            <span>{menus.length}</span>
          </div>
          <div className="inline-meta">
            <strong>Tickets visible</strong>
            <span>{orders.length}</span>
          </div>
        </article>
      </section>
    </>
  );
}
