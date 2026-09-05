# Rückmeldung — Zweig `regeln/werte-fundament`

Baustein für Baustein mitgeschrieben, damit die Arbeit auch dann
auffindbar ist, wenn die Sitzung vorher endet. Jede Zeile trägt ihr
Datum.

## Baustein 1 — Schadensarten und die Werte-Tabelle (05.09.2026)

- Neu `spiel/schadensarten.mjs`: fünf Arten (`schnitt`, `wucht`,
  `feuer`, `frost`, `fluch`) mit Kennung, Anzeigename, Farbe aus
  `runtime/palette.js`, Kurztext und `ignoriertRuestung`. Genau eine
  Art geht an der Rüstung vorbei: `fluch`. Dazu die Zuordnung
  `MERKMAL_ART` von den acht Waffenmerkmalen auf die fünf Arten — sie
  steht im Katalog und nicht in den Waffen, damit die Prüfung sie
  nachrechnen kann.
- `spiel/werte.mjs` umgebaut: `WERTE_TABELLE` mit **55** Einträgen der
  Form `{ id, name, text, grund, gruppe, form }`, davon **32 erzeugt**
  (5 Arten × 5 Achsen = 25, dazu 7 Kartenneigungen je Gruppe).
  23 Einträge sind getippt. Sieben Gruppen: `wehr`, `angriff`, `krit`,
  `arten`, `beweglichkeit`, `beute`, `karten`. Drei Formen: `flach`,
  `prozent`, `multiplikator`.
- `WERTE` und `WERT_TEXT` sind aus der Tabelle **abgeleitet**, nicht
  mehr getippt.

### Zwei Befunde, beide gemessen (05.09.2026)

**1 · `WERTE` darf nicht selbst die Tabelle werden.** Der Auftrag
verlangte das; gemessen bricht es `spiel/stufen.mjs`, und zwar ohne
rote Prüfung. Dort steht `for (const w of WERTE) ... GEWICHT[w]`, und
`GEWICHT[<Objekt>]` ist `undefined` — die Schleife liefe null Mal, der
Kartentopf bliebe leer, und der erste Aufstieg stürbe an
`WERT_TEXT[undefined][0]`. `spiel/stufen.mjs` gehört einem anderen
Agenten und durfte nicht angefasst werden. Deshalb: die Tabelle heißt
`WERTE_TABELLE`, `WERTE` bleibt die daraus abgeleitete Kennungsliste.
Wer `WERTE` doch zur Tabelle machen will, muss zuerst `stufen.mjs`
umstellen.

**2 · Die Reihenfolge der ersten acht Werte ist Balance.**
`spiel/stufen.mjs` baut den Kartentopf mit `for (const w of WERTE)` und
zieht daraus mit dem gesäten Strom. Beim ersten Anlauf standen die acht
nach Gruppen sortiert an anderer Stelle — dieselbe Menge, andere
Reihenfolge, und der Vier-Spieler-Lauf sprang von welleMittel 103,3 auf
201,0 und riss die Sperrklinke in `pruefe-balance.mjs` (6 Abbrüche bei
erlaubten 5). Behoben, indem die acht in ihrer ursprünglichen
Reihenfolge an den Kopf der Tabelle gestellt wurden. Danach sind alle
neun Balancezahlen wieder **zeichengleich** zum Ausgangsstand.

### Gemessen

| Reihe | vorher (`c5713d9`) | nach Baustein 1 |
| --- | --- | --- |
| 1 Spieler | welleMittel 6,100 · Stufe 6,900 · 0 Abbrüche | identisch |
| 2 Spieler | welleMittel 104,167 · Stufe 27,667 · 3 Abbrüche | identisch |
| 4 Spieler | welleMittel 103,333 · Stufe 27,667 · 3 Abbrüche | identisch |

Der Umbau ist damit nachweislich neutral — die neuen Werte stehen alle
auf 0 und dürfen nichts bewegen.

### Fremde Datei angefasst

`werkzeuge/pruefe-katalog.mjs`: Die eine Zeile
`melde(WERTE.length === 8, ...)` wäre ab jetzt dauerhaft rot. Ersetzt
durch zwei Zusicherungen, die den echten Regressionsschutz behalten
(die acht ursprünglichen Werte gibt es noch, keine Kennung doppelt).
Sonst nichts geändert. Alles Weitere prüft `werkzeuge/pruefe-werte.mjs`.

## Baustein 2 — Krit, Modifier, Widerstände, Schadensart je Waffe (05.09.2026)

- Alle zwölf Waffen tragen jetzt eine `schadensart`, zugeordnet über
  ihr **erstes** Merkmal nach `MERKMAL_ART`. Verteilung: `schnitt` 5,
  `fluch` 3, `wucht` 2, `feuer` 1, `frost` 1.
- `spiel/kampf.mjs` rechnet den Schaden nicht mehr selbst. Es sammelt
  nur noch, was **nicht** vom Ziel abhängt (Waffe, Stufe, Gruppenbonus,
  Art, Fläche) und reicht das an `berechneSchaden()` weiter.
  **Gerechnet wird beim Einschlag, nicht beim Abschuss** — der
  Widerstand gehört dem Ziel, ein Geschoss mit fertigem Schaden träfe
  zwei verschieden gepanzerte Gegner gleich hart.
- Neu wirksam: Kritchance und Kritschaden (global und je Art),
  Schadensart-Modifier flach und in Prozent, Widerstände des Ziels,
  Flächenschaden und Flächenreichweite, Reichweite, Zusatzangriffe,
  Zusatzgeschosse (gefächert), Durchdringung, Regeneration je Sekunde,
  Goldfund und Erfahrung.
- Brand zählt als `feuer`, Gift als `fluch`. Beide tragen den
  Widerstand des Ziels — sonst wäre ein Feuerwiderstand gegen die
  Pechfackel nur ein Sechstel wert, weil ihr Schaden im Brand steckt.

### Gemessen (05.09.2026)

| Probe | Ergebnis |
| --- | --- |
| Grund 10, +5 flach, +100 % | **30** (vertauscht wären es 25 - 20 % daneben) |
| 100 % Kritchance, +50 Kritschaden | 20 statt 10, `krit` wahr |
| Kritchance nur Feuer, Treffer Frost | kein Krit |
| Grund 10 gegen 50 % Feuerwiderstand | 5 |
| Widerstand 100 gesetzt | wirkt als 90 %, gedeckelt |
| fehlendes `widerstaende`-Feld | zählt als 0, Schaden unverändert |
| 30 Rüstung gegen 100 Schnitt / 100 Fluch | 50 / **100** |
| Reichweite +10 % / Flächenwaffe +10 +50 % | 110 / 160 |
| Durchschläge Armbrust bei +1 Durchdringung | 4 |
| Goldfaktor bei 50 Gier und 20 Goldfund | 1,7 |

Balancezahlen weiterhin **zeichengleich** zum Ausgangsstand — alle
neuen Achsen stehen auf 0, also darf sich nichts bewegen.

### Zwei Fallen, in die ich fast gelaufen wäre

**Richtung eines Geschosses.** Für den Fächer lag es nahe, die Richtung
über `atan2` und `cos`/`sin` zu rechnen. Das ist **nicht bitgleich** zu
`x / hypot(x, y)`, und der Unterschied im letzten Bit verschiebt über
tausend Schritte die ganze Nacht. Bei genau einem Geschoss wird deshalb
weiter wie bisher normiert; gedreht wird nur ab dem zweiten.

**Ein zweiter Zufall im Kern.** Der Kritwurf würfelt **nur**, wenn eine
Chance über null besteht. Ein Wurf ohne Chance würde den gesäten Strom
verschieben und jede bisherige Messung entwerten, obwohl sich am Spiel
nichts geändert hat.

## Baustein 3 — Ausweichen (05.09.2026)

Neu `spiel/ausweichen.mjs`. Ein Sprung in die gedrückte Richtung, sonst
in die zuletzt gelaufene. Er läuft über elf Schritte statt in einem —
ein Sprung, der in einem Schritt fertig ist, ist ein Teleport, man
sieht nichts, und es liest sich als Fehler. Während des Sprungs ist der
Spieler unverwundbar; ohne das wäre er nur schnelles Laufen und würde
in einer dichten Front gar nichts ändern.

Angeschlossen in `spiel/bewegung.mjs` (der Sprung hat Vorrang vor dem
Laufen und wird dort im Bannkreis gehalten) und `spiel/welt.mjs`
(rüstet einen neuen Spieler aus, ruft die Regeneration).

**Die Eingabe je Spieler und Schritt ist ab jetzt
`{ x, y, ausweichen }`.** Das Feld darf fehlen; dann wird nicht
gesprungen. Genau deshalb läuft der Kunstspieler in
`werkzeuge/balance.mjs` unverändert weiter.

### Die vier Zahlen sind gerechnet, nicht geraten (05.09.2026)

| Zahl | Wert | woher |
| --- | --- | --- |
| Weite | 46 px | Hauptmann berührt bei 13 + 5 = 18 px, dahinter zwei Schlurfer à 10 px, plus Luft |
| Dauer | 0,18 s | elf Schritte bei 1/60 s, damit die Bewegung sichtbar ist |
| Sprungtempo | 256 px/s | 46 / 0,18 — **1,8-mal** so schnell wie der schnellste Gegner am Tempodeckel (Aaskrähe 74 x 1,9 = 140,6) |
| Abklingzeit | 1,6 s | dauernde Unverwundbarkeit begänne bei 0,18 s; 1,6 ist davon das Neunfache entfernt. Unverwundbar ist man 11,25 % der Zeit |

### Gemessen im laufenden Spiel (05.09.2026)

| Probe | Ergebnis |
| --- | --- |
| Laufen in 11 Schritten | 14,30 px |
| Springen in 11 Schritten | **46,00 px** — genau die versprochene Weite |
| Schritte mit sichtbarer Bewegung | 11 von 11, größter Einzelschritt 4,26 px |
| unverwundbar nach dem ersten Sprungschritt | 0,243 s (beim Laufen 0) |
| Dauerdruck über 200 Schritte | gesperrt, kein zweiter Sprung |
| +30 Ausweichweite | Reichweite 76, gesprungen 76,00 |
| +100 Ausweichhast | Abklingzeit 1,600 auf 0,800 s |
| Sprung gegen den Bannkreis | 185,00 bei erlaubten 185,00 |
| ohne das Feld `ausweichen` | kein einziger Sprung |

**Ein Befund, den Jannik kennen sollte:** Ausweichen ist auch ein
Fortbewegungsmittel. Über einen Abklingzyklus kommt man springend
156,5 px weit gegen 124,8 px im Laufen — **25,4 % schneller**. Das ist
Absicht: Wäre es nicht so, wäre der Sprung nur ein anderes Wort für
Laufen. Wer es nicht will, senkt die Weite oder hebt die Abklingzeit;
beide Zahlen stehen an einer Stelle.

## Baustein 4 — die neue Prüfung (05.09.2026)

Neu `werkzeuge/pruefe-werte.mjs`, **133 Zusicherungen**. Sie wird von
`werkzeuge/pruefe-alles.mjs` selbst gefunden; die Zeile in der
Wegweiser-Tabelle dort ist die einzige Änderung an dieser Datei.

Geprüft werden: die Tabelle (alle sechs Felder, Formen, Gruppen,
ASCII-Kennungen, keine doppelte), die Reihenfolge der ersten acht,
`macheWerte` und `WERT_TEXT`, die Vollzähligkeit der erzeugten Werte,
die fünf Schadensarten samt Farbabstand und Palettenzugehörigkeit, die
Zuordnung Merkmal auf Art bei allen zwölf Waffen, die Schadensrechnung
in ihrer Reihenfolge, Krit, Widerstände, Rüstung und Fluch, die
Waffenwerte, Beute und Karten, der Sprung als Formel und im laufenden
Spiel, und zuletzt, dass zwei Läufe mit derselben Saat gleich enden.

### Rot-Beweis: 16 von 16 (05.09.2026)

Jeder Fall baute genau **einen echten Fehler** in den Quelltext ein
(keine gelöschte Datei, kein leeres Modul), ließ die Prüfung laufen und
legte die Datei danach **byteweise** zurück.

| eingebauter Fehler | was die Prüfung meldete |
| --- | --- |
| Kennung `ruestung` zu `rüstung` | „jede Kennung ist reines ASCII in Kleinbuchstaben - 1 mit Umlaut" |
| Reihenfolge der Werte umgedreht | „die acht ursprünglichen Werte stehen vorn ... - neigung_karten,neigung_beute,..." |
| Prozent vor flach gerechnet | „flacher Zuschlag wirkt vor dem Prozentmodifier" |
| Kritwurf auch ohne Chance | „ohne Kritchance wird nicht gewürfelt - 1 Ziehungen" |
| Fluch geht doch durch die Rüstung | „Fluch geht an der Rüstung vorbei" |
| zweite Art ignoriert Rüstung | „genau eine Art geht an der Rüstung vorbei - frost fluch" |
| zwei Artfarben gleich gesetzt | „die Artfarben liegen mindestens 90 auseinander - kleinster Abstand 0.0" |
| Pechfackel auf Art `frost` | „jede Waffenart folgt ihrem ersten Merkmal - 1 abweichend" |
| Sprungdauer auf einen Schritt | „der Sprung dauert mehrere Schritte und ist kein Teleport - 1 Schritte" |
| letzter Sprungschritt nicht gekürzt | „der Sprung trägt genau seine Reichweite - 46.85 von 46" |
| Sprung ohne Unverwundbarkeit | „der Sprung macht unverwundbar - 0.000 s" |
| Sprung auch ohne Tastendruck | „ohne das Feld `ausweichen` wird nie gesprungen" |
| Abklingzeit des Sprungs auf null | „Dauerdruck ergibt keine Sprungkette - Abklingzeit noch 0.00 s" |
| ein Wert fehlt in `macheWerte` | „macheWerte legt jede Kennung als Zahl an - gier" |
| Widerstand nicht gedeckelt | „der Widerstand ist bei 90 % gedeckelt" |
| Art-Kritchance auf alle Arten | „eine Art-Kritchance gilt nur für ihre Art" |

Zwei Schranken sind **gemessen und nicht geraten**: Der kleinste
Farbabstand zwischen zwei Schadensarten liegt bei 107,1 (frost gegen
fluch), die Schranke steht bei 90 und lässt damit knapp ein Fünftel
Luft. Und die Sprungkette wird nicht über die Strecke gemessen, sondern
über den **Vorsprung** vor bloßem Laufen: ein Sprung bringt 31,7 px
mehr, zwei brächten 63,4 — die Grenze bei einer Sprungweite trennt
beides sauber. Der erste Anlauf maß die Strecke selbst und war
**fälschlich rot** (109,7 px gegen eine geratene Grenze von 92); die
Messung war zu grob, nicht das Verhalten falsch.
