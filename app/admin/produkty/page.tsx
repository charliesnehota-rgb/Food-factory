"use client";

import { useState } from "react";
import { allMenuItems } from "@/lib/data/concepts";
import { getConcept } from "@/lib/data/concepts";
import { formatCzk } from "@/lib/types";

export default function ProductsPage() {
  const items = allMenuItems();
  // lokální stav dostupnosti (v fázi 2 = zápis do Firestore)
  const [availability, setAvailability] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.id, i.available]))
  );

  function toggle(id: string) {
    setAvailability((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Produkty</h1>
        <span className="text-sm text-[var(--muted)]">{items.length} položek · {`napříč koncepty`}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">Položka</th>
              <th className="p-3 font-medium">Koncept</th>
              <th className="p-3 font-medium">Kategorie</th>
              <th className="p-3 font-medium">Cena</th>
              <th className="p-3 font-medium">Dostupnost</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const concept = getConcept(item.conceptSlug);
              const on = availability[item.id];
              return (
                <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-[var(--muted)]">{item.description}</div>
                  </td>
                  <td className="p-3">
                    <span style={{ color: concept?.accent }}>{concept?.name}</span>
                  </td>
                  <td className="p-3 text-[var(--muted)]">{item.category}</td>
                  <td className="p-3">{formatCzk(item.priceCzk)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggle(item.id)}
                      className={
                        "rounded-full px-3 py-1 text-xs font-medium " +
                        (on
                          ? "bg-green-500/15 text-green-400"
                          : "bg-neutral-800 text-[var(--muted)]")
                      }
                    >
                      {on ? "V nabídce" : "Vypnuto"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-[var(--muted)]">
        Přidávání a editace produktů (formuláře + zápis do Firestore) přijde
        ve fázi 2. Teď jde o ukázku správy dostupnosti.
      </p>
    </div>
  );
}
