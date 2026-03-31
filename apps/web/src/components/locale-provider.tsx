"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { createTranslator, type SupportedLocale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: ReturnType<typeof createTranslator>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: SupportedLocale;
}) {
  const [locale, setLocale] = useState<SupportedLocale>(initialLocale);
  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: createTranslator(locale),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useI18n must be used within LocaleProvider");
  }
  return context;
}
