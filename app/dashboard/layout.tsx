import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";
import { getPublicCompanyIdentity } from "@/lib/public-company";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [user, company] = await Promise.all([
    getCurrentUser(),
    getPublicCompanyIdentity(),
  ]);
  if (!user) redirect("/login");

  return <DashboardShell user={user} company={company}>{children}</DashboardShell>;
}
