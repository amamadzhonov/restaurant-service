import { TableManager } from "@/components/table-manager";
import { getTablesServer } from "@/lib/server-api";

export default async function AdminTablesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tables = await getTablesServer(slug);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">Tables</span>
        <h1 className="display">Map the floor, keep QR-safe codes, and see who owns each table.</h1>
        <p className="lede">
          Tables stay human-readable for staff while public QR routes avoid raw internal IDs and waiter claim state
          stays visible to admins.
        </p>
      </section>
      <TableManager slug={slug} tables={tables} />
    </>
  );
}
