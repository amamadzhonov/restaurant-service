"use client";

import Link from "next/link";
import { useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import type { PasswordResetTokenRecord, PlatformRestaurantDetailRecord } from "@/lib/types";

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

export function PlatformRestaurantDetail({ initialRestaurant }: { initialRestaurant: PlatformRestaurantDetailRecord }) {
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState<PasswordResetTokenRecord | null>(null);

  async function toggleAccess() {
    setMessage(`Updating ${restaurant.name}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/platform/restaurants/${restaurant.slug}/access`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_accessible: !restaurant.is_accessible }),
      });
      if (!response.ok) {
        setMessage("Restaurant access update failed.");
        return;
      }
      const updated = (await response.json()) as PlatformRestaurantDetailRecord;
      setRestaurant(updated);
      setMessage("Restaurant access updated.");
    } catch {
      setMessage("Backend unavailable. Platform actions need the API.");
    }
  }

  async function requestReset(userId: string) {
    setMessage("Generating password reset token...");
    try {
      const response = await fetch(`${apiBaseUrl}/platform/users/${userId}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expires_in_hours: 24 }),
      });
      if (!response.ok) {
        setMessage("Password reset failed.");
        return;
      }
      const payload = (await response.json()) as PasswordResetTokenRecord;
      setResetToken(payload);
      setMessage("Password reset token created.");
    } catch {
      setMessage("Backend unavailable. Platform actions need the API.");
    }
  }

  return (
    <div className="stack">
      <section className="content-card stack">
        <div className="inline-meta">
          <Link className="chip" href="/platform">
            Back to restaurants
          </Link>
          <span className={`status-pill ${restaurant.subscription_status}`}>{restaurant.subscription_status}</span>
          <span className={`status-pill ${restaurant.is_accessible ? "active" : "cancelled"}`}>
            {restaurant.is_accessible ? "enabled" : "suspended"}
          </span>
        </div>
        <div className="section-header">
          <div>
            <h2 className="section-title">{restaurant.name}</h2>
            <p className="section-subtitle">
              {restaurant.slug} · {restaurant.address ?? "No address"}
            </p>
          </div>
          <button className="ghost-button" onClick={toggleAccess} type="button">
            {restaurant.is_accessible ? "Suspend restaurant" : "Restore restaurant"}
          </button>
        </div>
        <div className="grid three">
          <article className="metric-card">
            <h3>Open today</h3>
            <div className="metric-value">{restaurant.today_open_orders}</div>
          </article>
          <article className="metric-card">
            <h3>Closed today</h3>
            <div className="metric-value">{restaurant.today_closed_orders}</div>
          </article>
          <article className="metric-card">
            <h3>Ready backlog</h3>
            <div className="metric-value">{restaurant.ready_backlog}</div>
          </article>
        </div>
        <div className="inline-meta">
          <span>{restaurant.admin_count} admins</span>
          <span>{restaurant.device_count} devices</span>
          <span>{restaurant.active_tables} active tables</span>
          <span>
            {restaurant.timezone} · {restaurant.currency}
          </span>
        </div>
        {message ? <div className="muted">{message}</div> : null}
        {resetToken ? (
          <div className="empty-state">
            Reset token for user <strong>{resetToken.user_id}</strong>: <code>{resetToken.token}</code>
            <div className="muted">Expires {resetToken.expires_at}</div>
          </div>
        ) : null}
      </section>

      <section className="grid two">
        <section className="content-card stack">
          <div className="section-header">
            <div>
              <h3>Users</h3>
              <p className="muted">Support-only controls for tenant access recovery.</p>
            </div>
          </div>
          {restaurant.users.map((user) => (
            <article className="order-card" key={user.id}>
              <div className="inline-meta">
                <strong>{user.full_name}</strong>
                <span className={`status-pill ${user.role}`}>{user.role}</span>
              </div>
              <div className="muted">{user.email}</div>
              <button className="ghost-button" onClick={() => requestReset(user.id)} type="button">
                Generate reset token
              </button>
            </article>
          ))}
        </section>

        <section className="content-card stack">
          <div className="section-header">
            <div>
              <h3>Devices</h3>
              <p className="muted">Live hardware footprint for this restaurant.</p>
            </div>
          </div>
          {restaurant.devices.map((device) => (
            <article className="order-card" key={device.id}>
              <div className="inline-meta">
                <strong>{device.label}</strong>
                <span className={`status-pill ${device.status}`}>{device.status}</span>
              </div>
              <div className="muted">
                {device.platform}
                {device.assigned_table_id ? ` · table ${device.assigned_table_id}` : ""}
              </div>
            </article>
          ))}
        </section>
      </section>

      <section className="content-card stack">
        <div className="section-header">
          <div>
            <h3>Today&apos;s recent orders</h3>
            <p className="muted">Operational snapshot for support and health checks.</p>
          </div>
        </div>
        <div className="grid two">
          {restaurant.recent_orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="inline-meta">
                <strong>
                  Table {order.table_number}
                  {order.guest_name ? ` · ${order.guest_name}` : ""}
                </strong>
                <span className={`status-pill ${order.status}`}>{order.status}</span>
              </div>
              <div className="muted">{order.source === "qr_guest" ? "Guest QR" : "Waiter assisted"}</div>
              <div className="inline-meta">
                <strong>{formatCurrency(order.total_price)}</strong>
                <span>{new Date(order.created_at).toLocaleTimeString()}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
