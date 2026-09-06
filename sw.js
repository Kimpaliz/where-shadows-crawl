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
/* ⚠️ **Genau ein Eintrag wird vorab eingelagert: der Einstieg.**

   Das ist kein Rückfall in die oben verworfene Dateiliste — die müsste
   jede neue Datei kennen und wäre nach dem ersten vergessenen Eintrag
   still unvollständig. Diese Liste hat **zwei Adressen für dieselbe
   Seite** und ändert sich nie.

   Der Fall, der ohne sie eintritt (gemessen am 06.09.2026): Jannik
   besucht die Seite einmal, installiert die App und tippt später im
   Funkloch auf das Symbol. Der erste Besuch lief noch **ohne** den
   Dienst — er übernimmt erst nach `activate` mit `clients.claim()` —,
   also lag nichts im Vorrat. Das Netz scheitert, der Vorrat ist leer,
   der Rückfall unten findet nichts, und in der installierten App ohne
   Adressleiste steht Jannik vor einer Fehlerseite ohne Ausweg.

   **Beide Adressen**, weil die Startseite unter zwei Schlüsseln
   erreichbar ist: `…/where-shadows-crawl/` (so startet die App über
   `start_url`) und `…/where-shadows-crawl/index.html` (so sieht ein
   verschickter Link oft aus). Wer nur den einen kennt, steht mit dem
   anderen wieder vor der Fehlerseite. */
const EINSTIEGE = ["./", "./index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    try {
      const vorrat = await caches.open(VORRAT);
      await vorrat.addAll(EINSTIEGE);
    } catch {
      /* Kein Netz beim Einbau, oder eine der beiden Adressen antwortet
         nicht. Kein Grund, den Einbau scheitern zu lassen — dann gibt
         es eben keinen Vorrat, und das Spiel läuft online weiter. */
    }
  })());
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

/* Wie lange auf das Netz gewartet wird, bevor der Vorrat gewinnt.

   ⚠️ **Der Fall, den ein nacktes `await fetch()` nicht abfängt:** In
   der U-Bahn oder im Keller steht ein Balken, die Verbindung ist da und
   trotzdem tot. `fetch` scheitert dann nicht — es **hängt**, oft zehn
   bis dreißig Sekunden je Datei, und der Vorrat wurde erst im `catch`
   gefragt, also erst nach dem endgültigen Scheitern. Beim Start
   gemessen: **47 Anfragen** gleicher Herkunft (40 Module plus Seite,
   Manifest, Dienst und vier Symbole). Ergebnis war ein schwarzer
   Bildschirm auf unbestimmte Zeit, obwohl alles eingelagert war.

   Dasselbe Muster wie in `runtime/vollbild.js`: ein Wettlauf, kein
   Warten. Zwei Sekunden sind mehr, als eine gesunde Verbindung je für
   eine kleine Datei braucht, und weniger, als jemand vor einem
   schwarzen Bildschirm aushält. Das Netz läuft danach weiter — was es
   noch bringt, landet im Vorrat und gilt beim nächsten Mal. */
const NETZ_FRIST = 2000;

async function mitFrist(anfrage) {
  const gelagert = await caches.match(anfrage);
  /* Ohne Vorratsfassung gibt es nichts zu gewinnen: Dann ist Warten
     besser als Aufgeben, und die Frist wird nicht angelegt. */
  if (!gelagert) return fetch(anfrage);

  const abbruch = new Promise((r) => setTimeout(() => r(null), NETZ_FRIST));
  const ausDemNetz = fetch(anfrage).then(
    (a) => {
      /* Kommt es doch noch, wandert es trotzdem in den Vorrat — sonst
         bliebe nach jedem langsamen Start der alte Stand liegen. */
      if (a && a.ok) caches.open(VORRAT).then((v) => v.put(anfrage, a.clone()));
      return a;
    },
    () => null
  );
  return (await Promise.race([ausDemNetz, abbruch])) ?? gelagert;
}

self.addEventListener("fetch", (e) => {
  const anfrage = e.request;

  /* Nur eigene Dateien und nur Lesezugriffe. Der Vermittler fürs
     Netz-Koop läuft über WebSocket und geht hier ohnehin nicht durch;
     alles Fremde bleibt unangetastet. */
  if (anfrage.method !== "GET") return;
  if (new URL(anfrage.url).origin !== self.location.origin) return;

  e.respondWith((async () => {
    /* Der Rückhalt, an drei Stellen gebraucht. */
    const ausDemVorrat = async () => {
      const gelagert = await caches.match(anfrage);
      if (gelagert) return gelagert;
      /* Beim Neuladen ohne Netz und ohne passenden Eintrag wenigstens
         die Startseite zeigen, statt den Fehlerbildschirm des Browsers
         — unter **beiden** Adressen, unter denen sie liegen kann. */
      if (anfrage.mode === "navigate") {
        for (const einstieg of EINSTIEGE) {
          const start = await caches.match(einstieg);
          if (start) return start;
        }
      }
      return null;
    };

    try {
      const antwort = await mitFrist(anfrage);

      /* ⚠️ **Eine schlechte Antwort ist kein Netzfehler** — und fiel
         deshalb früher nicht in den `catch`. Antwortet der Server mit
         404, 500 oder 503 (GitHub Pages mitten in einer Auslieferung,
         ein Mobilfunk-Zwischenspeicher, eine umbenannte Datei), dann
         wurde sie zwar richtig nicht eingelagert, aber trotzdem
         durchgereicht: Der Browser bricht den Import ab, schwarzer
         Bildschirm — obwohl die gute Fassung derselben Datei im Vorrat
         lag. Jetzt gilt der Vorrat auch hier. */
      if (!antwort || !antwort.ok) {
        const gelagert = await ausDemVorrat();
        if (gelagert) return gelagert;
        return antwort;
      }

      /* Nur Gelungenes einlagern. Eine 404 im Vorrat wäre ein Fehler,
         der sich selbst konserviert. */
      const vorrat = await caches.open(VORRAT);
      vorrat.put(anfrage, antwort.clone());
      return antwort;
    } catch (fehler) {
      const gelagert = await ausDemVorrat();
      if (gelagert) return gelagert;
      throw fehler;
    }
  })());
});
