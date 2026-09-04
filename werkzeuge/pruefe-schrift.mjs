/* [Aufgabe: Prüfwesen] Kann die Schrift jeden Text malen, der vorkommt?

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   `zeichneText` fällt bei einem unbekannten Zeichen auf `?` zurück.
   Das ist der richtige Rückfall — er stürzt nicht ab —, aber er sieht
   auf dem Bildschirm aus wie ein Fehler im Text und nicht wie eine
   Lücke in der Schrift. Genau das ist zweimal passiert: „J1 WASD ?
   LEERTASTE" und „DER KRÄMER ? VOR NACHT 2", beide erst im Browser
   aufgefallen, beide von keiner Prüfung gemeldet.

   Geprüft werden zwei Quellen:

   1. Alle Anzeigetexte der Kataloge (`name`, `text`) und die
      Wertbeschreibungen — sie kommen zwangsläufig auf den Schirm.
   2. Alle Zeichenketten in `runtime/oberflaeche.js`. Grob, aber in die
      richtige Richtung: Lieber ein Zeichen zu viel prüfen als das
      eine übersehen, das später als Fragezeichen erscheint.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/schrift.js` (die Glyphen), den Katalogen (die Texte). */

import { macheMelder, liesDatei } from "./helfer.mjs";
import { bekannteZeichen, ZEICHEN_BREITE, ZEICHEN_HOEHE } from "../runtime/schrift.js";
import { WAFFEN } from "../spiel/katalog/waffen.mjs";
import { GEGNER } from "../spiel/katalog/gegner.mjs";
import { GEGENSTAENDE } from "../spiel/katalog/gegenstaende.mjs";
import { WERT_TEXT, WERTE } from "../spiel/werte.mjs";

const { glyphen, umlaute } = bekannteZeichen();
const { melde, ende } = macheMelder({ still: true });

/* ── Die Glyphen selbst ──────────────────────────────────────────── */

let breiteFalsch = 0, hoeheFalsch = 0, zeichenFalsch = 0;
for (const [name, g] of Object.entries(glyphen)) {
  if (g.length !== ZEICHEN_HOEHE) hoeheFalsch++;
  for (const zeile of g) {
    if (zeile.length !== ZEICHEN_BREITE) breiteFalsch++;
    if (/[^#.]/.test(zeile)) zeichenFalsch++;
  }
}
melde(hoeheFalsch === 0, `alle Glyphen sind ${ZEICHEN_HOEHE} hoch`, `${hoeheFalsch} falsch`);
melde(breiteFalsch === 0, `alle Glyphenzeilen sind ${ZEICHEN_BREITE} breit`, `${breiteFalsch} falsch`);
melde(zeichenFalsch === 0, "Glyphen enthalten nur # und .", `${zeichenFalsch} falsch`);

/* Ein leeres Glyph für einen sichtbaren Buchstaben wäre unsichtbarer
   Text — schlimmer als ein Fragezeichen, weil gar nichts dasteht. */
let leer = 0;
for (const [name, g] of Object.entries(glyphen)) {
  if (name === " ") continue;
  if (g.every((z) => !z.includes("#"))) leer++;
}
melde(leer === 0, "kein sichtbares Zeichen ist leer gezeichnet", `${leer} leer`);

/* ── Kann jeder Text gemalt werden? ──────────────────────────────── */

function kannMalen(zeichen) {
  /* Dieselbe Reihenfolge wie in `zeichneText` — eine Pruefung, die
     anders nachschlaegt als der Zeichner, prueft nicht den Zeichner. */
  if (zeichen === " " || glyphen[zeichen] !== undefined) return true;
  const gross = zeichen.toUpperCase();
  return glyphen[gross] !== undefined
    || umlaute[zeichen] !== undefined || umlaute[gross] !== undefined;
}

function pruefeText(text, herkunft) {
  const fehlend = new Set();
  for (const z of String(text)) if (!kannMalen(z)) fehlend.add(z);
  melde(fehlend.size === 0, `Text malbar: ${herkunft}`,
    fehlend.size ? `fehlt: ${[...fehlend].join(" ")} in "${text}"` : "");
}

for (const w of WAFFEN) { pruefeText(w.name, `Waffe ${w.id} Name`); pruefeText(w.text, `Waffe ${w.id} Text`); }
for (const g of GEGNER) { pruefeText(g.name, `Gegner ${g.id} Name`); pruefeText(g.text, `Gegner ${g.id} Text`); }
for (const g of GEGENSTAENDE) { pruefeText(g.name, `Fundstueck ${g.id} Name`); pruefeText(g.text, `Fundstueck ${g.id} Text`); }
for (const w of WERTE) {
  melde(WERT_TEXT[w] !== undefined, `Wert "${w}" hat einen Anzeigetext`);
  if (WERT_TEXT[w]) { pruefeText(WERT_TEXT[w][0], `Wert ${w} Name`); pruefeText(WERT_TEXT[w][1], `Wert ${w} Text`); }
}

/* ── Die festen Texte der Oberfläche ─────────────────────────────── */

const quelle = liesDatei("runtime/oberflaeche.js");
/* Kommentare zuerst streichen: Sie stehen nie auf dem Bildschirm, und
   ein Wort daraus als „fehlendes Zeichen" zu melden hieße, die eigene
   Begründung für einen Fehler zu halten. */
const ohneKommentar = quelle.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const stellen = [...ohneKommentar.matchAll(/"([^"\\\n]*)"|`([^`\\]*)`/g)]
  .map((m) => (m[1] ?? m[2] ?? "").replace(/\$\{[^}]*\}/g, ""))
  /* Farbcodes und Stilangaben stehen nie auf dem Bildschirm — sie
     als fehlende Zeichen zu melden waere ein Fehlalarm, und ein
     Waechter, der Fehlalarm gibt, wird bald ignoriert. */
  .filter((t) => /[A-Za-zÄÖÜäöüß]/.test(t)
    && !/^[a-z][A-Za-z]*$/.test(t)
    && !/^#[0-9a-fA-F]{3,8}$/.test(t)
    && !/^rgba?\(/.test(t));

let ohneGlyph = new Set();
for (const t of stellen) for (const z of t) if (!kannMalen(z)) ohneGlyph.add(z);
melde(ohneGlyph.size === 0, `${stellen.length} Texte in oberflaeche.js sind malbar`,
  ohneGlyph.size ? `fehlt: ${[...ohneGlyph].join(" ")}` : "");

ende();
