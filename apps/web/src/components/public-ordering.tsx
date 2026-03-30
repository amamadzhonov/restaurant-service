"use client";

import { useMemo, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import type { PublicMenu, PublicOrderStatusRecord, TableRecord } from "@/lib/types";

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function prettifyTag(tag: string) {
  return tag.replaceAll("_", " ");
}

export function PublicOrdering({
  slug,
  menu,
  table,
}: {
  slug: string;
  menu: PublicMenu;
  table: TableRecord | null;
}) {
  const [guestName, setGuestName] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const flatItems = useMemo(() => menu.sections.flatMap((section) => section.items), [menu.sections]);
  const cartItems = flatItems
    .map((item) => ({ item, quantity: quantities[item.id] ?? 0 }))
    .filter(({ quantity }) => quantity > 0);
  const total = cartItems.reduce((sum, entry) => sum + Number(entry.item.price) * entry.quantity, 0);

  function setQuantity(itemId: string, quantity: number) {
    setQuantities((current) => ({ ...current, [itemId]: Math.max(0, quantity) }));
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!table) {
      setMessage("This QR table could not be resolved.");
      return;
    }
    if (!guestName.trim()) {
      setMessage("Enter your name before sending the order.");
      return;
    }
    if (cartItems.length === 0) {
      setMessage("Add at least one item before submitting.");
      return;
    }

    setSubmitting(true);
    setMessage("Sending your order...");
    try {
      const response = await fetch(`${apiBaseUrl}/public/tables/${table.code}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: guestName.trim(),
          notes: notes || null,
          items: cartItems.map(({ item, quantity }) => ({ menu_item_id: item.id, quantity })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ detail: "Order submission failed." }))) as {
          detail?: string;
        };
        setMessage(payload.detail ?? "Order submission failed.");
        setSubmitting(false);
        return;
      }

      const payload = (await response.json()) as PublicOrderStatusRecord;
      window.location.href = `/r/${slug}/orders/${payload.public_status_token}`;
    } catch {
      setSubmitting(false);
      setMessage("Backend unavailable. The demo menu is rendering without live order submission.");
    }
  }

  return (
    <div className="stack">
      <section className="hero-panel">
        <span className="eyebrow">Table service</span>
        <h1 className="display">{menu.tenant.name}</h1>
        <p className="lede">
          Order directly from your phone for {table ? `table ${table.table_number}` : "this table"}. Kitchen and
          waiter teams will track the order once you submit it.
        </p>
        <div className="table-banner">
          <strong>{table ? `Table ${table.table_number}` : "Unknown table"}</strong>
          <span className="muted">{table?.code ?? "Missing code"}</span>
        </div>
      </section>

      <section className="grid two">
        <form className="form-card stack" onSubmit={submitOrder}>
          <div>
            <h3>Guest checkout</h3>
            <p className="muted">Simple on purpose: name, cart, one note, then send it to the line.</p>
          </div>
          <label className="field">
            <span>Your name</span>
            <input onChange={(event) => setGuestName(event.target.value)} value={guestName} />
          </label>
          <label className="field">
            <span>Order note</span>
            <textarea
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Allergy or pacing note"
              rows={3}
              value={notes}
            />
          </label>
          <div className="stack">
            {cartItems.length === 0 ? (
              <div className="empty-state">Your cart is empty.</div>
            ) : (
              cartItems.map(({ item, quantity }) => (
                <div className="inline-meta" key={item.id}>
                  <strong>
                    {quantity} × {item.name}
                  </strong>
                  <span>{formatCurrency((Number(item.price) * quantity).toFixed(2))}</span>
                </div>
              ))
            )}
          </div>
          <div className="inline-meta">
            <strong>Total</strong>
            <span className="price">{formatCurrency(total.toFixed(2))}</span>
          </div>
          <button className="button" disabled={!menu.ordering_enabled || submitting} type="submit">
            {menu.ordering_enabled ? (submitting ? "Submitting..." : "Send order") : "Ordering unavailable"}
          </button>
          {message ? <div className="muted">{message}</div> : null}
          {!menu.ordering_enabled ? (
            <div className="empty-state">Ordering is temporarily unavailable. The menu is still visible.</div>
          ) : null}
        </form>

        <section className="content-card stack">
          <div className="section-header">
            <div>
              <h2 className="section-title">Build your order</h2>
              <p className="section-subtitle">Pick items section by section. Quantities update instantly.</p>
            </div>
          </div>
          <div className="chip-row">
            {menu.sections.map((section) => (
              <a className="chip" href={`#${section.id}`} key={section.id}>
                {section.name}
              </a>
            ))}
          </div>
        </section>
      </section>

      {menu.sections.map((section) => (
        <section className="section" id={section.id} key={section.id}>
          <div className="section-header">
            <div>
              <h2 className="section-title">{section.name}</h2>
              <p className="section-subtitle">Tap-friendly controls and strong availability states for the dining room.</p>
            </div>
          </div>
          <div className="menu-grid">
            {section.items.map((item) => (
              <article className="menu-item-card stack" key={item.id}>
                {item.image_url ? <img alt={item.name} className="menu-item-image" src={item.image_url} /> : null}
                <div className="inline-meta">
                  <span className={`status-pill ${item.is_available ? "active" : "cancelled"}`}>
                    {item.is_available ? "available" : "unavailable"}
                  </span>
                  {item.is_featured ? <span className="status-pill ready">featured</span> : null}
                </div>
                <div className="section-header" style={{ marginBottom: 0 }}>
                  <div>
                    <h3>{item.name}</h3>
                    <p className="muted">{item.description}</p>
                  </div>
                  <span className="price">{formatCurrency(item.price)}</span>
                </div>
                <div className="tag-row">
                  {item.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {prettifyTag(tag)}
                    </span>
                  ))}
                </div>
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
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
