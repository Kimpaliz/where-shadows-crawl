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
  WERT_NACH_ID, WERTE, GRUPPEN, lebenMax, laufTempo, schadensminderung,
  abklingzeit, aufsammelReichweite, regenerationJeSekunde, wert
} from "../spiel/werte.mjs";
import { symbolFuerWert, maleSymbol, SYMBOL_KANTE, GRUPPEN_MIT_FARBE } from "./wertsymbole.js";

/* Wie hoch eine Zeile steht. Enger als `ZEILE` (8) aus
   `runtime/schrift.js`: Die Schrift ist fünf Bildpunkte hoch, und bei
   sieben passen zwei Zeilen mehr in dieselbe Spalte. Enger als sieben
   klebt die Unterlänge der einen an der Oberlänge der nächsten. */
export const ZEILENHOEHE = 7;

/* Was das Zeichen links kostet: seine Kante plus zwei Bildpunkte Luft.
   Abgeleitet und nicht danebengeschrieben — wer das Zeichen größer
   macht, verschiebt damit auch den Text. */
export const SYMBOL_SPALTE = SYMBOL_KANTE + 2;

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
  { id: "hast_wirkung", name: "SCHLAGZEIT", einheit: "", zeichen: "hast",
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
  { id: "aufsammeln", name: "GRIFF", zeichen: "gier",
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
export function zeilenFuer(werte, karte, alle = false, platz = 0) {
  const nachher = vorschauWerte(werte, karte);
  const zeilen = [];

  const zeile = (name, id, jetzt, dann, zeichenId) => ({
    name, jetzt, dann,
    geaendert: jetzt !== dann,
    symbol: symbolFuerWert(zeichenId ?? id)
  });

  for (const z of KOPFZEILEN) {
    zeilen.push(zeile(z.name, z.id, zahlText(z, werte), zahlText(z, nachher), z.zeichen));
  }

  /* Wie ein Rohwert dasteht — an einer Stelle, damit die kurze und die
     volle Liste nie auseinanderlaufen. */
  const rohZeile = (id) => {
    const e = WERT_NACH_ID.get(id);
    const einheit = e && e.form !== "flach" ? "%" : "";
    const a = werte[id] ?? 0, b = nachher[id] ?? 0;
    /* ⚠️ **Das „ %" im Namen bleibt stehen.** Die Kartenhand streicht
       es (`zeilenVon()` in `spiel/stufen.mjs`), weil dort die Einheit
       schon hinter der Zahl steht. Hier stehen die beiden Zeilen
       **untereinander**: „Schnittschaden" und „Schnittschaden %" sind
       zwei verschiedene Werte, und ohne das Zeichen hiessen sie
       gleich. Im Browser gemessen: sechs solcher Paare in der Liste,
       jedes davon zweimal derselbe Text. */
    return zeile((e?.name ?? id).toUpperCase(), id,
      `${Math.round(a)}${einheit}`, `${Math.round(b)}${einheit}`);
  };

  if (!alle) {
    /* Die kurze Liste — neben der Kartenhand, wo wenig Platz ist.
       Dort steht nur, was gerade etwas aussagt: was der Spieler hat,
       und was die Karte anfasst. Eine Liste aus fünfzig Nullen wäre
       dort die Übersicht, die keine ist. */
    for (const id of WERTE) {
      if (IM_KOPF.has(id)) continue;
      const a = werte[id] ?? 0, b = nachher[id] ?? 0;
      if (a === 0 && b === 0) continue;
      zeilen.push(rohZeile(id));
    }
    return aufPlatz(zeilen, platz);
  }

  /* ── Die volle Liste ────────────────────────────────────────────

     Janniks Ansage: „alle werte die ich genannt habe sollen genommen
     werden". Also **alle** fünfundfünfzig, auch die auf null — in der
     Pause ist der Platz da, und wer nachsieht, will wissen, was es
     überhaupt gibt.

     Sortiert nach den Gruppen aus `spiel/werte.mjs` und mit
     Zwischenüberschriften. Fünfundfünfzig Zeilen ohne Gliederung sind
     eine Wand; nach Bereichen geordnet findet man die Zeile, die man
     sucht, ohne jede zu lesen. */
  const schonDa = new Set(KOPFZEILEN.map((z) => z.id));
  for (const [gruppe, name, farbe] of GRUPPEN_MIT_FARBE) {
    const drin = WERTE.filter((id) => !schonDa.has(id)
      && WERT_NACH_ID.get(id)?.gruppe === gruppe);
    if (drin.length === 0) continue;
    zeilen.push({ ueberschrift: name.toUpperCase(), farbe });
    for (const id of drin) zeilen.push(rohZeile(id));
  }
  return zeilen;
}

/* Die Liste auf den vorhandenen Platz bringen, **ohne** die Zeile zu
   verlieren, um die es geht.

   ⚠️ **Im Browser gemessen, und zwar an genau dem Fall, für den die
   Vorschau da ist.** Die Kopfgruppe hat dreizehn Zeilen, neben die
   Kartenhand passen vierzehn. Fasst eine Karte einen Wert an, der
   **nicht** in der Kopfgruppe steht — „+17 % Flächenschaden" zum
   Beispiel —, kommt eine vierzehnte Zeile dazu, und mit dem Hinweis
   „+N weitere" bleiben nur noch dreizehn: Die eine Zeile, die die
   Karte erklärt, war die einzige, die man **nicht** sah.

   Geworfen wird deshalb von unten nach oben, und zwar nur, was
   **null** ist und was die Karte **nicht** anfasst. Eine Zeile auf
   null sagt „hast du nicht"; das ist verzichtbar, solange man sieht,
   was sich ändert. Die Reihenfolge bleibt dabei, wie sie ist — eine
   Liste, die ihre Zeilen umsortiert, während man sie liest, kann man
   nicht lernen. */
function aufPlatz(zeilen, platz) {
  if (!(platz > 0) || zeilen.length <= platz) return zeilen;
  const raus = [...zeilen];
  for (let i = raus.length - 1; i >= 0 && raus.length > platz; i--) {
    const z = raus[i];
    if (z.geaendert) continue;
    if (z.jetzt !== "0" && z.jetzt !== "0%") continue;
    raus.splice(i, 1);
  }
  return raus;
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
    if (z.ueberschrift) { name = Math.max(name, textBreite(z.ueberschrift)); continue; }
    name = Math.max(name, textBreite(z.name));
    zahl = Math.max(zahl, textBreite(z.geaendert ? `${z.jetzt} > ${z.dann}` : z.jetzt));
  }
  return SYMBOL_SPALTE + name + VORSCHUB + zahl;
}

/* Eine Liste malen. Gibt die benutzte Höhe zurück.

   Links das Zeichen, dann der Name, rechtsbündig die Zahl.
   **Rechtsbündig**, weil untereinander stehende Zahlen an ihrer Länge
   gelesen werden und linksbündig mit jeder Stelle wackeln. Die
   Vorschau steht in derselben Zeile hinter einem `>` und in Grün —
   dieselbe Farbe, in der die Karten ihre Zahlen tragen („ihre werte
   auf der karte sind dynamisch und grünlich hervorgehoben",
   `runtime/karten-hand.js`).

   Das Zeichen trägt die Farbe seines Wertes, wenn die Zeile etwas zu
   sagen hat, und einen gedämpften Ton, wenn nicht. Damit liest sich
   die Liste auch dann noch, wenn man nur die linke Spalte überfliegt:
   Was leuchtet, hat man. */
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

    if (z.ueberschrift) {
      /* Eine Zwischenüberschrift bekommt kein Zeichen — sie **ist**
         die Auskunft, und ein Zeichen daneben behauptete, sie sei ein
         Wert wie die anderen. */
      zeichneText(c, z.ueberschrift, x, zy + 1, z.farbe ?? FARBEN.schriftMatt);
      gemalt++;
      continue;
    }

    /* Das Zeichen füllt die Zeile (sieben hoch), die Schrift ist fünf
       hoch und sitzt deshalb einen Bildpunkt tiefer — so stehen beide
       auf derselben Mittellinie statt auf derselben Oberkante.

       ⚠️ **Nicht andersherum.** Der erste Anlauf setzte das Zeichen auf
       `zy - 1` und die Schrift auf `zy`; optisch dasselbe, aber die
       oberste Zeile ragte damit einen Bildpunkt über den Kasten
       hinaus — von der eigenen Prüfung gefangen, bevor es im Browser
       jemandem aufgefallen wäre. */
    /* ⚠️ **Drei Helligkeiten, und die unterste muss noch lesbar sein.**
       Der erste Anlauf malte Zeilen auf null in `FARBEN.rahmen`
       (#3a3446). Im Browser gemessen war das auf dem fast schwarzen
       Pausengrund kaum zu erkennen — und damit war „alle Werte zeigen"
       wieder eine Auswahl, nur eine unsichtbare. `steinHell` ist
       deutlich zurückgenommen und trotzdem zu lesen.

       Das **Zeichen** behält immer seine eigene Farbe. Es ist die
       Spalte, über die man die Liste überfliegt: Wer nach „Frost"
       sucht, sucht nach Blau, nicht nach einem Wort. Ein gedämpftes
       Zeichen wäre ein zweiter Kanal, der dasselbe sagt wie der Text,
       statt etwas Eigenes. */
    const leer = z.jetzt === "0" || z.jetzt === "0%";
    maleSymbol(c, z.symbol, x, zy);

    const tx = x + SYMBOL_SPALTE;
    zeichneText(c, z.name, tx, zy + 1,
      leer ? FARBEN.steinHell : FARBEN.schrift);

    const text = z.geaendert ? `${z.jetzt} > ${z.dann}` : z.jetzt;
    const zx = x + breite - textBreite(text);
    if (z.geaendert) {
      zeichneText(c, `${z.jetzt} >`, zx, zy + 1, FARBEN.schriftMatt);
      zeichneText(c, z.dann, zx + textBreite(`${z.jetzt} > `), zy + 1, FARBEN.seucheHell);
    } else {
      zeichneText(c, text, zx, zy + 1, leer ? FARBEN.steinHell : FARBEN.schriftMatt);
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
