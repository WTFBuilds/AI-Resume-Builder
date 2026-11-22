import { requireUser } from "@/lib/auth-guard";
import { listTags } from "@airesume/db";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const tags = await listTags(user.id).catch(() => []);

  return (
    <div className="flex min-h-dvh">
      <DashboardSidebar
        user={{ name: user.name, email: user.email }}
        tags={tags.map((t) => ({ id: t.id, name: t.name }))}
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
