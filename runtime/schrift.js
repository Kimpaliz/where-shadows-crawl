/* [Aufgabe: Bild] Eine Schrift aus Bildpunkten.

   ── Warum nicht einfach `ctx.fillText` ─────────────────────────────

   Weil eine Browser-Schrift Kantenglättung mitbringt: weiche
   Graustufen an jedem Buchstabenrand. Auf einem Bild, das aus harten
   Bildpunkten besteht und dann vergrößert wird, ist das der eine
   verwaschene Fleck, an dem man sieht, dass es keine echte
   Pixelgrafik ist. Und weil die Anzeige mitvergrößert wird, wäre die
   Unschärfe genau so groß wie das Bild.

   ── Aufbau ─────────────────────────────────────────────────────────

   Jedes Zeichen ist 4 Bildpunkte breit und 5 hoch, Vorschub 5. Über
   den Buchstaben liegen zwei weitere Zeilen für die Pünktchen der
   Umlaute — deutsche Texte ohne Umlaute zu schreiben wäre die andere
   Art, sich vor dem Problem zu drücken.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/oberflaeche.js` (schreibt damit alles), `runtime/palette.js`
   (Farben). Hängt an nichts anderem. */

import { FARBEN } from "./palette.js";

export const ZEICHEN_BREITE = 4;
export const ZEICHEN_HOEHE = 5;
export const VORSCHUB = 5;
export const ZEILE = 8;
/* Die Pünktchen sitzen zwei Zeilen über dem Buchstaben. */
export const UMLAUT_HOCH = 2;

const G = {
  "0": [".##.", "#..#", "#..#", "#..#", ".##."],
  "1": ["..#.", ".##.", "..#.", "..#.", ".###"],
  "2": ["###.", "...#", ".##.", "#...", "####"],
  "3": ["###.", "...#", ".##.", "...#", "###."],
  "4": ["#..#", "#..#", "####", "...#", "...#"],
  "5": ["####", "#...", "###.", "...#", "###."],
  "6": [".##.", "#...", "###.", "#..#", ".##."],
  "7": ["####", "...#", "..#.", ".#..", ".#.."],
  "8": [".##.", "#..#", ".##.", "#..#", ".##."],
  "9": [".##.", "#..#", ".###", "...#", ".##."],
  A: [".##.", "#..#", "####", "#..#", "#..#"],
  B: ["###.", "#..#", "###.", "#..#", "###."],
  C: [".###", "#...", "#...", "#...", ".###"],
  D: ["###.", "#..#", "#..#", "#..#", "###."],
  E: ["####", "#...", "###.", "#...", "####"],
  F: ["####", "#...", "###.", "#...", "#..."],
  G: [".###", "#...", "#.##", "#..#", ".###"],
  H: ["#..#", "#..#", "####", "#..#", "#..#"],
  I: ["###.", ".#..", ".#..", ".#..", "###."],
  J: ["..##", "...#", "...#", "#..#", ".##."],
  K: ["#..#", "#.#.", "##..", "#.#.", "#..#"],
  L: ["#...", "#...", "#...", "#...", "####"],
  M: ["#..#", "####", "####", "#..#", "#..#"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  O: [".##.", "#..#", "#..#", "#..#", ".##."],
  P: ["###.", "#..#", "###.", "#...", "#..."],
  Q: [".##.", "#..#", "#..#", "#.#.", ".#.#"],
  R: ["###.", "#..#", "###.", "#.#.", "#..#"],
  S: [".###", "#...", ".##.", "...#", "###."],
  T: ["####", ".#..", ".#..", ".#..", ".#.."],
  U: ["#..#", "#..#", "#..#", "#..#", ".##."],
  V: ["#..#", "#..#", "#..#", ".##.", ".##."],
  W: ["#..#", "#..#", "####", "####", "#..#"],
  X: ["#..#", ".##.", ".##.", ".##.", "#..#"],
  Y: ["#..#", "#..#", ".##.", ".#..", ".#.."],
  Z: ["####", "...#", ".##.", "#...", "####"],
  " ": ["....", "....", "....", "....", "...."],
  ".": ["....", "....", "....", "....", ".#.."],
  ",": ["....", "....", "....", ".#..", "#..."],
  ":": ["....", ".#..", "....", ".#..", "...."],
  "-": ["....", "....", "###.", "....", "...."],
  "+": ["....", ".#..", "###.", ".#..", "...."],
  "/": ["...#", "..#.", ".#..", "#...", "#..."],
  "!": [".#..", ".#..", ".#..", "....", ".#.."],
  "?": ["###.", "...#", ".##.", "....", ".#.."],
  "%": ["#..#", "...#", ".##.", "#...", "#..#"],
  "(": ["..#.", ".#..", ".#..", ".#..", "..#."],
  ")": [".#..", "..#.", "..#.", "..#.", ".#.."],
  "*": ["#.#.", ".#..", "#.#.", "....", "...."],
  "<": ["..#.", ".#..", "#...", ".#..", "..#."],
  ">": [".#..", "..#.", "...#", "..#.", ".#.."],
  "=": ["....", "###.", "....", "###.", "...."],
  "'": [".#..", ".#..", "....", "....", "...."],
  "×": ["....", "#..#", ".##.", "#..#", "...."],
  /* Der Mittelpunkt trennt Bedienhinweise. Er fehlte beim ersten Lauf
     und wurde auf dem Titelbild als Fragezeichen gemalt — ein
     unbekanntes Zeichen fällt still auf `?` zurück und sieht dann aus
     wie ein Fehler im Text statt wie eine Lücke in der Schrift. */
  "·": ["....", "....", ".#..", "....", "...."],
  "—": ["....", "....", "####", "....", "...."],
  "–": ["....", "....", "###.", "....", "...."]
};

/* Umlaute und Eszett: derselbe Buchstabe plus Pünktchen. */
const UMLAUT = { "Ä": "A", "Ö": "O", "Ü": "U", "ä": "A", "ö": "O", "ü": "U" };
G["ß"] = ["##..", "#.#.", "##..", "#.#.", "##.."];

/* Kleinbuchstaben gibt es nicht — Anzeigetexte stehen in
   Großbuchstaben. Eine zweite Garnitur wäre doppelt so viel Daten für
   Text, der ohnehin aus drei Wörtern besteht. */
export function textBreite(text) {
  return text.length * VORSCHUB - 1;
}

export function zeichneText(c, text, x, y, farbe = FARBEN.schrift) {
  c.fillStyle = farbe;
  let px = Math.round(x);
  const py = Math.round(y);
  for (const roh of text) {
    /* Erst das Zeichen selbst: "ß".toUpperCase() ist "SS" — zwei
       Zeichen, und die Suche danach geht ins Leere. */
    const gross = G[roh] ? roh : roh.toUpperCase();
    const umlaut = UMLAUT[roh] ?? UMLAUT[gross];
    const glyph = G[umlaut ?? gross] ?? G["?"];
    for (let gy = 0; gy < ZEICHEN_HOEHE; gy++) {
      const zeile = glyph[gy];
      for (let gx = 0; gx < ZEICHEN_BREITE; gx++) {
        if (zeile[gx] === "#") c.fillRect(px + gx, py + gy, 1, 1);
      }
    }
    if (umlaut) {
      c.fillRect(px + 1, py - UMLAUT_HOCH, 1, 1);
      c.fillRect(px + 3, py - UMLAUT_HOCH, 1, 1);
    }
    px += VORSCHUB;
  }
}

/* Text mit Kontur — auf einem Bild aus Fackelschein und Schatten ist
   ein Buchstabe ohne Rand je nach Untergrund unlesbar. */
export function zeichneTextUmrandet(c, text, x, y, farbe = FARBEN.schrift, rand = FARBEN.kontur) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    zeichneText(c, text, x + dx, y + dy, rand);
  }
  zeichneText(c, text, x, y, farbe);
}

export function zeichneTextMittig(c, text, mitteX, y, farbe, rand) {
  const x = Math.round(mitteX - textBreite(text) / 2);
  if (rand) zeichneTextUmrandet(c, text, x, y, farbe, rand);
  else zeichneText(c, text, x, y, farbe);
  return x;
}

/* Für die Prüfung: alle bekannten Zeichen. */
export function bekannteZeichen() {
  return { glyphen: G, umlaute: UMLAUT };
}
