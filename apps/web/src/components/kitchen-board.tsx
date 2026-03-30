"use client";

import { useEffect, useMemo, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import type { OrderRecord, OrderStatus } from "@/lib/types";

const LANES: OrderStatus[] = ["placed", "preparing", "ready"];

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function nextStatuses(status: OrderStatus): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    placed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: [],
    served: [],
    closed: [],
    cancelled: [],
  };
  return transitions[status];
}

export function KitchenBoard({ slug, initialOrders }: { slug: string; initialOrders: OrderRecord[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [message, setMessage] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    let previous = new Map(initialOrders.map((order) => [order.id, order.status]));

    async function poll() {
      try {
        const response = await fetch(`${apiBaseUrl}/kitchen/${slug}/orders`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { items: OrderRecord[] };
        if (!active) {
          return;
        }
        const changed = payload.items
          .filter((order) => previous.get(order.id) !== order.status)
          .map((order) => order.id);
        if (changed.length > 0) {
          setRecentIds(changed);
          window.setTimeout(() => {
            if (active) {
              setRecentIds([]);
            }
          }, 1600);
        }
        previous = new Map(payload.items.map((order) => [order.id, order.status]));
        setOrders(payload.items);
      } catch {
        setMessage("Using cached board state while the backend is unavailable.");
      }
    }

    const interval = window.setInterval(poll, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [initialOrders, slug]);

  async function moveOrder(orderId: string, status: OrderStatus) {
    setMessage(`Moving order to ${status}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/kitchen/${slug}/orders/${orderId}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        setMessage("Status update failed.");
        return;
      }
      const updated = (await response.json()) as OrderRecord;
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      setRecentIds([updated.id]);
      setMessage(`Order moved to ${status}.`);
    } catch {
      setMessage("Backend unavailable. Board actions need the API.");
    }
  }

  const laneCounts = useMemo(
    () => Object.fromEntries(LANES.map((lane) => [lane, orders.filter((order) => order.status === lane).length])),
    [orders],
  );

  return (
    <div className="stack">
      <section className="content-card stack">
        <div className="inline-meta">
          <strong>Kitchen cadence</strong>
          <span>{laneCounts.placed} new</span>
          <span>{laneCounts.preparing} firing</span>
          <span>{laneCounts.ready} ready</span>
        </div>
        <p className="muted">The board polls every 5 seconds and highlights orders that just arrived or changed lanes.</p>
        {message ? <div className="muted">{message}</div> : null}
      </section>

      <section className="staff-board">
        {LANES.map((lane) => (
          <article className="lane-card" key={lane}>
            <div className="section-header">
              <div>
                <h3 style={{ textTransform: "capitalize" }}>{lane}</h3>
                <p className="section-subtitle">{laneCounts[lane]} orders</p>
              </div>
            </div>
            <div className="stack">
              {orders
                .filter((order) => order.status === lane)
                .map((order) => (
                  <div className={`order-card ${recentIds.includes(order.id) ? "flash-card" : ""}`} key={order.id}>
                    <div className="inline-meta">
                      <strong>
                        Table {order.table_number}
                        {order.guest_name ? ` · ${order.guest_name}` : ""}
                      </strong>
                      <span className={`status-pill ${order.status}`}>{order.status}</span>
                    </div>
                    <div className="muted">{order.notes ?? "No note"}</div>
                    <div className="tag-row">
                      {order.items.map((item) => (
                        <span className="tag" key={item.id}>
                          {item.quantity} × {item.menu_item_name}
                        </span>
                      ))}
                    </div>
                    <div className="inline-meta">
                      <strong>{formatCurrency(order.total_price)}</strong>
                      <span>{order.source === "qr_guest" ? "guest QR" : "waiter assisted"}</span>
                    </div>
                    <div className="chip-row">
                      {nextStatuses(order.status).map((nextStatus) => (
                        <button className="ghost-button" key={nextStatus} onClick={() => moveOrder(order.id, nextStatus)} type="button">
                          {nextStatus}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              {orders.filter((order) => order.status === lane).length === 0 ? (
                <div className="empty-state">No orders in this lane.</div>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
