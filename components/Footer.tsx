export function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Food Factory — multi-concept kitchen, Praha</p>
        <p>Pět konceptů · jedna kuchyně</p>
      </div>
    </footer>
  );
}
