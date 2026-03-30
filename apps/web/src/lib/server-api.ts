import "server-only";

import { cookies } from "next/headers";

import {
  demoDevices,
  demoItems,
  demoMenus,
  demoOrders,
  demoPlatformRestaurantDetail,
  demoPlatformRestaurants,
  demoSections,
  demoSubscription,
  demoSummary,
  demoTables,
  demoUsers,
  demoWaiterTables,
  getDemoSession,
} from "@/lib/api";
import type {
  AdminOperationsSummary,
  AuthSession,
  DeviceRecord,
  MenuItemRecord,
  MenuRecord,
  MenuSectionRecord,
  OrderRecord,
  PlatformRestaurantDetailRecord,
  PlatformRestaurantListRecord,
  StaffAccountRecord,
  SubscriptionRecord,
  TableRecord,
  WaiterTableRecord,
} from "@/lib/types";

const SERVER_API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function buildCookieHeader(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const relevant = ["access_token", "refresh_token"]
    .map((name) => cookieStore.get(name))
    .filter((cookie): cookie is { name: string; value: string } => Boolean(cookie));

  if (relevant.length === 0) {
    return undefined;
  }

  return relevant.map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`).join("; ");
}

async function fetchProtectedJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const cookieHeader = await buildCookieHeader();
    const response = await fetch(`${SERVER_API_URL}${path}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getAuthSessionServer(): Promise<AuthSession | null> {
  try {
    const cookieHeader = await buildCookieHeader();
    if (!cookieHeader) {
      return null;
    }
    const response = await fetch(`${SERVER_API_URL}/auth/me`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as AuthSession;
  } catch {
    return null;
  }
}

export async function getMenusServer(slug: string): Promise<MenuRecord[]> {
  return fetchProtectedJson(`/admin/${slug}/menus`, demoMenus);
}

export async function getSectionsServer(slug: string): Promise<MenuSectionRecord[]> {
  return fetchProtectedJson(`/admin/${slug}/menu-sections`, demoSections);
}

export async function getMenuItemsServer(slug: string): Promise<MenuItemRecord[]> {
  return fetchProtectedJson(`/admin/${slug}/menu-items`, demoItems);
}

export async function getTablesServer(slug: string): Promise<TableRecord[]> {
  return fetchProtectedJson(`/admin/${slug}/tables`, demoTables);
}

export async function getDevicesServer(slug: string): Promise<DeviceRecord[]> {
  return fetchProtectedJson(`/admin/${slug}/devices`, demoDevices);
}

export async function getAdminOrdersServer(slug: string): Promise<OrderRecord[]> {
  return fetchProtectedJson(`/admin/${slug}/orders`, demoOrders);
}

export async function getAdminSummaryServer(slug: string): Promise<AdminOperationsSummary> {
  return fetchProtectedJson(`/admin/${slug}/reports/summary`, demoSummary);
}

export async function getUsersServer(slug: string): Promise<StaffAccountRecord[]> {
  return fetchProtectedJson(`/admin/${slug}/users`, demoUsers);
}

export async function getWaiterTablesServer(
  slug: string,
): Promise<{ claimed: WaiterTableRecord[]; available: WaiterTableRecord[] }> {
  return fetchProtectedJson(`/waiter/${slug}/tables`, demoWaiterTables);
}

export async function getWaiterOrdersServer(slug: string): Promise<OrderRecord[]> {
  const payload = await fetchProtectedJson<{ items: OrderRecord[] }>(`/waiter/${slug}/orders`, {
    items: demoOrders,
  });
  return payload.items;
}

export async function getKitchenOrdersServer(slug: string): Promise<OrderRecord[]> {
  const payload = await fetchProtectedJson<{ items: OrderRecord[] }>(`/kitchen/${slug}/orders`, {
    items: demoOrders.filter((order) => ["placed", "preparing", "ready"].includes(order.status)),
  });
  return payload.items;
}

export async function getSubscriptionServer(slug: string): Promise<SubscriptionRecord> {
  return fetchProtectedJson(`/admin/${slug}/billing/subscription`, demoSubscription);
}

export async function getPlatformRestaurantsServer(): Promise<PlatformRestaurantListRecord[]> {
  return fetchProtectedJson("/platform/restaurants", demoPlatformRestaurants);
}

export async function getPlatformRestaurantDetailServer(slug: string): Promise<PlatformRestaurantDetailRecord | null> {
  return fetchProtectedJson(
    `/platform/restaurants/${slug}`,
    demoPlatformRestaurantDetail.slug === slug ? demoPlatformRestaurantDetail : null,
  );
}

export function getFallbackSession(role: AuthSession["user"]["role"] = "admin"): AuthSession {
  return getDemoSession(role);
}
