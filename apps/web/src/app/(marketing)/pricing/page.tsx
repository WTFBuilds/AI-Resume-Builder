import type { Metadata } from "next";
import { Badge, Card } from "@airesume/ui";

export const metadata: Metadata = {
  title: "Pricing",
  description: "AIResume pricing — free during beta. Paid plans arrive with AI assistance.",
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    status: "Available now",
    statusVariant: "accent" as const,
    points: ["Up to 3 resumes", "All 4 launch templates", "PDF exports", "Version snapshots (50 per resume)"],
  },
  {
    name: "Pro",
    price: "$8/mo",
    status: "Coming with AI features",
    statusVariant: "warning" as const,
    points: ["Unlimited resumes", "Premium templates", "Extended history (300 per resume)", "AI writing assistant & ATS analysis"],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">Pricing</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-[var(--ink-2)]">
        Simple and honest. Free during beta — paid tiers arrive together with AI assistance.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {TIERS.map((tier) => (
          <Card key={tier.name} className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--ink)]">{tier.name}</h2>
              <Badge variant={tier.statusVariant}>{tier.status}</Badge>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-[var(--ink)]">
              {tier.price}
              {tier.name === "Pro" ? (
                <span className="text-sm font-medium text-[var(--muted)]"> / month</span>
              ) : null}
            </p>
            <ul className="mt-6 space-y-2.5">
              {tier.points.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm text-[var(--ink-2)]">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  {p}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
