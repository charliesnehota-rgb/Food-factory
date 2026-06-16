# Food Factory — platforma pro multi-concept gastro

Tenhle dokument je „mapa“ celého projektu: co stavíme, jak to drží pohromadě,
jak fungují databáze, admin a napojení na platby a rozvoz, a co je potřeba
udělat dál. Aktualizuje se průběžně.

---

## 1. Vize

Jedna kuchyně (cloud / ghost kitchen), pět konceptů, jeden web a jeden admin:

1. **Sunny Side** — all-day breakfast
2. **Dumply** — čínské knedlíčky & dim sum
3. **Smash** — smashburgery & wrapy
4. **Bowlevard** — grain & poke bowls
5. **Řízkárna** — řízek nově (katsu sando, smash řízek wrap) i klasika

Každý koncept cílí na jinou část dne / jiného zákazníka, aby se navzájem
nekanibalizovaly. Web umožní objednávku, admin umožní vše spravovat.

---

## 2. Architektura (vysoká úroveň)

```
            ┌──────────────────────────────────────────┐
            │              Next.js (web + API)           │
            │  • veřejný web (koncepty, menu, košík)      │
            │  • admin panel (/admin)                     │
            │  • API routes / server actions             │
            └───────┬───────────┬───────────┬────────────┘
                    │           │           │
              ┌─────▼────┐ ┌────▼─────┐ ┌───▼────────────┐
              │ Firestore│ │  Stripe  │ │  Rozvoz         │
              │ (DB+auth)│ │ (platby) │ │ Wolt Drive /    │
              │          │ │          │ │ Foodora (DH)    │
              └──────────┘ └──────────┘ └────────────────┘
```

Vše běží z jedné Next.js aplikace — žádný oddělený backend. To je pro tuhle
velikost projektu nejjednodušší na správu i nasazení.

---

## 3. Databáze — Firebase (Firestore)

Volba: **Firebase / Firestore**. Proč to dává smysl právě tady:

- **Real-time** — admin „order board“ vidí nové objednávky okamžitě, bez
  refreshe. To je u rozvozu klíčové.
- **Rychlý start** — auth (přihlášení do adminu), DB i hosting souborů
  (obrázky jídel) pod jednou střechou, štědrý free tier.
- **Snadné škálování** na začátku bez správy serveru.

> Poznámka k volbě: pro silně relační reporting (sklad, marže, účetní
> exporty) bývá Postgres (Supabase) o něco pohodlnější. Firestore to zvládne
> taky, jen se data modelují „dokumentově“. Pro fázi 1–2 je Firestore lepší
> volba kvůli rychlosti a real-time. Kdyby reporting v budoucnu přerostl, dá
> se napojit datový sklad zvlášť — kód je psaný tak, aby se DA vrstva dala
> vyměnit (viz `lib/`).

### Kolekce (návrh)

```
concepts/{conceptSlug}
  name, tagline, daypart, accent, emoji, active

products/{productId}
  conceptSlug, name, description, priceCzk, category,
  tags[], imageUrl, available

orders/{orderId}
  conceptSlug, channel(web|wolt|foodora|pos),
  fulfilment(delivery|pickup|dine_in),
  status(new|accepted|preparing|ready|out_for_delivery|delivered|cancelled),
  items[ {productId, name, qty, unitPriceCzk, note} ],
  totalCzk,
  customer{ name, phone, address },
  createdAt,
  delivery{ provider, trackingId, eta },
  payment{ provider, status, intentId }

users/{uid}
  role(admin|staff), conceptAccess[]
```

Typy téhle struktury jsou už v kódu: `lib/types.ts`.

---

## 4. Admin panel (`/admin`)

Co admin umí (skeleton je už v repu, data zatím ukázková):

- **Přehled** — denní tržby, počty objednávek, stav konceptů
- **Objednávky** — živý board (nové → příprava → hotovo → rozvoz/doručeno),
  posouvání stavu jedním klikem
- **Produkty** — seznam položek napříč koncepty, zapnutí/vypnutí dostupnosti,
  ceny (úpravy a přidávání přijdou s napojením na Firestore)

> ⚠️ **Bezpečnost:** v této první verzi je `/admin` BEZ přihlášení (demo).
> Než půjde web reálně do provozu, MUSÍ se přidat Firebase Auth + ochrana
> tras (middleware), aby se do adminu nedostal kdokoliv. Je to první úkol
> fáze 2.

---

## 5. Platby — Stripe

- Checkout přes Stripe Payment Intent / Checkout Session ve server action.
- Webhook potvrdí platbu → objednávka se v DB označí `paid` → teprve pak se
  pustí do kuchyně / vytvoří rozvoz.
- Klíče (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) jen v `.env`, nikdy v
  kódu. Připravený stub: `lib/stripe.ts`.

---

## 6. Rozvoz — Wolt Drive & Foodora (Delivery Hero)

Důležité zjištění z reálných dokumentací (ověřeno):

- **Wolt** i **Foodora/Damejídlo (Delivery Hero)** mají API, ale jsou to
  **B2B partnerské integrace**. Přístupové údaje (OAuth/klíče) se NEGENERUJÍ
  samoobsluhou — dostaneš je až po onboardingu jako merchant přes account
  managera, často přes POS/middleware partnera.
- Pro **vlastní web** je nejrelevantnější **Wolt Drive** = Wolt jako kurýr
  „na poslední míli“ pro objednávky z našeho webu (ne marketplace listing).
- Komunikace je přes **webhooky** (stav objednávky) + REST API; Wolt podepisuje
  webhooky HMAC-SHA256, takže je potřeba ověřovat podpisy.

Proto je v kódu **abstrakce poskytovatele rozvozu** (`lib/delivery/`):
jednotné rozhraní + zaslepené implementace Wolt/Foodora. Až budou klíče,
doplní se jen ony – zbytek aplikace se nemění.

---

## 7. AI vrstva (fáze 3)

- **AI digitální manažer marketingu** — generování postů, popisů jídel,
  kampaní; běží jako server action volající model (Claude/OpenAI).
- **AI automatizace** — např. shrnutí dne, návrhy cen, hlídání zásob.
- Postaví se až nad funkčním jádrem (web + objednávky + DB), aby měla data.

---

## 8. Roadmapa

- **Fáze 1 — Základ (TADY)**: struktura, veřejný web s koncepty a menu,
  admin skeleton, datový model, zaslepené integrace, nasaditelná v1.
- **Fáze 2 — Backend naživo**: Firebase projekt + Auth (ochrana adminu),
  produkty/objednávky z Firestore, košík + Stripe checkout.
- **Fáze 3 — Rozvoz + AI**: Wolt Drive / Foodora onboarding a napojení,
  AI marketing manager, automatizace.

---

## 9. Co musíš udělat ty (lidské kroky, které za tebe nejde udělat)

1. **Firebase projekt** — vytvořit na console.firebase.google.com, zapnout
   Firestore + Authentication, zkopírovat config do `.env` (viz `.env.example`).
2. **Stripe účet** — získat API klíče (test mode stačí na vývoj).
3. **Rozvoz** — domluvit merchant onboarding s Woltem (Wolt Drive) / Foodorou.
4. **Nasazení (deploy)** — propojit repo s Vercelem (1 klik), nastavit env
   proměnné. Veřejný web pojede hned; backendové funkce po doplnění klíčů.

---

## 10. Lokální spuštění

```bash
npm install      # doinstaluje i nové závislosti (firebase, stripe)
npm run dev      # http://localhost:3000
```

`/` = web, `/admin` = admin panel, `/restaurace/<slug>` = koncept + menu.
