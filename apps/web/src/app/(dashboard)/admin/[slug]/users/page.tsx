import { StaffManager } from "@/components/staff-manager";
import { getTranslatorServer } from "@/lib/i18n-server";
import { getUsersServer } from "@/lib/server-api";

export default async function AdminUsersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = await getTranslatorServer();
  const { slug } = await params;
  const users = await getUsersServer(slug);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">{t("admin.users_eyebrow")}</span>
        <h1 className="display">{t("admin.users_title")}</h1>
        <p className="lede">{t("admin.users_description")}</p>
      </section>
      <StaffManager initialStaff={users} slug={slug} />
    </>
  );
}
