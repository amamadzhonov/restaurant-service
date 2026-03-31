"use client";

import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n";
import { useI18n } from "@/components/locale-provider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  function handleChange(nextLocale: SupportedLocale) {
    if (nextLocale === locale) {
      return;
    }
    setLocale(nextLocale);
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <div className="locale-switcher-wrap">
      <span className="locale-label">{t("locale.label")}</span>
      <div className="locale-switcher" aria-label={t("locale.label")}>
        {SUPPORTED_LOCALES.map((entry) => (
          <button
            className={`locale-chip ${locale === entry ? "active" : ""}`}
            key={entry}
            onClick={() => handleChange(entry)}
            type="button"
          >
            {t(`locale.${entry}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
