import { notFound, redirect } from "next/navigation";

import { PlatformRestaurantDetail } from "@/components/platform-restaurant-detail";
import { SessionPanel } from "@/components/session-panel";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer, getPlatformRestaurantDetailServer } from "@/lib/server-api";

export default async function PlatformRestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getAuthSessionServer();
  if (!session) {
    redirect("/");
  }
  if (session.user.role !== "super_admin") {
    redirect(routeForSession(session) as any);
  }
  const restaurant = await getPlatformRestaurantDetailServer(slug);
  if (!restaurant) {
    notFound();
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <span className="eyebrow">Restaurant Support View</span>
        <h1 className="display">Support the restaurant without becoming its admin.</h1>
        <p className="lede">
          The platform detail page is intentionally focused: profile, access, users, devices, and today&apos;s service state.
        </p>
      </section>
      <section className="grid two section">
        <SessionPanel
          contextLabel={`platform support for ${slug}`}
          defaultEmail="owner@platform.local"
          demoRole="super_admin"
          title="Super admin session"
        />
      </section>
      <section className="section">
        <PlatformRestaurantDetail initialRestaurant={restaurant} />
      </section>
    </main>
  );
}
