"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/components/locale-provider";

export function SiteHeaderActions() {
  const pathname = usePathname();
  const { t } = useI18n();

  if (pathname !== "/") {
    return null;
  }

  return (
    <div className="header-cta-group">
      <Link className="button" href="/login">
        {t("common.sign_in")}
      </Link>
    </div>
  );
}
