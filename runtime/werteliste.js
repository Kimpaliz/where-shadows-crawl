/* [Aufgabe: Bedienung] Die Werteübersicht — und was eine Karte daran ändern würde.

   ── Janniks Ansage ─────────────────────────────────────────────────

   *„ein stats übersicht beim auf leveln. und beim pausieren. wenn man
   mit maus oder finger lvl up werte anwählt oder drüberhält oder auch
   karte. sieht man bei den allgemeinen werten schon eine vorschau
   veränderung!"*

   ── Der Befund dahinter ────────────────────────────────────────────

   Ein Spieler hat über fünfzig Werte (`spiel/werte.mjs`), und bis
   hierhin bekam er **keinen einzigen** davon zu sehen. Was er
   erfährt, steht auf den Karten: „+12 RÜSTUNG". Wovon auf wie viel,
   sagt niemand — und ob 12 Rüstung viel sind, hängt daran, ob man 0
   oder 40 hat. Ohne Bezugsgröße ist eine Kartenwahl ein Griff ins
   Dunkle, der sich nach Entscheidung anfühlen soll.

   ── Die zwei Zahlen, die eine Vorschau erst nützlich machen ────────

   Eine Vorschau, die nur die Karte wiederholt („+12"), wäre keine.
   Interessant ist, was **hinten herauskommt**, und das ist bei drei
   der wichtigsten Werte gar nicht die Summe:

   * **Schutz** wächst gedeckelt: Die ersten 30 Rüstung nehmen die
     Hälfte des Schadens, die nächsten 30 lange nicht noch einmal so
     viel (`schadensminderung()`). „+12 Rüstung" heißt bei 0 etwas
     ganz anderes als bei 60, und genau das zeigt die Zeile.
   * **Leben** ist ein Grundwert plus der Zuwachs — die Karte nennt
     nur den Zuwachs.
   * **Tempo** ist ein Vielfaches des Grundtempos.

   Deshalb stehen in der Liste **abgeleitete** Zahlen, wo es welche
   gibt, und Rohwerte nur da, wo die Ableitung nichts hinzufügt.

   ── Warum die Vorschau nicht `nimmKarte()` ruft ────────────────────

   `nimmKarte()` verändert den Spieler: Es zählt `offeneWahlen`
   herunter, zieht eine neue Hand aus dem **gesäten Zufallsstrom**,
   merkt Abgelehntes, und drei Meta-Regeln greifen mit. Ein Aufruf
   „nur zum Ausrechnen" zöge damit jede spätere Ziehung im Lauf
   um eine Stelle weiter — und zwar für **alle** Rechner im Netz-Koop,
   sobald einer nur mit der Maus über eine Karte fährt.

   `vorschauWerte()` macht deshalb genau das, was `nimmKarte()` an den
   Werten tut, auf einer **Kopie**, und sonst nichts. Dass beides
   dasselbe Ergebnis liefert, ist keine Behauptung: Es wird in
   `werkzeuge/pruefe-werteliste.mjs` nachgerechnet, indem eine echte
   Karte einmal in der Vorschau und einmal wirklich genommen wird.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/werte.mjs` (die Werte und ihre Ableitungen),
   `spiel/stufen.mjs` (`nimmKarte()`, die Wahrheit, gegen die geprüft
   wird), `runtime/karten-hand.js` (sagt, worüber gerade der Finger
   liegt), `runtime/oberflaeche.js` (malt sie bei Aufstieg und Pause),
   `runtime/schrift.js`, `runtime/palette.js`,
   `werkzeuge/pruefe-werteliste.mjs`. */

import { FARBEN } from "./palette.js";
import { zeichneText, textBreite, VORSCHUB } from "./schrift.js";
import {
  WERT_NACH_ID, WERTE, lebenMax, laufTempo, schadensminderung,
  abklingzeit, aufsammelReichweite, regenerationJeSekunde, wert
} from "../spiel/werte.mjs";

/* Wie hoch eine Zeile steht. Enger als `ZEILE` (8) aus
   `runtime/schrift.js`: Die Schrift ist fünf Bildpunkte hoch, und bei
   sieben passen zwei Zeilen mehr in dieselbe Spalte. Enger als sieben
   klebt die Unterlänge der einen an der Oberlänge der nächsten. */
export const ZEILENHOEHE = 7;

/* ── Was gezeigt wird ─────────────────────────────────────────────── */

/* Die feste Kopfgruppe: die Werte, die immer dastehen, auch wenn sie
   null sind.

   ⚠️ **Auch bei null.** Der erste Entwurf blendete Nullwerte aus, und
   das war gemessen falsch: Am Anfang eines Laufs sind **alle** Werte
   null, die Liste war leer, und die Vorschau hatte nichts, woran sie
   sich zeigen konnte. Eine Übersicht, die erst dann etwas sagt, wenn
   man schon etwas hat, hilft genau dann nicht, wenn man sie braucht.

   `lies` macht aus dem Werteobjekt die Zahl, die dasteht. Wo es sie
   gibt, ist das die **abgeleitete** Größe (siehe Kopfnotiz); sonst
   der Rohwert. `einheit` ist das, was hinter der Zahl steht. */
export const KOPFZEILEN = [
  { id: "leben", name: "LEBEN", lies: (w) => Math.round(lebenMax(w)) },
  { id: "schaden", name: "SCHADEN", lies: (w) => Math.round(wert(w, "schaden")) },
  { id: "hast", name: "HAST", einheit: "%", lies: (w) => Math.round(wert(w, "hast")) },
  /* Nicht „Hast %", sondern was dabei herauskommt: Eine Waffe mit
     einer Sekunde Abklingzeit schlägt danach alle X Zehntel zu.
     Hundertstel, damit man den Unterschied zwischen 0,83 und 0,80
     überhaupt sieht. */
  { id: "hast_wirkung", name: "SCHLAGZEIT", einheit: "", roh: false,
    lies: (w) => (Math.round(abklingzeit(w, 1) * 100) / 100).toFixed(2) },
  { id: "tempo", name: "TEMPO", lies: (w) => Math.round(laufTempo(w)) },
  { id: "ruestung", name: "SCHUTZ", einheit: "%",
    lies: (w) => Math.round(schadensminderung(w) * 100) },
  { id: "krit_chance", name: "KRIT", einheit: "%",
    lies: (w) => Math.round(wert(w, "krit_chance")) },
  { id: "krit_schaden", name: "KRITWUCHT", einheit: "%",
    lies: (w) => Math.round(wert(w, "krit_schaden")) },
  { id: "reichweite", name: "WEITE", einheit: "%",
    lies: (w) => Math.round(wert(w, "reichweite")) },
  { id: "lebensregeneration", name: "REGEN",
    lies: (w) => Math.round(regenerationJeSekunde(w) * 10) / 10 },
  { id: "aufsammeln", name: "GRIFF",
    lies: (w) => Math.round(aufsammelReichweite(w)) },
  { id: "glueck", name: "GLÜCK", lies: (w) => Math.round(wert(w, "glueck")) },
  { id: "gier", name: "GIER", lies: (w) => Math.round(wert(w, "gier")) }
];

/* Die Kennungen, die schon in der Kopfgruppe stecken — sie sollen
   nicht ein zweites Mal als Rohwert erscheinen. Abgeleitet aus der
   Liste oben und nicht danebengeschrieben: Zwei Listen für dieselbe
   Sache gehen gut, bis jemand eine ändert (`docs/FEHLERBUCH.md` E2). */
const IM_KOPF = new Set(KOPFZEILEN.map((z) => z.id));

/* ── Die Vorschau ─────────────────────────────────────────────────── */

/* Die Werte, wie sie **nach** dieser Karte wären. Kopie, kein Eingriff.

   Muss Zeile für Zeile dem entsprechen, was `nimmKarte()` in
   `spiel/stufen.mjs` an `spieler.werte` tut — heute ist das genau eine
   Zeile. Wächst sie dort, wächst sie hier; dass beide gleich bleiben,
   hält `werkzeuge/pruefe-werteliste.mjs` fest, indem es beide Wege
   wirklich geht und vergleicht. */
export function vorschauWerte(werte, karte) {
  const kopie = { ...werte };
  if (karte && karte.wert && WERT_NACH_ID.has(karte.wert)) {
    kopie[karte.wert] = (kopie[karte.wert] ?? 0) + karte.menge;
  }
  return kopie;
}

function zahlText(zeile, werte) {
  const roh = zeile.lies(werte);
  return `${roh}${zeile.einheit ?? ""}`;
}

/* Die Zeilen, die dastehen. `karte` darf fehlen — dann ohne Vorschau.

   `alle` schaltet von der Kartenwahl (wenig Platz, links neben der
   Hand) auf die Pause um (viel Platz, zwei Spalten): Dort steht
   zusätzlich **jeder** Wert, den der Spieler tatsächlich hat. */
export function zeilenFuer(werte, karte, alle = false) {
  const nachher = vorschauWerte(werte, karte);
  const zeilen = [];

  for (const z of KOPFZEILEN) {
    const jetzt = zahlText(z, werte);
    const dann = zahlText(z, nachher);
    zeilen.push({ name: z.name, jetzt, dann, geaendert: jetzt !== dann });
  }

  /* Alles Weitere nur, wenn es **nicht null** ist oder wenn die Karte
     es gerade ändert. Die Kopfgruppe oben zeigt sich auch bei null,
     weil man sie sonst nie sähe; hier wäre eine Liste aus fünfzig
     Nullen die Übersicht, die keine ist. */
  for (const id of WERTE) {
    if (IM_KOPF.has(id)) continue;
    const a = werte[id] ?? 0;
    const b = nachher[id] ?? 0;
    if (a === 0 && b === 0) continue;
    if (!alle && a === b) continue;
    const e = WERT_NACH_ID.get(id);
    const einheit = e && e.form !== "flach" ? "%" : "";
    zeilen.push({
      name: (e?.name ?? id).toUpperCase().replace(/ %$/, ""),
      jetzt: `${Math.round(a)}${einheit}`,
      dann: `${Math.round(b)}${einheit}`,
      geaendert: a !== b
    });
  }

  return zeilen;
}

/* Was eine Meta-Karte ändert, lässt sich nicht als Zahl zeigen — sie
   setzt eine Regel. Statt einer leeren Vorschau steht dann der
   Kartentext da; das ist die ehrlichere Auskunft. */
export function metaHinweis(karte) {
  if (!karte || !karte.regel) return null;
  return karte.zeilen?.[0]?.text ?? karte.titel ?? null;
}

/* ── Malen ───────────────────────────────────────────────────────── */

/* Die Breite, die eine Liste braucht: der längste Name, die längste
   Zahlenspalte, und dazwischen Luft.

   Gerechnet und nicht geraten — mit einer festen Zahl wäre entweder
   rechts eine Lücke oder links ein abgeschnittener Name, und beides
   fiele erst im Browser auf. Dieselbe Begründung wie bei `KARTE_B` in
   `runtime/karten-hand.js`. */
export function breiteFuer(zeilen) {
  let name = 0, zahl = 0;
  for (const z of zeilen) {
    name = Math.max(name, textBreite(z.name));
    zahl = Math.max(zahl, textBreite(z.geaendert ? `${z.jetzt} > ${z.dann}` : z.jetzt));
  }
  return name + VORSCHUB + zahl;
}

/* Eine Liste malen. Gibt die benutzte Höhe zurück.

   Die Zahlenspalte ist **rechtsbündig**: Untereinander stehende Zahlen
   liest man an ihrer Länge, und linksbündig wackeln sie mit jeder
   Stelle. Die Vorschau steht in derselben Zeile hinter einem `>` und
   in Grün — dieselbe Farbe, in der die Karten ihre Zahlen tragen
   („ihre werte auf der karte sind dynamisch und grünlich
   hervorgehoben", `runtime/karten-hand.js`). */
export function zeichneWerteliste(c, zeilen, x, y, breite, hoehe) {
  const passen = Math.max(0, Math.floor(hoehe / ZEILENHOEHE));
  /* Passt nicht alles, wird die **letzte** Zeile für den Hinweis
     freigehalten, statt ihn über eine Zeile zu malen. Zwei Texte
     übereinander sind in Bildpunktschrift ein unlesbarer Klumpen —
     und zwar genau einer, den man für einen Anzeigefehler hält. */
  const zuVieleZeilen = zeilen.length > passen;
  const platz = zuVieleZeilen ? Math.max(0, passen - 1) : passen;
  let gemalt = 0;

  for (const z of zeilen) {
    if (gemalt >= platz) break;
    const zy = y + gemalt * ZEILENHOEHE;
    zeichneText(c, z.name, x, zy, z.geaendert ? FARBEN.schrift : FARBEN.schriftMatt);

    const text = z.geaendert ? `${z.jetzt} > ${z.dann}` : z.jetzt;
    const tx = x + breite - textBreite(text);
    if (z.geaendert) {
      /* Der alte Wert bleibt matt, der neue leuchtet grün. Wer nur die
         Farbe sieht und nicht liest, sieht trotzdem sofort, welche
         Zeile die Karte anfasst. */
      zeichneText(c, `${z.jetzt} >`, tx, zy, FARBEN.schriftMatt);
      zeichneText(c, z.dann, tx + textBreite(`${z.jetzt} > `), zy, FARBEN.seucheHell);
    } else {
      zeichneText(c, text, tx, zy, FARBEN.schriftMatt);
    }
    gemalt++;
  }

  /* Was nicht mehr hinpasst, wird **gesagt** und nicht verschwiegen.
     Eine Liste, die stillschweigend endet, liest sich wie eine
     vollständige. */
  if (zuVieleZeilen && passen > 0) {
    const rest = `+${zeilen.length - gemalt} WEITERE`;
    zeichneText(c, rest, x, y + gemalt * ZEILENHOEHE, FARBEN.rahmen);
    return (gemalt + 1) * ZEILENHOEHE;
  }
  return gemalt * ZEILENHOEHE;
}
