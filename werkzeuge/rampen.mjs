/* [Aufgabe: Bild] Farbrampen bauen und ihre Trennung messen.

       node werkzeuge/rampen.mjs              → alle Rampen, gemessen
       node werkzeuge/rampen.mjs --js         → als Palettenblock

   ── Warum das nötig war ────────────────────────────────────────────

   Janniks Ansage zu den Angriffen: *„aber feine farbliche übergänge."*
   Gemessen hatte jede Schadensart genau **zwei** Töne (`frost` und
   `frostHell`, `bann` und `bannHell`, …). Mit zwei Tönen gibt es keinen
   Übergang, nur einen Sprung — ein Geschoss kann damit nicht glühen,
   nicht abkühlen und nicht auslaufen.

   ── Warum nicht einfach neue Farben ────────────────────────────────

   Weil der Stil bleiben soll. Die heutigen zwei Töne sind hier die
   **Anker** und stehen unverändert in der fertigen Rampe (Stufe 1 und
   3); ergänzt werden eine dunklere, eine mittlere und eine hellere
   Stufe. Wer stattdessen einen frischen Grundton nimmt, bekommt eine
   schönere Rampe und ein anderes Spiel.

   ── Die Regel der Rampe ────────────────────────────────────────────

   Sie folgt der Regel, die in `runtime/palette.js` schon steht:
   **Dunkles ist kühl, Beleuchtetes ist warm.** Deshalb wandert die
   unterste Stufe ins Blau-Violette und die oberste ins Bernstein —
   nicht einfach Schwarz und Weiß beigemischt. Genau dieser
   Farbtonversatz trennt gemalte Pixelgrafik von Klemmkunst.

   ── Die Messung ────────────────────────────────────────────────────

   Zwei Stufen nebeneinander müssen sich in der **Helligkeit** um
   mindestens 12 von 255 unterscheiden, sonst verschwimmen sie bei 1:1.
   Gemessen wird die wahrgenommene Leuchtdichte (Rec. 709), nicht der
   Mittelwert der Kanäle — Grün wiegt darin dreimal so schwer wie Blau,
   und genau daran ist die erste Seuche-Rampe gescheitert (4,3 statt
   12).

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/palette.js` (dorthin gehört das Ergebnis),
   `werkzeuge/pruefe-sprites.mjs` (prüft die Farbcodes),
   `werkzeuge/pruefe-angriffe.mjs` (hält die Trennung fest). */

import { pathToFileURL } from "node:url";

/* Die Anker: was heute in `runtime/palette.js` steht. Wer hier etwas
   ändert, ändert das Aussehen des Spiels — deshalb stehen die Werte
   ausgeschrieben da und werden nicht importiert: Ein Import würde
   stillschweigend mitwandern, und niemand sähe im Diff, dass sich der
   Ausgangspunkt verschoben hat. */
export const ANKER = {
  frost:  { dunkel: "#6fa8c9", hell: "#a8d6ec", zweck: "Frostrune — Kälte, die den Schritt bremst" },
  seuche: { dunkel: "#6fa03a", hell: "#9ccc55", zweck: "Seuchenglas — Fäulnis, die nachwirkt" },
  bann:   { dunkel: "#8f6fd0", hell: "#bfa4f0", zweck: "Bannstein — die einzige suchende Waffe" },
  flamme: { dunkel: "#ffb455", hell: "#ffe0a8", zweck: "Pechfackel und Glut" },

  /* ⚠ **`blut` steht bewusst nicht in dieser Liste.** Gemessen liegen
     seine beiden Töne nur **19,5** von 255 auseinander; für drei
     trennbare Stufen bräuchte es 24, für fünf 48. Auch der größte
     Überstand kam nur auf 9,7 statt 12 — die Anker selbst sind zu eng,
     und eine Rampe daraus wäre ein Verlauf, den bei 1:1 niemand sieht.

     Weiterschieben ließe sich das nur, indem man `blut` dunkler oder
     `blutHell` heller macht — das ändert den Lebensbalken und das
     Trefferzeichen für Schnitt, also den Stil. Das ist Janniks
     Entscheidung und nicht meine, und für die Angriffe wird es nicht
     gebraucht: Der Blutdorn ist eine **Nahkampfwaffe** und hat gar kein
     Geschoss. */
  eisen:  { dunkel: "#5a5f6b", hell: "#828896", zweck: "Wurfmesser und Armbrustbolzen" }
};

/* Wie weit die Enden im Farbton auswandern. 0,055 ist gemessen: Bei
   0,02 sieht man den Versatz nicht, bei 0,12 kippt Frost am oberen Ende
   ins Gelbliche und ist keine Kälte mehr. */
const VERSATZ = 0.055;
/* Wie weit die Enden über die Anker hinausgehen — **nicht** fest,
   sondern gesucht. Ein fester Überstand ist bei hellen Tönen
   wirkungslos: `flammeHell` liegt schon bei Leuchtdichte 221, dort
   bringt „noch heller" fast nichts mehr, und die oberste Stufe klebt an
   ihrem Nachbarn (gemessen 10,2 statt 12). Bei `blut` ist es
   umgekehrt — dort ist nach unten viel Platz. Deshalb wächst der
   Überstand, bis die Trennung hält, und die Rampe sagt, wenn es nicht
   geht. */
const UEBERSTAND_START = 0.34;
const UEBERSTAND_MAX = 1.6;
const UEBERSTAND_SCHRITT = 0.02;

const zuRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const zuHex = (r) => "#" + r.map((v) =>
  Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

/* Wahrgenommene Helligkeit nach Rec. 709. Der Mittelwert der drei
   Kanäle wäre hier falsch: Er hält ein sattes Grün für so hell wie ein
   mittleres Blau, und die Rampe fiele dort zusammen, wo das Auge noch
   Unterschiede sieht — oder umgekehrt. */
export const leuchtdichte = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/* Ein Ton kühler (ins Blau-Violette) oder wärmer (ins Bernstein)
   ziehen. `menge` ist vorzeichenbehaftet: negativ kühl, positiv warm. */
function toenen([r, g, b], menge) {
  const ziel = menge < 0 ? [96, 88, 168] : [255, 190, 110];
  const m = Math.abs(menge);
  return [r + (ziel[0] - r) * m, g + (ziel[1] - g) * m, b + (ziel[2] - b) * m];
}

function mische(a, b, t) {
  return [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t);
}

/* Fünf Stufen aus zwei Ankern. Stufe 1 und 3 sind die Anker selbst —
   byteweise, nicht ungefähr; das ist der Punkt der ganzen Übung. */
export function baueRampe(dunkel, hell, ueberstand = UEBERSTAND_START) {
  const d = zuRgb(dunkel), h = zuRgb(hell);
  return [
    zuHex(toenen(mische(d, h, -ueberstand), -VERSATZ)),
    dunkel,
    zuHex(mische(d, h, 0.5)),
    hell,
    zuHex(toenen(mische(d, h, 1 + ueberstand), VERSATZ))
  ];
}

/* Die beste Rampe für ein Ankerpaar: den Überstand so weit wachsen
   lassen, bis die engste Trennung hält. Gibt zurück, was gefunden
   wurde — und ehrlich `haelt: false`, wenn auch der größte Überstand
   nicht reicht. Dann liegen die beiden Anker selbst zu eng, und das
   ist ein Befund über die Palette, keine Zahl zum Wegdrehen. */
export function besteRampe(dunkel, hell) {
  let beste = null;
  for (let u = UEBERSTAND_START; u <= UEBERSTAND_MAX + 1e-9; u += UEBERSTAND_SCHRITT) {
    const rampe = baueRampe(dunkel, hell, u);
    const eng = engsteTrennung(rampe);
    if (!beste || eng > beste.eng) beste = { rampe, eng, ueberstand: u };
    if (eng >= MINDESTTRENNUNG) return { ...beste, rampe, eng, ueberstand: u, haelt: true };
  }
  return { ...beste, haelt: false };
}

/* Die engste Helligkeitstrennung einer Rampe — die Zahl, an der sie
   scheitert oder besteht. */
export function engsteTrennung(rampe) {
  const l = rampe.map((f) => leuchtdichte(zuRgb(f)));
  let eng = Infinity;
  for (let i = 1; i < l.length; i++) eng = Math.min(eng, Math.abs(l[i] - l[i - 1]));
  return eng;
}

export const MINDESTTRENNUNG = 12;

/* Die Namen in `runtime/palette.js`: Stufe 1 heißt wie die Art,
   Stufe 3 trägt `Hell` — genau wie heute, damit kein bestehender
   Sprite-Verweis bricht. */
export const STUFENNAMEN = ["Tief", "", "Mitte", "Hell", "Glanz"];

export function rampenName(art, stufe) {
  return art + STUFENNAMEN[stufe];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const alsJs = process.argv.includes("--js");
  if (!alsJs) console.log("Rampen aus den heutigen Ankern, fünf Stufen:\n");

  for (const [art, a] of Object.entries(ANKER)) {
    const { rampe, eng, ueberstand, haelt } = besteRampe(a.dunkel, a.hell);
    if (alsJs) {
      console.log(`  /* ${a.zweck} */`);
      for (let i = 0; i < rampe.length; i++) {
        console.log(`  ${rampenName(art, i)}: "${rampe[i]}",`);
      }
      console.log("");
    } else {
      const anker = rampe.map((f, i) =>
        f === a.dunkel || f === a.hell ? `${f}*` : `${f} `);
      console.log(`  ${art.padEnd(8)} ${anker.join(" ")}   Trennung ${eng.toFixed(1).padStart(5)}`
        + `   Überstand ${ueberstand.toFixed(2)}`
        + (haelt ? "" : "   ⚠ die Anker selbst liegen zu eng"));
    }
  }
  if (!alsJs) {
    console.log(`\n  * = unveränderter Anker aus runtime/palette.js`);
    console.log(`  Mindesttrennung ${MINDESTTRENNUNG} von 255 — darunter verschwimmen zwei Stufen bei 1:1.`);
  }
}
