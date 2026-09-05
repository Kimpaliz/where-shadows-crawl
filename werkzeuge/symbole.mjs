/* [Aufgabe: Bedienung] Die Symbole der installierbaren App.

   ── Warum als Zeichencode und nicht als Bilddatei ──────────────────

   Dieselbe Regel wie im ganzen Projekt: Ein Sprite ist Text mit einem
   Zeichen je Bildpunkt (`runtime/sprite-daten.js`). Ein Symbol, das als
   fertige `.png` im Repository liegt, kann niemand mehr lesen, ändern
   oder gegen die Palette prüfen — und es wäre die einzige Bilddatei in
   einem Spiel, das ausdrücklich ohne auskommt.

   Erzeugt wird mit `node werkzeuge/symbole.mjs --wirklich`. Ohne den
   Schalter wird nur berichtet, was entstehen würde: Das Schreiben von
   Dateien, die im Repository landen, soll man absichtlich tun.

   ── Das Motiv ──────────────────────────────────────────────────────

   Das Spiel heißt „Where Shadows Crawl", und sein einziges Licht ist
   eine Fackel in der Mitte der Arena. Genau das ist das Symbol: ein
   Lichtkreis, die Flamme darin, und der Rand, an dem es aufhört.

   Kein Jäger, keine Waffe — bei 48 Bildpunkten auf einem Startbildschirm
   ist eine Figur ein Fleck. Ein Lichtkreis im Dunkeln bleibt bei jeder
   Größe erkennbar, und er ist das, was man beim Spielen die ganze Zeit
   ansieht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/png.mjs` (schreibt), `runtime/palette.js` (die Farben —
   dieselben wie im Spiel, nicht neu erfunden), `manifest.webmanifest`
   (nennt die entstehenden Dateien). */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { schreibePng } from "./png.mjs";
import { FARBEN } from "../runtime/palette.js";

const WURZEL = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const WIRKLICH = process.argv.includes("--wirklich");

/* Das Muster, 16 x 16. Ungerade Kantenlängen braucht es hier nicht —
   ein Symbol wird nie gedreht (`pixel-werkstatt`, Regel 2 gilt für
   Drehbares).

   `.` außen · `d`/`m`/`h` der Lichtkreis von außen nach innen ·
   `f`/`F` die Flamme · `k` der Fackelstiel. */
const MUSTER = [
  "................",
  "......dddd......",
  "....ddmmmmdd....",
  "...dmmmmmmmmd...",
  "..dmmmhhhhmmmd..",
  ".dmmmhhffhhmmmd.",
  ".dmmhhfFFfhhmmd.",
  "dmmmhhfFFfhhmmmd",
  "dmmmhhfFFfhhmmmd",
  ".dmmhhffkffhhmd.",
  ".dmmmhhkkhhmmmd.",
  "..dmmmhkkhmmmd..",
  "...dmmmkkmmmd...",
  "....ddmkkmdd....",
  "......dddd......",
  "................"
];

/* Die Farben kommen aus der Spielpalette. Eine eigene Farbtabelle wäre
   eine zweite Wahrheit über das Aussehen dieses Spiels. */
const ZEICHEN = {
  ".": null,
  d: FARBEN.aussen1,
  m: FARBEN.boden0,
  h: FARBEN.boden2,
  f: FARBEN.flamme,
  F: FARBEN.flammeHell,
  k: FARBEN.kontur
};

function zuRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/* Ein Symbol in `groesse` x `groesse`. Der Faktor ist immer eine ganze
   Zahl — sonst verwischen die Kanten, und ein Pixelspiel mit
   weichgezeichnetem Symbol sieht aus wie ein Versehen.

   `rand` lässt Platz für die runde Maske, die Android über
   `maskable`-Symbole legt: Sie schneidet bis zu einem Fünftel ab. Ohne
   den Rand fräse sie den Lichtkreis an. */
function baueSymbol(groesse, rand = 0, grund = null) {
  const punkte = new Uint8Array(groesse * groesse * 4);

  if (grund) {
    const [r, g, b] = zuRgb(grund);
    for (let i = 0; i < groesse * groesse; i++) {
      punkte[i * 4] = r; punkte[i * 4 + 1] = g; punkte[i * 4 + 2] = b; punkte[i * 4 + 3] = 255;
    }
  }

  const innen = groesse - rand * 2;
  const faktor = Math.max(1, Math.floor(innen / MUSTER.length));
  const gemalt = faktor * MUSTER.length;
  const versatz = Math.floor((groesse - gemalt) / 2);

  for (let y = 0; y < MUSTER.length; y++) {
    for (let x = 0; x < MUSTER[y].length; x++) {
      const farbe = ZEICHEN[MUSTER[y][x]];
      if (!farbe) continue;
      const [r, g, b] = zuRgb(farbe);
      for (let dy = 0; dy < faktor; dy++) {
        for (let dx = 0; dx < faktor; dx++) {
          const px = versatz + x * faktor + dx;
          const py = versatz + y * faktor + dy;
          if (px < 0 || py < 0 || px >= groesse || py >= groesse) continue;
          const i = (py * groesse + px) * 4;
          punkte[i] = r; punkte[i + 1] = g; punkte[i + 2] = b; punkte[i + 3] = 255;
        }
      }
    }
  }
  return { punkte, faktor };
}

/* Zwei Sorten: durchsichtig für gewöhnliche Symbole, und mit Grund für
   `maskable` — Android legt dort eine eigene Form darüber, und was
   durchsichtig ist, wird weiß. */
const AUFTRAEGE = [
  { datei: "symbole/symbol-192.png", groesse: 192, rand: 0, grund: null },
  { datei: "symbole/symbol-512.png", groesse: 512, rand: 0, grund: null },
  { datei: "symbole/symbol-maske-192.png", groesse: 192, rand: 24, grund: FARBEN.kontur },
  { datei: "symbole/symbol-maske-512.png", groesse: 512, rand: 64, grund: FARBEN.kontur }
];

if (WIRKLICH) mkdirSync(join(WURZEL, "symbole"), { recursive: true });

for (const a of AUFTRAEGE) {
  const { punkte, faktor } = baueSymbol(a.groesse, a.rand, a.grund);
  const png = schreibePng(a.groesse, a.groesse, punkte);
  if (WIRKLICH) writeFileSync(join(WURZEL, a.datei), png);
  console.log(`${a.datei.padEnd(30)} ${a.groesse}x${a.groesse}, Faktor ${faktor}, ${png.length} Bytes`
    + (WIRKLICH ? "" : "  (Trockenlauf)"));
}

if (!WIRKLICH) console.log("\nMit --wirklich werden die Dateien geschrieben.");
