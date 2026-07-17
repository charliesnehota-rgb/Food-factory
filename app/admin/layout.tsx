"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode, type ReactElement } from "react";
import { useMe } from "@/lib/auth/use-me";
import { createSupabaseBrowser } from "@/lib/auth/client";
import { LangProvider, LangToggle, useT } from "@/lib/i18n";
import { ToastProvider } from "@/lib/toast";

// ── Automatické odhlášení po zavření posledního admin listu ──
// sessionStorage přežije reload (F5), ale ne zavření listu. Nově otevřený
// list se přes BroadcastChannel zeptá, jestli ještě žije jiný admin list:
// když ano, session převezme (druhý panel funguje dál); když ne, poslední
// list byl zavřen → lokální odhlášení a login. Týká se jen /admin —
// zákaznického webu ani appky se to nedotýká.
const TAB_FLAG = "ff-admin-tab";
const PRESENCE_CHANNEL = "ff-admin-presence";

// SVG ikony pro bottom nav
const Icons: Record<string, ReactElement> = {
  overview: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  orders:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>,
  warehouse:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  pnl:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  marketing:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  more:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  pricing:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  truck:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>,
  register: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>,
};

function AdminInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { me }   = useMe();
  const t        = useT();

  const isLogin =
    pathname === "/admin/login" ||
    pathname === "/admin/reset" ||
    pathname === "/admin/nove-heslo" ||
    pathname === "/admin/pristup-zamitnut";

  const isAccountant = me?.role === "accountant";
  const isCourier    = me?.role === "courier";
  const isAdmin      = me?.role === "admin";

  useEffect(() => {
    if (isLogin) return;
    if (isAccountant && !pathname.startsWith("/admin/sklad/exporty")) router.replace("/admin/sklad/exporty");
    if (isCourier && !pathname.startsWith("/admin/kurier")) router.replace("/admin/kurier");
  }, [isLogin, isAccountant, isCourier, pathname, router]);

  // Čerstvý list (bez TAB_FLAG v sessionStorage): zeptej se ostatních admin
  // listů, jestli žijí. Bez odpovědi do 350 ms = poslední list byl zavřen →
  // odhlásit (jen tento prohlížeč, ať to neshodí session kuchyně/kurýra
  // na jiném zařízení) a poslat na login.
  const [tabChecked, setTabChecked] = useState(false);
  useEffect(() => {
    if (isLogin) { sessionStorage.setItem(TAB_FLAG, "1"); setTabChecked(true); return; }
    if (sessionStorage.getItem(TAB_FLAG)) { setTabChecked(true); return; }
    let settled = false;
    const bc = new BroadcastChannel(PRESENCE_CHANNEL);
    bc.onmessage = (e) => {
      if (e.data === "alive" && !settled) {
        settled = true;
        sessionStorage.setItem(TAB_FLAG, "1"); // adopce: jiný list žije, jedeme dál
        setTabChecked(true);
        bc.close();
      }
    };
    bc.postMessage("ping");
    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      bc.close();
      sessionStorage.setItem(TAB_FLAG, "1"); // login list je od teď „živý"
      try {
        await createSupabaseBrowser().auth.signOut({ scope: "local" });
      } catch { /* i bez toho končíme na loginu */ }
      router.replace("/admin/login");
      setTabChecked(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [isLogin, router]);

  // Dokud tenhle list žije a má session, odpovídá na dotazy nových listů
  useEffect(() => {
    const bc = new BroadcastChannel(PRESENCE_CHANNEL);
    bc.onmessage = (e) => {
      if (e.data === "ping" && !isLogin && sessionStorage.getItem(TAB_FLAG)) bc.postMessage("alive");
    };
    return () => bc.close();
  }, [isLogin]);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (isLogin) return <>{children}</>;

  // Než doběhne kontrola listu, nevykresluj admin data (žádné bliknutí
  // obsahu v listu, který se vzápětí odhlásí).
  if (!tabChecked) return null;

  // KDS běží fullscreen (tablet v kuchyni) — bez sidebaru a bottom navu
  if (pathname.startsWith("/admin/kds")) return <>{children}</>;

  const allLinks = [
    { href: "/admin",            label: t("nav.overview"),   icon: "overview"  },
    { href: "/admin/objednavky", label: t("nav.orders"),     icon: "orders"    },
    { href: "/admin/kds",        label: t("nav.kds"),        icon: "orders"    },
    { href: "/admin/produkty",   label: t("nav.products"),   icon: "more"      },
    { href: "/admin/sklad",      label: t("nav.warehouse"),  icon: "warehouse" },
    { href: "/admin/pnl",        label: t("nav.pnl"),        icon: "pnl"       },
    { href: "/admin/marketing",  label: t("nav.marketing"),  icon: "marketing" },
    { href: "/admin/kanaly",     label: t("nav.channels"),   icon: "more"      },
    { href: "/admin/provoz",     label: t("nav.hours"),      icon: "overview"  },
    { href: "/admin/cenotvorba", label: t("nav.pricing"),    icon: "pricing"   },
    { href: "/admin/kurier",     label: t("nav.courier"),    icon: "truck"     },
    { href: "/admin/pokladna",   label: t("nav.pos"),        icon: "register"  },
  ];
  const accountantLinks = [
    { href: "/admin/sklad/exporty", label: t("nav.exports"), icon: "pnl" },
  ];
  const courierLinks = [
    { href: "/admin/kurier", label: t("nav.courier"), icon: "truck" },
  ];
  const staffAdminLink = { href: "/admin/personal", label: t("nav.staff"), icon: "more" };

  const links = isAccountant
    ? accountantLinks
    : isCourier
      ? courierLinks
      : isAdmin
        ? [...allLinks, staffAdminLink]
        : allLinks;

  // Bottom nav: první 4 + vždy sklad (kuchař potřebuje)
  const bottomLinks = isAccountant
    ? accountantLinks
    : isCourier
      ? courierLinks
      : [allLinks[0], allLinks[1], allLinks[3], allLinks[4], allLinks[5]]; // overview, orders, sklad, pnl, marketing

  function isActive(href: string) {
    return href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* Desktop + tablet layout */}
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:pb-8">
        <div className="flex flex-col gap-6 sm:flex-row">

          {/* Sidebar — skrytý na mobilu */}
          <aside className="hidden sm:block sm:w-48 shrink-0">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {isAccountant ? t("nav.accountant") : t("nav.admin")}
              </div>
              <LangToggle />
            </div>
            <nav className="flex flex-col gap-1">
              {(isAccountant || isCourier ? [{ label: null as string | null, hrefs: links.map(l => l.href) }] : [
                { label: t("nav.sec.ops"),   hrefs: ["/admin", "/admin/objednavky", "/admin/kds", "/admin/provoz"] },
                { label: t("nav.sec.sales"), hrefs: ["/admin/pokladna", "/admin/kurier", "/admin/cenotvorba", "/admin/marketing", "/admin/kanaly"] },
                { label: t("nav.sec.data"),  hrefs: ["/admin/sklad", "/admin/pnl", "/admin/produkty", "/admin/personal"] },
              ]).map((sec, si) => {
                const items = sec.hrefs
                  .map(h => links.find(l => l.href === h))
                  .filter((l): l is typeof links[number] => !!l);
                if (items.length === 0) return null;
                return (
                  <div key={si} className={si > 0 ? "mt-3" : undefined}>
                    {sec.label && (
                      <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">{sec.label}</div>
                    )}
                    <div className="flex flex-col gap-1">
                      {items.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          style={isActive(l.href) ? { background: "#ffffff", color: "#111111" } : undefined}
                          className={
                            "rounded-md px-3 py-2 text-sm font-medium " +
                            (isActive(l.href)
                              ? ""
                              : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-white")
                          }
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>

            {me?.email && (
              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <p className="text-xs text-[var(--muted)] mb-2 truncate" title={me.email}>
                  {me.email}
                </p>
                <Link
                  href="/admin/nove-heslo"
                  className="mb-2 block text-xs text-[var(--muted)] hover:text-white rounded-md border border-[var(--border)] px-3 py-1.5 w-full text-left hover:border-neutral-600 transition"
                >
                  {t("nav.changePassword")}
                </Link>
                <button
                  onClick={signOut}
                  className="text-xs text-[var(--muted)] hover:text-white rounded-md border border-[var(--border)] px-3 py-1.5 w-full text-left hover:border-neutral-600 transition"
                >
                  {t("nav.signOut")}
                </button>
              </div>
            )}
          </aside>

          {/* Obsah */}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>

      {/* Mobile top bar — viditelný jen na mobilu */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[var(--bg)] border-b border-[var(--border)]">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Food Factory
        </span>
        <LangToggle />
      </div>

      {/* Mobile top bar spacer */}
      <div className="sm:hidden h-12" />

      {/* Bottom nav — viditelný jen na mobilu */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg)] border-t border-[var(--border)] flex">
        {bottomLinks.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition " +
                (active ? "text-white" : "text-[var(--muted)]")
              }
            >
              <span className={active ? "text-white" : "text-[var(--muted)]"}>
                {Icons[l.icon]}
              </span>
              <span className="leading-none">{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <ToastProvider>
        <AdminInner>{children}</AdminInner>
      </ToastProvider>
    </LangProvider>
  );
}
