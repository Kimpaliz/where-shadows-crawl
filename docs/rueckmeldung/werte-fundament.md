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
