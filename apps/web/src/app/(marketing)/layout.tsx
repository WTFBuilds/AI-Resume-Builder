import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingNav } from "@/components/marketing/nav";
import { getSessionUser } from "@/lib/auth-guard";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingNav signedIn={Boolean(user)} />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
