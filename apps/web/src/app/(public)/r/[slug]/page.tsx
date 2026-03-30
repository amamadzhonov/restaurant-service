import Link from "next/link";

import { getPublicMenu } from "@/lib/api";

function formatPrice(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function prettifyTag(tag: string) {
  return tag.replaceAll("_", " ");
}

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <span className="eyebrow">QR Menu · {menu.menu_name}</span>
        <h1 className="display">{menu.tenant.hero_title ?? menu.tenant.name}</h1>
        <p className="lede">{menu.tenant.hero_subtitle ?? "A polished mobile menu built for fast restaurant service."}</p>
        <div className="chip-row section">
          {menu.sections.map((section) => (
            <a className="chip" href={`#${section.id}`} key={section.id}>
              {section.name}
            </a>
          ))}
        </div>
        <div className="table-banner">
          <strong>{menu.ordering_enabled ? "Ordering is live" : "Menu only"}</strong>
          <span className="muted">
            {menu.ordering_enabled
              ? "Scan the table QR route to open the guest cart and send an order."
              : "The menu remains visible while ordering is temporarily unavailable."}
          </span>
        </div>
        <div className="chip-row section">
          <Link className="button" href={`/r/${slug}/t/table-a1`}>
            Open demo table
          </Link>
          <Link className="ghost-button" href={`/waiter/${slug}`}>
            Waiter view
          </Link>
          <Link className="ghost-button" href={`/kitchen/${slug}`}>
            Kitchen board
          </Link>
        </div>
      </section>

      {menu.sections.map((section) => (
        <section className="section" id={section.id} key={section.id}>
          <div className="section-header">
            <div>
              <h2 className="section-title">{section.name}</h2>
              <p className="section-subtitle">Built to read quickly on a phone, with strong states and bold pricing.</p>
            </div>
          </div>
          <div className="menu-grid">
            {section.items.map((item) => (
              <article className="menu-item-card stack" key={item.id}>
                {item.image_url ? <img alt={item.name} className="menu-item-image" src={item.image_url} /> : null}
                <div className="inline-meta">
                  <span className={`status-pill ${item.is_available ? "active" : "cancelled"}`}>
                    {item.is_available ? "available" : "unavailable"}
                  </span>
                  {item.is_featured ? <span className="status-pill ready">featured</span> : null}
                </div>
                <h3>{item.name}</h3>
                <p className="muted">{item.description}</p>
                <div className="tag-row">
                  {item.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {prettifyTag(tag)}
                    </span>
                  ))}
                </div>
                <div className="price">{formatPrice(item.price)}</div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
