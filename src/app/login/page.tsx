import { redirect } from "next/navigation";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LoginAliasPage({ searchParams }: Props) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
  }

  const qs = params.toString();
  redirect(qs ? `/auth/login?${qs}` : "/auth/login");
}

