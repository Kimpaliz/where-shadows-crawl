# Rückmeldung: Auswertungsprotokoll

Fortlaufendes Bautagebuch zum Auftrag „ein Auswertungsprotokoll", damit
bei einem Abbruch nichts verloren geht. Ein Baustein je Abschnitt,
oben das Neueste. Datierte Vermerke, keine Statusbehauptungen — siehe
`docs/REGELN.md` Regel 14.

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
