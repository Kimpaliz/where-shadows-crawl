# Changelog-Teil: Auswertungsprotokoll

Eigenständiger Änderungsprotokoll-Ausschnitt für den Auftrag „ein
Auswertungsprotokoll" (05.09.2026), getrennt von `CHANGELOG.md` geführt,
weil parallel arbeitende Sitzungen dort schreiben. Zum Zusammenführen:
diesen Abschnitt oben in `CHANGELOG.md` einfügen, dann diese Datei
leeren oder entfernen.

## Auswertungsprotokoll: Beobachter, Auswertung, Vergleich (05.09.2026)

Auftrag Janniks, wörtlich: „und ganz wichtig. ein auswertungs
protokoll!" — Dauer bis zum letzten Gegner, Tode des Spielers,
Lebenspunkte zu Zeitmarken, Zeit vom ersten Treffer bis zum Tod,
Sterbeentfernung, gleichzeitige Gegner je Zeitmarke, dazu Beute, Werte
und Powerscaling.

**Die tragende Entscheidung:** Kein Haken im Regelkern. `spiel/protokoll.mjs`
tastet die Welt nach jedem Schritt von außen ab (`abtasten(welt)`) und
vergleicht gegen die vorige Abtastung — `welt.mjs`, `kampf.mjs`,
`bewegung.mjs`, `beute.mjs`, `werte.mjs`, `katalog/waffen.mjs` bleiben
unverändert.

`werkzeuge/balance.mjs` bekam dafür einen optionalen `beobachter`-Parameter
in `spieleLauf` (zwei Zeilen, Standardverhalten unverändert, mit
`pruefe-balance.mjs` gegengeprüft). `werkzeuge/auswertung.mjs` spielt
darüber einen Lauf und druckt eine Tabelle, JSON oder einen Vergleich
zweier gespeicherter Stände (`--vergleich`).

Deckt alle sieben von Jannik genannten Kennzahlengruppen ab: Runde
(Dauer, Restzeit, gleichzeitige Gegner je Zeitmarke), Spieler (Tode,
Lebenspunkte zu Zeitmarken, Zeit am Boden, Schadensquelle), Gegner
(erster Treffer bis Tod als Verteilung, Sterbeentfernung, Sofort-Tot-Anteil,
nie getroffen), Beute (erschienen/aufgesammelt/verloren, Zeit bis zum
Aufsammeln) und Powerscaling (Bedarf gegen Leistung je Sekunde, Werte
und Waffen je Wellenende).

`werkzeuge/pruefe-protokoll.mjs`: 30 Prüfungen — fünf synthetische
Szenarien für die Fallen des Beobachters, vier Gegenproben mit
mutiertem Katalog in eigenen Kindprozessen (Waffenschaden, Gegnerleben,
Grabgold, Modus-Elitewelle), zwei Rot-Beweise durchgeführt und
zurückgenommen. Details mit gemessenen Zahlen in
`docs/rueckmeldung/auswertungsprotokoll.md`.

(Wird mit jedem Baustein fortgeschrieben — siehe
`docs/rueckmeldung/auswertungsprotokoll.md` für den Bauverlauf mit
Messungen und Gegenproben.)
