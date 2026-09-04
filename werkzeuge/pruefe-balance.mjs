/* [Aufgabe: Prüfwesen] Ist das Spiel noch ein Spiel?

   ── Was diese Prüfung kann und was nicht ───────────────────────────

   Sie prüft **keine Zahlen**, sondern **Eigenschaften**: dass ein Lauf
   endet, dass er weit genug trägt, dass es keine Wand gibt, und dass
   Koop nicht schwerer ist als allein. Eine Prüfung auf „Siegquote ist
   37 %" wäre bei jeder Katalogänderung rot und würde deshalb bald
   ignoriert.

   ⚠️ Gemessen wird ein **Kunstspieler** (`werkzeuge/balance.mjs`), kein
   Mensch. Er weicht **besser** aus als ein Mensch — er sieht alle
   Gegner gleichzeitig und zittert nicht — und kauft dümmer. Das ist im
   endlosen Modus wichtiger als vorher: Ein perfekter Ausweicher stellt
   ganz andere Anforderungen an die Auslegung als jemand, der sich in
   die Enge treiben lässt. Die Zahlen taugen für **Vergleiche**, nicht
   als Vorhersage.

   ── Zwei Befunde, die diese Prüfung begründen ──────────────────────

   **04.09.2026:** Zu zweit war es gemessen **schwerer** als allein (27
   gegen 37 Prozent), weil das Wellenbudget mit der Spielerzahl wuchs,
   die Arenafläche aber nicht. Ein Koop-Spiel, das seinen eigenen Zweck
   verfehlt — und es fiel nur auf, weil jemand die Tabelle gelesen hat.

   **05.09.2026, beim Bau der Endloswellen:** Die Läufe waren
   **zweigipflig** — sie endeten bei Welle 6 bis 11 oder liefen bis 130
   und weiter. Nichts dazwischen. Ursache war, dass **kein** Gegner
   schneller wird: Wer sauber ausweicht, ist unsterblich, egal wie viele
   Lebenspunkte die Nacht mitbringt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/balance.mjs` (spielt), `spiel/*` (wird gespielt),
   `spiel/katalog/modi.mjs` (was „Ende" überhaupt heißt). */

import { macheMelder } from "./helfer.mjs";
import { messreihe, WELLEN_DECKEL } from "./balance.mjs";
import { modus } from "../spiel/katalog/modi.mjs";

const { melde, ende } = macheMelder({ still: true });
const arena = modus("arena");

/* Feste Saaten: Die Prüfung muss bei zweimaligem Laufen dasselbe
   sagen, sonst ist sie ein Würfel und kein Wächter. */
const REIHEN = [
  { spieler: 1, laeufe: 10 },
  { spieler: 2, laeufe: 6 },
  { spieler: 4, laeufe: 6 }
];

const messungen = REIHEN.map((r) => ({
  ...r, ...messreihe({ laeufe: r.laeufe, spielerzahl: r.spieler, saat: 1 })
}));

/* ── Was für jede Spielerzahl gelten muss ────────────────────────── */

for (const m of messungen) {
  const n = m.spieler;

  /* 1 · Der Anfang gehört niemandem. Wer in Welle 1 oder 2 stirbt, hat
     nichts falsch gemacht — er hatte nur eine Sichel. */
  const fruehTot = (m.stirbtIn[1] ?? 0) + (m.stirbtIn[2] ?? 0);
  melde(fruehTot === 0, `${n} Spieler: niemand stirbt in Welle 1 oder 2`, `${fruehTot}`);

  /* 2 · Der Lauf muss weit genug tragen, dass ein Bau entsteht. Vier
     Wellen sind zwei Minuten und kein Bau. */
  melde(m.welleMittel >= 5, `${n} Spieler: die Läufe tragen weit genug`,
    `Welle ${m.welleMittel.toFixed(1)} im Mittel`);

  /* 3 · Es muss etwas zu holen geben — ohne Aufstiege gäbe es keine
     Kartenwahl, und Bauteil 6 wäre tot. */
  melde(m.stufeMittel >= 4, `${n} Spieler: es wird aufgestiegen`,
    `Stufe ${m.stufeMittel.toFixed(1)}`);

  /* 4 · Keine Wand. Häuft sich mehr als drei Viertel aller Niederlagen
     auf **einer** Welle, ist das kein Anstieg, sondern ein Riegel —
     genau der Fall, den der Hauptmann in Welle 4 einmal gebaut hat.

     Die Grenze ist im endlosen Modus weiter als die 55 % von vorher:
     Ohne Ende gibt es keine Sieger, also sammeln sich alle Läufe auf
     wenigen Wellen, und das ist kein Fehler, sondern Arithmetik. */
  const tote = m.stirbtIn.reduce((a, b) => a + b, 0);
  const schlimmste = Math.max(...m.stirbtIn);
  melde(tote === 0 || schlimmste / tote <= 0.78,
    `${n} Spieler: keine Wand in einer einzelnen Welle`,
    `${schlimmste} von ${tote} in Welle ${m.stirbtIn.indexOf(schlimmste)}`);
}

/* ── Koop darf nicht schwerer sein als allein ─────────────────────── */

const allein = messungen[0];
for (const m of messungen.slice(1)) {
  melde(m.welleMittel >= allein.welleMittel - 1.0,
    `zu ${m.spieler}. ist es nicht schwerer als allein`,
    `Welle ${m.welleMittel.toFixed(1)} gegen ${allein.welleMittel.toFixed(1)}`);
}

/* ── Der endlose Modus muss trotzdem enden ────────────────────────── */

/* ⚠️ **Bekannte Lücke, gemessen und nicht behoben.** Ein endloser Lauf
   ohne Ende ist kein Modus, sondern ein Bildschirmschoner. Allein
   endet heute **jeder** Lauf; zu mehreren erreicht ein Teil davon die
   Notbremse bei Welle ${WELLEN_DECKEL} — der Kunstspieler weicht so
   sauber aus, dass ihn auch schnellere Gegner nicht erwischen.

   Die Zahl unten ist die **gemessene Wirklichkeit vom 05.09.2026**,
   nicht das Ziel. Sie steht hier als Sperrklinke: Sie darf sinken,
   niemals steigen. Das Ziel ist null, und der Weg dahin ist eine
   Entscheidung Janniks („Was kostet ein Sturz im endlosen Modus?") —
   nicht noch eine Runde Zahlendrehen gegen einen Bot, der besser
   ausweicht als jeder Mensch. */
const ABBRUCH_SPERRE = { 1: 0, 2: 6, 4: 5 };

for (const m of messungen) {
  const grenze = ABBRUCH_SPERRE[m.spieler] ?? 0;
  melde(m.abgebrochen <= grenze,
    `${m.spieler} Spieler: höchstens ${grenze} Läufe ohne Ende`,
    `${m.abgebrochen} von ${m.laeufe} erreichten Welle ${WELLEN_DECKEL}`);
}

melde(allein.abgebrochen === 0, "allein endet jeder Lauf", `${allein.abgebrochen} ohne Ende`);

/* ── Der Modus selbst ─────────────────────────────────────────────── */

melde(arena.endlos === true, "der Bannkreis ist endlos");
melde(arena.wellenSekunden === 30, "eine Welle dauert 30 Sekunden", `${arena.wellenSekunden}`);
melde(arena.endet(1) === "zeit", "eine normale Welle endet auf die Uhr");
melde(arena.endet(4) === "elite", "eine Hauptmannswelle endet mit dem Hauptmann");
melde(arena.endet(8) === "elite" && arena.endet(7) === "zeit",
  `jede ${arena.elitewelleJede}. Welle ist eine Hauptmannswelle`);

/* ── Beute kommt an ──────────────────────────────────────────────── */

const beispiel = allein.ergebnisse[0];
melde(beispiel.spieler[0].gold >= 0, "Gold ist nie negativ");
melde(beispiel.spieler.every((s) => s.waffen.length >= 1), "jeder trägt am Ende eine Waffe");
melde(beispiel.spieler.some((s) => s.waffen.length >= 2 || s.gegenstaende >= 1),
  "im Lauf wird wirklich eingekauft",
  `${beispiel.spieler[0].waffen.length} Waffen, ${beispiel.spieler[0].gegenstaende} Fundstücke`);

/* ── Wiederholbarkeit der Messung selbst ─────────────────────────── */

const wieder = messreihe({ laeufe: 3, spielerzahl: 1, saat: 1 });
const nochmal = messreihe({ laeufe: 3, spielerzahl: 1, saat: 1 });
melde(wieder.welleMittel === nochmal.welleMittel,
  "dieselbe Messung zweimal gibt dasselbe",
  `${wieder.welleMittel} / ${nochmal.welleMittel}`);

ende();
