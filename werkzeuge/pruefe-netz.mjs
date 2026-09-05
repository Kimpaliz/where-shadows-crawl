/* [Aufgabe: Prüfwesen] Was Netz-Koop tragen muss — ohne einen Browser zu brauchen.

       node werkzeuge/pruefe-netz.mjs
       node werkzeuge/pruefe-netz.mjs --nur-pfade   (nur Teil 1, für den Pages-Ablauf)

   ── Teil 1 · Relative Pfade ─────────────────────────────────────────

   Unter `https://kimpaliz.github.io/where-shadows-crawl/` liegt die
   Seite in einem **Unterordner**. Ein `/runtime/start.js` zeigte dort
   auf `kimpaliz.github.io/runtime/start.js` und damit ins Leere —
   daheim unter `127.0.0.1:8144/` fiele das nie auf, weil dort die
   Wurzel das Projekt ist. Das ist der häufigste Grund, warum ein Spiel
   daheim läuft und im Netz weiß bleibt, und er lässt sich nur hier
   fangen: Im Browser sieht man eine leere Seite und keinen Grund.

   Weitere Teile (Gleichlauf, Lockstep, Nachrichten) kommen mit den
   Netz-Bausteinen dazu.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `helfer.mjs` und `.github/workflows/pages.yml`, das Teil 1 vor jeder
   Veröffentlichung mit `--nur-pfade` aufruft. */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { macheMelder, liesDatei, WURZEL } from "./helfer.mjs";

const { melde, ende } = macheMelder({ still: true });
const NUR_PFADE = process.argv.includes("--nur-pfade");

/* ── Teil 1 · Relative Pfade ─────────────────────────────────────── */

/* Ein absoluter Pfad in einem `import`, einem `src=` oder einem
   `href=` auf eine eigene Datei. Fremde Adressen (`https://…`,
   `//host/…`) sind ausgenommen: Die sind absichtlich absolut. */
const ABSOLUT = /\b(?:from|import)\s+["']\/[^"']*["']|\b(?:src|href)\s*=\s*["']\/(?!\/)[^"']*["']/g;

const AUSNAHMEN = new Set(["node_modules", ".git", "vendor", "dist", "build"]);
const ENDUNGEN = [".js", ".mjs", ".html"];

const quellen = [];
const sammle = (rel) => {
  for (const name of readdirSync(join(WURZEL, rel))) {
    const kind = rel === "." ? name : rel + "/" + name;
    if (AUSNAHMEN.has(name)) continue;
    if (statSync(join(WURZEL, kind)).isDirectory()) sammle(kind);
    else if (ENDUNGEN.some((e) => name.endsWith(e))) quellen.push(kind);
  }
};
sammle(".");

let absolute = 0;
for (const d of quellen) {
  for (const t of liesDatei(d).matchAll(ABSOLUT)) {
    absolute++;
    console.log(`    absoluter Pfad: ${d}  ·  ${t[0].trim()}`);
  }
}
console.log(`  ${quellen.length} Quelldateien auf absolute Pfade geprüft`);
melde(absolute === 0, "jeder eigene Pfad ist relativ (`./`, `../`)",
  `${absolute} absolute(r) Pfad(e) — die Seite bliebe unter einem Unterordner weiß`);

/* `.nojekyll` fehlt geräuschlos: Jekyll schluckt dann jeden Ordner mit
   führendem Unterstrich, ohne dass irgendwo ein Fehler erschiene. */
melde(existsSync(join(WURZEL, ".nojekyll")),
  "`.nojekyll` liegt im Wurzelverzeichnis",
  "ohne sie schiebt Pages die Auslieferung durch Jekyll");

if (NUR_PFADE) {
  console.log("\n  (--nur-pfade: nur Teil 1)");
}

ende();
