# Changelog-Teil · Lobby und Netz

Für die Übernahme nach `CHANGELOG.md`. Der Zweig `koop/lobby-und-netz`
fasst `CHANGELOG.md` nicht selbst an — dort arbeiten am 05.09.2026
mehrere Stränge gleichzeitig, und eine gemeinsam beschriebene Datei
wäre ein Konflikt in jedem einzelnen Merge.

---

## Die Webadresse (05.09.2026)

**Janniks Ansage:** *„Das spiel über github erreichbar machen für
freunde! also webadresse!"*

Neu `.github/workflows/pages.yml` — bei jedem Push auf `main` geht die
Seite über GitHub Pages hinaus. **Kein Bauschritt:** Das Spiel ist
reines HTML mit ES-Modulen und ohne Abhängigkeit; was im Repository
liegt, wird byteweise ausgeliefert. Ein Bauschritt dazwischen wäre eine
zweite Wahrheit, in der ein Fehler stecken könnte, den daheim niemand
sieht.

Dazu `.nojekyll`. Ohne diese leere Datei schiebt Pages jede
Auslieferung durch Jekyll, und Jekyll schluckt **geräuschlos** jeden
Ordner und jede Datei mit führendem Unterstrich — ohne Fehlermeldung,
die Datei ist einfach 404.

**Gemessen, weil es der häufigste Grund für eine weiße Seite ist:**
Unter `https://kimpaliz.github.io/where-shadows-crawl/` liegt die Seite
in einem Unterordner, ein `/runtime/start.js` zeigte dort ins Leere.
Alle **28** verschiedenen Importpfade des Projekts sind relativ, über
**47** Quelldateien **0** absolute Pfade
(`node werkzeuge/pruefe-netz.mjs`). Der Pages-Ablauf ruft dieselbe
Prüfung mit `--nur-pfade` vor dem Hochladen auf und bricht sonst ab.

Neu `werkzeuge/pruefe-netz.mjs`, in der Kette und im Wegweiser von
`pruefe-alles.mjs`. **Rot-Beweis** für beide Zusicherungen einzeln:
absoluter Pfad in `index.html` → `absoluter Pfad: index.html ·
src="/runtime/start.js"`, Rückgabewert 1; `.nojekyll` weggeschoben →
`` `.nojekyll` liegt im Wurzelverzeichnis ``, Rückgabewert 1. Dateien
danach byteweise zurückgelegt.
