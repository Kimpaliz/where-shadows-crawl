# Lobby und Netz — was gebaut wurde, was gemessen ist

Arbeitsstrang `koop/lobby-und-netz`, begonnen am 05.09.2026 auf `c5713d9`.

Janniks Ansagen wörtlich: *„Nur lobby beitritt, kein lokal auf der
selben tastatur."* · *„Das spiel über github erreichbar machen für
freunde! also webadresse! und endlich lobbycode."* · *„spielbar auf
desktop und handy!!!!!"*

Diese Datei sammelt je Baustein eine Zeile, dazu die Messungen und die
Rot-Beweise. Sie ist bewusst nüchtern: Was nicht gemessen wurde, steht
am Ende unter „Was ich nicht prüfen konnte".

---

## Baustein 1 · Die Webadresse (05.09.2026)

`.github/workflows/pages.yml` veröffentlicht bei jedem Push auf `main`
über GitHub Pages. Kein Bauschritt: Das Spiel ist reines HTML mit
ES-Modulen und hat null Abhängigkeiten, der Ordner im Repository ist
byteweise der, der ausgeliefert wird. Dazu `.nojekyll` — ohne sie
schiebt Pages alles durch Jekyll, und Jekyll schluckt geräuschlos jeden
Ordner mit führendem Unterstrich.

### Gemessen: alle Pfade sind relativ

Der häufigste Grund, warum ein Spiel daheim läuft und im Netz weiß
bleibt: Unter `https://kimpaliz.github.io/where-shadows-crawl/` liegt
die Seite in einem **Unterordner**. Ein `/runtime/start.js` zeigte dort
auf `kimpaliz.github.io/runtime/start.js`.

Rohbefehl und Ausgabe:

```
$ grep -rnE "(from|import|src=|href=)[[:space:]]*[\"']/" \
    --include=*.js --include=*.mjs --include=*.html .
>>> keine absoluten Pfade <<<

$ node werkzeuge/pruefe-netz.mjs
  47 Quelldateien auf absolute Pfade geprüft

2 Prüfungen, 0 Fehler
```

Alle 28 verschiedenen Importpfade des Projekts beginnen mit `./` oder
`../`; `index.html` lädt `runtime/start.js` ohne führenden Schrägstrich.

Damit das so bleibt, ruft der Pages-Ablauf `pruefe-netz.mjs
--nur-pfade` **vor** dem Hochladen auf und bricht bei einem absoluten
Pfad ab. Lieber dort abbrechen als im Browser eine weiße Seite ohne
Begründung.

### Rot-Beweis

Beide Zusicherungen einzeln absichtlich gebrochen, Datei danach
zurückgelegt (`git diff --stat` leer):

| gebrochen | Meldung | Rückgabewert |
| --- | --- | --- |
| `src="runtime/start.js"` → `src="/runtime/start.js"` | `absoluter Pfad: index.html · src="/runtime/start.js"` — `jeder eigene Pfad ist relativ` | 1 |
| `.nojekyll` weggeschoben | `` `.nojekyll` liegt im Wurzelverzeichnis · ohne sie schiebt Pages die Auslieferung durch Jekyll `` | 1 |

Danach beide wieder grün, 2 Prüfungen, 0 Fehler.

### Was hier nicht geprüft ist

Der Ablauf selbst lässt sich hier nicht ausführen — es gibt keinen
GitHub-Runner. Geprüft ist die Datei gegen das aktuelle Schema
(`actions/checkout@v4`, `actions/configure-pages@v5`,
`actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`,
Berechtigungen `pages: write` und `id-token: write`, Umgebung
`github-pages`). Ob Pages für das Repository überhaupt eingeschaltet
ist, entscheidet Jannik in den Einstellungen des Repositorys — das ist
ein Schalter, den nur er umlegen kann.
