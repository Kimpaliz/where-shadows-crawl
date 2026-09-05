/* [Aufgabe: Bedienung] Der Dienst, der die App installierbar macht.

   ── Warum „Netz zuerst" und nicht andersherum ──────────────────────

   Ein Dienstarbeiter, der zuerst in seinen Vorrat sieht, zeigt nach
   jeder Veröffentlichung tagelang den alten Stand — der Vorrat gewinnt,
   und niemand merkt, dass eine neue Fassung längst live ist. Genau das
   ist bei Slay'Em All passiert, bevor es umgedreht wurde.

   Deshalb: **erst das Netz fragen, den Vorrat nur als Rückhalt.** Wer
   online ist, sieht immer den neuesten Stand; wer im Zug sitzt, spielt
   trotzdem. Der Preis ist eine Netzanfrage je Datei — bei einem Spiel,
   das ohnehin nur beim Start lädt, ist das nichts.

   ── Was hier absichtlich fehlt ─────────────────────────────────────

   Kein Vorab-Füllen einer Dateiliste beim Einbau. Eine solche Liste
   müsste jede neue Datei kennen und wäre nach dem ersten vergessenen
   Eintrag still unvollständig — man merkt es erst offline. Stattdessen
   wandert in den Vorrat, was wirklich geladen wurde: Nach dem ersten
   Spiel ist alles drin, was ein Spiel braucht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `index.html` (meldet ihn an), `manifest.webmanifest` (macht daraus
   zusammen die installierbare App). */

const VORRAT = "wsc-v1";

/* Sofort übernehmen statt auf das Schließen aller Tabs zu warten. Ein
   Spiel, das nach einer Veröffentlichung noch eine Sitzung lang die
   alte Fassung fährt, ist genau die Falle von oben, nur eine Ebene
   höher. */
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    /* Alte Vorräte wegräumen — sonst wächst der Speicher des Telefons
       mit jeder Fassung. */
    for (const name of await caches.keys()) {
      if (name !== VORRAT) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const anfrage = e.request;

  /* Nur eigene Dateien und nur Lesezugriffe. Der Vermittler fürs
     Netz-Koop läuft über WebSocket und geht hier ohnehin nicht durch;
     alles Fremde bleibt unangetastet. */
  if (anfrage.method !== "GET") return;
  if (new URL(anfrage.url).origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      const antwort = await fetch(anfrage);
      /* Nur Gelungenes einlagern. Eine 404 im Vorrat wäre ein Fehler,
         der sich selbst konserviert. */
      if (antwort && antwort.ok) {
        const vorrat = await caches.open(VORRAT);
        vorrat.put(anfrage, antwort.clone());
      }
      return antwort;
    } catch (fehler) {
      const gelagert = await caches.match(anfrage);
      if (gelagert) return gelagert;
      /* Beim Neuladen ohne Netz und ohne Vorrat wenigstens die
         Startseite zeigen, statt den Fehlerbildschirm des Browsers. */
      if (anfrage.mode === "navigate") {
        const start = await caches.match("./");
        if (start) return start;
      }
      throw fehler;
    }
  })());
});
