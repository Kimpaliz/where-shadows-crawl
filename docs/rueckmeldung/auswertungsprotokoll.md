# Rückmeldung: Auswertungsprotokoll

Fortlaufendes Bautagebuch zum Auftrag „ein Auswertungsprotokoll", damit
bei einem Abbruch nichts verloren geht. Ein Baustein je Abschnitt,
oben das Neueste. Datierte Vermerke, keine Statusbehauptungen — siehe
`docs/REGELN.md` Regel 14.

## Baustein 5 · `werkzeuge/pruefe-protokoll.mjs`, die Gegenproben (05.09.2026)

**Bausteine 3 und 4** (Beute/Aufstieg/Powerscaling, Vergleich zweier
Stände) waren schon mit Baustein 1 und 2 fertig — `spiel/protokoll.mjs`
liefert sie von Anfang an mit, `werkzeuge/auswertung.mjs --vergleich`
gab es schon. Am 05.09.2026 geprüft: zwei identische Läufe (Saat 1,
1 Spieler) über `--vergleich` gegeneinander gestellt zeigen „keine Zahl
hat sich verschoben"; ein Lauf mit anderer Saat zeigt sofort 17+
verschobene Zahlen mit Vorher/Nachher-Werten.

**30 Prüfungen** in `pruefe-protokoll.mjs`, zwei Sorten:

1. Fünf synthetische Szenarien (Gegner, Beute, Spieler, Schadensquelle,
   Ressourcen) — handgebaute Mini-Welten statt eines echten Laufs, um
   jede Falle einzeln und ohne Zufallseinfluss zu stellen.
2. Vier Gegenproben am echten Spiel mit mutiertem Katalog, jede in
   einem eigenen Kindprozess (Begründung: der ES-Modulcache gibt sonst
   allen Läufen im selben Prozess denselben Katalog — dieselbe Falle,
   die im Projekt schon zweimal aufgetreten ist).

**Zwei Rot-Beweise, beide am 05.09.2026 durchgeführt und zurückgenommen**
(`spiel/protokoll.mjs` danach zeichengleich mit dem committeten Stand,
per `git diff` bestätigt):

- `g.tot` durch `true` ersetzt (jeder Verschwundene zählt als Toter):
  **6 von 30 Prüfungen** schlagen an — unter anderem wird der
  Wellenende-Überlebende g2 fälschlich zum Toten, „nie getroffen" fällt
  auf 0, die Sterbeentfernung verschiebt sich.
- Wissens-Rückrechnung durch `wissenVerbrauchtGesamt = 0` ersetzt
  (naive Differenz statt Formel): **2 Prüfungen** schlagen an, exakt
  die beiden zur Wissensrechnung.

Die vier Gegenproben mit ihren gemessenen Zahlen (Saat/Spielerzahl wie
im Quelltext, alle am 05.09.2026 gelaufen):

| Gegenprobe | vorher | nachher |
| --- | --- | --- |
| G1 · doppelter Waffenschaden → Zeit bis Tod sinkt | 0,461 s | 0,144 s |
| G2 · doppeltes Gegnerleben → Sofort-Tot-Anteil sinkt | 76 % | 3 % |
| G2 · doppeltes Gegnerleben → Zeit bis Tod steigt | 0,112 s | 1,288 s |
| G3 · doppeltes Grabgold → Gold in Welle 1 exakt verdoppelt | 65 | 130 |
| G4 · jede Welle Bosswelle → Hauptmann stirbt praktisch jede Welle | – | 1 von 2 Wellen |

**Ein Befund beim Bauen der Prüfung selbst:** Ein `melde(...)`-Text mit
`„Wort"` (schließendes gerades Anführungszeichen) in einem
doppelt-gequoteten String bricht die JavaScript-Syntax — die
schließende `"` beendet den String vorzeitig. Zweimal passiert, beide
Male durch Umstellen auf Template-Literale (Backticks) behoben, dem
Muster aus `pruefe-vorgaenge.mjs` folgend.

**Kette:** `node werkzeuge/pruefe-alles.mjs` — alle 15 Prüfungen grün
außer `arbeitsweise`, solange dieser Zweig uncommittete Änderungen
trägt (die Regel „Änderung ohne CHANGELOG.md-Eintrag" prüft nur den
offenen Arbeitsbaum, nicht die Historie — nach jedem Commit hier ist
sie wieder grün, siehe `pruefe-arbeitsweise.mjs` Zeile 60). Da
`CHANGELOG.md` laut Auftrag nicht angefasst werden darf (andere
Sitzungen schreiben dort), steht die Begründung stattdessen in
`docs/changelog-teile/auswertungsprotokoll.md` — zum Einfügen bereit,
sobald jemand die Zweige zusammenführt.

## Baustein 2 · `werkzeuge/auswertung.mjs` und der `beobachter`-Haken (05.09.2026)

`balance.mjs`s `spieleLauf` bekam einen optionalen `beobachter`-Parameter
(Standard `undefined`, `beobachter?.(welt)` nach jedem echten
`schrittImLauf`-Aufruf — zwei zusätzliche Zeilen). `node
werkzeuge/pruefe-balance.mjs` am 05.09.2026 danach unverändert grün
(27 Prüfungen, 0 Fehler) — der Haken ändert am bestehenden Verhalten
nichts, solange niemand ihn benutzt.

`werkzeuge/auswertung.mjs` spielt darüber genau einen Lauf und druckt
eine Tabelle (`node werkzeuge/auswertung.mjs --spieler 1 --saat 1`),
JSON (`--json`) oder einen Vergleich zweier gespeicherter Stände
(`--vergleich alt.json`). Am 05.09.2026 an Saat 1/1 Spieler geprüft:
Ausgang „verloren" in Welle 6 nach 170,2 s, 167 erschienene Gegner, 154
gestorben, 54 % davon beim ersten Treffer, Schadensquelle 0 Berührung
gegen 7 Fernkampf (die ersten fünf Wellen haben nur Nahkampf-Gegner,
der Kunstspieler weicht ihnen nach eigener Bauart aus — siehe
`werkzeuge/balance.mjs` Kopfnotiz „Wer sauber ausweicht, ist
unsterblich"; erst der Speier ab Welle 6 trifft ihn). An Saat 7/2
Spieler gegengeprüft: 270 gestorben, 71 am Wellenende überlebt, 66 nie
getroffen, Gold erschienen 1643 gegen 442 verloren — alle Zahlen intern
stimmig (Verhältnisse plausibel, keine negativen oder unendlichen
Werte).

## Baustein 1 · `spiel/protokoll.mjs` (05.09.2026)

Der Beobachter selbst: `macheProtokoll()` liefert `abtasten(welt)` und
`auswerten()`. Kein Import aus `kampf.mjs`, `bewegung.mjs` oder
`beute.mjs` — nur `SCHRITT` aus `welt.mjs` und `schwelle` aus
`stufen.mjs`, beide rein lesend. 419 Zeilen, `node --check` am
05.09.2026 ohne Fehler.

Zwei Fallen von Anfang an eingebaut statt nachträglich gefunden:

1. **`beendeWelle()` räumt `welt.gegner` am Wellenende unbedingt** —
   auch lebende Gegner fallen aus dem Array. Ohne die Unterscheidung
   über `g.tot` (Objekt bleibt nach dem Entfernen lesbar, solange diese
   Datei es als Kartenschlüssel referenziert) wäre jeder Überlebende
   ein erfundener Toter geworden. Dieselbe Unterscheidung gilt für
   Beute: `raeumeBeute()` leert `welt.beute` unbedingt, `bewegeBeute()`
   markiert Aufgesammeltes vorher mit `b.weg = true`.
2. **Wissen darf nicht per Differenz gemessen werden.** `welt.mjs
   schritt()` ruft `pruefeAufstieg` direkt nach `bewegeBeute` — Aufnahme
   und Verbrauch können im selben 1/60-s-Schritt passieren. Eine
   Differenzsumme hätte beides um denselben Betrag verschluckt.
   Stattdessen wird der Verbrauch aus der Aufstiegsformel
   `schwelle(k)` zurückgerechnet; `aufgesammelt = übrig + verbraucht`.
   Gold braucht das nicht, weil es während einer Welle nur zunimmt
   (Einkauf läuft ausschließlich in der Ladenphase).

Offen für die eigene Prüfung später: `abtasten` wurde bisher nur gegen
`node --check` geprüft, noch nicht gegen einen echten Lauf.

## Nächster Baustein

`werkzeuge/balance.mjs` bekommt einen optionalen `beobachter`-Parameter
in `spieleLauf`, damit `werkzeuge/auswertung.mjs` denselben Ablauf
benutzen kann wie der Prüfstand — ohne die bestehende Schnittstelle zu
verändern (Standardwert `undefined`, Verhalten ohne ihn unverändert).
