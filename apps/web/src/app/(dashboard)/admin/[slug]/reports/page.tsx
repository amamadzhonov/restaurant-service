import { getAdminSummaryServer } from "@/lib/server-api";

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

export default async function AdminReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const summary = await getAdminSummaryServer(slug);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">Reports</span>
        <h1 className="display">Today&apos;s operations, not enterprise analytics.</h1>
        <p className="lede">
          The first reporting pass stays intentionally tight: open orders, ready backlog, active tables, and closed
          sales for the restaurant&apos;s current local day.
        </p>
      </section>
      <section className="grid three">
        <article className="metric-card">
          <h3>Orders today</h3>
          <div className="metric-value">{summary.orders_today}</div>
        </article>
        <article className="metric-card">
          <h3>Ready backlog</h3>
          <div className="metric-value">{summary.ready_backlog}</div>
        </article>
        <article className="metric-card">
          <h3>Closed today</h3>
          <div className="metric-value">{summary.closed_today}</div>
        </article>
        <article className="metric-card">
          <h3>Active orders</h3>
          <div className="metric-value">{summary.active_orders}</div>
        </article>
        <article className="metric-card">
          <h3>Active tables</h3>
          <div className="metric-value">{summary.active_tables}</div>
        </article>
        <article className="metric-card">
          <h3>Gross sales today</h3>
          <div className="metric-value">{formatCurrency(summary.gross_sales_today)}</div>
        </article>
      </section>
    </>
  );
}
