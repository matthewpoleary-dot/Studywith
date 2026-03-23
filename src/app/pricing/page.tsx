import { redirect } from "next/navigation";

// Permanent redirect to the pricing section on the landing page.
// This fixes the 404 on /pricing and enables SEO indexing of the URL.
export default function PricingPage() {
  redirect("/#pricing");
}
