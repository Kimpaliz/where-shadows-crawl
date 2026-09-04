/* [Aufgabe: Prüfwesen] Die Sprites für die Pixel-Werkstatt.

       node werkzeuge/werkstatt-auftrag.mjs [--nach <ordner>] [nur-diese-art]

   ── Wozu ───────────────────────────────────────────────────────────

   Der Skill `pixel-werkstatt` misst Sprites auf sieben Eigenschaften, die
   das Auge nicht zuverlässig sieht — Silhouette, Wertetrennung,
   Merkmalstreue über alle Dreh- und Größenstufen, Kontrast gegen den
   **echten** Untergrund. Er liest dafür ein Auftragsformat mit
   Hex-Farben; dieses Spiel schreibt Farb**namen**. Diese Datei ist die
   Übersetzung.

   Ohne sie wäre die Messung eine einmalige Sache gewesen. Mit ihr ist sie
   ein Befehl — und das ist der Unterschied zwischen einer Zahl, die
   irgendwo steht, und einer Zahl, die stimmt.

   ── Was die Messung am 04.09.2026 gefunden hat ─────────────────────

   Sechs von neun Sprites hatten Mängel, keiner davon mit bloßem Auge
   auffindbar:

   - Vier hatten **gerade Kantenlängen** — bei sechzehn Drehungen wandert
     die Mitte dann um einen halben Bildpunkt.
   - Die **Kapuzenöffnung** des Jägers waren vier Einzelpunkte über Eck;
     schon bei 0° zählte sie als ein Fleck.
   - `knochenDunkel` und `eisenHell` lagen **2 von 255** auseinander:
     Knochen und Rüstung des Knochenritters waren gleich hell.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprite-daten.js` und `runtime/palette.js` (die Quelle), dem
   Skill `pixel-werkstatt` (der Empfänger). Ändert nichts. */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FARBEN, JAEGER_FARBEN } from "../runtime/palette.js";
import { JAEGER, GEGNER_BILDER } from "../runtime/sprite-daten.js";

const WURZEL = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/* Die echten Untergründe des Spiels, nicht erfundene: der Steinboden im
   Bannkreis in zwei Tönen und die Erde draußen. Gegen Weiß zu messen
   würde nichts über dieses Spiel aussagen. */
const UNTERGRUENDE = [FARBEN.boden0, FARBEN.boden2, FARBEN.aussen1];

/* Welches Zeichen bei jeder Drehung und Verkleinerung erkennbar bleiben
   muss — das eine Merkmal, an dem man die Art erkennt. */
export const MERKMAL = {
  jaeger: "D",          /* die Kapuzenöffnung, das einzige Richtungszeichen */
  schlurfer: "F",       /* der helle Kopf über den hängenden Schultern      */
  balg: "F",
  hetzer: "F",
  aaskraehe: "b",       /* der Schnabel — er macht sie zum Vogel            */
  speier: "G",          /* der offene Schlund                               */
  waechter: "r",        /* der Sehschlitz                                   */
  knochenritter: "d",   /* der Sehschlitz im Helm                           */
  hauptmann: "r"        /* das Auge im Helm                                 */
};

export function loeseFarben(sprite, jaegerFarbe) {
  const palette = {};
  for (const [zeichen, name] of Object.entries(sprite.zeichen)) {
    if (name.startsWith("@")) {
      const wert = jaegerFarbe?.[name.slice(1)];
      if (!wert) throw new Error(`Jägerfarbe "${name}" fehlt`);
      palette[zeichen] = wert;
    } else {
      const wert = FARBEN[name];
      if (!wert) throw new Error(`Farbe "${name}" steht nicht in der Palette`);
      palette[zeichen] = wert;
    }
  }
  return palette;
}

export function auftrag(name, sprite, jaegerFarbe) {
  const palette = loeseFarben(sprite, jaegerFarbe);
  const merkmal = Object.keys(palette).indexOf(MERKMAL[name]);
  if (merkmal < 0) throw new Error(`Merkmalszeichen "${MERKMAL[name]}" gibt es in ${name} nicht`);
  return {
    palette,
    untergruende: UNTERGRUENDE,
    merkmal,
    notiz: `${name}, wie er im Spiel steht.`,
    blaetter: [{ titel: name, zeilen: sprite.bild }]
  };
}

export const ALLE = { jaeger: JAEGER, ...GEGNER_BILDER };

/* ── Aufruf von der Kommandozeile ───────────────────────────────── */
const selbstAufgerufen = process.argv[1]
  && process.argv[1].replace(/\\/g, "/").endsWith("/werkstatt-auftrag.mjs");

if (selbstAufgerufen) {
  const i = process.argv.indexOf("--nach");
  const ordner = i >= 0 && process.argv[i + 1]
    ? process.argv[i + 1]
    : join(WURZEL, "werkstatt-auftraege");
  const nur = process.argv.filter((a, k) => k > 1 && !a.startsWith("--") && process.argv[k - 1] !== "--nach")[0];

  mkdirSync(ordner, { recursive: true });
  let n = 0;
  for (const [name, sprite] of Object.entries(ALLE)) {
    if (nur && name !== nur) continue;
    const a = auftrag(name, sprite, name === "jaeger" ? JAEGER_FARBEN[0] : null);
    writeFileSync(join(ordner, `${name}.json`), JSON.stringify(a, null, 2));
    n++;
  }
  console.log(`${n} Auftraege in ${ordner}`);
  console.log(`Messen: node <pixel-werkstatt>/werkzeuge/pruefe-sprite.mjs ${ordner}/<art>.json`);
}
