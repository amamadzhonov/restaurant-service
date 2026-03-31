import Link from "next/link";

import { DecorativeBackdrop } from "@/components/decorative-backdrop";
import { getPublicOrderStatus } from "@/lib/api";
import { formatCurrencyForLocale, translateStatus } from "@/lib/i18n";
import { getTranslatorServer } from "@/lib/i18n-server";
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

export default async function PublicOrderStatusPage({
  params,
}: {
  params: Promise<{ slug: string; publicStatusToken: string }>;
}) {
  const { locale, t } = await getTranslatorServer();
  const { slug, publicStatusToken } = await params;
  const order = await getPublicOrderStatus(publicStatusToken);

  if (!order) {
    return (
      <main className="app-shell public-scene-shell public-scene-shell--status">
        <DecorativeBackdrop preset="public_status" />
        <section className="hero-panel public-hero reveal-panel reveal-1">
          <span className="eyebrow">{t("public_status.eyebrow")}</span>
          <h1 className="display">{t("public_status.not_found_title")}</h1>
          <p className="lede">{t("public_status.not_found_description")}</p>
        </section>
      </main>
    );
  }

  const activeStepIndex = STEP_INDEX[order.status];

  return (
    <main className="app-shell public-scene-shell public-scene-shell--status">
      <DecorativeBackdrop preset="public_status" />
      <section className="hero-panel public-hero reveal-panel reveal-1">
        <span className="eyebrow">{t("public_status.eyebrow")}</span>
        <h1 className="display">
          {t("common.table", { table: order.table_number })}
          {order.guest_name ? ` · ${order.guest_name}` : ""}
        </h1>
        <p className="lede">{t("public_status.description")}</p>
        <div className="table-banner">
          <strong>{translateStatus(locale, order.status)}</strong>
          <span className="muted">{formatCurrencyForLocale(locale, order.total_price)}</span>
        </div>
        <div className="timeline-row section">
          {STEPS.map((step, index) => (
            <div
              className={`timeline-step ${index <= activeStepIndex ? "done" : ""} ${index === activeStepIndex ? "current" : ""}`}
              key={step}
            >
              <span>{index + 1}</span>
              <strong>{translateStatus(locale, step)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card stack section reveal-panel reveal-2">
        <div className="section-header">
          <div>
            <h2 className="section-title">{t("public_status.ticket_title")}</h2>
            <p className="section-subtitle">{order.notes ?? t("public_status.no_special_note")}</p>
          </div>
          <Link className="ghost-button" href={`/r/${slug}`}>
            {t("common.back_to_menu")}
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
