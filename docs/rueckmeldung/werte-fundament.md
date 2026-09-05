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
