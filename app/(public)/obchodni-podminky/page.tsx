// NÁVRH obchodních podmínek — před ostrým provozem nechat zkontrolovat
// právníkem a doplnit údaje označené [DOPLNIT].
export const metadata = { title: "Obchodní podmínky — Food Factory" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold mb-2">Obchodní podmínky</h1>
      <p className="text-sm text-[var(--muted)] mb-8">Platné od [DOPLNIT datum] · Návrh k právní revizi</p>

      <div className="space-y-6 text-sm leading-relaxed text-[var(--muted)] [&_h2]:text-white [&_h2]:font-medium [&_h2]:text-base [&_h2]:mb-1">
        <section>
          <h2>1. Provozovatel</h2>
          <p>Provozovatelem služby Food Factory a prodávajícím je [DOPLNIT: název společnosti], IČO [DOPLNIT], DIČ [DOPLNIT], se sídlem [DOPLNIT adresa], zapsaná v obchodním rejstříku vedeném [DOPLNIT soud, spisová značka] (dále „prodávající"). Kontakt: [DOPLNIT e-mail], [DOPLNIT telefon]. Provozovna: [DOPLNIT adresa kuchyně].</p>
        </section>
        <section>
          <h2>2. Objednávka a uzavření smlouvy</h2>
          <p>Kupní smlouva vzniká odesláním objednávky kupujícím a jejím potvrzením prodávajícím (e-mailem). Prezentace jídel na webu je informativního charakteru a prodávající není povinen smlouvu uzavřít. Objednávky lze podávat pouze v provozní době uvedené na webu.</p>
        </section>
        <section>
          <h2>3. Ceny a platba</h2>
          <p>Ceny jsou uvedeny včetně DPH. K objednávce s doručením se účtuje doručné dle aktuálního ceníku zobrazeného v košíku. Platbu lze provést online kartou (zpracovává Stripe) nebo hotově při převzetí.</p>
        </section>
        <section>
          <h2>4. Doručení a převzetí</h2>
          <p>Jídlo doručujeme v rámci [DOPLNIT oblast] nebo je připraveno k osobnímu vyzvednutí na provozovně. Orientační čas přípravy a doručení je uveden při objednávce; jde o odhad, nikoli závazný termín.</p>
        </section>
        <section>
          <h2>5. Odstoupení od smlouvy</h2>
          <p>Vzhledem k povaze zboží (jídlo podléhající rychlé zkáze a zboží upravené podle přání spotřebitele) nemůže kupující dle § 1837 písm. e) a g) občanského zákoníku od smlouvy odstoupit ve 14denní lhůtě. Tím nejsou dotčena práva z vadného plnění.</p>
        </section>
        <section>
          <h2>6. Reklamace</h2>
          <p>Zjevné vady (chybějící položka, záměna, poškození) je třeba oznámit bez zbytečného odkladu po převzetí na [DOPLNIT e-mail/telefon], ideálně s fotografií. Oprávněnou reklamaci řešíme novým doručením, slevou nebo vrácením ceny.</p>
        </section>
        <section>
          <h2>7. Alergeny</h2>
          <p>Informace o alergenech (čísla dle nařízení EU 1169/2011) jsou uvedeny u každého jídla v jeho detailu. Na vyžádání je poskytneme i telefonicky či e-mailem.</p>
        </section>
        <section>
          <h2>8. Mimosoudní řešení sporů</h2>
          <p>K mimosoudnímu řešení spotřebitelských sporů je příslušná Česká obchodní inspekce (www.coi.cz). Spotřebitel může využít i platformu ODR (ec.europa.eu/consumers/odr).</p>
        </section>
        <section>
          <h2>9. Osobní údaje</h2>
          <p>Zpracování osobních údajů se řídí dokumentem <a href="/ochrana-osobnich-udaju" className="underline underline-offset-2">Ochrana osobních údajů</a>.</p>
        </section>
      </div>
    </div>
  );
}
