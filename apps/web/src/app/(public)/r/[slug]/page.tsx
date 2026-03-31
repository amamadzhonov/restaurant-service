import Link from "next/link";

import { DecorativeBackdrop } from "@/components/decorative-backdrop";
import { getPublicMenu } from "@/lib/api";
import { formatCurrencyForLocale, translateTag } from "@/lib/i18n";
import { getTranslatorServer } from "@/lib/i18n-server";

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { locale, t } = await getTranslatorServer();
  const { slug } = await params;
  const menu = await getPublicMenu(slug);

  return (
    <main className="app-shell public-scene-shell public-scene-shell--menu">
      <DecorativeBackdrop preset="public_menu" />
      <section className="hero-panel public-hero reveal-panel reveal-1">
        <span className="eyebrow">{t("public_menu.eyebrow", { menu: menu.menu_name })}</span>
        <h1 className="display">{menu.tenant.hero_title ?? menu.tenant.name}</h1>
        <p className="lede">{menu.tenant.hero_subtitle ?? t("public_menu.default_subtitle")}</p>
        <div className="chip-row section">
          {menu.sections.map((section) => (
            <a className="chip" href={`#${section.id}`} key={section.id}>
              {section.name}
            </a>
          ))}
        </div>
        <div className="table-banner">
          <strong>{menu.ordering_enabled ? t("public_menu.ordering_live") : t("public_menu.menu_only")}</strong>
          <span className="muted">
            {menu.ordering_enabled
              ? t("public_menu.ordering_live_description")
              : t("public_menu.menu_only_description")}
          </span>
        </div>
        <div className="hero-detail-strip">
          <span className="hero-detail-card">{menu.menu_name}</span>
          {menu.sections.slice(0, 3).map((section) => (
            <span className="hero-detail-card subtle" key={section.id}>
              {section.name}
            </span>
          ))}
        </div>
        <div className="chip-row section">
          <Link className="button" href={`/r/${slug}/t/table-a1`}>
            {t("public_menu.open_demo_table")}
          </Link>
          <Link className="ghost-button" href={`/waiter/${slug}`}>
            {t("public_menu.waiter_view")}
          </Link>
          <Link className="ghost-button" href={`/kitchen/${slug}`}>
            {t("public_menu.kitchen_board")}
          </Link>
        </div>
      </section>

      {menu.sections.map((section) => (
        <section className="section section-stage" id={section.id} key={section.id}>
          <div className="section-header">
            <div>
              <h2 className="section-title">{section.name}</h2>
              <p className="section-subtitle">{t("public_menu.section_subtitle")}</p>
            </div>
          </div>
          <div className="menu-grid showcase-grid">
            {section.items.map((item) => (
              <article className="menu-item-card stack" key={item.id}>
                <div className="menu-item-media">
                  {item.image_url ? (
                    <img alt={item.name} className="menu-item-image" src={item.image_url} />
                  ) : (
                    <div aria-hidden="true" className="menu-item-image menu-item-image-placeholder" />
                  )}
                </div>
                <div className="inline-meta">
                  <span className={`status-pill ${item.is_available ? "active" : "cancelled"}`}>
                    {item.is_available ? t("common.available") : t("common.unavailable")}
                  </span>
                  {item.is_featured ? <span className="status-pill ready">{t("common.featured")}</span> : null}
                </div>
                <h3>{item.name}</h3>
                <p className="muted">{item.description}</p>
                <div className="tag-row">
                  {item.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {translateTag(locale, tag)}
                    </span>
                  ))}
                </div>
                <div className="price">{formatCurrencyForLocale(locale, item.price)}</div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
