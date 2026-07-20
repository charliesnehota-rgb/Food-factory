// Potvrzovací stránka po odhlášení z odběru novinek (cíl redirect z unsubscribe API).
import Link from "next/link";

export const metadata = { title: "Odhlášení z odběru — Free City" };

export default async function UnsubscribePage(
  { searchParams }: { searchParams: Promise<{ ok?: string }> }
) {
  const { ok } = await searchParams;
  const success = ok !== "0";

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="text-5xl mb-5">{success ? "👋" : "🤔"}</div>
      <h1 className="text-2xl font-semibold mb-3">
        {success ? "Odhlášeno" : "Odkaz není platný"}
      </h1>
      <p className="text-[var(--muted)] mb-8">
        {success
          ? "Už vám nebudeme posílat novinky ani akce. Kdykoli se můžete přihlásit znovu ve svém profilu."
          : "Odhlašovací odkaz je neplatný nebo už byl použit. Odběr můžete spravovat ve svém profilu."}
      </p>
      <Link href="/" className="inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 transition">
        Zpět na Free City
      </Link>
    </div>
  );
}
