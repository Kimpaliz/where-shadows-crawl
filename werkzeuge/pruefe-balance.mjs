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
   Der **schlimmste von fünf** gemessenen Saatbasen, nicht der einer
   einzigen. Warum das der Unterschied zwischen einem Wächter und einem
   Würfel ist, steht dort. */
const WAND_SPERRE = { 1: 0.54, 2: 0.47, 4: 0.75 };

/* Die gemessene Spanne in Prozentpunkten — steht hier, damit die
   Meldung ihre eigene Genauigkeit mitnennt, statt eine vorzutäuschen.
   Dieselbe Bauart wie `ABBRUCH_STREUUNG` weiter unten. */
const WAND_STREUUNG = { 1: 14, 2: 13, 4: 17 };

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

     ⚠️ **Diese Grenze war ein Würfel mit Meinung — derselbe Fall
     wie bei `ABBRUCH_SPERRE` unten, Fehlerbuch E4.** Sie stand auf
     0,59 / 0,41 / 0,79 und war an **einer** Saatbasis gemessen. Fünf
     Basen zu je 40 Läufen, am selben Code, Anteil der schlimmsten
     Welle an allen Toten (gemessen am 06.09.2026):

     | Spieler | Saat 1 | 201 | 401 | 601 | 801 | schlimmster | Spanne |
     | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
     | 1 | 50,0 | **60,7** | 48,5 | 50,0 | **60,7** | 60,7 | **12,2** |
     | 2 | **40,0** | 38,5 | 31,0 | 39,3 | 37,0 | 40,0 | **9,0** |
     | 4 | 75,0 | 70,8 | 67,9 | 65,5 | **78,9** | 78,9 | **13,4** |

     Die alte Grenze für einen Spieler lag damit **mitten** in der
     Streuung: Zwei der fünf Basen reißen sie, ohne dass am Spiel eine
     Zeile anders wäre. Ob die Kette grün ist, entschied die Saatbasis
     und nicht das Spiel — und genau dieser Wächter sollte den Umbau
     der Nahkampfangriffe beurteilen.

     ⚠️ **Für einen Spieler steigt die Grenze von 0,59 auf 0,61, und
     das ist eine Lockerung.** Sie wird hier ausdrücklich so genannt,
     statt als Reparatur verkauft: Eine Sperrklinke darf sinken und
     nicht steigen. Diese hier stand auf einem Wert, den der Code nie
     eingehalten hat — nur an der einen Saat, an der zufällig gemessen
     wurde. Für zwei Spieler sinkt sie (0,41 → 0,40), für vier bleibt
     sie (0,79). Ab hier gilt die Regel wieder.

     Die schlimmste Welle ist über alle fünf Basen dieselbe: **Welle 6**
     allein und zu zweit, **Welle 8** zu viert. Das ist keine Panne,
     sondern zwei Befunde: Zu viert stirbt man fast nur noch auf
     Bosswellen (Welle 8 ist die erste mit zwei Hauptleuten und trägt
     bei vier Spielern **19.270** Lebenspunkte gegen 9.157 in Welle 7 —
     eine Verdopplung in einer Welle). Allein dagegen steht die Wand auf
     einer **gewöhnlichen** Welle.

     Eine feste Grenze müsste eines von beidem für falsch erklären. Sie
     ist deshalb dieselbe Sperrklinke wie `ABBRUCH_SPERRE` unten: die
     gemessene Wirklichkeit, die sinken darf und nicht steigen. Ob eine
     Bosswelle eine Wand sein *soll*, ist Janniks Entscheidung (#52) —
     nicht die einer Prüfung, die sie stillschweigend wegdefiniert.

     ⚠️ **Was sie nach der Reparatur fängt und was nicht.** Bei einer
     Spanne von 9 bis 13 Prozentpunkten fängt sie keine kleine
     Verschiebung mehr — das konnte sie vorher auch nicht, sie hat es
     nur behauptet. Was sie fängt, ist ein neuer Riegel: eine Welle, an
     der plötzlich vier von fünf Läufen enden.

     Ein Gegenversuch ist gemessen und verworfen: den Knochenritter von
     Welle 8 auf 9 zu schieben (er betritt den Topf genau in der zweiten
     Bosswelle) machte die Wand **schlimmer**, nicht besser — 78,1 auf
     82,9 %, weil dann mehr Läufe Welle 8 überhaupt erreichen.

     ── Nach dem Nahkampf-Umbau neu gemessen ─────────────────────────

     ⚠️ **Der Umbau der Nahkampfangriffe hat diese Zahlen bewegt, in
     beide Richtungen.** Dieselben fünf Basen, nach dem Umbau (der
     Schlag zeigt auf den Gegner und trifft nur, wo die Animation liegt)
     und mit den drei neuen Nahkampfwaffen:

     | Spieler | Saat 1 | 201 | 401 | 601 | 801 | schlimmster | vorher |
     | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
     | 1 | 47,2 | 41,2 | **53,1** | 51,7 | 38,7 | 53,1 | 60,7 |
     | 2 | 41,9 | **46,4** | 40,7 | 33,3 | 35,3 | 46,4 | 40,0 |
     | 4 | 60,9 | **75,0** | 69,6 | 70,4 | 57,7 | 75,0 | 78,9 |

     Allein und zu viert ist die Wand **niedriger** als vorher, zu
     zweit höher. Die Sperre folgt beidem: 0,54 / 0,47 / 0,75. Zwei von
     drei ziehen an, eine lockert — und die eine wird hier benannt.

     ⚠️ **Warum sie zu zweit steigt (0,41 → 0,47).** Zwei Ursachen,
     beide gemessen:

     **1 · Arithmetik.** Der Bruch ist „schlimmste Welle geteilt durch
     **alle Toten**", und es sterben jetzt mehr Läufe, weil weniger
     ohne Ende ausgehen (siehe die Abbruchzahlen weiter unten: zu zweit
     15 → 13, allein 12 → 11, zu viert 21 → 17). Ein Lauf, der vorher
     ewig weiterlief, stirbt jetzt — und zwar an der Wand, denn dort
     stirbt man.

     **2 · Auslegung.** Ein Schlag, der nur noch trifft, wo er hinzeigt,
     ist im Gedränge schwächer als einer, der rundum austeilt. Genau das
     hat Jannik bestellt, und genau das macht Welle 6 härter.

     Eine Zwischenmessung zeigt, wie viel die drei neuen Waffen daran
     retten: **ohne** sie, nur mit dem Umbau, stand die Wand bei
     61,1 / 47,1 / 81,8 — mit ihnen bei 53,1 / 46,4 / 75,0. Mehr
     Auswahl im Laden trifft die Wand härter als jedes Zahlendrehen.

     **Warum der Bruch trotzdem nicht umdefiniert wird.** „Anteil an
     allen **Läufen**" wäre der sauberere Nenner und stünde besser da.
     Den Maßstab zu wechseln, nachdem man das Ergebnis gesehen hat, ist
     aber dasselbe wie die Grenze wegzudefinieren — und dagegen steht
     ein paar Absätze weiter oben ein ausdrücklicher Satz.

     **Was für die nächste Sitzung gilt.** Diese Grenze ist heute
     zweimal angefasst worden. Für einen Spieler ist sie am Morgen
     gestiegen (0,59 → 0,61, weil sie auf einem nie gehaltenen Wert
     stand) und am Abend wieder gefallen (0,61 → 0,54). Zu zweit ist sie
     gestiegen und geblieben. Wer sie das nächste Mal **anhebt**, ohne
     #52 („Was kostet ein Sturz im endlosen Modus?") zu beantworten,
     schafft diesen Wächter ab, statt ihn zu pflegen. */
  const tote = m.stirbtIn.reduce((a, b) => a + b, 0);
  const schlimmste = Math.max(...m.stirbtIn);
  const grenze = WAND_SPERRE[n] ?? 0.78;
  const wandStreu = WAND_STREUUNG[n] ?? 13;
  melde(tote === 0 || schlimmste / tote <= grenze,
    `${n} Spieler: die Wand ist nicht schlimmer als gemessen (${(grenze * 100).toFixed(0)} %)`,
    `${schlimmste} von ${tote} in Welle ${m.stirbtIn.indexOf(schlimmste)} — der Anteil `
    + `schwankt allein durch die Saatbasis um ${wandStreu} Prozentpunkte`);
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
   sagt sie jetzt auch.

   ── Nachgemessen, und die Tabelle oben ist überholt ────────────────

   ⚠️ **Am 06.09.2026 noch einmal gemessen, nach `ff00062` (Salvenmuster
   je Waffe) und `7a06469`.** Dieselben fünf Basen, derselbe Befehl,
   heutiger Code:

   | | Saat 1 | 201 | 401 | 601 | 801 | schlimmster |
   | --- | ---: | ---: | ---: | ---: | ---: | ---: |
   | 1 Spieler | 8 | 12 | 7 | 8 | 12 | **12** |
   | 2 Spieler | 15 | 14 | 11 | 12 | 13 | **15** |
   | 4 Spieler | 20 | 16 | 12 | 11 | 21 | **21** |

   Zwei Dinge stehen damit fest, und keines davon ist hier erledigt:

   **1 · Die Sperre sitzt auf der Kante.** Allein und zu viert ist der
   schlimmste gemessene Wert **genau** die Grenze (12 von 12, 21 von
   21). Die nächste Änderung, die den Spieler stärker macht, macht diese
   Kette rot — nicht weil etwas kaputtgeht, sondern weil #52 („Was
   kostet ein Sturz im endlosen Modus?") weiter offen ist. Wer sie dann
   anhebt, statt #52 zu beantworten, hat den Wächter abgeschafft.

   **2 · Die Zahlen wurden zunächst nicht angezogen.** 15 statt 18 zu
   zweit wäre eine echte Verschärfung gewesen — sie zu nehmen, während
   dieselbe Messung allein und zu viert **gestiegen** war, wäre
   Rosinenpickerei.

   ── Und dann kam der Nahkampf-Umbau ───────────────────────────────

   ⚠️ **Nach dem Umbau der Nahkampfangriffe, dieselben fünf Basen:**

   | | Saat 1 | 201 | 401 | 601 | 801 | schlimmster | vorher |
   | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
   | 1 Spieler | 4 | 6 | 8 | **11** | 9 | **11** | 12 |
   | 2 Spieler | 9 | 12 | **13** | 13 | 6 | **13** | 15 |
   | 4 Spieler | **17** | 12 | 17 | 13 | 14 | **17** | 21 |

   Alle drei sinken, und zu viert deutlich: 21 → 17 von 40 Läufen. Das
   ist die erste Änderung überhaupt, die diese Zahl senkt — und sie
   senkt sie nicht durch Zahlendrehen, sondern weil ein Schlag, der nur
   noch trifft, wo er hinzeigt, den perfekt ausweichenden Kunstspieler
   nicht mehr unsterblich macht.

   Die Sperre folgt: **11 / 13 / 17** statt 12 / 18 / 21. Eine
   Sperrklinke darf sinken, und hier sinkt sie dreimal.

   Der Preis bleibt derselbe wie vorher: Zu viert sitzt sie wieder genau
   auf dem schlimmsten gemessenen Wert (17 von 17). Zwei Fünftel aller
   Viererläufe enden immer noch nicht von selbst, und solange #52 offen
   ist, ändert daran auch der nächste gute Umbau nichts Grundsätzliches.
   Wer diese Zahl anhebt, statt #52 zu beantworten, baut einen
   Bildschirmschoner. */
const ABBRUCH_SPERRE = { 1: 11, 2: 13, 4: 17 };

/* Die gemessene Spanne je Spielerzahl — steht hier, damit die Meldung
   ihre eigene Genauigkeit mitnennt statt eine vorzutäuschen. Aus der
   **zweiten** Tabelle oben (06.09.2026, heutiger Code): 12−7, 15−11,
   21−11. */
const ABBRUCH_STREUUNG = { 1: 7, 2: 7, 4: 5 };

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
