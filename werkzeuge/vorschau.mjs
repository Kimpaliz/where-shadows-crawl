/* [Aufgabe: Prüfwesen] Ein winziger Server, damit das Spiel im Browser läuft.

       node werkzeuge/vorschau.mjs        → http://127.0.0.1:8144/

   ── Warum das nötig ist ────────────────────────────────────────────

   Das Spiel besteht aus ES-Modulen. Öffnet man `index.html` direkt von
   der Festplatte, verbietet der Browser jeden `import` — nicht wegen
   eines Fehlers im Spiel, sondern weil `file://` keine Herkunft hat,
   gegen die er prüfen könnte. Ein Server auf dem eigenen Rechner löst
   das mit zwölf Zeilen.

   Er hört **nur** auf 127.0.0.1: Aus dem Netz ist er nicht erreichbar,
   und das soll auch so bleiben (docs/PROJEKTGRENZE gibt es hier nicht,
   weil das Projekt keinen Nachbarn hat).

   Ohne Abhängigkeiten, wie alles hier.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   Nichts — er reicht nur Dateien durch. */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const HAFEN = 8144;

const TYPEN = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};

createServer(async (anfrage, antwort) => {
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
}).listen(HAFEN, "127.0.0.1", () => {
  console.log(`Where Shadows Crawl laeuft auf http://127.0.0.1:${HAFEN}/`);
});
