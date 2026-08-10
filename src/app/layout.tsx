import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://studywith.live"),
  title: { default: "StudyWith | AI study skills for Leaving Cert", template: "%s | StudyWith" },
  description: "Understand difficult topics, practise active recall and build a realistic Leaving Cert study plan with AI that supports your thinking.",
  openGraph: { title: "StudyWith", description: "AI study skills that strengthen your thinking.", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#101820" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
