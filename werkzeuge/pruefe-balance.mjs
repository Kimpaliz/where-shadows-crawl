/* [Aufgabe: Prüfwesen] Ist das Spiel noch ein Spiel?

   ── Was diese Prüfung kann und was nicht ───────────────────────────

   Sie prüft **keine Zahlen**, sondern **Eigenschaften**: dass man
   verlieren kann, dass man gewinnen kann, dass es keine Wand gibt, und
   dass Koop nicht schwerer ist als allein. Eine Prüfung auf „Siegquote
   ist 37 %" wäre bei jeder Katalogänderung rot und würde deshalb bald
   ignoriert.

   Die Grenzen sind bewusst weit. Sie fangen den Fall ab, den man beim
   Zahlendrehen wirklich baut: „Ich habe eine Waffe stärker gemacht,
   und jetzt gewinnt man immer" oder „Welle 4 tötet neunzig Prozent".

   ⚠️ Gemessen wird ein **Kunstspieler** (`werkzeuge/balance.mjs`), kein
   Mensch. Er weicht besser aus und kauft dümmer. Die Zahlen taugen für
   Vergleiche, nicht als Vorhersage.

   ── Der Befund, der diese Prüfung begründet ────────────────────────

   Am 04.09.2026 war zu zweit gemessen **schwerer** als allein (27
   gegen 37 Prozent), weil das Wellenbudget mit der Spielerzahl wuchs,
   die Arenafläche aber nicht. Das ist ein Koop-Spiel, das seinen
   eigenen Zweck verfehlt — und es fiel nur auf, weil jemand die
   Tabelle gelesen hat. Jetzt fällt es auf, ohne dass jemand liest.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/balance.mjs` (spielt), `spiel/*` (wird gespielt). */

import { macheMelder } from "./helfer.mjs";
import { messreihe } from "./balance.mjs";
import { WELLEN_JE_LAUF } from "../spiel/katalog/wellen.mjs";

const { melde, ende } = macheMelder({ still: true });

/* Feste Saaten: Die Prüfung muss bei zweimaligem Laufen dasselbe
   sagen, sonst ist sie ein Würfel und kein Wächter. */
const REIHEN = [
  { spieler: 1, laeufe: 20 },
  { spieler: 2, laeufe: 12 },
  { spieler: 3, laeufe: 12 },
  { spieler: 4, laeufe: 12 }
];

const messungen = REIHEN.map((r) => ({
  ...r, ...messreihe({ laeufe: r.laeufe, spielerzahl: r.spieler, saat: 1 })
}));

for (const m of messungen) {
  const n = m.spieler;

  /* 1 · Man muss verlieren können. Ein Spiel, das man immer gewinnt,
     hat keine Entscheidungen mehr. */
  melde(m.siegquote < 0.95, `${n} Spieler: man kann verlieren`,
    `${(m.siegquote * 100).toFixed(0)} % Siege`);

  /* 2 · Und gewinnen. Ohne einen einzigen Sieg in zwanzig Läufen ist
     entweder das Spiel unfair oder der Kunstspieler kaputt — beides
     will man wissen. */
  melde(m.siegquote > 0.05, `${n} Spieler: man kann gewinnen`,
    `${(m.siegquote * 100).toFixed(0)} % Siege`);

  /* 3 · Der Anfang gehört niemandem. Wer in Welle 1 oder 2 stirbt, hat
     nichts falsch gemacht — er hatte nur eine Sichel. */
  const fruehTot = m.stirbtIn[1] + m.stirbtIn[2];
  melde(fruehTot === 0, `${n} Spieler: niemand stirbt in Welle 1 oder 2`, `${fruehTot}`);

  /* 4 · Keine Wand. Häuft sich mehr als die Hälfte aller Niederlagen
     auf **einer** Welle, ist das keine Kurve, sondern ein Riegel —
     genau der Fall, den der Hauptmann in Welle 4 einmal gebaut hat. */
  const tote = m.stirbtIn.reduce((a, b) => a + b, 0);
  const schlimmste = Math.max(...m.stirbtIn);
  melde(tote === 0 || schlimmste / tote <= 0.55,
    `${n} Spieler: keine Wand in einer einzelnen Welle`,
    `${schlimmste} von ${tote} in Welle ${m.stirbtIn.indexOf(schlimmste)}`);

  /* 5 · Der Lauf muss weit genug tragen, dass ein Bau entsteht. */
  melde(m.welleMittel >= WELLEN_JE_LAUF * 0.4,
    `${n} Spieler: die Läufe tragen weit genug`, `Welle ${m.welleMittel.toFixed(1)} im Mittel`);

  /* 6 · Es muss etwas zu holen geben — ohne Aufstiege gäbe es keine
     Kartenwahl, und Bauteil 6 wäre tot. */
  melde(m.stufeMittel >= 4, `${n} Spieler: es wird aufgestiegen`,
    `Stufe ${m.stufeMittel.toFixed(1)}`);
}

/* 7 · Koop darf nicht schwerer sein als allein. Das ist die Regel, die
   dem Projekt seinen Zweck gibt (docs/SPIEL.md 4). Etwas Spielraum,
   weil zwölf Läufe rauschen — aber ein deutlicher Abfall wäre ein
   Entwurfsfehler und keine Streuung. */
const allein = messungen[0];
for (const m of messungen.slice(1)) {
  melde(m.welleMittel >= allein.welleMittel - 1.0,
    `zu ${m.spieler}. ist es nicht schwerer als allein`,
    `Welle ${m.welleMittel.toFixed(1)} gegen ${allein.welleMittel.toFixed(1)}`);
}

/* 8 · Beute muss ankommen. Bleibt fast alles liegen, ist entweder die
   Aufsammelreichweite kaputt oder die Wellen enden zu abrupt — beim
   ersten Bau kamen nur 5 von 26 Gold an, und daran lag es, dass man
   nie etwas kaufen konnte. */
const beispiel = allein.ergebnisse[0];
melde(beispiel.spieler[0].gold >= 0, "Gold ist nie negativ");
melde(beispiel.spieler.every((s) => s.waffen.length >= 1), "jeder trägt am Ende eine Waffe");
melde(beispiel.spieler.some((s) => s.waffen.length >= 2 || s.gegenstaende >= 1),
  "im Lauf wird wirklich eingekauft",
  `${beispiel.spieler[0].waffen.length} Waffen, ${beispiel.spieler[0].gegenstaende} Fundstücke`);

/* 9 · Wiederholbarkeit der Messung selbst. Ohne sie wäre jede Zahl
   oben ein Zufallswert, und die Prüfung wäre bei jedem zweiten Lauf
   rot — was schlimmer ist als keine Prüfung. */
const wieder = messreihe({ laeufe: 6, spielerzahl: 1, saat: 1 });
const nochmal = messreihe({ laeufe: 6, spielerzahl: 1, saat: 1 });
melde(wieder.welleMittel === nochmal.welleMittel && wieder.siegquote === nochmal.siegquote,
  "dieselbe Messung zweimal gibt dasselbe",
  `${wieder.welleMittel} / ${nochmal.welleMittel}`);

ende();
