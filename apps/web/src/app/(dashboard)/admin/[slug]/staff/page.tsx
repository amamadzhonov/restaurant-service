import { redirect } from "next/navigation";

export default async function LegacyAdminStaffPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/admin/${slug}/users`);
}
