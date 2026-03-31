import { DeviceRegistry } from "@/components/device-registry";
import { getTranslatorServer } from "@/lib/i18n-server";
import { getDevicesServer, getTablesServer } from "@/lib/server-api";

export default async function AdminDevicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = await getTranslatorServer();
  const { slug } = await params;
  const [devices, tables] = await Promise.all([getDevicesServer(slug), getTablesServer(slug)]);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">{t("admin.devices_eyebrow")}</span>
        <h1 className="display">{t("admin.devices_title")}</h1>
        <p className="lede">{t("admin.devices_description")}</p>
      </section>
      <DeviceRegistry devices={devices} slug={slug} tables={tables} />
    </>
  );
}
