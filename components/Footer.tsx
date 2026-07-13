export function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} · <a href="/" className="underline-offset-2 hover:underline">Powered by Food Factory</a></p>
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          <span>Provozovatel: [DOPLNIT s.r.o.], IČO [DOPLNIT]</span>
          <a href="/obchodni-podminky" className="underline-offset-2 hover:underline">Obchodní podmínky</a>
          <a href="/ochrana-osobnich-udaju" className="underline-offset-2 hover:underline">Osobní údaje</a>
        </p>
      </div>
    </footer>
  );
}
