# Rückmeldung — Zweig `regeln/kartenhand`

Phase 13, Vorgänge #65 bis #69. Schritt für Schritt mitgeschrieben,
damit die Arbeit auch dann auffindbar ist, wenn die Sitzung vorher
endet. Jede Zeile trägt ihr Datum.

## Schritt 13.1 — Eine Karte ist ein Katalogeintrag (#66, 05.09.2026)

- Neu `spiel/katalog/karten.mjs`: `SELTENHEITEN` (vier Stufen),
  `REGELN` (die Regelnamen, die eine Meta-Karte setzen darf) und
  `KARTEN` — der eigentliche Katalog. Dazu `ziehbareKarten()`,
  `kartenGruppe()`, `istMeta()`, `seltenheitVon()`.
- `spiel/stufen.mjs` umgebaut: `KARTEN_MENGE` und `GEWICHT` sind weg,
  `ziehKarten()` zieht aus dem Katalog. Neu `regelnVon()`,
  `hatRegel()`, `mengeVon()`, `KARTEN_JE_WAHL = 3`, `META_SCHUB`.
- **Der Befund, der den Umbau begründet:** Vorher waren nur **8 der 55
  Werte** überhaupt ziehbar — der Topf entstand mit
  `for (let i = 0; i < GEWICHT[w]; i++)`, und `0 < undefined` ist
  `false`. Die 47 Werte ohne Eintrag in `GEWICHT` fielen still aus dem
  Spiel. Keine Meldung, keine rote Prüfung.

## Zwischenfall F3 — eine Zeile fehlte (05.09.2026)

Der Sicherungs-Commit `46d58e8` („letzter Stand vor dem Zwischenfall")
hat einen **halb bearbeiteten** Stand festgehalten: Gegenüber `8f34c3d`
fehlte genau eine Zeile in `spiel/stufen.mjs`,

    if (regeln.aderlass) spieler.leben = spieler.lebenMax;

Damit war die Regel `aderlass` gesetzt, aber nirgends gefragt.
`werkzeuge/pruefe-karten.mjs` war deshalb beim Antritt **rot** (74
Prüfungen, 2 Fehler: „Regel gesetzt, aber nie gefragt" und „aderlass
macht beim Aufstieg wieder ganz · 3 von 50"). Zeile wiederhergestellt,
danach 74 Prüfungen, 0 Fehler.

**Merksatz:** Eine Sicherung mitten in einer Bearbeitung sichert auch
die Hälfte. Nur die Prüfkette sagt, welche Hälfte es war.

## Schritt 13.4 — Die Kartenhand am unteren Rand (#69, 05.09.2026)

- Neu `runtime/karten-hand.js` (426 Zeilen), eingehängt in
  `runtime/start.js`. `zeichneWahl()` aus `runtime/oberflaeche.js` wird
  nicht mehr gerufen — die Funktion selbst bleibt dort stehen, weil die
  Datei einem anderen Bereich gehört (siehe „Offen" am Ende).
- Drei Karten, gefächert und um 16 Bildpunkte überlappend, im Bogen
  (die mittlere steht 8 Bildpunkte höher). **Nicht gedreht:** Eine
  gedrehte Bildpunktschrift ist verwaschene Schrift.
- Angetippt wird eine Karte hervorgehoben: 88 × 88 → **140 × 132**, mit
  Seltenheitsname, allen Wertzeilen und dem Flavour-Text. Titel oben,
  darunter die Werte; die **Zahl grün** (`FARBEN.seucheHell`), der Name
  daneben nicht.
- **Ein Klick ruft nicht `nimmKarte`.** Über die Leitung gehen rohe
  Eingaben; `bedieneWahl()` läuft auf allen Rechnern für alle Spieler.
  Ein Klick, der `menue.wahlZeiger` nur örtlich verschöbe, liesse die
  Welten auseinanderlaufen. Der Zeigefinger wird deshalb in Achsen- und
  Knopfeingaben übersetzt und nimmt denselben Weg wie Tastatur und
  Daumen.
- **Zwei Fallen, beide gemessen statt geraten:**
  - `GROSS_B` stand auf 128, gerechnet nur mit dem **Namen** der
    Wertzeile (24 Zeichen). Die Zahl davor war vergessen — 220 von rund
    9.000 gemessenen Zeilen passten nicht. Jetzt 140.
  - Der zweite Tipp („nehmen") verlangte eine **leere** Kette. Nach
    einer Bewegung liegt aber noch das Loslassen darin, während der
    Zeiger schon am Ziel steht: Der zweite Tipp tat **41 Bilder lang
    nichts**. Jetzt wird der Knopf angehängt, aber nie zweimal.
- Auf dem Telefon liegt `#stickfeld` über der ganzen linken Bildhälfte.
  Die Hand horcht deshalb in der **Einfangphase** am Fenster und hält
  ein Zeigerereignis nur an, wenn es wirklich eine Karte trifft.
