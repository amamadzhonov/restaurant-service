import { DecorativeBackdrop } from "@/components/decorative-backdrop";
import { PublicOrdering } from "@/components/public-ordering";
import { getPublicMenu, getTable } from "@/lib/api";

export default async function TableMenuPage({
  params,
}: {
  params: Promise<{ slug: string; tableCode: string }>;
}) {
  const { slug, tableCode } = await params;
  const [menu, table] = await Promise.all([getPublicMenu(slug), getTable(tableCode)]);

  return (
    <main className="app-shell public-scene-shell public-scene-shell--ordering">
      <DecorativeBackdrop preset="public_ordering" />
      <PublicOrdering menu={menu} slug={slug} table={table} />
    </main>
  );
}
