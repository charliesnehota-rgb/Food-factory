"use client";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/auth/client";

export default function AccessDeniedPage() {
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="text-5xl mb-6">🔒</div>
      <h1 className="text-2xl font-semibold mb-3">Přístup zamítnut</h1>
      <p className="text-[var(--muted)] mb-8">
        Tento účet nemá oprávnění pro vstup do administrace. Admin sekce je jen pro pracovníky.
      </p>
      <div className="flex flex-col gap-3">
        <a href="/" style={{ background: "#ffffff", color: "#111111" }} className="rounded-xl px-6 py-3 text-sm font-semibold hover:bg-neutral-200 transition">
          Zpět na hlavní stránku
        </a>
        <button onClick={signOut} className="text-sm text-[var(--muted)] hover:text-white underline">
          Přihlásit se jiným účtem
        </button>
      </div>
    </div>
  );
}
