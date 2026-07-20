import Link from "next/link";
import { CartButton } from "@/components/CartButton";
import { AccountButton } from "@/components/AccountButton";

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="text-xl">🍴</span>
          <span>Free City</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/#koncepty" className="rounded-md px-3 py-2 text-[var(--muted)] hover:text-white">Koncepty</Link>
          <AccountButton />
          <CartButton />
          <Link href="/admin" className="rounded-md border border-[var(--border)] px-3 py-2 hover:border-neutral-600 ml-1">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
