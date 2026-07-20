# Supabase setup — 3 kroky

## 1. Vytvoř projekt
- Jdi na https://supabase.com → New project
- Zvol název "free-city", region "Central EU (Frankfurt)"
- Zapiš si heslo k databázi

## 2. Spusť schema
- V Supabase Dashboard → SQL Editor → New query
- Zkopíruj a spusť celý obsah souboru `schema.sql`
- Tabulky + seed 5 konceptů se vytvoří automaticky

## 3. Doplň .env
- Settings → API → zkopíruj:
  - Project URL → NEXT_PUBLIC_SUPABASE_URL
  - anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY
  - service_role key → SUPABASE_SERVICE_ROLE_KEY (jen na serveru!)
- Ulož do `.env` (nikdy necommitovat)

## 4. Generuj TypeScript typy (volitelné, ale doporučené)
```bash
npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > lib/db/types.generated.ts
```

## Hotovo
Po doplnění klíčů web automaticky přepne z mock dat na živou databázi.
