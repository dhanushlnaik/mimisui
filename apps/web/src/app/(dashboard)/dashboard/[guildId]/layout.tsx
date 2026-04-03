import type { ReactNode } from "react";
import { DashboardChrome } from "@/components/dashboard-chrome";

export default async function GuildDashboardLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  return <DashboardChrome guildId={guildId}>{children}</DashboardChrome>;
}
