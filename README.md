# Free City

Multi-concept gastro platforma (web + admin) postavená na Next.js 16, React 19,
TypeScript a Tailwind v4. Databáze Firebase/Firestore, platby Stripe, rozvoz
Wolt Drive / Foodora.

📋 Kompletní plán, architektura a další kroky: viz **[PROJECT.md](./PROJECT.md)**.

## Spuštění
```bash
npm install
npm run dev   # http://localhost:3000
```

- `/` — veřejný web s koncepty a menu
- `/restaurace/[slug]` — detail konceptu a menu
- `/admin` — admin panel (přehled, objednávky, produkty)
