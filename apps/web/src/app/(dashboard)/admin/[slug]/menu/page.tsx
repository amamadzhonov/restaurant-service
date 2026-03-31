import { MenuStudio } from "@/components/menu-studio";
import { getTranslatorServer } from "@/lib/i18n-server";
import { getMenuItemsServer, getMenusServer, getSectionsServer } from "@/lib/server-api";

export default async function AdminMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = await getTranslatorServer();
  const { slug } = await params;
  const [menus, sections, items] = await Promise.all([
    getMenusServer(slug),
    getSectionsServer(slug),
    getMenuItemsServer(slug),
  ]);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">{t("admin.menu_eyebrow")}</span>
        <h1 className="display">{t("admin.menu_title")}</h1>
        <p className="lede">{t("admin.menu_description")}</p>
      </section>
      <MenuStudio items={items} menus={menus} sections={sections} slug={slug} />
    </>
  );
}
