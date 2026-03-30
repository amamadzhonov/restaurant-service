import Link from "next/link";

import { getPublicOrderStatus } from "@/lib/api";
import type { OrderStatus } from "@/lib/types";

const STEPS = ["placed", "preparing", "ready", "served"] as const;
const STEP_INDEX: Record<OrderStatus, number> = {
  placed: 0,
  preparing: 1,
  ready: 2,
  served: 3,
  closed: 3,
  cancelled: 0,
};

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

export default async function PublicOrderStatusPage({
  params,
}: {
  params: Promise<{ slug: string; publicStatusToken: string }>;
}) {
  const { slug, publicStatusToken } = await params;
  const order = await getPublicOrderStatus(publicStatusToken);

  if (!order) {
    return (
      <main className="app-shell">
        <section className="hero-panel">
          <span className="eyebrow">Order status</span>
          <h1 className="display">Order not found</h1>
          <p className="lede">The status token is missing or expired.</p>
        </section>
      </main>
    );
  }

  const activeStepIndex = STEP_INDEX[order.status];

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <span className="eyebrow">Order tracking</span>
        <h1 className="display">
          Table {order.table_number}
          {order.guest_name ? ` · ${order.guest_name}` : ""}
        </h1>
        <p className="lede">Your order is live in the restaurant workflow. Kitchen and wait staff will update it as service moves.</p>
        <div className="table-banner">
          <strong>{order.status}</strong>
          <span className="muted">{formatCurrency(order.total_price)}</span>
        </div>
        <div className="timeline-row section">
          {STEPS.map((step, index) => (
            <div className={`timeline-step ${index <= activeStepIndex ? "done" : ""}`} key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card stack section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Ticket details</h2>
            <p className="section-subtitle">{order.notes ?? "No special note on this order."}</p>
          </div>
          <Link className="ghost-button" href={`/r/${slug}`}>
            Back to menu
          </Link>
        </div>
        <div className="tag-row">
          {order.items.map((item) => (
            <span className="tag" key={`${item.menu_item_id}-${item.menu_item_name}`}>
              {item.quantity} × {item.menu_item_name}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
