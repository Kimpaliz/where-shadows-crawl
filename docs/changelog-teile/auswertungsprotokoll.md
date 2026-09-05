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

(Wird mit jedem Baustein fortgeschrieben — siehe
`docs/rueckmeldung/auswertungsprotokoll.md` für den Bauverlauf mit
Messungen und Gegenproben.)
