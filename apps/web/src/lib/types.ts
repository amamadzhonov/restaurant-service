export type UserRole = "super_admin" | "admin" | "waiter" | "kitchen";
export type OrderStatus = "placed" | "preparing" | "ready" | "served" | "closed" | "cancelled";
export type OrderSource = "qr_guest" | "staff_assisted";
export type DeviceStatus = "active" | "lost" | "damaged" | "inactive";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "grace" | "canceled" | "incomplete";

export interface TenantBranding {
  id: string;
  name: string;
  slug: string;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  primary_color: string;
  accent_color: string;
  logo_url?: string | null;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  image_url?: string | null;
  is_available: boolean;
  is_featured: boolean;
  tags: string[];
}

export interface PublicMenuSection {
  id: string;
  name: string;
  display_order: number;
  items: PublicMenuItem[];
}

export interface PublicMenu {
  tenant: TenantBranding;
  menu_id: string;
  menu_name: string;
  ordering_enabled: boolean;
  sections: PublicMenuSection[];
}

export interface TableRecord {
  id: string;
  tenant_id: string;
  table_number: string;
  code: string;
  qr_code_url?: string | null;
  current_waiter_user_id?: string | null;
  current_waiter_name?: string | null;
  claimed_at?: string | null;
}

export interface WaiterTableRecord extends TableRecord {
  active_order_count: number;
}

export interface MenuRecord {
  id: string;
  tenant_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface MenuSectionRecord {
  id: string;
  tenant_id: string;
  menu_id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export interface MenuItemRecord {
  id: string;
  tenant_id: string;
  menu_id: string;
  section_id: string;
  name: string;
  description?: string | null;
  price: string;
  image_url?: string | null;
  is_available: boolean;
  is_featured: boolean;
  tags: string[];
  display_order: number;
  created_at: string;
}

export interface OrderItemRecord {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  price: string;
}

export interface OrderRecord {
  id: string;
  tenant_id: string;
  table_id: string;
  table_number: string;
  created_by_user_id?: string | null;
  served_by_user_id?: string | null;
  closed_by_user_id?: string | null;
  source: OrderSource;
  guest_name?: string | null;
  public_status_token: string;
  status: OrderStatus;
  total_price: string;
  notes?: string | null;
  placed_at: string;
  ready_at?: string | null;
  served_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  status_changed_at: string;
  items: OrderItemRecord[];
}

export interface PublicOrderStatusRecord {
  order_id: string;
  public_status_token: string;
  table_number: string;
  guest_name?: string | null;
  status: OrderStatus;
  notes?: string | null;
  total_price: string;
  placed_at: string;
  ready_at?: string | null;
  served_at?: string | null;
  items: Array<{
    menu_item_id: string;
    menu_item_name: string;
    quantity: number;
    price: string;
  }>;
}

export interface DeviceRecord {
  id: string;
  tenant_id: string;
  label: string;
  platform: string;
  status: DeviceStatus;
  assigned_table_id?: string | null;
  last_seen_at?: string | null;
}

export interface StaffAccountRecord {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role: Extract<UserRole, "admin" | "waiter" | "kitchen">;
  is_active: boolean;
  created_at: string;
}

export interface AdminOperationsSummary {
  orders_today: number;
  ready_backlog: number;
  active_orders: number;
  closed_today: number;
  gross_sales_today: string;
  active_tables: number;
}

export interface SubscriptionRecord {
  tenant_id: string;
  plan: string;
  status: SubscriptionStatus;
  grace_ends_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  is_accessible: boolean;
}

export interface PlatformUserRecord {
  id: string;
  tenant_id?: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface PlatformRestaurantListRecord {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: SubscriptionStatus;
  grace_ends_at?: string | null;
  is_accessible: boolean;
  admin_count: number;
  device_count: number;
  today_open_orders: number;
  today_closed_orders: number;
}

export interface PlatformDeviceRecord {
  id: string;
  tenant_id: string;
  label: string;
  platform: string;
  status: DeviceStatus;
  assigned_table_id?: string | null;
  last_seen_at?: string | null;
}

export interface PlatformOrderSnapshotRecord {
  id: string;
  table_id: string;
  table_number: string;
  guest_name?: string | null;
  status: OrderStatus;
  source: OrderSource;
  total_price: string;
  created_at: string;
  status_changed_at: string;
}

export interface PlatformRestaurantDetailRecord {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  timezone: string;
  currency: string;
  subscription_plan: string;
  subscription_status: SubscriptionStatus;
  grace_ends_at?: string | null;
  is_accessible: boolean;
  admin_count: number;
  device_count: number;
  today_open_orders: number;
  today_closed_orders: number;
  ready_backlog: number;
  active_tables: number;
  users: PlatformUserRecord[];
  devices: PlatformDeviceRecord[];
  recent_orders: PlatformOrderSnapshotRecord[];
}

export interface PasswordResetTokenRecord {
  user_id: string;
  token: string;
  expires_at: string;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    tenant_id?: string | null;
    is_active: boolean;
    created_at: string;
  };
  tenant?: {
    id?: string | null;
    name?: string | null;
    slug?: string | null;
    subscription_status?: string | null;
    grace_ends_at?: string | null;
    is_accessible?: boolean | null;
  } | null;
}
