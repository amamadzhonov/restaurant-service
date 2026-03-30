export default async function AdminSettingsPage() {
  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">Settings</span>
        <h1 className="display">Keep tenant setup boring so service operations stay sharp.</h1>
        <p className="lede">
          The MVP still assumes a single-location tenant, USD pricing, internal onboarding, and no public customer
          accounts. This screen is held for future brand and operational defaults.
        </p>
      </section>
      <section className="content-card stack">
        <div className="tag-row">
          <span className="tag">Single location</span>
          <span className="tag">USD default</span>
          <span className="tag">Internal onboarding</span>
          <span className="tag">No online payment</span>
          <span className="tag">No modifiers</span>
        </div>
      </section>
    </>
  );
}
