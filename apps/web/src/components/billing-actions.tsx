"use client";

import { useI18n } from "@/components/locale-provider";
import { translateStatus } from "@/lib/i18n";
import type { SubscriptionRecord } from "@/lib/types";

export function BillingSummaryCard({ subscription }: { subscription: SubscriptionRecord }) {
  const { locale, t } = useI18n();

  return (
    <section className="content-card stack">
      <div className="inline-meta">
        <strong>{t("billing.plan")}</strong>
        <span>{subscription.plan}</span>
      </div>
      <div className="inline-meta">
        <strong>{t("billing.status")}</strong>
        <span className={`status-pill ${subscription.status}`}>{translateStatus(locale, subscription.status)}</span>
      </div>
      <div className="inline-meta">
        <strong>{t("billing.tenant_access")}</strong>
        <span className={`status-pill ${subscription.is_accessible ? "active" : "cancelled"}`}>
          {subscription.is_accessible ? t("common.enabled") : t("common.suspended")}
        </span>
      </div>
      {subscription.grace_ends_at ? <div className="muted">{t("billing.grace_ends", { time: subscription.grace_ends_at })}</div> : null}
      <div className="empty-state">{t("billing.readonly")}</div>
    </section>
  );
}
