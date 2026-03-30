import { DeviceRegistry } from "@/components/device-registry";
import { getDevicesServer, getTablesServer } from "@/lib/server-api";

export default async function AdminDevicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [devices, tables] = await Promise.all([getDevicesServer(slug), getTablesServer(slug)]);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">Device registry</span>
        <h1 className="display">Track tablets as restaurant assets, not a separate platform.</h1>
        <p className="lede">
          The first release keeps device management practical: assignment, status, and visibility without turning the
          product into MDM software.
        </p>
      </section>
      <DeviceRegistry devices={devices} slug={slug} tables={tables} />
    </>
  );
}
