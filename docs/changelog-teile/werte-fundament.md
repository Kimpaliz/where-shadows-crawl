# Changelog-Teil — Werte-Fundament (Zweig `regeln/werte-fundament`)

Zum Einfalten in `CHANGELOG.md` beim Zusammenführen. Getrennte Datei,
weil `CHANGELOG.md` allen Agenten gehört und jeder gleichzeitige
Eintrag dort ein Konflikt wäre.

---

## Werte-Fundament — 55 Werte, fünf Schadensarten, Krit, Ausweichen (05.09.2026)

### Werte werden eine Tabelle

Aus acht Werten sind **55** geworden. Sie stehen nicht als 55 Felder da,
sondern als Tabelle `WERTE_TABELLE` in `spiel/werte.mjs`, jeder Eintrag
mit Kennung, Anzeigename, Erklärung, Grundwert, Gruppe und Form.
**32 der 55 werden erzeugt** — die fünf Schadensarten mal ihre fünf
Achsen und je Gruppe eine Kartenneigung. Eine sechste Schadensart wäre
ein Eintrag in `spiel/schadensarten.mjs` und keine Zeile in der Tabelle.

Drei Formen sagen der Anzeige, wie eine Zahl zu lesen ist: `flach`
(wird addiert), `prozent` (ist selbst ein Prozentsatz) und
`multiplikator` (Prozentpunkte, die als `1 + x/100` malnehmen).

`WERTE` und `WERT_TEXT` sind daraus **abgeleitet**. Der Rest des Spiels
liest `werte.schaden` unverändert weiter.

### Fünf Schadensarten

`schnitt`, `wucht`, `feuer`, `frost`, `fluch` — neu in
`spiel/schadensarten.mjs`, mit Farbe aus der Palette und Kurztext. Genau
eine Art geht an der Rüstung vorbei (`fluch`); zwei wären zwei Wege um
dieselbe Verteidigung herum, und Rüstung wäre kein Wert mehr. Jede Waffe
trägt ihre `schadensart`, zugeordnet über ihr erstes Merkmal.

### Die eine Schadensrechnung

`berechneSchaden()` in `spiel/werte.mjs` ist ab jetzt die einzige
Stelle, an der Schaden entsteht: Grundschaden → flacher Zuschlag der Art
→ Prozentmodifier → Gruppenbonus → Kritwurf → Widerstand des Ziels →
mindestens 1. Die Reihenfolge steht als Kommentar daneben, mit der
Rechnung, was ihr Vertauschen kostet.

### Ausweichen

Ein Sprung auf Tastendruck (`spiel/ausweichen.mjs`), über mehrere
Schritte statt als Sprung im Nullkommanichts, mit kurzer
Unverwundbarkeit und eigener Abklingzeit. Die Eingabe je Spieler ist ab
jetzt `{ x, y, ausweichen }`.

### Gemessen

Alle neuen Werte stehen auf 0, und der Umbau ist damit **neutral**: Die
neun Balancezahlen aus `werkzeuge/pruefe-balance.mjs` sind vor und nach
dem Umbau zeichengleich (1/2/4 Spieler: welleMittel 6,100 · 104,167 ·
103,333). Der Beweis steht in `docs/rueckmeldung/werte-fundament.md`.
