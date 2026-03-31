"use client";

import Link from "next/link";
import { useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { apiBaseUrl } from "@/lib/api";
import { translateStatus } from "@/lib/i18n";
import type { PlatformRestaurantListRecord } from "@/lib/types";

export function PlatformConsole({ initialRestaurants }: { initialRestaurants: PlatformRestaurantListRecord[] }) {
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [message, setMessage] = useState("");
  const { locale, t } = useI18n();

  async function toggleAccess(restaurant: PlatformRestaurantListRecord) {
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
      const updated = (await response.json()) as {
        id: string;
        is_accessible: boolean;
        subscription_plan: string;
        subscription_status: PlatformRestaurantListRecord["subscription_status"];
      };
      setRestaurants((current) =>
        current.map((entry) =>
          entry.id === restaurant.id
            ? {
                ...entry,
                is_accessible: updated.is_accessible,
                subscription_plan: updated.subscription_plan,
                subscription_status: updated.subscription_status,
              }
            : entry,
        ),
      );
      setMessage(t("platform.updated"));
    } catch {
      setMessage(t("platform.backend_unavailable"));
    }
  }

  return (
    <div className="stack">
      <section className="content-card stack">
        <div className="inline-meta">
          <strong>{t("platform.console_title")}</strong>
          <span>{t("platform.console_count", { count: restaurants.length })}</span>
        </div>
        <p className="muted">{t("platform.console_description")}</p>
        {message ? <div className="muted">{message}</div> : null}
      </section>

      <section className="content-card">
        <div className="restaurant-table">
          <div className="table-row table-head">
            <span>{t("platform.header.restaurant")}</span>
            <span>{t("platform.header.plan")}</span>
            <span>{t("platform.header.billing")}</span>
            <span>{t("platform.header.access")}</span>
            <span>{t("platform.header.admins")}</span>
            <span>{t("platform.header.devices")}</span>
            <span>{t("platform.header.open_today")}</span>
            <span>{t("platform.header.closed_today")}</span>
            <span>{t("common.actions")}</span>
          </div>
          {restaurants.map((restaurant) => (
            <div className="table-row" key={restaurant.id}>
              <div>
                <Link className="table-link" href={`/platform/restaurants/${restaurant.slug}`}>
                  {restaurant.name}
                </Link>
                <div className="muted">{restaurant.slug}</div>
              </div>
              <span>{restaurant.subscription_plan}</span>
              <span className={`status-pill ${restaurant.subscription_status}`}>
                {translateStatus(locale, restaurant.subscription_status)}
              </span>
              <span className={`status-pill ${restaurant.is_accessible ? "active" : "cancelled"}`}>
                {restaurant.is_accessible ? t("common.enabled") : t("common.suspended")}
              </span>
              <span>{restaurant.admin_count}</span>
              <span>{restaurant.device_count}</span>
              <span>{restaurant.today_open_orders}</span>
              <span>{restaurant.today_closed_orders}</span>
              <button className="ghost-button" onClick={() => toggleAccess(restaurant)} type="button">
                {restaurant.is_accessible ? t("platform.suspend") : t("platform.restore")}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
