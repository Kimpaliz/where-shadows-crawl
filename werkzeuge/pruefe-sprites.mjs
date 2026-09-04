/* [Aufgabe: Prüfwesen] Sind die Bildpunktraster heil und drehbar?

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   Drei Sorten Fehler, und keine davon stürzt ab:

   1. **Eine Zeile ist einen Bildpunkt zu kurz.** Beim Zeichnen fehlt
      dann rechts eine Spalte — man sieht es, aber man findet es nicht.
      Genau das war beim ersten Anlauf zweimal der Fall, weil ich
      einzelne Zeilen mit `.replace()` zusammengebaut hatte.
   2. **Ein Zeichen zeigt auf eine Farbe, die es nicht gibt.**
      `FARBEN[name]` ist dann `undefined`, und der Bildpunkt wird
      knallrosa gemalt — auffällig, aber erst im fertigen Bild.
   3. **Ein Sprite ist punktsymmetrisch.** Dann sieht seine Drehung
      genauso aus wie sein Original, und die ganze Drehmaschinerie ist
      unsichtbar. Das ist der teuerste Fehler, weil er wie eine
      korrekte Umsetzung aussieht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprite-daten.js` (die Raster), `runtime/sprites.js` (die
   Drehung, als reine Rechnung), `runtime/palette.js` (die Farben). */

import { macheMelder } from "./helfer.mjs";
import { FARBEN, JAEGER_FARBEN } from "../runtime/palette.js";
import { JAEGER, SCHLAGBOGEN, GEGNER_BILDER, DINGE, GESCHOSSE } from "../runtime/sprite-daten.js";
import { pruefeRaster, dreheRaster, drehGroesse, richtungsIndex, RICHTUNGEN } from "../runtime/sprites.js";
import { GEGNER } from "../spiel/katalog/gegner.mjs";

const { melde, ende } = macheMelder({ still: true });

/* ── Die Palette ─────────────────────────────────────────────────── */

let farbFehler = [];
for (const [name, wert] of Object.entries(FARBEN)) {
  if (!/^#[0-9a-fA-F]{6}$/.test(wert)) farbFehler.push(`${name}="${wert}"`);
}
melde(farbFehler.length === 0, `${Object.keys(FARBEN).length} Palettenfarben sind gültige Farbcodes`,
  farbFehler.join(", "));

for (const f of JAEGER_FARBEN) {
  const gut = ["hell", "mittel", "dunkel"].every((k) => /^#[0-9a-fA-F]{6}$/.test(f[k]));
  melde(gut, `Jägerfarbe "${f.name}" vollständig`);
}
melde(JAEGER_FARBEN.length === 4, "vier Jägerfarben für vier Spieler");

/* ── Die Raster ──────────────────────────────────────────────────── */

const ALLE = [
  ["jaeger", JAEGER], ["schlagbogen", SCHLAGBOGEN],
  ...Object.entries(GEGNER_BILDER).map(([k, v]) => [`gegner/${k}`, v]),
  ...Object.entries(DINGE).map(([k, v]) => [`dinge/${k}`, v]),
  ...Object.entries(GESCHOSSE).map(([k, v]) => [`geschoss/${k}`, v])
];

for (const [name, sprite] of ALLE) {
  const maengel = pruefeRaster(name, sprite);
  melde(maengel.length === 0, `Raster heil: ${name}`, maengel.slice(0, 3).join(" | "));
}

/* Jede Gegnerart aus dem Regelkern braucht ein Bild — sonst erscheint
   sie im Spiel als **gar nichts** und läuft unsichtbar auf einen zu.
   `zeichnen.js` überspringt sie stillschweigend. */
for (const g of GEGNER) {
  melde(GEGNER_BILDER[g.id] !== undefined, `Gegner "${g.id}" hat ein Bild`);
}
/* Und die Gegenrichtung: ein Bild ohne Gegner ist toter Ballast. */
for (const id of Object.keys(GEGNER_BILDER)) {
  melde(GEGNER.some((g) => g.id === id), `Bild "${id}" gehört zu einem Gegner`);
}

/* ── Sind sie drehbar erkennbar? ─────────────────────────────────── */

function abweichung(a, b) {
  let n = 0;
  for (let y = 0; y < a.length; y++) {
    for (let x = 0; x < a[y].length; x++) if (a[y][x] !== b[y][x]) n++;
  }
  return n;
}

/* Ein um 180 Grad gedrehtes Sprite muss sich vom Original
   unterscheiden — sonst hat es keine Vorderseite und die Blickrichtung
   ist im Bild nicht ablesbar. Geprüft für alles, was gedreht wird;
   Goldstücke und Steine sind ausdrücklich ausgenommen. */
const GEDREHT = [["jaeger", JAEGER], ...Object.entries(GEGNER_BILDER).map(([k, v]) => [`gegner/${k}`, v])];
for (const [name, sprite] of GEDREHT) {
  const vorn = dreheRaster(sprite.bild, 0);
  const hinten = dreheRaster(sprite.bild, RICHTUNGEN / 2);
  const n = abweichung(vorn, hinten);
  melde(n >= 4, `${name} zeigt beim Drehen eine Vorderseite`, `${n} Bildpunkte Unterschied`);
}

/* Die Drehung darf keine Figur verlieren. Zehn Prozent Schwund sind
   beim Runden unvermeidlich; die Hälfte wäre ein Fehler. */
for (const [name, sprite] of GEDREHT) {
  const voll = sprite.bild.join("").split("").filter((z) => z !== ".").length;
  let schlimmster = 1;
  for (let r = 0; r < RICHTUNGEN; r++) {
    const g = dreheRaster(sprite.bild, r).join("").split("").filter((z) => z !== ".").length;
    schlimmster = Math.min(schlimmster, g / voll);
  }
  melde(schlimmster > 0.7, `${name} verliert beim Drehen nicht zu viel`,
    `schlimmster Fall ${(schlimmster * 100).toFixed(0)} %`);
}

/* Das Drehfeld muss ungerade sein — sonst hat es keine echte Mitte und
   die Figur wandert beim Drehen um einen halben Bildpunkt. */
for (const [name, sprite] of ALLE) {
  const d = drehGroesse(sprite.bild[0].length, sprite.bild.length);
  melde(d % 2 === 1, `${name}: Drehfeld ${d} ist ungerade`);
}

/* ── Die Richtungsrechnung ───────────────────────────────────────── */

melde(richtungsIndex(0, -1) === 0, "Richtung 0 zeigt nach oben");
melde(richtungsIndex(1, 0) === RICHTUNGEN / 4, "nach rechts ist ein Viertel");
melde(richtungsIndex(0, 1) === RICHTUNGEN / 2, "nach unten ist die Hälfte");
melde(richtungsIndex(-1, 0) === (RICHTUNGEN * 3) / 4, "nach links sind drei Viertel");
let ausserhalb = 0;
for (let i = 0; i < 360; i++) {
  const w = (i / 180) * Math.PI;
  const r = richtungsIndex(Math.cos(w), Math.sin(w));
  if (!Number.isInteger(r) || r < 0 || r >= RICHTUNGEN) ausserhalb++;
}
melde(ausserhalb === 0, "Richtungsnummer bleibt immer im gültigen Bereich", `${ausserhalb} daneben`);

ende();
