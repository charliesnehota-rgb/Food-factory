export default async function OrderConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-2xl font-semibold mb-2">Objednávka přijata!</h1>
      <p className="text-[var(--muted)] mb-1">Číslo objednávky: <span className="text-white font-medium">{id}</span></p>
      <p className="text-sm text-[var(--muted)] mb-8">Dáme vědět, jakmile bude připravena.</p>
      <a href="/" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-200 transition">
        Zpět na hlavní stránku
      </a>
    </div>
  );
}
