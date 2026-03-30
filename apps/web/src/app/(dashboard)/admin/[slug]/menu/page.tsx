import { MenuStudio } from "@/components/menu-studio";
import { getMenuItemsServer, getMenusServer, getSectionsServer } from "@/lib/server-api";

export default async function AdminMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [menus, sections, items] = await Promise.all([
    getMenusServer(slug),
    getSectionsServer(slug),
    getMenuItemsServer(slug),
  ]);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">Menu management</span>
        <h1 className="display">Structured enough to scale, simple enough to update with photos.</h1>
        <p className="lede">
          The catalog stays lean on purpose: menu, sections, items, tags, availability, and image upload. No
          modifiers, no pricing matrix, no accidental complexity.
        </p>
      </section>
      <MenuStudio items={items} menus={menus} sections={sections} slug={slug} />
    </>
  );
}
