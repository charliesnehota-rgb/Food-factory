// NÁVRH zásad zpracování osobních údajů (GDPR) — před ostrým provozem
// nechat zkontrolovat právníkem a doplnit údaje označené [DOPLNIT].
export const metadata = { title: "Ochrana osobních údajů — Food Factory" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold mb-2">Ochrana osobních údajů</h1>
      <p className="text-sm text-[var(--muted)] mb-8">Informace dle čl. 13 GDPR · Návrh k právní revizi</p>

      <div className="space-y-6 text-sm leading-relaxed text-[var(--muted)] [&_h2]:text-white [&_h2]:font-medium [&_h2]:text-base [&_h2]:mb-1">
        <section>
          <h2>1. Správce</h2>
          <p>Správcem osobních údajů je [DOPLNIT: název společnosti], IČO [DOPLNIT], sídlo [DOPLNIT]. Kontakt: [DOPLNIT e-mail].</p>
        </section>
        <section>
          <h2>2. Jaké údaje a proč zpracováváme</h2>
          <p>Pro vyřízení objednávky: jméno, e-mail, telefon, doručovací adresu a obsah objednávky (právní základ: plnění smlouvy; uchování po dobu nutnou dle daňových předpisů). Pro uživatelský účet: e-mail, jméno a historii objednávek (plnění smlouvy; do zrušení účtu). Pro zasílání novinek: e-mail a jméno (souhlas; do odvolání — odhlásit se lze jedním klikem v každém e-mailu, v profilu, nebo na [DOPLNIT e-mail]).</p>
        </section>
        <section>
          <h2>3. Zpracovatelé</h2>
          <p>Údaje zpracováváme pomocí těchto poskytovatelů: Supabase (databáze a přihlašování), Vercel (hosting webu), Stripe (platby kartou — číslo karty vidí pouze Stripe), Resend (odesílání e-mailů). Údaje nepředáváme třetím stranám k jejich vlastnímu marketingu.</p>
        </section>
        <section>
          <h2>4. Cookies a lokální úložiště</h2>
          <p>Web používá pouze technicky nezbytné úložiště (obsah košíku, přihlášení). Nepoužíváme reklamní ani sledovací cookies třetích stran.</p>
        </section>
        <section>
          <h2>5. Vaše práva</h2>
          <p>Máte právo na přístup k údajům, opravu, výmaz, omezení zpracování, přenositelnost a námitku, a právo podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz). Žádosti vyřizujeme na [DOPLNIT e-mail].</p>
        </section>
      </div>
    </div>
  );
}
