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
/* ⚠️ **Warum 40 statt 10/6/6 — und warum das keine Kosmetik ist.**

   Bis zum 05.09.2026 lief diese Prüfung auf 10, 6 und 6 Läufen. Bei
   dieser Stichprobe meldete sie „allein endet jeder Lauf" und hielt
   `ABBRUCH_SPERRE[1] = 0`. Über **120** Läufe gemessen war zur selben
   Zeit jeder fünfte Alleinlauf ohne Ende (26 von 120, 21,7 %). Die
   Prüfung hat also nicht gemessen, was sie behauptet hat — sie hat
   zehn Saaten erwischt, in denen es zufällig gut ging.

   Was die Schwäche bewiesen hat: Das Verhalten `stur` auf dem Hetzer
   senkte die Abbrüche über 120 Läufe von 26 auf 16, und **dieselbe
   Änderung machte die Prüfung rot** (0 → 1 bei zehn Saaten). Ein
   Wächter, dessen Urteil bei einer echten Verbesserung umkippt, ist
   ein Würfel mit Meinung.

   40 Läufe je Spielerzahl kosten rund 60 Sekunden. Das ist der Preis
   dafür, dass die Zahl unten etwas bedeutet. Wer sie senkt, senkt
   nicht die Laufzeit, sondern die Aussagekraft. */
const REIHEN = [
  { spieler: 1, laeufe: 40 },
  { spieler: 2, laeufe: 40 },
  { spieler: 4, laeufe: 40 }
];

/* Die gemessene Wand je Spielerzahl — Erläuterung bei Prüfung 4 unten.
   Sperrklinke: darf sinken, nie steigen. */
const WAND_SPERRE = { 1: 0.59, 2: 0.41, 4: 0.79 };

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

  /* 4 · Die Wand. Häuft sich ein großer Teil aller Niederlagen auf
     **einer** Welle, ist das kein Anstieg, sondern ein Riegel — genau
     der Fall, den der Hauptmann in Welle 4 einmal gebaut hat.

     ⚠️ **Hier stand eine feste Grenze von 0,78, und sie war bei sechs
     Läufen je Reihe nicht zu halten.** Über 40 Läufe gemessen (Saat 1):

     | Spieler | schlimmste Welle | Anteil | Stand |
     | ---: | ---: | ---: | --- |
     | 1 | 6 | 50,0 % | 06.09.2026 |
     | 2 | 6 | 40,0 % | 06.09.2026 |
     | 4 | 8 | **75,0 %** | 06.09.2026 |

     ⚠️ **Die vorige Fassung dieser Tabelle nannte 58,8 / 40,0 / 78,1 %
     und die schlimmste Welle für einen Spieler mit 6, für zwei mit 8.**
     Diese Zahlen stammten von *vor* der Kartenhand und wurden beim
     Nachziehen der Sperren nicht mitgemessen — die Tabelle beschrieb
     also einen Stand, den die Datei zwanzig Zeilen weiter selbst für
     überholt erklärt. Wer die Wand beurteilen wollte, las 58,8 % und
     maß 50,0 %. Von einer unabhängigen Prüfung am 06.09.2026 gefunden,
     an den Nennern erkannt.

     Für die Streuung dieser Werte gilt dasselbe wie für die
     Abbruchzahl weiter unten: Sie sind mit **einer** Saatbasis
     gemessen und auf einen Prozentpunkt genau nicht zu lesen.

     Die Zahlen sind keine Panne, sondern zwei Befunde: Zu viert stirbt
     man fast nur noch auf Bosswellen (Welle 8 ist die erste mit zwei
     Hauptleuten und trägt bei vier Spielern **19.270** Lebenspunkte
     gegen 9.157 in Welle 7 — eine Verdopplung in einer Welle). Allein
     dagegen steht die Wand auf einer **gewöhnlichen** Welle.

     Eine feste Grenze müsste eines von beidem für falsch erklären. Sie
     ist deshalb dieselbe Sperrklinke wie `ABBRUCH_SPERRE` unten: die
     gemessene Wirklichkeit, die sinken darf und nicht steigen. Ob eine
     Bosswelle eine Wand sein *soll*, ist Janniks Entscheidung (#52) —
     nicht die einer Prüfung, die sie stillschweigend wegdefiniert.

     Ein Gegenversuch ist gemessen und verworfen: den Knochenritter von
     Welle 8 auf 9 zu schieben (er betritt den Topf genau in der zweiten
     Bosswelle) machte die Wand **schlimmer**, nicht besser — 78,1 auf
     82,9 %, weil dann mehr Läufe Welle 8 überhaupt erreichen. */
  const tote = m.stirbtIn.reduce((a, b) => a + b, 0);
  const schlimmste = Math.max(...m.stirbtIn);
  const grenze = WAND_SPERRE[n] ?? 0.78;
  melde(tote === 0 || schlimmste / tote <= grenze,
    `${n} Spieler: die Wand ist nicht schlimmer als gemessen (${(grenze * 100).toFixed(0)} %)`,
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
   ohne Ende ist kein Modus, sondern ein Bildschirmschoner. Bei **jeder**
   Spielerzahl erreicht ein Teil der Läufe die Notbremse bei Welle
   ${WELLEN_DECKEL} — der Kunstspieler weicht so sauber aus, dass ihn
   auch schnellere Gegner nicht erwischen.

   **Korrektur vom 05.09.2026:** Hier stand „allein endet heute jeder
   Lauf" und `{ 1: 0 }`. Beides war ein Artefakt der zehn Saaten, auf
   denen diese Prüfung damals lief. Über 120 Läufe gemessen endete
   allein **jeder fünfte nicht** (26 von 120). Die Aussage war nie
   wahr; sie war nur nie widerlegt worden.

   Die Zahlen unten sind die **gemessene Wirklichkeit** bei den 40
   Läufen je Reihe, die oben begründet stehen — nicht das Ziel. Sie
   stehen als Sperrklinke: Sie dürfen sinken, niemals steigen. Das Ziel
   ist null, und der Weg dahin ist eine Entscheidung Janniks („Was
   kostet ein Sturz im endlosen Modus?", Vorgang #52) — nicht noch eine
   Runde Zahlendrehen gegen einen Bot, der besser ausweicht als jeder
   Mensch.

   ⚠️ **Diese Zahlen sind am 05.09.2026 gestiegen, und das widerspricht
   dem Absatz darüber.** Sie stehen hier trotzdem, weil das Verschweigen
   die schlechtere Wahl wäre — aber es ist ausdrücklich kein Freibrief:

   | | vor der Kartenhand | danach |
   | --- | ---: | ---: |
   | 1 Spieler | 6 von 40 | **10 von 40 (25,0 %)** |
   | 2 Spieler | 10 von 40 | **15 von 40 (37,5 %)** |
   | 4 Spieler | 8 von 40 | **16 von 40 (40,0 %)** |

   Die Ursache ist gemessen und keine Panne: Die Aufstiegskarten sind
   mit den Seltenheitsgraden (#69) stärker geworden — mittlere Menge je
   Karte **5,04 → 11,17**, erreichbare Werte **8 → 31**. Das ist genau
   das, was Jannik bestellt hat. Ein stärkerer Spieler überlebt länger,
   und in einem Modus ohne Ende heißt „länger" irgendwann „für immer".

   **Damit ist #52 nicht mehr eine offene Frage, sondern die
   blockierende.** Zwei Fünftel aller Viererläufe enden nicht mehr von
   selbst. Wer diese Zahlen weiter steigen lässt, ohne dass ein Sturz
   etwas kostet, baut einen Bildschirmschoner.

   ── Und jetzt der Teil, der die Zahlen oben relativiert ────────────

   ⚠️ **Am 06.09.2026 gemessen: Diese Kennzahl schwankt allein durch die
   Saatbasis stärker, als jede bisherige Änderung sie bewegt hat.**
   Fünf Basen zu je 40 Läufen, am selben Code:

   | | Saat 1 | 201 | 401 | 601 | 801 | Spanne |
   | --- | ---: | ---: | ---: | ---: | ---: | ---: |
   | 1 Spieler | 6 | 10 | 4 | 7 | 8 | **6** |
   | 2 Spieler | 8 | 13 | 16 | 18 | 10 | **10** |
   | 4 Spieler | 13 | 16 | 19 | 18 | 15 | **6** |

   Die alten Sperren (10 / 15 / 16) lagen damit **mitten in der
   Streuung**: Ob die Kette grün war, entschied die Saatbasis, nicht das
   Spiel. Genau der Fall, der als **E4** im Fehlerbuch steht — dort
   fiel er auf, weil eine echte Verbesserung die Prüfung rot machte;
   hier, weil eine unabhängige Prüfung nachgerechnet hat.

   **Warum trotzdem eine Sperre bleibt.** Über drei Basen gemittelt
   (je 40 Läufe, mit dem heutigen Stand) sind es **9,0 / 13,0 / 17,7**.
   Der Anstieg bei vier Spielern ist also echt und nicht nur Rauschen —
   nur eben nicht auf einen Lauf genau messbar. Eine Prüfung, die drei
   Basen misst, bräuchte 880 s statt 250; das kostet mehr, als sie wert
   ist.

   Deshalb steht die Grenze jetzt auf dem **schlechtesten der fünf
   gemessenen Werte**, plus nichts. Sie fängt damit keine kleinen
   Verschiebungen mehr — das konnte sie ohnehin nie, sie hat es nur
   behauptet. Was sie fängt, ist eine grobe Verschlechterung, und das
   sagt sie jetzt auch. */
const ABBRUCH_SPERRE = { 1: 12, 2: 18, 4: 21 };

/* Die gemessene Spanne je Spielerzahl — steht hier, damit die Meldung
   ihre eigene Genauigkeit mitnennt statt eine vorzutäuschen. */
const ABBRUCH_STREUUNG = { 1: 6, 2: 10, 4: 6 };

for (const m of messungen) {
  const grenze = ABBRUCH_SPERRE[m.spieler] ?? 0;
  const streu = ABBRUCH_STREUUNG[m.spieler] ?? 0;
  melde(m.abgebrochen <= grenze,
    `${m.spieler} Spieler: höchstens ${grenze} Läufe ohne Ende`,
    `${m.abgebrochen} von ${m.laeufe} — die Zahl schwankt allein durch die `
    + `Saatbasis um ${streu}, taugt also nur für grobe Ausschläge`);
}

/* Was von „allein endet jeder Lauf" übrig bleibt, nachdem die Aussage
   widerlegt ist: Allein muss es wenigstens **seltener** ohne Ende
   ausgehen als zu mehreren. Das ist die Eigenschaft, die der Satz
   eigentlich meinte — ein einzelner Spieler hat keine zweite Waffe
   neben sich, die ihm die Welle wegräumt. */
{
  const zuMehreren = messungen.slice(1);
  const anteil = (m) => m.abgebrochen / m.laeufe;
  const schlechtesterMehr = Math.max(...zuMehreren.map(anteil));
  melde(anteil(allein) <= schlechtesterMehr,
    "allein endet ein Lauf nicht seltener als zu mehreren",
    `${(anteil(allein) * 100).toFixed(1)} % gegen ${(schlechtesterMehr * 100).toFixed(1)} %`);
}

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
