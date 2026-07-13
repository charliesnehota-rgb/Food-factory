// Worker: zpracuje channel_sync_queue s respektem k rate limitům platforem.
// Spouští ho Vercel Cron (/api/cron/channel-sync každých 5 min) nebo
// admin tlačítkem "Synchronizovat teď".
import { supabaseAdmin } from "@/lib/db/supabase";
import { MIN_INTERVAL_MS, buildMenuForConcept, type Channel, type ChannelAdapter, type ChannelConnection, type SyncEventType } from "./index";
import { woltAdapter } from "./wolt";
import { foodoraAdapter } from "./foodora";

const ADAPTERS: Record<Channel, ChannelAdapter> = {
  wolt: woltAdapter,
  foodora: foodoraAdapter,
};

const MAX_ATTEMPTS = 3;

export interface WorkerReport {
  processed: number;
  done: number;
  failed: number;
  skipped: number;
  deferred: number; // čeká na rate-limit okno
}

export async function processChannelQueue(): Promise<WorkerReport> {
  const report: WorkerReport = { processed: 0, done: 0, failed: 0, skipped: 0, deferred: 0 };
  if (!supabaseAdmin) return report;

  const { data: pending } = await supabaseAdmin
    .from("channel_sync_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at")
    .limit(30);

  if (!pending || pending.length === 0) return report;

  // Napojení načteme jednou
  const { data: conns } = await supabaseAdmin.from("channel_connections").select("*");
  const connMap = new Map<string, ChannelConnection>(
    (conns ?? []).map(c => [`${c.channel}:${c.concept_slug}`, { ...c, price_multiplier: Number(c.price_multiplier) }])
  );

  for (const job of pending) {
    report.processed++;
    const channel = job.channel as Channel;
    const eventType = job.event_type as SyncEventType;
    const adapter = ADAPTERS[channel];
    const conn = connMap.get(`${channel}:${job.concept_slug}`);

    // Vypnuté napojení / chybějící klíče → skipped (admin uvidí důvod)
    if (!conn || !conn.enabled) {
      await mark(job.id, "skipped", "Kanál není zapnutý");
      report.skipped++;
      continue;
    }
    if (!adapter.isConfigured()) {
      await mark(job.id, "skipped", "Čeká na API klíče (env)");
      report.skipped++;
      continue;
    }

    // Rate-limit okno: poslední ÚSPĚŠNÝ job stejného typu na stejném venue
    const windowMs = MIN_INTERVAL_MS[channel][eventType];
    const { data: lastDone } = await supabaseAdmin
      .from("channel_sync_queue")
      .select("processed_at")
      .eq("dedupe_key", job.dedupe_key)
      .eq("status", "done")
      .order("processed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastDone?.processed_at && Date.now() - new Date(lastDone.processed_at).getTime() < windowMs) {
      report.deferred++; // zůstává pending, vezme ho další běh
      continue;
    }

    // Vykonání dle typu události
    let result: { ok: boolean; error?: string };
    try {
      result = await execute(job, conn, adapter);
    } catch (e) {
      result = { ok: false, error: e instanceof Error ? e.message : "Neznámá chyba" };
    }

    if (result.ok) {
      await mark(job.id, "done");
      report.done++;
    } else {
      const attempts = (job.attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await supabaseAdmin.from("channel_sync_queue")
          .update({ status: "failed", attempts, error: result.error, processed_at: new Date().toISOString() })
          .eq("id", job.id);
        report.failed++;
      } else {
        await supabaseAdmin.from("channel_sync_queue")
          .update({ attempts, error: result.error })
          .eq("id", job.id); // zůstává pending → retry příští běh
        report.deferred++;
      }
    }
  }

  return report;
}

async function execute(
  job: { concept_slug: string; event_type: string; payload: Record<string, unknown> },
  conn: ChannelConnection,
  adapter: ChannelAdapter
) {
  const eventType = job.event_type as SyncEventType;

  if (eventType === "menu_full") {
    const menu = await buildMenuForConcept(job.concept_slug, conn.price_multiplier);
    if (menu.items.length === 0) return { ok: false, error: "Koncept nemá žádné produkty" };
    return adapter.pushFullMenu(conn, menu);
  }

  if (eventType === "item_update" || eventType === "inventory") {
    const ids = Array.isArray(job.payload?.productIds) ? (job.payload.productIds as string[]) : [];
    if (ids.length === 0) return { ok: true }; // nic k poslání
    const menu = await buildMenuForConcept(job.concept_slug, conn.price_multiplier);
    const items = menu.items.filter(i => ids.includes(i.id));
    if (items.length === 0) return { ok: true }; // produkty mezitím smazané
    return eventType === "item_update"
      ? adapter.updateItems(conn, items)
      : adapter.updateInventory(conn, items.map(i => ({ id: i.id, available: i.available })));
  }

  if (eventType === "hours") {
    if (!supabaseAdmin) return { ok: false, error: "DB nedostupná" };
    const { data } = await supabaseAdmin
      .from("concept_settings").select("hours").eq("concept_slug", job.concept_slug).single();
    return adapter.setHours(conn, (data?.hours ?? {}) as Record<string, { open: string; close: string; closed?: boolean }>);
  }

  if (eventType === "venue_status") {
    return adapter.setVenueStatus(conn, job.payload?.online !== false);
  }

  return { ok: false, error: `Neznámý typ události: ${eventType}` };
}

async function mark(id: string, status: "done" | "skipped", error?: string) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("channel_sync_queue")
    .update({ status, error: error ?? null, processed_at: new Date().toISOString() })
    .eq("id", id);
}
