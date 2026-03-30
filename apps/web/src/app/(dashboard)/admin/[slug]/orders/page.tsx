import { getAdminOrdersServer } from "@/lib/server-api";

function currency(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

export default async function AdminOrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const orders = await getAdminOrdersServer(slug);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">Order queue</span>
        <h1 className="display">One timeline across guest QR, kitchen readiness, and waiter closeout.</h1>
        <p className="lede">Polling is still the delivery mechanism, but the domain model now follows the real restaurant workflow.</p>
      </section>
      <section className="stack">
        {orders.map((order) => (
          <article className="content-card stack" key={order.id}>
            <div className="section-header">
              <div>
                <h2 className="section-title">
                  Table {order.table_number}
                  {order.guest_name ? ` · ${order.guest_name}` : ""}
                </h2>
                <p className="section-subtitle">{order.notes ?? "No note"}</p>
              </div>
              <div className="inline-meta">
                <span className={`status-pill ${order.status}`}>{order.status}</span>
                <span className="tag">{order.source === "qr_guest" ? "guest QR" : "waiter assisted"}</span>
                <strong>{currency(order.total_price)}</strong>
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
