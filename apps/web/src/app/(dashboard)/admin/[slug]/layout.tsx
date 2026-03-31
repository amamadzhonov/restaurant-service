import Link from "next/link";
import { redirect } from "next/navigation";

import { SessionPanel } from "@/components/session-panel";
import { getTranslatorServer } from "@/lib/i18n-server";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer } from "@/lib/server-api";

const NAV = [
  { href: "", key: "admin.nav.overview" },
  { href: "/menu", key: "admin.nav.menu" },
  { href: "/users", key: "admin.nav.users" },
  { href: "/tables", key: "admin.nav.tables" },
  { href: "/orders", key: "admin.nav.orders" },
  { href: "/devices", key: "admin.nav.devices" },
  { href: "/reports", key: "admin.nav.reports" },
  { href: "/billing", key: "admin.nav.billing" },
  { href: "/settings", key: "admin.nav.settings" },
];

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { t } = await getTranslatorServer();
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
        <div className="stack">
          <span className="eyebrow">{t("admin.layout_eyebrow")}</span>
          <div className="tenant-lockup">
            <span className="tenant-mark">{slug.slice(0, 2).toUpperCase()}</span>
            <div>
              <h1 className="nav-title">{t("admin.layout_title")}</h1>
              <p className="muted">{slug}</p>
            </div>
          </div>
          <p className="muted">{t("admin.layout_description")}</p>
        </div>
        <nav className="stack nav-stack">
          {NAV.map((item) => (
            <Link
              className="nav-link"
              href={item.href ? `/admin/${slug}${item.href}` : `/admin/${slug}`}
              key={item.key}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <SessionPanel contextLabel={`admin for ${slug}`} />
      </aside>
      <section className="stack dashboard-content">{children}</section>
    </main>
  );
}
