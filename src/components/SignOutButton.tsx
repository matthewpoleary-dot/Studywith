"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface SignOutButtonProps {
  className?: string;
  label?: string;
}

export default function SignOutButton({
  className,
  label = "Sign out",
}: SignOutButtonProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <button
      onClick={() => void handleSignOut()}
      className={
        className ??
        "rounded-full border border-[#E7E5E4] px-3 py-1.5 text-xs font-medium text-[#57534E] transition hover:border-[#D97706] hover:text-[#1A1A1A]"
      }
    >
      {label}
    </button>
  );
}
