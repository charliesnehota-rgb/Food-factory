const CACHE = "ff-v1";
const OFFLINE = "/offline";

// Assety ke cachování při instalaci
const PRECACHE = ["/", "/offline"];

// Instalace — precache
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Aktivace — smaž staré cache
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategie
self.addEventListener("fetch", e => {
  const { request } = e;
  const url = new URL(request.url);

  // API — vždy network, při chybě vrátí error JSON
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Navigace — network first, fallback na cache nebo offline stránku
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ?? (await caches.match(OFFLINE)) ?? new Response("Offline", { status: 503 });
        })
    );
    return;
  }

  // Statické assety — cache first
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok && request.url.match(/\.(js|css|woff2?|png|svg|jpg|webp)$/)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      });
    })
  );
});

// Push notifikace
self.addEventListener("push", e => {
  if (!e.data) return;
  let data;
  try { data = e.data.json(); } catch { data = { title: "Food Factory", body: e.data.text() }; }

  e.waitUntil(
    self.registration.showNotification(data.title ?? "Food Factory", {
      body:    data.body ?? "",
      icon:    data.icon ?? "/favicon.ico",
      badge:   "/favicon.ico",
      tag:     data.tag ?? "ff-notif",
      data:    { url: data.url ?? "/" },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

// Klik na notifikaci → otevřít URL
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const target = e.notification.data?.url ?? "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url === target && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
