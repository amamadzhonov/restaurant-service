"use client";

import Link from "next/link";
import { useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import type { PlatformRestaurantListRecord } from "@/lib/types";

export function PlatformConsole({ initialRestaurants }: { initialRestaurants: PlatformRestaurantListRecord[] }) {
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [message, setMessage] = useState("");

  async function toggleAccess(restaurant: PlatformRestaurantListRecord) {
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
      setMessage("Restaurant access updated.");
    } catch {
      setMessage("Backend unavailable. Platform actions need the API.");
    }
  }

  return (
    <div className="stack">
      <section className="content-card stack">
        <div className="inline-meta">
          <strong>Restaurant index</strong>
          <span>{restaurants.length} restaurants</span>
        </div>
        <p className="muted">Open a restaurant to inspect today’s operational state, tenant users, devices, and support actions.</p>
        {message ? <div className="muted">{message}</div> : null}
      </section>

      <section className="content-card">
        <div className="restaurant-table">
          <div className="table-row table-head">
            <span>Restaurant</span>
            <span>Plan</span>
            <span>Billing</span>
            <span>Access</span>
            <span>Admins</span>
            <span>Devices</span>
            <span>Open today</span>
            <span>Closed today</span>
            <span>Actions</span>
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
              <span className={`status-pill ${restaurant.subscription_status}`}>{restaurant.subscription_status}</span>
              <span className={`status-pill ${restaurant.is_accessible ? "active" : "cancelled"}`}>
                {restaurant.is_accessible ? "enabled" : "suspended"}
              </span>
              <span>{restaurant.admin_count}</span>
              <span>{restaurant.device_count}</span>
              <span>{restaurant.today_open_orders}</span>
              <span>{restaurant.today_closed_orders}</span>
              <button className="ghost-button" onClick={() => toggleAccess(restaurant)} type="button">
                {restaurant.is_accessible ? "Suspend" : "Restore"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
