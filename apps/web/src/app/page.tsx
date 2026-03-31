import { DecorativeBackdrop } from "@/components/decorative-backdrop";
import { redirect } from "next/navigation";

import { getTranslatorServer } from "@/lib/i18n-server";
import { routeForSession } from "@/lib/session-routing";
import { getAuthSessionServer } from "@/lib/server-api";

export default async function HomePage() {
  const { t } = await getTranslatorServer();
  const session = await getAuthSessionServer();
  if (session) {
    redirect(routeForSession(session) as any);
  }

  const flavorNotes = [
    t("home.flavor_1"),
    t("home.flavor_2"),
    t("home.flavor_3"),
    t("home.flavor_4"),
    t("home.flavor_5"),
    t("home.flavor_6"),
  ];

  const showcaseDishes = [
    {
      badge: t("home.dish_1_badge"),
      name: t("home.dish_1_name"),
      description: t("home.dish_1_description"),
    },
    {
      badge: t("home.dish_2_badge"),
      name: t("home.dish_2_name"),
      description: t("home.dish_2_description"),
    },
    {
      badge: t("home.dish_3_badge"),
      name: t("home.dish_3_name"),
      description: t("home.dish_3_description"),
    },
  ];

  const storyPoints = [t("home.story_point_1"), t("home.story_point_2"), t("home.story_point_3")];
  const rhythmSteps = [
    {
      title: t("home.rhythm_step_1_title"),
      description: t("home.rhythm_step_1_description"),
    },
    {
      title: t("home.rhythm_step_2_title"),
      description: t("home.rhythm_step_2_description"),
    },
    {
      title: t("home.rhythm_step_3_title"),
      description: t("home.rhythm_step_3_description"),
    },
    {
      title: t("home.rhythm_step_4_title"),
      description: t("home.rhythm_step_4_description"),
    },
  ];

  return (
    <main className="app-shell page-stack public-scene-shell public-scene-shell--home">
      <DecorativeBackdrop preset="home" />
      <section className="content-card home-stage reveal-panel reveal-1">
        <div className="home-stage-grid">
          <div className="home-copy-stack">
            <span className="eyebrow">{t("home.eyebrow")}</span>
            <h1 className="display home-display">{t("home.title")}</h1>
            <p className="lede">{t("home.description")}</p>
            <div className="chip-row">
              <span className="chip">{t("home.guest_flow_value")}</span>
              <span className="chip">{t("home.role_routing_value")}</span>
              <span className="chip">{t("home.tenant_safety_value")}</span>
            </div>
            <div className="flavor-marquee">
              <div className="flavor-track">
                {flavorNotes.concat(flavorNotes).map((note, index) => (
                  <span className="flavor-chip" key={`${note}-${index}`}>
                    {note}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="home-scene">
            <div className="home-scene-glow home-scene-glow-a" />
            <div className="home-scene-glow home-scene-glow-b" />

            {showcaseDishes.map((dish, index) => (
              <article className={`dish-card dish-card-${index + 1}`} key={dish.name}>
                <span className="dish-kicker">{dish.badge}</span>
                <strong>{dish.name}</strong>
                <p>{dish.description}</p>
              </article>
            ))}

            <div className="report-chip report-chip-a">
              <span>{t("home.guest_flow_title")}</span>
              <strong>{t("home.guest_flow_value")}</strong>
            </div>
            <div className="report-chip report-chip-b">
              <span>{t("home.tenant_safety_title")}</span>
              <strong>{t("home.tenant_safety_value")}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid three reveal-panel reveal-2">
        <article className="metric-card">
          <h3>{t("home.guest_flow_title")}</h3>
          <div className="metric-value">{t("home.guest_flow_value")}</div>
          <p className="muted">{t("home.guest_flow_description")}</p>
        </article>
        <article className="metric-card">
          <h3>{t("home.role_routing_title")}</h3>
          <div className="metric-value">{t("home.role_routing_value")}</div>
          <p className="muted">{t("home.role_routing_description")}</p>
        </article>
        <article className="metric-card">
          <h3>{t("home.tenant_safety_title")}</h3>
          <div className="metric-value">{t("home.tenant_safety_value")}</div>
          <p className="muted">{t("home.tenant_safety_description")}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="content-card stack reveal-panel reveal-2">
          <div>
            <span className="eyebrow">{t("home.story_title")}</span>
            <h2 className="section-title" style={{ marginTop: 16 }}>
              {t("home.story_title")}
            </h2>
            <p className="section-subtitle">{t("home.story_description")}</p>
          </div>
          <div className="home-story-list">
            {storyPoints.map((point, index) => (
              <div className="home-story-item" key={point}>
                <span className="story-index">0{index + 1}</span>
                <p>{point}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="content-card stack reveal-panel reveal-3">
          <div>
            <span className="eyebrow">{t("home.rhythm_title")}</span>
            <h2 className="section-title" style={{ marginTop: 16 }}>
              {t("home.rhythm_title")}
            </h2>
            <p className="section-subtitle">{t("home.rhythm_description")}</p>
          </div>
          <div className="home-rhythm-list">
            {rhythmSteps.map((step, index) => (
              <article className="rhythm-step" key={step.title}>
                <span className="rhythm-index">0{index + 1}</span>
                <div className="stack" style={{ gap: 6 }}>
                  <strong>{step.title}</strong>
                  <p className="muted">{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
