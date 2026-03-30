import Link from "next/link";
import { redirect } from "next/navigation";

import { SessionPanel } from "@/components/session-panel";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer } from "@/lib/server-api";

const NAV = [
  { href: "", label: "Overview" },
  { href: "/menu", label: "Menu" },
  { href: "/users", label: "Users" },
  { href: "/tables", label: "Tables" },
  { href: "/orders", label: "Orders" },
  { href: "/devices", label: "Devices" },
  { href: "/reports", label: "Reports" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" },
];

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getAuthSessionServer();
  if (!session) {
    redirect("/");
  }
  if (session && (session.user.role !== "admin" || session.tenant?.slug !== slug)) {
    redirect(routeForSession(session) as any);
  }

  return (
    <main className="app-shell dashboard">
      <aside className="nav-shell stack">
        <div>
          <span className="eyebrow">Restaurant Admin</span>
          <h1 style={{ marginBottom: 8 }}>Harbor Ops</h1>
          <p className="muted">Menu, staff, floor, devices, reporting, and billing status for a single tenant.</p>
        </div>
        <nav className="stack">
          {NAV.map((item) => (
            <Link
              className="nav-link"
              href={item.href ? `/admin/${slug}${item.href}` : `/admin/${slug}`}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <SessionPanel contextLabel={`admin for ${slug}`} />
      </aside>
      <section className="stack">{children}</section>
    </main>
  );
}
