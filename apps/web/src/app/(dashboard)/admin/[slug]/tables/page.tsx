import { TableManager } from "@/components/table-manager";
import { getTranslatorServer } from "@/lib/i18n-server";
import { getTablesServer } from "@/lib/server-api";

export default async function AdminTablesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = await getTranslatorServer();
  const { slug } = await params;
  const tables = await getTablesServer(slug);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">{t("admin.tables_eyebrow")}</span>
        <h1 className="display">{t("admin.tables_title")}</h1>
        <p className="lede">{t("admin.tables_description")}</p>
      </section>
      <TableManager slug={slug} tables={tables} />
    </>
  );
}
