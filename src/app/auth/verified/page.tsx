import type { Metadata } from "next";
import { VerificationSuccess } from "@/components/VerificationSuccess";

export const metadata: Metadata = { title: "Account verified" };

type VerifiedPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function VerifiedPage({ searchParams }: VerifiedPageProps) {
  const requested = (await searchParams).next;
  const value = Array.isArray(requested) ? requested[0] : requested;
  const next = value?.startsWith("/") && !value.startsWith("//") ? value : "/app";
  const loginHref = `/auth/login?verified=1&redirectTo=${encodeURIComponent(next)}`;

  return <VerificationSuccess loginHref={loginHref} />;
}
