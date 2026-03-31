"use client";

import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { apiBaseUrl } from "@/lib/api";
import { formatCurrencyForLocale, translateSource, translateStatus } from "@/lib/i18n";
import type { OrderRecord, OrderStatus } from "@/lib/types";

const LANES: OrderStatus[] = ["placed", "preparing", "ready"];

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
  const { locale, t } = useI18n();

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
        setMessage(t("kitchen.cached"));
      }
    }

    const interval = window.setInterval(poll, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [initialOrders, slug]);

  async function moveOrder(orderId: string, status: OrderStatus) {
    setMessage(t("kitchen.moving", { status: translateStatus(locale, status) }));
    try {
      const response = await fetch(`${apiBaseUrl}/kitchen/${slug}/orders/${orderId}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        setMessage(t("kitchen.status_failed"));
        return;
      }
      const updated = (await response.json()) as OrderRecord;
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      setRecentIds([updated.id]);
      setMessage(t("kitchen.status_moved", { status: translateStatus(locale, status) }));
    } catch {
      setMessage(t("kitchen.backend_unavailable"));
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
          <strong>{t("kitchen.summary_title")}</strong>
          <span>{t("kitchen.summary_new", { count: laneCounts.placed })}</span>
          <span>{t("kitchen.summary_firing", { count: laneCounts.preparing })}</span>
          <span>{t("kitchen.summary_ready", { count: laneCounts.ready })}</span>
        </div>
        <p className="muted">{t("kitchen.summary_description")}</p>
        {message ? <div className="muted">{message}</div> : null}
      </section>

      <section className="staff-board">
        {LANES.map((lane) => (
          <article className="lane-card" key={lane}>
            <div className="section-header">
              <div>
                <h3 style={{ textTransform: "capitalize" }}>{translateStatus(locale, lane)}</h3>
                <p className="section-subtitle">{t("kitchen.orders_count", { count: laneCounts[lane] })}</p>
              </div>
            </div>
            <div className="stack">
              {orders
                .filter((order) => order.status === lane)
                .map((order) => (
                  <div className={`order-card ${recentIds.includes(order.id) ? "flash-card" : ""}`} key={order.id}>
                    <div className="inline-meta">
                      <strong>
                        {t("common.table", { table: order.table_number })}
                        {order.guest_name ? ` · ${order.guest_name}` : ""}
                      </strong>
                      <span className={`status-pill ${order.status}`}>{translateStatus(locale, order.status)}</span>
                    </div>
                    <div className="muted">{order.notes ?? t("common.no_note")}</div>
                    <div className="tag-row">
                      {order.items.map((item) => (
                        <span className="tag" key={item.id}>
                          {item.quantity} × {item.menu_item_name}
                        </span>
                      ))}
                    </div>
                    <div className="inline-meta">
                      <strong>{formatCurrencyForLocale(locale, order.total_price)}</strong>
                      <span>{translateSource(locale, order.source)}</span>
                    </div>
                    <div className="chip-row">
                      {nextStatuses(order.status).map((nextStatus) => (
                        <button className="ghost-button" key={nextStatus} onClick={() => moveOrder(order.id, nextStatus)} type="button">
                          {translateStatus(locale, nextStatus)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              {orders.filter((order) => order.status === lane).length === 0 ? (
                <div className="empty-state">{t("kitchen.no_orders_lane")}</div>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
