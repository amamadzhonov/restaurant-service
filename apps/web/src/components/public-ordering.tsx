"use client";

import { useMemo, useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { apiBaseUrl } from "@/lib/api";
import { formatCurrencyForLocale, translateTag } from "@/lib/i18n";
import type { PublicMenu, PublicOrderStatusRecord, TableRecord } from "@/lib/types";

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
  const { locale, t } = useI18n();

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
      setMessage(t("public_ordering.error_missing_table"));
      return;
    }
    if (!guestName.trim()) {
      setMessage(t("public_ordering.error_missing_name"));
      return;
    }
    if (cartItems.length === 0) {
      setMessage(t("public_ordering.error_missing_items"));
      return;
    }

    setSubmitting(true);
    setMessage(t("public_ordering.sending"));
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
        const payload = (await response.json().catch(() => ({ detail: t("public_ordering.submit_failed") }))) as {
          detail?: string;
        };
        setMessage(payload.detail ?? t("public_ordering.submit_failed"));
        setSubmitting(false);
        return;
      }

      const payload = (await response.json()) as PublicOrderStatusRecord;
      window.location.href = `/r/${slug}/orders/${payload.public_status_token}`;
    } catch {
      setSubmitting(false);
      setMessage(t("public_ordering.backend_unavailable"));
    }
  }

  return (
    <div className="stack public-flow">
      <section className="hero-panel public-hero reveal-panel reveal-1">
        <span className="eyebrow">{t("public_ordering.eyebrow")}</span>
        <h1 className="display">{menu.tenant.name}</h1>
        <p className="lede">
          {t("public_ordering.description", {
            table: table ? t("common.table", { table: table.table_number }) : t("public_ordering.this_table"),
          })}
        </p>
        <div className="table-banner">
          <strong>{table ? t("common.table", { table: table.table_number }) : t("common.unknown_table")}</strong>
          <span className="muted">{table?.code ?? t("common.missing_code")}</span>
        </div>
        <div className="hero-detail-strip">
          <span className="hero-detail-card">{menu.menu_name}</span>
          {menu.sections.slice(0, 3).map((section) => (
            <span className="hero-detail-card subtle" key={section.id}>
              {section.name}
            </span>
          ))}
        </div>
      </section>

      <section className="grid two">
        <form className="form-card stack checkout-card reveal-panel reveal-2" onSubmit={submitOrder}>
          <div>
            <h3>{t("public_ordering.checkout_title")}</h3>
            <p className="muted">{t("public_ordering.checkout_description")}</p>
          </div>
          <label className="field">
            <span>{t("public_ordering.your_name")}</span>
            <input onChange={(event) => setGuestName(event.target.value)} value={guestName} />
          </label>
          <label className="field">
            <span>{t("common.order_note")}</span>
            <textarea
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("public_ordering.note_placeholder")}
              rows={3}
              value={notes}
            />
          </label>
          <div className="stack">
            {cartItems.length === 0 ? (
              <div className="empty-state">{t("public_ordering.empty_cart")}</div>
            ) : (
              cartItems.map(({ item, quantity }) => (
                <div className="inline-meta" key={item.id}>
                  <strong>
                    {quantity} × {item.name}
                  </strong>
                  <span>{formatCurrencyForLocale(locale, (Number(item.price) * quantity).toFixed(2))}</span>
                </div>
              ))
            )}
          </div>
          <div className="inline-meta">
            <strong>{t("common.total")}</strong>
            <span className="price">{formatCurrencyForLocale(locale, total.toFixed(2))}</span>
          </div>
          <button className="button" disabled={!menu.ordering_enabled || submitting} type="submit">
            {menu.ordering_enabled
              ? submitting
                ? t("public_ordering.submitting")
                : t("public_ordering.send_order")
              : t("public_ordering.ordering_unavailable")}
          </button>
          {message ? <div className="muted">{message}</div> : null}
          {!menu.ordering_enabled ? (
            <div className="empty-state">{t("public_ordering.unavailable_message")}</div>
          ) : null}
        </form>

        <section className="content-card stack reveal-panel reveal-3">
          <div className="section-header">
            <div>
              <h2 className="section-title">{t("public_ordering.build_title")}</h2>
              <p className="section-subtitle">{t("public_ordering.build_description")}</p>
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
        <section className="section section-stage" id={section.id} key={section.id}>
          <div className="section-header">
            <div>
              <h2 className="section-title">{section.name}</h2>
              <p className="section-subtitle">{t("public_ordering.section_subtitle")}</p>
            </div>
          </div>
          <div className="menu-grid showcase-grid">
            {section.items.map((item) => (
              <article className="menu-item-card stack" key={item.id}>
                <div className="menu-item-media">
                  {item.image_url ? (
                    <img alt={item.name} className="menu-item-image" src={item.image_url} />
                  ) : (
                    <div aria-hidden="true" className="menu-item-image menu-item-image-placeholder" />
                  )}
                </div>
                <div className="inline-meta">
                  <span className={`status-pill ${item.is_available ? "active" : "cancelled"}`}>
                    {item.is_available ? t("common.available") : t("common.unavailable")}
                  </span>
                  {item.is_featured ? <span className="status-pill ready">{t("common.featured")}</span> : null}
                </div>
                <div className="section-header" style={{ marginBottom: 0 }}>
                  <div>
                    <h3>{item.name}</h3>
                    <p className="muted">{item.description}</p>
                  </div>
                  <span className="price">{formatCurrencyForLocale(locale, item.price)}</span>
                </div>
                <div className="tag-row">
                  {item.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {translateTag(locale, tag)}
                    </span>
                  ))}
                </div>
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
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
