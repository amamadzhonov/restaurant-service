"use client";

import { useEffect, useMemo, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import type { OrderRecord, OrderStatus, PublicMenu, WaiterTableRecord } from "@/lib/types";

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

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
      setGuestName(selectedTable ? `Table ${selectedTable.table_number}` : "");
      setNotes("");
      setQuantities({});
      return;
    }
    setGuestName(selectedOrder.guest_name ?? `Table ${selectedOrder.table_number}`);
    setNotes(selectedOrder.notes ?? "");
    setQuantities(
      selectedOrder.items.reduce<Record<string, number>>((acc, item) => {
        acc[item.menu_item_id] = item.quantity;
        return acc;
      }, {}),
    );
  }, [selectedOrder, selectedTable]);

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
        setMessage("Using cached waiter data while the backend is unavailable.");
      }
    }

    const interval = window.setInterval(poll, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [slug]);

  function setQuantity(itemId: string, quantity: number) {
    setQuantities((current) => ({ ...current, [itemId]: Math.max(0, quantity) }));
  }

  async function claimTable(tableId: string) {
    setMessage("Claiming table...");
    try {
      const response = await fetch(`${apiBaseUrl}/waiter/${slug}/tables/${tableId}/claim`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage("Table claim failed.");
        return;
      }
      const payload = (await response.json()) as { claimed: WaiterTableRecord[]; available: WaiterTableRecord[] };
      setTables(payload);
      setSelectedTableId(tableId);
      setSelectedOrderId("");
      setMessage("Table claimed.");
    } catch {
      setMessage("Backend unavailable. Waiter claim actions need the API.");
    }
  }

  async function releaseTable(tableId: string) {
    setMessage("Releasing table...");
    try {
      const response = await fetch(`${apiBaseUrl}/waiter/${slug}/tables/${tableId}/release`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage("Table release failed.");
        return;
      }
      const payload = (await response.json()) as { claimed: WaiterTableRecord[]; available: WaiterTableRecord[] };
      setTables(payload);
      if (selectedTableId === tableId) {
        setSelectedTableId(payload.claimed[0]?.id ?? "");
        setSelectedOrderId("");
      }
      setMessage("Table released.");
    } catch {
      setMessage("Backend unavailable. Waiter release actions need the API.");
    }
  }

  async function saveOrder() {
    if (!selectedTable) {
      setMessage("Claim a table before working an order.");
      return;
    }

    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([menu_item_id, quantity]) => ({ menu_item_id, quantity }));

    if (items.length === 0) {
      setMessage("Add at least one item.");
      return;
    }

    setMessage(selectedOrder ? "Saving edits..." : "Creating assisted order...");
    try {
      const response = await fetch(
        selectedOrder ? `${apiBaseUrl}/waiter/${slug}/orders/${selectedOrder.id}` : `${apiBaseUrl}/waiter/${slug}/orders`,
        {
          method: selectedOrder ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table_id: selectedTable.id,
            guest_name: guestName || `Table ${selectedTable.table_number}`,
            notes: notes || null,
            items,
          }),
        },
      );
      if (!response.ok) {
        setMessage("Order save failed.");
        return;
      }
      const updated = (await response.json()) as OrderRecord;
      setOrders((current) =>
        selectedOrder ? current.map((order) => (order.id === updated.id ? updated : order)) : [updated, ...current],
      );
      setSelectedOrderId(updated.id);
      setMessage(selectedOrder ? "Order updated." : "Assisted order created.");
    } catch {
      setMessage("Backend unavailable. Waiter actions need the API.");
    }
  }

  async function updateStatus(orderId: string, status: OrderStatus) {
    setMessage(`Moving order to ${status}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/waiter/${slug}/orders/${orderId}/status`, {
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
      setMessage(`Order moved to ${status}.`);
    } catch {
      setMessage("Backend unavailable. Waiter actions need the API.");
    }
  }

  return (
    <div className="stack">
      <section className="content-card stack">
        <div className="inline-meta">
          <strong>Claimed tables</strong>
          <span>{tables.claimed.length} serving</span>
          <span>{tables.available.length} unclaimed</span>
        </div>
        <p className="muted">Waiters work table-first: claim a table, review its active orders, then assist or close service.</p>
        {message ? <div className="muted">{message}</div> : null}
      </section>

      <section className="grid two">
        <section className="stack">
          <section className="content-card stack">
            <div className="section-header">
              <div>
                <h3>Your tables</h3>
                <p className="muted">Only these tables expose live orders and waiter actions.</p>
              </div>
            </div>
            <div className="table-pill-grid">
              {tables.claimed.map((table) => (
                <article className={`table-card ${selectedTableId === table.id ? "selected-card" : ""}`} key={table.id}>
                  <div className="inline-meta">
                    <strong>Table {table.table_number}</strong>
                    <span>{table.active_order_count} active orders</span>
                  </div>
                  <div className="chip-row">
                    <button className="ghost-button" onClick={() => setSelectedTableId(table.id)} type="button">
                      Open
                    </button>
                    <button className="ghost-button" onClick={() => releaseTable(table.id)} type="button">
                      Release
                    </button>
                  </div>
                </article>
              ))}
              {tables.claimed.length === 0 ? <div className="empty-state">No claimed tables yet.</div> : null}
            </div>
          </section>

          <section className="content-card stack">
            <div className="section-header">
              <div>
                <h3>Available tables</h3>
                <p className="muted">Claim a table before creating or editing waiter-managed orders.</p>
              </div>
            </div>
            <div className="table-pill-grid">
              {tables.available.map((table) => (
                <article className="table-card" key={table.id}>
                  <div className="inline-meta">
                    <strong>Table {table.table_number}</strong>
                    <span>{table.code}</span>
                  </div>
                  <button className="ghost-button" onClick={() => claimTable(table.id)} type="button">
                    Claim table
                  </button>
                </article>
              ))}
              {tables.available.length === 0 ? <div className="empty-state">No unclaimed tables available.</div> : null}
            </div>
          </section>

          <section className="content-card stack">
            <div className="section-header">
              <div>
                <h3>Active orders</h3>
                <p className="muted">Table-specific orders only.</p>
              </div>
            </div>
            {selectedTable ? (
              tableOrders.length > 0 ? (
                tableOrders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div className="section-header">
                      <div>
                        <h3>
                          Table {order.table_number}
                          {order.guest_name ? ` · ${order.guest_name}` : ""}
                        </h3>
                        <p className="muted">{order.notes ?? "No note"}</p>
                      </div>
                      <span className={`status-pill ${order.status}`}>{order.status}</span>
                    </div>
                    <div className="tag-row">
                      {order.items.map((item) => (
                        <span className="tag" key={item.id}>
                          {item.quantity} × {item.menu_item_name}
                        </span>
                      ))}
                    </div>
                    <div className="inline-meta">
                      <strong>{formatCurrency(order.total_price)}</strong>
                      <span>{order.source === "qr_guest" ? "Guest QR" : "Waiter assisted"}</span>
                    </div>
                    <div className="chip-row">
                      <button className="ghost-button" onClick={() => setSelectedOrderId(order.id)} type="button">
                        Edit
                      </button>
                      {nextStatuses(order.status).map((status) => (
                        <button className="ghost-button" key={status} onClick={() => updateStatus(order.id, status)} type="button">
                          {status}
                        </button>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">No active orders for this table yet.</div>
              )
            ) : (
              <div className="empty-state">Claim a table to start service.</div>
            )}
          </section>
        </section>

        <section className="form-card stack">
          <div>
            <h3>{selectedOrder ? "Assist existing order" : "Create assisted order"}</h3>
            <p className="muted">Keep service simple: pick a claimed table, add items, then save one clean ticket.</p>
          </div>
          {selectedTable ? (
            <>
              <div className="table-banner">
                <strong>Table {selectedTable.table_number}</strong>
                <span className="muted">{selectedTable.active_order_count} active orders</span>
              </div>
              <label className="field">
                <span>Guest label</span>
                <input onChange={(event) => setGuestName(event.target.value)} value={guestName} />
              </label>
              <div className="menu-grid">
                {menu.sections.flatMap((section) =>
                  section.items.map((item) => (
                    <article className="menu-item-card stack" key={item.id}>
                      {item.image_url ? <img alt={item.name} className="menu-item-image" src={item.image_url} /> : null}
                      <div className="inline-meta">
                        <strong>{item.name}</strong>
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                      <p className="muted">{section.name}</p>
                      <label className="field">
                        <span>Quantity</span>
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
                <span>Order note</span>
                <textarea onChange={(event) => setNotes(event.target.value)} rows={3} value={notes} />
              </label>
              <div className="chip-row">
                <button className="button" onClick={saveOrder} type="button">
                  {selectedOrder ? "Save edits" : "Create assisted order"}
                </button>
                {selectedOrder ? (
                  <button className="ghost-button" onClick={() => setSelectedOrderId("")} type="button">
                    New order form
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="empty-state">Claim a table to unlock waiter ordering and edits.</div>
          )}
        </section>
      </section>
    </div>
  );
}
