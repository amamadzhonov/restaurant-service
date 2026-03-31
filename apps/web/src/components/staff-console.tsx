"use client";

import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { apiBaseUrl } from "@/lib/api";
import { formatCurrencyForLocale, translateSource, translateStatus } from "@/lib/i18n";
import type { OrderRecord, OrderStatus, PublicMenu, WaiterTableRecord } from "@/lib/types";

function nextStatuses(status: OrderStatus): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    placed: ["cancelled"],
    preparing: ["cancelled"],
    ready: ["served", "cancelled"],
    served: ["closed"],
    closed: [],
    cancelled: [],
  };
  return transitions[status];
}

export function WaiterConsole({
  slug,
  menu,
  initialOrders,
  initialTables,
}: {
  slug: string;
  menu: PublicMenu;
  initialOrders: OrderRecord[];
  initialTables: { claimed: WaiterTableRecord[]; available: WaiterTableRecord[] };
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [tables, setTables] = useState(initialTables);
  const [selectedTableId, setSelectedTableId] = useState(initialTables.claimed[0]?.id ?? "");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [notes, setNotes] = useState("");
  const [guestName, setGuestName] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const { locale, t } = useI18n();

  const selectedTable = tables.claimed.find((table) => table.id === selectedTableId) ?? tables.claimed[0] ?? null;
  const tableOrders = useMemo(
    () => orders.filter((order) => order.table_id === selectedTable?.id),
    [orders, selectedTable?.id],
  );
  const selectedOrder = tableOrders.find((order) => order.id === selectedOrderId) ?? null;

  useEffect(() => {
    if (!selectedTable && tables.claimed[0]) {
      setSelectedTableId(tables.claimed[0].id);
    }
    if (selectedTable && !tables.claimed.some((table) => table.id === selectedTable.id)) {
      setSelectedTableId(tables.claimed[0]?.id ?? "");
      setSelectedOrderId("");
    }
  }, [selectedTable, tables.claimed]);

  useEffect(() => {
    if (!selectedOrder) {
      setGuestName(selectedTable ? t("common.table", { table: selectedTable.table_number }) : "");
      setNotes("");
      setQuantities({});
      return;
    }
    setGuestName(selectedOrder.guest_name ?? t("common.table", { table: selectedOrder.table_number }));
    setNotes(selectedOrder.notes ?? "");
    setQuantities(
      selectedOrder.items.reduce<Record<string, number>>((acc, item) => {
        acc[item.menu_item_id] = item.quantity;
        return acc;
      }, {}),
    );
  }, [selectedOrder, selectedTable, t]);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const [tablesResponse, ordersResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/waiter/${slug}/tables`, {
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/waiter/${slug}/orders`, {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
        if (!tablesResponse.ok || !ordersResponse.ok || !active) {
          return;
        }
        const tablePayload = (await tablesResponse.json()) as { claimed: WaiterTableRecord[]; available: WaiterTableRecord[] };
        const orderPayload = (await ordersResponse.json()) as { items: OrderRecord[] };
        setTables(tablePayload);
        setOrders(orderPayload.items);
      } catch {
        setMessage(t("waiter.cached"));
      }
    }

    const interval = window.setInterval(poll, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [slug, t]);

  function setQuantity(itemId: string, quantity: number) {
    setQuantities((current) => ({ ...current, [itemId]: Math.max(0, quantity) }));
  }

  async function claimTable(tableId: string) {
    setMessage(t("waiter.claiming"));
    try {
      const response = await fetch(`${apiBaseUrl}/waiter/${slug}/tables/${tableId}/claim`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage(t("waiter.claim_failed"));
        return;
      }
      const payload = (await response.json()) as { claimed: WaiterTableRecord[]; available: WaiterTableRecord[] };
      setTables(payload);
      setSelectedTableId(tableId);
      setSelectedOrderId("");
      setMessage(t("waiter.claimed"));
    } catch {
      setMessage(t("waiter.backend_unavailable"));
    }
  }

  async function releaseTable(tableId: string) {
    setMessage(t("waiter.releasing"));
    try {
      const response = await fetch(`${apiBaseUrl}/waiter/${slug}/tables/${tableId}/release`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage(t("waiter.release_failed"));
        return;
      }
      const payload = (await response.json()) as { claimed: WaiterTableRecord[]; available: WaiterTableRecord[] };
      setTables(payload);
      if (selectedTableId === tableId) {
        setSelectedTableId(payload.claimed[0]?.id ?? "");
        setSelectedOrderId("");
      }
      setMessage(t("waiter.released"));
    } catch {
      setMessage(t("waiter.backend_unavailable"));
    }
  }

  async function saveOrder() {
    if (!selectedTable) {
      setMessage(t("waiter.claim_first"));
      return;
    }

    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([menu_item_id, quantity]) => ({ menu_item_id, quantity }));

    if (items.length === 0) {
      setMessage(t("waiter.add_item"));
      return;
    }

    setMessage(selectedOrder ? t("waiter.saving_edits") : t("waiter.creating_order"));
    try {
      const response = await fetch(
        selectedOrder ? `${apiBaseUrl}/waiter/${slug}/orders/${selectedOrder.id}` : `${apiBaseUrl}/waiter/${slug}/orders`,
        {
          method: selectedOrder ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table_id: selectedTable.id,
            guest_name: guestName || t("common.table", { table: selectedTable.table_number }),
            notes: notes || null,
            items,
          }),
        },
      );
      if (!response.ok) {
        setMessage(t("waiter.save_failed"));
        return;
      }
      const updated = (await response.json()) as OrderRecord;
      setOrders((current) =>
        selectedOrder ? current.map((order) => (order.id === updated.id ? updated : order)) : [updated, ...current],
      );
      setSelectedOrderId(updated.id);
      setMessage(selectedOrder ? t("waiter.order_updated") : t("waiter.order_created"));
    } catch {
      setMessage(t("waiter.backend_unavailable"));
    }
  }

  async function updateStatus(orderId: string, status: OrderStatus) {
    setMessage(t("waiter.moving", { status: translateStatus(locale, status) }));
    try {
      const response = await fetch(`${apiBaseUrl}/waiter/${slug}/orders/${orderId}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        setMessage(t("waiter.status_failed"));
        return;
      }
      const updated = (await response.json()) as OrderRecord;
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      setMessage(t("waiter.status_moved", { status: translateStatus(locale, status) }));
    } catch {
      setMessage(t("waiter.backend_unavailable"));
    }
  }

  return (
    <div className="stack">
      <section className="content-card stack">
        <div className="inline-meta">
          <strong>{t("waiter.summary_title")}</strong>
          <span>{t("waiter.summary_serving", { count: tables.claimed.length })}</span>
          <span>{t("waiter.summary_unclaimed", { count: tables.available.length })}</span>
        </div>
        <p className="muted">{t("waiter.summary_description")}</p>
        {message ? <div className="muted">{message}</div> : null}
      </section>

      <section className="grid two">
        <section className="stack">
          <section className="content-card stack">
            <div className="section-header">
              <div>
                <h3>{t("waiter.your_tables")}</h3>
                <p className="muted">{t("waiter.your_tables_description")}</p>
              </div>
            </div>
            <div className="table-pill-grid">
              {tables.claimed.map((table) => (
                <article className={`table-card ${selectedTableId === table.id ? "selected-card" : ""}`} key={table.id}>
                  <div className="inline-meta">
                    <strong>{t("common.table", { table: table.table_number })}</strong>
                    <span>{t("waiter.active_orders_count", { count: table.active_order_count })}</span>
                  </div>
                  <div className="chip-row">
                    <button className="ghost-button" onClick={() => setSelectedTableId(table.id)} type="button">
                      {t("common.open")}
                    </button>
                    <button className="ghost-button" onClick={() => releaseTable(table.id)} type="button">
                      {t("common.release")}
                    </button>
                  </div>
                </article>
              ))}
              {tables.claimed.length === 0 ? <div className="empty-state">{t("waiter.no_claimed_tables")}</div> : null}
            </div>
          </section>

          <section className="content-card stack">
            <div className="section-header">
              <div>
                <h3>{t("waiter.available_tables")}</h3>
                <p className="muted">{t("waiter.available_tables_description")}</p>
              </div>
            </div>
            <div className="table-pill-grid">
              {tables.available.map((table) => (
                <article className="table-card" key={table.id}>
                  <div className="inline-meta">
                    <strong>{t("common.table", { table: table.table_number })}</strong>
                    <span>{table.code}</span>
                  </div>
                  <button className="ghost-button" onClick={() => claimTable(table.id)} type="button">
                    {t("waiter.claim_table")}
                  </button>
                </article>
              ))}
              {tables.available.length === 0 ? <div className="empty-state">{t("waiter.no_available_tables")}</div> : null}
            </div>
          </section>

          <section className="content-card stack">
            <div className="section-header">
              <div>
                <h3>{t("waiter.active_orders")}</h3>
                <p className="muted">{t("waiter.active_orders_description")}</p>
              </div>
            </div>
            {selectedTable ? (
              tableOrders.length > 0 ? (
                tableOrders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div className="section-header">
                      <div>
                        <h3>
                          {t("common.table", { table: order.table_number })}
                          {order.guest_name ? ` · ${order.guest_name}` : ""}
                        </h3>
                        <p className="muted">{order.notes ?? t("common.no_note")}</p>
                      </div>
                      <span className={`status-pill ${order.status}`}>{translateStatus(locale, order.status)}</span>
                    </div>
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
                      <button className="ghost-button" onClick={() => setSelectedOrderId(order.id)} type="button">
                        {t("common.edit")}
                      </button>
                      {nextStatuses(order.status).map((status) => (
                        <button className="ghost-button" key={status} onClick={() => updateStatus(order.id, status)} type="button">
                          {translateStatus(locale, status)}
                        </button>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">{t("waiter.no_active_orders")}</div>
              )
            ) : (
              <div className="empty-state">{t("waiter.claim_to_start")}</div>
            )}
          </section>
        </section>

        <section className="form-card stack">
          <div>
            <h3>{selectedOrder ? t("waiter.assist_existing") : t("waiter.create_assisted")}</h3>
            <p className="muted">{t("waiter.form_description")}</p>
          </div>
          {selectedTable ? (
            <>
              <div className="table-banner">
                <strong>{t("common.table", { table: selectedTable.table_number })}</strong>
                <span className="muted">{t("waiter.active_orders_count", { count: selectedTable.active_order_count })}</span>
              </div>
              <label className="field">
                <span>{t("waiter.guest_label")}</span>
                <input onChange={(event) => setGuestName(event.target.value)} value={guestName} />
              </label>
              <div className="menu-grid">
                {menu.sections.flatMap((section) =>
                  section.items.map((item) => (
                    <article className="menu-item-card stack" key={item.id}>
                      {item.image_url ? <img alt={item.name} className="menu-item-image" src={item.image_url} /> : null}
                      <div className="inline-meta">
                        <strong>{item.name}</strong>
                        <span>{formatCurrencyForLocale(locale, item.price)}</span>
                      </div>
                      <p className="muted">{section.name}</p>
                      <label className="field">
                        <span>{t("common.quantity")}</span>
                        <input
                          disabled={!item.is_available}
                          min={0}
                          onChange={(event) => setQuantity(item.id, Number(event.target.value))}
                          type="number"
                          value={quantities[item.id] ?? 0}
                        />
                      </label>
                    </article>
                  )),
                )}
              </div>
              <label className="field">
                <span>{t("common.order_note")}</span>
                <textarea onChange={(event) => setNotes(event.target.value)} rows={3} value={notes} />
              </label>
              <div className="chip-row">
                <button className="button" onClick={saveOrder} type="button">
                  {selectedOrder ? t("waiter.save_edits") : t("waiter.create_assisted")}
                </button>
                {selectedOrder ? (
                  <button className="ghost-button" onClick={() => setSelectedOrderId("")} type="button">
                    {t("waiter.new_order_form")}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="empty-state">{t("waiter.unlock_message")}</div>
          )}
        </section>
      </section>
    </div>
  );
}
