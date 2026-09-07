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

   ── Seit den Bossen und Trefferzeichen (05.09.2026) zusätzlich ──────

   4. **Ein Muster zerfällt in Einzelpunkte.** Zahlen wie „Breite
      stimmt" und „Farbe existiert" sagen nichts darüber, ob das
      Ergebnis noch als *ein Wesen* zu erkennen ist, statt als Staub.
   5. **Ein Trefferzeichen ist auf dem Bannkreis-Boden fast unsichtbar.**
      Genau das ist dem ersten Entwurf von `wucht` passiert (Steintöne
      auf Steinboden). Erst am gerenderten Bild gesehen, nicht an einer
      der bestehenden Prüfungen — deshalb jetzt eine eigene.
   6. **Eine Bildfolge (`bilder`) weicht im ersten Bild von `bild` ab**,
      oder ihre Rahmen haben unterschiedliche Maße. Beides sähe man erst
      im Browser, und nur, wenn die Animation überhaupt schon läuft.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprite-daten.js` (die Raster), `runtime/sprites.js` (die
   Drehung, als reine Rechnung), `runtime/palette.js` (die Farben). */

import { macheMelder } from "./helfer.mjs";
import { FARBEN, JAEGER_FARBEN } from "../runtime/palette.js";
import { JAEGER, SCHLAGBOEGEN, GEGNER_BILDER, DINGE, GESCHOSSE, TREFFER } from "../runtime/sprite-daten.js";
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
  ["jaeger", JAEGER],
  ...Object.entries(SCHLAGBOEGEN).map(([k, v]) => [`schlagbogen/${k}`, v]),
  ...Object.entries(GEGNER_BILDER).map(([k, v]) => [`gegner/${k}`, v]),
  ...Object.entries(DINGE).map(([k, v]) => [`dinge/${k}`, v]),
  ...Object.entries(GESCHOSSE).map(([k, v]) => [`geschoss/${k}`, v]),
  ...Object.entries(TREFFER).map(([k, v]) => [`treffer/${k}`, v])
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
/* Und die Gegenrichtung: ein Bild ohne Gegner ist toter Ballast. Zwei
   Bosse (05.09.2026, Auftrag "bild/sprites-und-bosse") sind bereits
   gezeichnet, aber noch ohne Eintrag in `spiel/katalog/gegner.mjs` —
   das ist Sache eines Spiellogik-Agenten, `spiel/*` gehört nicht zu
   dieser Aufgabe. Befristete, benannte Ausnahme statt stillem Rot:
   Sobald der Katalog die beiden IDs kennt, gehört diese Zeile weg und
   die beiden laufen durch dieselbe Prüfung wie jeder andere Gegner. */
const NOCH_OHNE_KATALOGEINTRAG = new Set(["gebeinfuerst", "vielfrass"]);
for (const id of Object.keys(GEGNER_BILDER)) {
  if (NOCH_OHNE_KATALOGEINTRAG.has(id)) continue;
  melde(GEGNER.some((g) => g.id === id), `Bild "${id}" gehört zu einem Gegner`);
}
for (const id of NOCH_OHNE_KATALOGEINTRAG) {
  melde(GEGNER_BILDER[id] !== undefined, `Boss ohne Katalogeintrag "${id}" hat wenigstens ein Bild`);
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

/* Und das **Raster selbst** muss ungerade sein, wenn es gedreht wird.
   Am 04.09.2026 gemessen: Bei gerader Kantenlänge ist der Quellmittelpunkt
   `(breite - 1) / 2` ein halber Bildpunkt. Die Rückwärtsabtastung greift
   dann je Richtung um einen halben Bildpunkt versetzt zu — die Figur
   **wandert beim Drehen**, und zwar so wenig, dass man es nicht sieht,
   sondern nur als Unruhe spürt. Vier von neun Sprites hatten das:
   Jäger 11 × 12, Schlurfer 9 × 10, Hetzer 7 × 10, Balg 6 × 6.

   Gefunden hat es nicht das Auge, sondern eine Messung — genau der Grund,
   warum es diese Zeile jetzt gibt. */
for (const [name, sprite] of GEDREHT) {
  const b = sprite.bild[0].length, h = sprite.bild.length;
  melde(b % 2 === 1 && h % 2 === 1,
    `${name}: ungerade Kanten, damit die Mitte beim Drehen nicht wandert`,
    `${b} × ${h}`);
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

/* ── Silhouette erkennbar? ───────────────────────────────────────── */

/* Wie viele Bildpunkte hängen (mit Diagonalen) an der größten
   zusammenhängenden Fläche? Ein Wesen, das in Einzelpunkte zerfällt,
   ist ganz schwarz gefüllt nicht mehr als *ein* Ding zu erkennen —
   genau die Silhouettenregel aus dem Handwerk, nur als Zahl statt als
   Blick. Diagonale Nachbarschaft zählt als verbunden: Pixelgrafik
   klebt auch über die Ecke. */
function groessteFlaeche(bild) {
  const h = bild.length, w = bild[0].length;
  const besucht = Array.from({ length: h }, () => new Array(w).fill(false));
  let gesamt = 0, groesste = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (bild[y][x] !== ".") gesamt++;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (bild[y][x] === "." || besucht[y][x]) continue;
      let groesse = 0;
      const stapel = [[y, x]];
      besucht[y][x] = true;
      while (stapel.length > 0) {
        const [cy, cx] = stapel.pop();
        groesse++;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dy === 0 && dx === 0) continue;
            const ny = cy + dy, nx = cx + dx;
            if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
            if (besucht[ny][nx] || bild[ny][nx] === ".") continue;
            besucht[ny][nx] = true;
            stapel.push([ny, nx]);
          }
        }
      }
      groesste = Math.max(groesste, groesse);
    }
  }
  return { gesamt, groesste };
}

/* Gilt für Wesen (gedreht — sie müssen als *ein* Ding lesbar sein),
   nicht für Trefferzeichen: Blutstropfen und Schutt dürfen dort
   absichtlich lose neben der Hauptform liegen, das ist keine
   zerfallene Silhouette, sondern Spritzer. */
for (const [name, sprite] of GEDREHT) {
  const { gesamt, groesste } = groessteFlaeche(sprite.bild);
  const anteil = groesste / gesamt;
  melde(anteil >= 0.9, `${name}: Silhouette ist ein Stück, nicht Staub`,
    `${groesste}/${gesamt} zusammenhängend (${(anteil * 100).toFixed(0)} %)`);
}

/* ── Trefferzeichen auf dem Boden lesbar? ────────────────────────── */

/* Am 05.09.2026 gemessen: Der erste Entwurf von `wucht` malte in
   Steintönen — auf dem Bannkreis-Boden fast unsichtbar (Abstand nur
   21,4 von 255). Gefunden am gerenderten Bild, nicht an dieser Zahl;
   diese Prüfung soll denselben Fehler künftig ohne Bild fangen. */
function leuchtdichte(hexFarbe) {
  const n = parseInt(hexFarbe.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const BODENTOENE = ["boden0", "boden1", "boden2", "aussen0", "aussen1"].map((n) => leuchtdichte(FARBEN[n]));
const HELLSTER_BODEN = Math.max(...BODENTOENE);
const KONTRAST_MINDESTENS = 60;

for (const [id, sprite] of Object.entries(TREFFER)) {
  const farben = Object.values(sprite.zeichen)
    .filter((n) => !n.startsWith("@"))
    .map((n) => leuchtdichte(FARBEN[n]));
  const hellste = Math.max(...farben);
  const abstand = hellste - HELLSTER_BODEN;
  melde(abstand >= KONTRAST_MINDESTENS, `treffer/${id}: hellste Farbe hebt sich vom Bannkreis-Boden ab`,
    `Abstand ${abstand.toFixed(1)} (Boden höchstens ${HELLSTER_BODEN.toFixed(1)})`);
}

/* ── Bildfolgen (`bilder`) unversehrt? ────────────────────────────── */

/* Neu seit dem Bossauftrag: ein Sprite kann `bilder` tragen. Zwei
   Dinge dürfen dabei nicht auseinanderlaufen: `bild` muss `bilder[0]`
   sein (sonst zeigt jeder Aufrufer, der nur `bild` kennt, ein anderes
   Bild als die Animation gleich danach), und jeder Rahmen muss für
   sich ein heiles Raster in derselben Größe wie `bild` sein — sonst
   springt die Figur beim ersten Bildwechsel im Ort. */
for (const [name, sprite] of ALLE) {
  if (!sprite.bilder) continue;
  const gleich = JSON.stringify(sprite.bild) === JSON.stringify(sprite.bilder[0]);
  melde(gleich, `${name}: bild ist bilder[0]`);
  const b0 = sprite.bild[0].length, h0 = sprite.bild.length;
  sprite.bilder.forEach((rahmen, i) => {
    const maengel = pruefeRaster(`${name}/bilder[${i}]`, { bild: rahmen, zeichen: sprite.zeichen });
    melde(maengel.length === 0, `${name}: Rahmen ${i} ist ein heiles Raster`, maengel.slice(0, 3).join(" | "));
    const passtGroesse = rahmen[0].length === b0 && rahmen.length === h0;
    melde(passtGroesse, `${name}: Rahmen ${i} hat dieselbe Größe wie bild`,
      `${rahmen[0].length} × ${rahmen.length}, erwartet ${b0} × ${h0}`);
  });
}

ende();
