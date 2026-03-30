import { StaffManager } from "@/components/staff-manager";
import { getUsersServer } from "@/lib/server-api";

export default async function AdminUsersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const users = await getUsersServer(slug);

  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">Users</span>
        <h1 className="display">Admins, waiters, and kitchen users stay inside one restaurant boundary.</h1>
        <p className="lede">
          Restaurant admins manage their own people directly, while the platform keeps super-admin recovery actions out
          of the day-to-day tenant shell.
        </p>
      </section>
      <StaffManager initialStaff={users} slug={slug} />
    </>
  );
}
