import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

// ═══ VLASTNÍ DOMÉNY ZNAČEK ═══════════════════════════════════
// Každá restaurace poběží na vlastní doméně jako samostatný podnik;
// backend (admin, sklad, marketing, objednávky) zůstává sdílený.
// Mapování řídí env: BRAND_DOMAINS="prostesnidane.cz=sunny-side,…"
// Bez env se nic neděje (bezpečné nasadit před koupí domén).
const KNOWN_SLUGS = ["sunny-side", "dumply", "smash"];
const BRAND_SCOPED_AUTH = ["/ucet/prihlaseni", "/ucet/registrace"];

function brandForHost(hostHeader: string | null): string | null {
  const raw = process.env.BRAND_DOMAINS ?? "";
  if (!raw) return null;
  const host = (hostHeader ?? "").toLowerCase().replace(/^www\./, "").split(":")[0];
  for (const pair of raw.split(",")) {
    const [domain, slug] = pair.split("=").map(x => x?.trim().toLowerCase());
    if (domain === host && slug && KNOWN_SLUGS.includes(slug)) return slug;
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ── Routing pro vlastní domény (bez auth dotazu — rychlá cesta) ──
  const slug = brandForHost(request.headers.get("host"));
  if (slug) {
    // Odkazy se slugem → čistá cesta bez slugu (redirect);
    // PWA manifest a ikony brandu ale musí projít beze změny
    if (path === `/${slug}/manifest.webmanifest` || path.startsWith(`/${slug}/icon`)) {
      return NextResponse.next({ request });
    }
    if (path === `/${slug}` || path.startsWith(`/${slug}/`)) {
      const url = request.nextUrl.clone();
      url.pathname = path.slice(slug.length + 1) || "/";
      return NextResponse.redirect(url, 308);
    }
    // Kořen domény → brand homepage (rewrite)
    if (path === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/${slug}`;
      return NextResponse.rewrite(url);
    }
    // Brandová auth na čisté cestě
    if (BRAND_SCOPED_AUTH.includes(path)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${slug}${path}`;
      return NextResponse.rewrite(url);
    }
    // Cizí brand na této doméně → domů
    if (KNOWN_SLUGS.some(s => s !== slug && (path === `/${s}` || path.startsWith(`/${s}/`)))) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url, 307);
    }
    // checkout, /ucet/profil, /objednavka, právní stránky, /api → sdílené, projde dál
  }

  // Auth ochrana se týká jen /admin a /ucet — jinde Supabase nevoláme
  if (!path.startsWith("/admin") && !path.startsWith("/ucet")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options as any));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // --- Admin ochrana ---
  const isAdminAuth = path === "/admin/login" || path === "/admin/reset" || path === "/admin/nove-heslo";
  const isAccessDenied = path === "/admin/pristup-zamitnut";

  if (path.startsWith("/admin") && !isAdminAuth && !user) {
    const r = request.nextUrl.clone(); r.pathname = "/admin/login"; r.searchParams.set("next", path);
    return NextResponse.redirect(r);
  }
  if (isAdminAuth && user) {
    const r = request.nextUrl.clone(); r.pathname = "/admin"; r.searchParams.delete("next");
    return NextResponse.redirect(r);
  }

  // Kontrola role: do adminu jen admin/staff (ne zákazníci)
  if (path.startsWith("/admin") && !isAdminAuth && !isAccessDenied && user) {
    const { data: profile } = await supabase
      .from("user_profiles").select("role").eq("id", user.id).single();
    const role = profile?.role;
    if (role !== "admin" && role !== "staff") {
      const r = request.nextUrl.clone(); r.pathname = "/admin/pristup-zamitnut"; r.search = "";
      return NextResponse.redirect(r);
    }
  }

  // --- Zákaznický účet ochrana ---
  const isCustomerAuth = path === "/ucet/prihlaseni" || path === "/ucet/registrace";
  if (path.startsWith("/ucet") && !isCustomerAuth && !user) {
    const r = request.nextUrl.clone(); r.pathname = "/ucet/prihlaseni"; r.searchParams.set("next", path);
    return NextResponse.redirect(r);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico|sw\\.js|brands/|icons/|robots\\.txt|sitemap\\.xml|manifest).*)"],
};
