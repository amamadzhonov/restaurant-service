import type {
  AdminOperationsSummary,
  AuthSession,
  DeviceRecord,
  MenuItemRecord,
  MenuRecord,
  MenuSectionRecord,
  OrderRecord,
  PasswordResetTokenRecord,
  PlatformRestaurantDetailRecord,
  PlatformRestaurantListRecord,
  PublicMenu,
  PublicOrderStatusRecord,
  StaffAccountRecord,
  SubscriptionRecord,
  TableRecord,
  UserRole,
  WaiterTableRecord,
} from "@/lib/types";

const browserApiUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
    : undefined;

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? browserApiUrl ?? "http://localhost:8000/api/v1";

export const demoMenu: PublicMenu = {
  tenant: {
    id: "tenant-harbor",
    name: "Harbor Bistro",
    slug: "harbor-bistro",
    hero_title: "Scan, order, and keep service moving",
    hero_subtitle: "Guest QR ordering up front, kitchen tickets in motion, and waiters closing the table.",
    primary_color: "#B24C2B",
    accent_color: "#183B4E",
  },
  menu_id: "menu-demo",
  menu_name: "All Day Menu",
  ordering_enabled: true,
  sections: [
    {
      id: "section-1",
      name: "Starters",
      display_order: 1,
      items: [
        {
          id: "item-1",
          name: "Charred Octopus",
          description: "Smoked paprika, citrus oil, and fennel crunch.",
          price: "18.00",
          is_available: true,
          is_featured: true,
          tags: ["gluten_free"],
        },
      ],
    },
    {
      id: "section-2",
      name: "Mains",
      display_order: 2,
      items: [
        {
          id: "item-2",
          name: "Harbor Burger",
          description: "Double patty, caramelized onion, and sea salt fries.",
          price: "24.00",
          is_available: true,
          is_featured: false,
          tags: [],
        },
        {
          id: "item-3",
          name: "Roasted Cauliflower Steak",
          description: "Tahini, green herb salsa, and toasted almonds.",
          price: "21.00",
          is_available: true,
          is_featured: false,
          tags: ["vegetarian"],
        },
      ],
    },
    {
      id: "section-3",
      name: "Drinks",
      display_order: 3,
      items: [
        {
          id: "item-4",
          name: "Spiced Citrus Spritz",
          description: "House cordial, sparkling water, orange peel.",
          price: "11.00",
          is_available: true,
          is_featured: false,
          tags: ["vegan"],
        },
      ],
    },
  ],
};

export const demoTables: TableRecord[] = [
  {
    id: "table-1",
    tenant_id: "tenant-harbor",
    table_number: "A1",
    code: "table-a1",
    qr_code_url: "http://localhost:3000/r/harbor-bistro/t/table-a1",
    current_waiter_user_id: "user-waiter",
    current_waiter_name: "Harbor Waiter",
    claimed_at: new Date().toISOString(),
  },
  {
    id: "table-2",
    tenant_id: "tenant-harbor",
    table_number: "A2",
    code: "table-a2",
    qr_code_url: "http://localhost:3000/r/harbor-bistro/t/table-a2",
    current_waiter_user_id: "user-waiter",
    current_waiter_name: "Harbor Waiter",
    claimed_at: new Date().toISOString(),
  },
  {
    id: "table-3",
    tenant_id: "tenant-harbor",
    table_number: "B4",
    code: "table-b4",
    qr_code_url: "http://localhost:3000/r/harbor-bistro/t/table-b4",
    current_waiter_user_id: null,
    current_waiter_name: null,
    claimed_at: null,
  },
];

export const demoWaiterTables: { claimed: WaiterTableRecord[]; available: WaiterTableRecord[] } = {
  claimed: demoTables
    .filter((table) => table.current_waiter_user_id === "user-waiter")
    .map((table, index) => ({ ...table, active_order_count: index === 0 ? 1 : 1 })),
  available: demoTables
    .filter((table) => !table.current_waiter_user_id)
    .map((table) => ({ ...table, active_order_count: 0 })),
};

export const demoMenus: MenuRecord[] = [
  {
    id: "menu-demo",
    tenant_id: "tenant-harbor",
    name: "All Day Menu",
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export const demoSections: MenuSectionRecord[] = demoMenu.sections.map((section) => ({
  id: section.id,
  tenant_id: "tenant-harbor",
  menu_id: "menu-demo",
  name: section.name,
  display_order: section.display_order,
  created_at: new Date().toISOString(),
}));

export const demoItems: MenuItemRecord[] = demoMenu.sections.flatMap((section) =>
  section.items.map((item, index) => ({
    id: item.id,
    tenant_id: "tenant-harbor",
    menu_id: "menu-demo",
    section_id: section.id,
    name: item.name,
    description: item.description,
    price: item.price,
    image_url: item.image_url,
    is_available: item.is_available,
    is_featured: item.is_featured,
    tags: item.tags,
    display_order: index + 1,
    created_at: new Date().toISOString(),
  })),
);

export const demoOrders: OrderRecord[] = [
  {
    id: "order-1",
    tenant_id: "tenant-harbor",
    table_id: "table-1",
    table_number: "A1",
    created_by_user_id: null,
    served_by_user_id: null,
    closed_by_user_id: null,
    source: "qr_guest",
    guest_name: "Maya",
    public_status_token: "demo-maya-order",
    status: "placed",
    total_price: "35.00",
    notes: "No onions on the burger",
    placed_at: new Date().toISOString(),
    ready_at: null,
    served_at: null,
    closed_at: null,
    created_at: new Date().toISOString(),
    status_changed_at: new Date().toISOString(),
    items: [
      { id: "oi-1", menu_item_id: "item-2", menu_item_name: "Harbor Burger", quantity: 1, price: "24.00" },
      { id: "oi-2", menu_item_id: "item-4", menu_item_name: "Spiced Citrus Spritz", quantity: 1, price: "11.00" },
    ],
  },
  {
    id: "order-2",
    tenant_id: "tenant-harbor",
    table_id: "table-2",
    table_number: "A2",
    created_by_user_id: "user-waiter",
    served_by_user_id: null,
    closed_by_user_id: null,
    source: "staff_assisted",
    guest_name: "Table A2",
    public_status_token: "demo-a2-order",
    status: "ready",
    total_price: "32.00",
    notes: "Spritz first, mains to follow",
    placed_at: new Date().toISOString(),
    ready_at: new Date().toISOString(),
    served_at: null,
    closed_at: null,
    created_at: new Date().toISOString(),
    status_changed_at: new Date().toISOString(),
    items: [
      {
        id: "oi-3",
        menu_item_id: "item-3",
        menu_item_name: "Roasted Cauliflower Steak",
        quantity: 1,
        price: "21.00",
      },
      { id: "oi-4", menu_item_id: "item-4", menu_item_name: "Spiced Citrus Spritz", quantity: 1, price: "11.00" },
    ],
  },
];

export const demoDevices: DeviceRecord[] = [
  {
    id: "device-1",
    tenant_id: "tenant-harbor",
    label: "Front Tablet",
    platform: "pwa",
    status: "active",
    assigned_table_id: "table-1",
    last_seen_at: new Date().toISOString(),
  },
];

export const demoUsers: StaffAccountRecord[] = [
  {
    id: "user-admin",
    tenant_id: "tenant-harbor",
    full_name: "Harbor Admin",
    email: "admin@harbor.local",
    role: "admin",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "user-waiter",
    tenant_id: "tenant-harbor",
    full_name: "Harbor Waiter",
    email: "waiter@harbor.local",
    role: "waiter",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "user-kitchen",
    tenant_id: "tenant-harbor",
    full_name: "Harbor Kitchen",
    email: "kitchen@harbor.local",
    role: "kitchen",
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export const demoSummary: AdminOperationsSummary = {
  orders_today: 2,
  ready_backlog: 1,
  active_orders: 2,
  closed_today: 0,
  gross_sales_today: "0.00",
  active_tables: 2,
};

export const demoSubscription: SubscriptionRecord = {
  tenant_id: "tenant-harbor",
  plan: "starter",
  status: "active",
  grace_ends_at: null,
  stripe_customer_id: "cus_demo",
  stripe_subscription_id: "sub_demo",
  is_accessible: true,
};

export const demoPublicOrderStatus: PublicOrderStatusRecord = {
  order_id: demoOrders[0].id,
  public_status_token: demoOrders[0].public_status_token,
  table_number: demoOrders[0].table_number,
  guest_name: demoOrders[0].guest_name,
  status: demoOrders[0].status,
  notes: demoOrders[0].notes,
  total_price: demoOrders[0].total_price,
  placed_at: demoOrders[0].placed_at,
  ready_at: demoOrders[0].ready_at,
  served_at: demoOrders[0].served_at,
  items: demoOrders[0].items.map((item) => ({
    menu_item_id: item.menu_item_id,
    menu_item_name: item.menu_item_name,
    quantity: item.quantity,
    price: item.price,
  })),
};

export const demoPlatformRestaurants: PlatformRestaurantListRecord[] = [
  {
    id: "tenant-harbor",
    name: "Harbor Bistro",
    slug: "harbor-bistro",
    subscription_plan: "starter",
    subscription_status: "active",
    grace_ends_at: null,
    is_accessible: true,
    admin_count: 1,
    device_count: 1,
    today_open_orders: 2,
    today_closed_orders: 0,
  },
  {
    id: "tenant-meadow",
    name: "Meadow Grill",
    slug: "meadow-grill",
    subscription_plan: "growth",
    subscription_status: "active",
    grace_ends_at: null,
    is_accessible: true,
    admin_count: 1,
    device_count: 1,
    today_open_orders: 0,
    today_closed_orders: 0,
  },
  {
    id: "tenant-slate",
    name: "Slate Room",
    slug: "slate-room",
    subscription_plan: "starter",
    subscription_status: "past_due",
    grace_ends_at: null,
    is_accessible: false,
    admin_count: 1,
    device_count: 1,
    today_open_orders: 0,
    today_closed_orders: 0,
  },
];

export const demoPlatformRestaurantDetail: PlatformRestaurantDetailRecord = {
  id: "tenant-harbor",
  name: "Harbor Bistro",
  slug: "harbor-bistro",
  address: "12 River Walk, Brooklyn, NY",
  timezone: "America/New_York",
  currency: "USD",
  subscription_plan: "starter",
  subscription_status: "active",
  grace_ends_at: null,
  is_accessible: true,
  admin_count: 1,
  device_count: 1,
  today_open_orders: 2,
  today_closed_orders: 0,
  ready_backlog: 1,
  active_tables: 2,
  users: demoUsers,
  devices: demoDevices,
  recent_orders: demoOrders.map((order) => ({
    id: order.id,
    table_id: order.table_id,
    table_number: order.table_number,
    guest_name: order.guest_name,
    status: order.status,
    source: order.source,
    total_price: order.total_price,
    created_at: order.created_at,
    status_changed_at: order.status_changed_at,
  })),
};

export const demoPasswordReset: PasswordResetTokenRecord = {
  user_id: "user-waiter",
  token: "demo-reset-token",
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

const demoSessions: Record<UserRole, AuthSession> = {
  super_admin: {
    user: {
      id: "user-owner",
      email: "owner@platform.local",
      full_name: "Platform Owner",
      role: "super_admin",
      tenant_id: null,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    tenant: null,
  },
  admin: {
    user: {
      id: "user-admin",
      email: "admin@harbor.local",
      full_name: "Harbor Admin",
      role: "admin",
      tenant_id: "tenant-harbor",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    tenant: {
      id: "tenant-harbor",
      name: "Harbor Bistro",
      slug: "harbor-bistro",
      subscription_status: "active",
      is_accessible: true,
    },
  },
  waiter: {
    user: {
      id: "user-waiter",
      email: "waiter@harbor.local",
      full_name: "Harbor Waiter",
      role: "waiter",
      tenant_id: "tenant-harbor",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    tenant: {
      id: "tenant-harbor",
      name: "Harbor Bistro",
      slug: "harbor-bistro",
      subscription_status: "active",
      is_accessible: true,
    },
  },
  kitchen: {
    user: {
      id: "user-kitchen",
      email: "kitchen@harbor.local",
      full_name: "Harbor Kitchen",
      role: "kitchen",
      tenant_id: "tenant-harbor",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    tenant: {
      id: "tenant-harbor",
      name: "Harbor Bistro",
      slug: "harbor-bistro",
      subscription_status: "active",
      is_accessible: true,
    },
  },
};

async function fetchJson<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
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

export async function getPublicMenu(slug: string): Promise<PublicMenu> {
  return fetchJson(`/public/restaurants/${slug}/menu`, demoMenu);
}

export async function getTable(tableCode: string): Promise<TableRecord | null> {
  return fetchJson(`/public/tables/${tableCode}`, demoTables.find((table) => table.code === tableCode) ?? null);
}

export async function getPublicOrderStatus(publicStatusToken: string): Promise<PublicOrderStatusRecord | null> {
  return fetchJson(
    `/public/orders/${publicStatusToken}`,
    demoPublicOrderStatus.public_status_token === publicStatusToken ? demoPublicOrderStatus : null,
  );
}

export async function getMenus(slug: string): Promise<MenuRecord[]> {
  return fetchJson(`/admin/${slug}/menus`, demoMenus);
}

export async function getSections(slug: string): Promise<MenuSectionRecord[]> {
  return fetchJson(`/admin/${slug}/menu-sections`, demoSections);
}

export async function getMenuItems(slug: string): Promise<MenuItemRecord[]> {
  return fetchJson(`/admin/${slug}/menu-items`, demoItems);
}

export async function getTables(slug: string): Promise<TableRecord[]> {
  return fetchJson(`/admin/${slug}/tables`, demoTables);
}

export async function getDevices(slug: string): Promise<DeviceRecord[]> {
  return fetchJson(`/admin/${slug}/devices`, demoDevices);
}

export async function getAdminOrders(slug: string): Promise<OrderRecord[]> {
  return fetchJson(`/admin/${slug}/orders`, demoOrders);
}

export async function getAdminSummary(slug: string): Promise<AdminOperationsSummary> {
  return fetchJson(`/admin/${slug}/reports/summary`, demoSummary);
}

export async function getUsers(slug: string): Promise<StaffAccountRecord[]> {
  return fetchJson(`/admin/${slug}/users`, demoUsers);
}

export async function getWaiterTables(slug: string): Promise<{ claimed: WaiterTableRecord[]; available: WaiterTableRecord[] }> {
  return fetchJson(`/waiter/${slug}/tables`, demoWaiterTables);
}

export async function getWaiterOrders(slug: string): Promise<OrderRecord[]> {
  const payload = await fetchJson<{ items: OrderRecord[] }>(`/waiter/${slug}/orders`, {
    items: demoOrders,
  });
  return payload.items;
}

export async function getKitchenOrders(slug: string): Promise<OrderRecord[]> {
  const payload = await fetchJson<{ items: OrderRecord[] }>(`/kitchen/${slug}/orders`, {
    items: demoOrders.filter((order) => ["placed", "preparing", "ready"].includes(order.status)),
  });
  return payload.items;
}

export async function getSubscription(slug: string): Promise<SubscriptionRecord> {
  return fetchJson(`/admin/${slug}/billing/subscription`, demoSubscription);
}

export async function getPlatformRestaurants(): Promise<PlatformRestaurantListRecord[]> {
  return fetchJson("/platform/restaurants", demoPlatformRestaurants);
}

export async function getPlatformRestaurantDetail(slug: string): Promise<PlatformRestaurantDetailRecord | null> {
  return fetchJson(
    `/platform/restaurants/${slug}`,
    demoPlatformRestaurantDetail.slug === slug ? demoPlatformRestaurantDetail : null,
  );
}

export function getDemoSession(role: UserRole = "admin"): AuthSession {
  return demoSessions[role];
}

export const apiBaseUrl = API_URL;
