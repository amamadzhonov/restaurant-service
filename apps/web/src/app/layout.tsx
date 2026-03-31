import type { Metadata } from "next";
import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteHeaderActions } from "@/components/site-header-actions";
import { getLocaleServer } from "@/lib/i18n-server";

import "./globals.css";

export const metadata: Metadata = {
  title: "Restaurant Menu SaaS",
  description: "QR self-ordering, kitchen and waiter operations, restaurant admin, and super-admin controls in one monorepo MVP.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocaleServer();

  return (
    <html lang={locale}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <div className="locale-shell">
            <div className="site-chrome">
              <div className="app-shell">
                <div className="site-header">
                  <Link className="brand-lockup" href="/">
                    <span className="brand-mark">S</span>
                    <span className="brand-wordmark">
                      <strong>ServiceOS</strong>
                      <span>Dining operations suite</span>
                    </span>
                  </Link>
                  <div className="header-actions">
                    <SiteHeaderActions />
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
            </div>
            {children}
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
