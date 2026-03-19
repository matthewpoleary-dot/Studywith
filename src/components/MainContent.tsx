"use client";
import { usePathname } from "next/navigation";

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSessionPage =
    !!pathname?.startsWith("/app/session/") || pathname === "/app/new";

  return (
    <main
      className={`flex-1 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden ${
        isSessionPage ? "app-main-session" : "app-main"
      }`}
    >
      {children}
    </main>
  );
}
