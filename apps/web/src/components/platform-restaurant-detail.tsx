"use client";

import Link from "next/link";
import { useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { apiBaseUrl } from "@/lib/api";
import {
  formatCurrencyForLocale,
  formatDateTimeForLocale,
  formatTimeForLocale,
  translateRole,
  translateSource,
  translateStatus,
} from "@/lib/i18n";
import type { PasswordResetTokenRecord, PlatformRestaurantDetailRecord } from "@/lib/types";

export function PlatformRestaurantDetail({ initialRestaurant }: { initialRestaurant: PlatformRestaurantDetailRecord }) {
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState<PasswordResetTokenRecord | null>(null);
  const { locale, t } = useI18n();

  async function toggleAccess() {
    setMessage(t("platform.updating", { name: restaurant.name }));
    try {
      const response = await fetch(`${apiBaseUrl}/platform/restaurants/${restaurant.slug}/access`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_accessible: !restaurant.is_accessible }),
      });
      if (!response.ok) {
        setMessage(t("platform.update_failed"));
        return;
      }
      const updated = (await response.json()) as PlatformRestaurantDetailRecord;
      setRestaurant(updated);
      setMessage(t("platform.updated"));
    } catch {
      setMessage(t("platform.backend_unavailable"));
    }
  }

  async function requestReset(userId: string) {
    setMessage(t("platform_detail.generating_reset"));
    try {
      const response = await fetch(`${apiBaseUrl}/platform/users/${userId}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expires_in_hours: 24 }),
      });
      if (!response.ok) {
        setMessage(t("platform_detail.reset_failed"));
        return;
      }
      const payload = (await response.json()) as PasswordResetTokenRecord;
      setResetToken(payload);
      setMessage(t("platform_detail.reset_created"));
    } catch {
      setMessage(t("platform.backend_unavailable"));
    }
  }

  return (
    <div className="stack">
      <section className="content-card stack">
        <div className="inline-meta">
          <Link className="chip" href="/platform">
            {t("common.back_to_restaurants")}
          </Link>
          <span className={`status-pill ${restaurant.subscription_status}`}>
            {translateStatus(locale, restaurant.subscription_status)}
          </span>
          <span className={`status-pill ${restaurant.is_accessible ? "active" : "cancelled"}`}>
            {restaurant.is_accessible ? t("common.enabled") : t("common.suspended")}
          </span>
        </div>
        <div className="section-header">
          <div>
            <h2 className="section-title">{restaurant.name}</h2>
            <p className="section-subtitle">
              {restaurant.slug} · {restaurant.address ?? t("common.no_address")}
            </p>
          </div>
          <button className="ghost-button" onClick={toggleAccess} type="button">
            {restaurant.is_accessible ? t("platform_detail.suspend_restaurant") : t("platform_detail.restore_restaurant")}
          </button>
        </div>
        <div className="grid three">
          <article className="metric-card">
            <h3>{t("platform_detail.open_today")}</h3>
            <div className="metric-value">{restaurant.today_open_orders}</div>
          </article>
          <article className="metric-card">
            <h3>{t("platform_detail.closed_today")}</h3>
            <div className="metric-value">{restaurant.today_closed_orders}</div>
          </article>
          <article className="metric-card">
            <h3>{t("platform_detail.ready_backlog")}</h3>
            <div className="metric-value">{restaurant.ready_backlog}</div>
          </article>
        </div>
        <div className="inline-meta">
          <span>{t("platform_detail.admins", { count: restaurant.admin_count })}</span>
          <span>{t("platform_detail.devices", { count: restaurant.device_count })}</span>
          <span>{t("platform_detail.active_tables", { count: restaurant.active_tables })}</span>
          <span>
            {restaurant.timezone} · {restaurant.currency}
          </span>
        </div>
        {message ? <div className="muted">{message}</div> : null}
        {resetToken ? (
          <div className="empty-state">
            {t("platform_detail.reset_token", { user: resetToken.user_id })} <code>{resetToken.token}</code>
            <div className="muted">{t("platform_detail.expires", { time: formatDateTimeForLocale(locale, resetToken.expires_at) })}</div>
          </div>
        ) : null}
      </section>

      <section className="grid two">
        <section className="content-card stack">
          <div className="section-header">
            <div>
              <h3>{t("platform_detail.users_title")}</h3>
              <p className="muted">{t("platform_detail.users_description")}</p>
            </div>
          </div>
          {restaurant.users.map((user) => (
            <article className="order-card" key={user.id}>
              <div className="inline-meta">
                <strong>{user.full_name}</strong>
                <span className={`status-pill ${user.role}`}>{translateRole(locale, user.role)}</span>
              </div>
              <div className="muted">{user.email}</div>
              <button className="ghost-button" onClick={() => requestReset(user.id)} type="button">
                {t("platform_detail.generate_reset")}
              </button>
            </article>
          ))}
        </section>

        <section className="content-card stack">
          <div className="section-header">
            <div>
              <h3>{t("platform_detail.devices_title")}</h3>
              <p className="muted">{t("platform_detail.devices_description")}</p>
            </div>
          </div>
          {restaurant.devices.map((device) => (
            <article className="order-card" key={device.id}>
              <div className="inline-meta">
                <strong>{device.label}</strong>
                <span className={`status-pill ${device.status}`}>{translateStatus(locale, device.status)}</span>
              </div>
              <div className="muted">
                {device.platform}
                {device.assigned_table_id ? ` · ${t("common.table", { table: device.assigned_table_id })}` : ""}
              </div>
            </article>
          ))}
        </section>
      </section>

      <section className="content-card stack">
        <div className="section-header">
          <div>
            <h3>{t("platform_detail.recent_orders_title")}</h3>
            <p className="muted">{t("platform_detail.recent_orders_description")}</p>
          </div>
        </div>
        <div className="grid two">
          {restaurant.recent_orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="inline-meta">
                <strong>
                  {t("common.table", { table: order.table_number })}
                  {order.guest_name ? ` · ${order.guest_name}` : ""}
                </strong>
                <span className={`status-pill ${order.status}`}>{translateStatus(locale, order.status)}</span>
              </div>
              <div className="muted">{translateSource(locale, order.source)}</div>
              <div className="inline-meta">
                <strong>{formatCurrencyForLocale(locale, order.total_price)}</strong>
                <span>{formatTimeForLocale(locale, order.created_at, restaurant.timezone)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
