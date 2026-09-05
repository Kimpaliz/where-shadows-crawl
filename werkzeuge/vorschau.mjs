/* [Aufgabe: Prüfwesen] Ein winziger Server, damit das Spiel im Browser läuft.

       node werkzeuge/vorschau.mjs        → http://127.0.0.1:8144/
       node werkzeuge/vorschau.mjs --wlan → auch vom Handy im selben WLAN

   ── Warum das nötig ist ────────────────────────────────────────────

   Das Spiel besteht aus ES-Modulen. Öffnet man `index.html` direkt von
   der Festplatte, verbietet der Browser jeden `import` — nicht wegen
   eines Fehlers im Spiel, sondern weil `file://` keine Herkunft hat,
   gegen die er prüfen könnte. Ein Server auf dem eigenen Rechner löst
   das mit zwölf Zeilen.

   ── Wer ihn erreichen darf ─────────────────────────────────────────

   Standardmäßig hört er **nur auf 127.0.0.1** — aus dem Netz ist er
   dann nicht erreichbar, und das bleibt die Vorgabe.

   Mit `--wlan` hört er zusätzlich auf **einer** Netzadresse, damit ein
   Handy im selben WLAN mitspielen kann. Bewusst **nicht** auf
   `0.0.0.0`: Auf diesem Rechner liegt neben dem WLAN noch ein zweiter
   Adapter (`192.168.127.x`), und ein Server, der auf allen Adressen
   lauscht, lauscht auch dort. Genau dieser Fehler ist im
   BATC-Hallenserver schon einmal vor dem Einsatz gefangen worden.

   Gewählt wird die erste private Adresse eines Adapters, dessen Name
   nach WLAN klingt; sonst die erste private überhaupt. Wer eine andere
   will, nennt sie: `--wlan=192.168.0.98`.

   ⚠️ Das ist **kein Veröffentlichen.** Erreichbar ist er nur im
   eigenen Netz — nicht aus dem Internet, und die Windows-Firewall
   fragt beim ersten Mal nach.

   Ohne Abhängigkeiten, wie alles hier.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   Nichts — er reicht nur Dateien durch. */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const WURZEL = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/* 8144 ist der Hausnummer-Hafen. `--hafen=8154` gibt es, weil mehrere
   Sitzungen gleichzeitig an eigenen Zweigen arbeiten: Der zweite Server
   auf demselben Hafen stirbt mit `EADDRINUSE`, und wer das nicht liest,
   prueft eine halbe Stunde lang die **fremde** Fassung im Browser. */
const hafenWunsch = process.argv.find((a) => a.startsWith("--hafen="));
const HAFEN = hafenWunsch ? Number(hafenWunsch.split("=")[1]) : 8144;
if (!Number.isInteger(HAFEN) || HAFEN < 1 || HAFEN > 65535) {
  console.error(`Kein gueltiger Hafen: ${hafenWunsch}`);
  process.exit(1);
}

const TYPEN = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  /* Ohne diese drei liefert die Vorschau `application/octet-stream`,
     und dann lehnt der Browser das Manifest ab und zeigt die Symbole
     nicht — die App wäre örtlich nicht installierbar, obwohl sie es
     live wäre. Dann prüfte man etwas anderes, als ausgeliefert wird.
     Genau dieser Fehler hat in Slay'Em All einen halben Abend
     gekostet. */
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8"
};

const server = createServer(async (anfrage, antwort) => {
  try {
    let pfad = decodeURIComponent(new URL(anfrage.url, "http://x").pathname);
    if (pfad === "/") pfad = "/index.html";
    /* Kein Ausbruch aus dem Projektordner. */
    const ziel = join(WURZEL, normalize(pfad).replace(/^(\.\.[/\\])+/, ""));
    if (!ziel.startsWith(WURZEL)) { antwort.writeHead(403).end("verboten"); return; }
    const inhalt = await readFile(ziel);
    antwort.writeHead(200, {
      "Content-Type": TYPEN[extname(ziel)] ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    antwort.end(inhalt);
  } catch {
    antwort.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    antwort.end("nicht gefunden");
  }
});

/* Alle privaten IPv4-Adressen dieses Rechners, in einer flachen Liste
   mit dem Namen ihres Adapters. */
function privateAdressen() {
  const raus = [];
  for (const [name, liste] of Object.entries(networkInterfaces())) {
    for (const a of liste ?? []) {
      if (a.family !== "IPv4" || a.internal) continue;
      if (/^192\.168\./.test(a.address) || /^10\./.test(a.address)
        || /^172\.(1[6-9]|2\d|3[01])\./.test(a.address)) {
        raus.push({ name, adresse: a.address });
      }
    }
  }
  return raus;
}

/* Welche davon `--wlan` meint: die eines Adapters, dessen Name nach
   Funk klingt — sonst die erste überhaupt. Auf diesem Rechner ist das
   der Unterschied zwischen dem WLAN und dem Adapter der Bahnanlage. */
function wlanAdresse(wunsch) {
  if (wunsch) return wunsch;
  const alle = privateAdressen();
  const funk = alle.find((a) => /wlan|wi-?fi|wireless|drahtlos/i.test(a.name));
  return (funk ?? alle[0])?.adresse ?? null;
}

const wlanWunsch = process.argv.find((a) => a.startsWith("--wlan"));
const adresse = wlanWunsch ? wlanAdresse(wlanWunsch.split("=")[1]) : null;

if (wlanWunsch && !adresse) {
  console.error("Keine private Netzadresse gefunden. Mit --wlan=<adresse> selbst nennen.");
  process.exit(1);
}

/* ⚠️ Die Meldung nennt **die** Adresse, auf der wirklich gehört wird.
   Sie zusätzlich als 127.0.0.1 anzukündigen wäre gelogen: Wer an eine
   einzelne Adresse bindet, ist über localhost nicht mehr erreichbar. */
server.listen(HAFEN, adresse ?? "127.0.0.1", () => {
  if (adresse) {
    console.log(`Where Shadows Crawl laeuft auf http://${adresse}:${HAFEN}/`);
    console.log("Dieselbe Adresse gilt fuer das Handy im selben WLAN.");
    console.log("Beim ersten Mal fragt die Windows-Firewall — 'Privates Netzwerk' erlauben.");
  } else {
    console.log(`Where Shadows Crawl laeuft auf http://127.0.0.1:${HAFEN}/`);
  }
});
