import "server-only";

import { cookies } from "next/headers";

import { createTranslator, LOCALE_COOKIE_NAME, resolveLocale } from "@/lib/i18n";

export async function getLocaleServer() {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export async function getTranslatorServer() {
  const locale = await getLocaleServer();
  return {
    locale,
    t: createTranslator(locale),
  };
}
