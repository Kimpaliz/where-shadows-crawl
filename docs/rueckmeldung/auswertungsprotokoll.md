# Rückmeldung: Auswertungsprotokoll

Fortlaufendes Bautagebuch zum Auftrag „ein Auswertungsprotokoll", damit
bei einem Abbruch nichts verloren geht. Ein Baustein je Abschnitt,
oben das Neueste. Datierte Vermerke, keine Statusbehauptungen — siehe
`docs/REGELN.md` Regel 14.

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
