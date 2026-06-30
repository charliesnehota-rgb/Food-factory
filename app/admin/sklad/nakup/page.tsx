"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { displayUnitsFor, type BaseUnit } from "@/lib/stock/units";
import type { StockItem } from "@/lib/stock/types";

const inputCls = "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

interface ListHead { id: string; list_number: string; status: "open" | "purchased" | "cancelled"; note: string | null; created_at: string; }
interface ListItem {
  id: string; stock_item_id: string | null; name: string; base_unit: string | null;
  order_qty: number | null; purchased: boolean; purchased_qty: number | null;
  stock_item?: { name: string; base_unit: BaseUnit; current_qty: number; min_qty: number } | null;
}
interface ListDetail extends ListHead { items: ListItem[]; }

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Rozpracovaný", cls: "bg-amber-500/15 text-amber-400" },
  purchased: { label: "Nakoupeno", cls: "bg-green-500/15 text-green-400" },
  cancelled: { label: "Zrušeno", cls: "bg-neutral-500/15 text-neutral-400" },
};

function bigUnit(base: string | null) {
  const b = (base ?? "ks") as BaseUnit;
  return displayUnitsFor(b)[0];
}

export default function NakupPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ListHead[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [detail, setDetail] = useState<ListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addId, setAddId] = useState("");
  const [customName, setCustomName] = useState("");

  const loadLists = useCallback(async () => {
    const [l, i] = await Promise.all([
      fetch("/api/sklad/shopping-lists").then((r) => r.json()),
      fetch("/api/sklad/items").then((r) => r.json()),
    ]);
    if (Array.isArray(l)) setLists(l);
    if (Array.isArray(i)) setItems(i);
    setLoading(false);
  }, []);
  useEffect(() => { loadLists(); }, [loadLists]);

  const openList = useCallback(async (id: string) => {
    const d = await fetch(`/api/sklad/shopping-lists/${id}`).then((r) => r.json());
    setDetail(d.error ? null : d);
  }, []);

  async function newList() {
    setBusy(true);
    const r = await fetch("/api/sklad/shopping-lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setBusy(false);
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "Chyba"); return; }
    const l = await r.json();
    await loadLists();
    openList(l.id);
  }

  async function patchItem(itemId: string, patch: Record<string, unknown>) {
    await fetch(`/api/sklad/shopping-list-items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    if (detail) openList(detail.id);
  }
  async function removeItem(itemId: string) {
    await fetch(`/api/sklad/shopping-list-items/${itemId}`, { method: "DELETE" });
    if (detail) openList(detail.id);
  }
  async function addExisting() {
    if (!addId || !detail) return;
    const it = items.find((x) => x.id === addId);
    await fetch(`/api/sklad/shopping-lists/${detail.id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock_item_id: addId, order_qty: it ? Number(it.min_qty) || 0 : 0 }),
    });
    setAddId(""); openList(detail.id);
  }
  async function addCustom() {
    if (!customName.trim() || !detail) return;
    await fetch(`/api/sklad/shopping-lists/${detail.id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: customName.trim(), base_unit: "ks" }),
    });
    setCustomName(""); openList(detail.id);
  }
  async function cancelList() {
    if (!detail || !confirm("Zrušit tento nákupní seznam?")) return;
    await fetch(`/api/sklad/shopping-lists/${detail.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }),
    });
    await loadLists(); openList(detail.id);
  }
  async function makeReceipt() {
    if (!detail) return;
    if (!confirm("Založit koncept příjemky z položek se skladovou kartou? Ceny doplníš v příjmu (nebo přes účtenku).")) return;
    setBusy(true);
    const r = await fetch(`/api/sklad/shopping-lists/${detail.id}/receipt`, { method: "POST" });
    setBusy(false);
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "Chyba"); return; }
    router.push("/admin/sklad/prijem");
  }

  const closed = detail && detail.status !== "open";
  const availableToAdd = items.filter((i) => !(detail?.items ?? []).some((l) => l.stock_item_id === i.id));

  function toDisplay(it: ListItem) {
    const du = bigUnit(it.base_unit);
    return { unit: du.unit, factor: du.factor };
  }

  function printList() {
    if (!detail) return;
    const rows = detail.items.filter((i) => Number(i.order_qty) > 0).map((i) => {
      const d = toDisplay(i);
      const q = Math.round((Number(i.order_qty) / d.factor) * 1000) / 1000;
      return `<tr><td style="padding:6px 10px;border-bottom:1px solid #ddd">${esc(i.name)}</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${q} ${d.unit}</td><td style="padding:6px 10px;border-bottom:1px solid #ddd;width:120px"></td></tr>`;
    }).join("");
    const html = `<html><head><meta charset="utf-8"><title>${detail.list_number}</title></head><body style="font-family:system-ui,sans-serif;padding:24px"><h1 style="font-size:20px">Nákupní seznam ${detail.list_number}</h1><p style="color:#666">${new Date().toLocaleDateString("cs-CZ")}</p><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Surovina</th><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Množství</th><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #333">Koupeno</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Nákup</h1>
          <p className="text-sm text-[var(--muted)]">Sdílený nákupní seznam. Nový se naplní z položek pod minimem; personál ho doplní, odškrtá a po nákupu z něj založí příjemku.</p>
        </div>
        <button onClick={newList} disabled={busy} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">+ Nový seznam</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <tr><th className="p-3 font-medium">Seznam</th><th className="p-3 font-medium">Vytvořen</th><th className="p-3 font-medium">Stav</th><th className="p-3 font-medium"></th></tr>
          </thead>
          <tbody>
            {lists.map((l) => (
              <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-3"><button onClick={() => openList(l.id)} className="font-medium hover:underline">{l.list_number}</button></td>
                <td className="p-3 text-[var(--muted)]">{new Date(l.created_at).toLocaleDateString("cs-CZ")}</td>
                <td className="p-3"><span className={"rounded-full px-3 py-1 text-xs font-medium " + STATUS[l.status].cls}>{STATUS[l.status].label}</span></td>
                <td className="p-3"><button onClick={() => openList(l.id)} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-white hover:border-neutral-600">Otevřít</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {lists.length === 0 && !loading && <div className="p-8 text-center text-[var(--muted)]">Zatím žádné seznamy. Založ nový — naplní se z toho, co dochází.</div>}
      </div>

      {detail && (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-medium">{detail.list_number} <span className={"ml-2 rounded-full px-2 py-0.5 text-xs " + STATUS[detail.status].cls}>{STATUS[detail.status].label}</span></h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={printList} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:text-white">Tisk</button>
              {!closed && <button onClick={makeReceipt} disabled={busy} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">Založit příjemku z koupeného</button>}
              {!closed && <button onClick={cancelList} className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] hover:text-red-400">Zrušit seznam</button>}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                <tr>
                  <th className="p-2 font-medium w-8"></th>
                  <th className="p-2 font-medium">Surovina</th>
                  <th className="p-2 font-medium">Stav / min</th>
                  <th className="p-2 font-medium">Koupit</th>
                  {!closed && <th className="p-2 font-medium w-8"></th>}
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it) => {
                  const d = toDisplay(it);
                  const orderDisplay = it.order_qty != null ? Math.round((Number(it.order_qty) / d.factor) * 1000) / 1000 : "";
                  const si = it.stock_item;
                  return (
                    <tr key={it.id} className={"border-b border-[var(--border)] last:border-0 " + (it.purchased ? "opacity-60" : "")}>
                      <td className="p-2">
                        <input type="checkbox" checked={it.purchased} disabled={!!closed}
                          onChange={(e) => patchItem(it.id, { purchased: e.target.checked })} />
                      </td>
                      <td className="p-2">
                        <span className={"font-medium " + (it.purchased ? "line-through" : "")}>{it.name}</span>
                        {!it.stock_item_id && <span className="ml-2 text-[10px] text-[var(--muted)]">(mimo kartu)</span>}
                      </td>
                      <td className="p-2 text-[var(--muted)]">{si ? `${Number(si.current_qty)} / ${Number(si.min_qty)} ${si.base_unit}` : "—"}</td>
                      <td className="p-2">
                        {closed ? (
                          `${orderDisplay} ${d.unit}`
                        ) : (
                          <span className="flex items-center gap-1">
                            <input type="number" defaultValue={orderDisplay}
                              onBlur={(e) => patchItem(it.id, { order_qty: e.target.value === "" ? null : Number(e.target.value) * d.factor })}
                              className={inputCls + " w-24"} />
                            <span className="text-[var(--muted)]">{d.unit}</span>
                          </span>
                        )}
                      </td>
                      {!closed && <td className="p-2"><button onClick={() => removeItem(it.id)} className="rounded-lg border border-[var(--border)] px-2 text-xs text-[var(--muted)] hover:text-red-400" title="Odebrat">✕</button></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {detail.items.length === 0 && <div className="p-4 text-center text-[var(--muted)]">Seznam je prázdný.</div>}
          </div>

          {!closed && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <span className="flex items-end gap-1">
                <select value={addId} onChange={(e) => setAddId(e.target.value)} className={inputCls + " min-w-[200px]"}>
                  <option value="">— přidat surovinu z karet —</option>
                  {availableToAdd.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <button onClick={addExisting} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:text-white">Přidat</button>
              </span>
              <span className="flex items-end gap-1">
                <input placeholder="ruční položka" value={customName} onChange={(e) => setCustomName(e.target.value)} className={inputCls} />
                <button onClick={addCustom} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:text-white">Přidat</button>
              </span>
            </div>
          )}
          <p className="mt-3 text-xs text-[var(--muted)]">Příjemka se založí jen z položek se skladovou kartou; ceny doplníš v příjmu, nebo nahráním účtenky přes AI.</p>
        </div>
      )}
    </div>
  );
}

function esc(s: string) { return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] ?? c)); }
