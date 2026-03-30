import type { SubscriptionRecord } from "@/lib/types";

export function BillingSummaryCard({ subscription }: { subscription: SubscriptionRecord }) {
  return (
    <section className="content-card stack">
      <div className="inline-meta">
        <strong>Plan</strong>
        <span>{subscription.plan}</span>
      </div>
      <div className="inline-meta">
        <strong>Status</strong>
        <span className={`status-pill ${subscription.status}`}>{subscription.status}</span>
      </div>
      <div className="inline-meta">
        <strong>Tenant access</strong>
        <span className={`status-pill ${subscription.is_accessible ? "active" : "cancelled"}`}>
          {subscription.is_accessible ? "enabled" : "suspended"}
        </span>
      </div>
      {subscription.grace_ends_at ? <div className="muted">Grace ends {subscription.grace_ends_at}</div> : null}
      <div className="empty-state">
        Billing is read-only for restaurant admins in v1. Super admins manage Stripe and access recovery from the
        platform console.
      </div>
    </section>
  );
}
