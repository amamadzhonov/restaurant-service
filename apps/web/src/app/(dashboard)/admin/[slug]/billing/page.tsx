import { BillingSummaryCard } from "@/components/billing-actions";
import { getSubscriptionServer } from "@/lib/server-api";

export default async function AdminBillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const subscription = await getSubscriptionServer(slug);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">Billing</span>
        <h1 className="display">Restaurant admins can monitor billing state, but platform owns recovery.</h1>
        <p className="lede">
          QR menus can remain public, while waiter, kitchen, and admin access depend on both billing health and tenant
          accessibility.
        </p>
      </section>
      <BillingSummaryCard subscription={subscription} />
    </>
  );
}
