import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

export async function proxy(request: NextRequest) {
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
  const path = request.nextUrl.pathname;

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
  matcher: ["/admin/:path*", "/ucet/:path*"],
};
