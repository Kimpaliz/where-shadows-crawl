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

---

## Auf dem Telefon spielbar (05.09.2026)

**Janniks Ansage:** *„spielbar auf desktop und handy!!!!!"*

**Ein Fehler, den erst das Messen zeigte:** Hochkant war das Bild
**abgeschnitten**, lautlos. Bei 375 x 812 Bildpunkten stand die Leinwand
mit 480 Bildpunkten Breite da — **128 %** des Fensters —, und
`overflow: hidden` schnitt links und rechts je **53** Bildpunkte ab. Man
sah den Bannkreis nicht mehr ganz, ohne dass irgendwo ein Fehler
erschien. Ursache: `Math.max(1, Math.floor(…))` hielt den Faktor auch
dann bei 1, wenn für 480 Bildpunkte gar kein Platz war.

**Die Entscheidung, und warum:** Hochkant gibt es **keinen**
ganzzahligen Faktor — 480 passt nicht in 375. Die Wahl steht nicht
zwischen „ganz" und „krumm", sondern zwischen „krumm" und
„abgeschnitten"; ein vollständiges Bild mit ungleichen Bildpunkten ist
besser als ein sauberes Raster, dem ein Fünftel fehlt. Jetzt 375 x 211,
**0** Bildpunkte abgeschnitten, dazu der Hinweis `BITTE QUER HALTEN`.
Quer bleibt es ganzzahlig: 736 x 414 und 812 x 375 ergeben beide
Faktor 1 (65,2 % beziehungsweise 59,1 % der Breite) — auf einem Telefon
mit dreifacher Bildpunktdichte genau 3 Gerätepunkte je Spielpunkt.

**Neu die Bedienung für den Daumen** (`index.html`,
`runtime/eingabe.js`): Der Stick nimmt die ganze linke Hälfte, der
Daumen setzt die Mitte dort, wo er aufkommt; der Knopf unten rechts
misst 100 x 100 Bildpunkte. Beide speisen **denselben** Weg wie die
Tastatur (`tasten`/`frisch`) statt eines zweiten Pfads — ein kurzer Tipp
ist dadurch genauso vor dem Verlorengehen geschützt wie ein kurzer
Tastendruck. Eingeblendet nur bei `(pointer: coarse)` **und**
`maxTouchPoints > 0`; am Schreibtisch gemessen `coarse: false`,
Bedienung nicht sichtbar. Dazu `touch-action: none` — sonst deutet der
Browser den Zug als Wischen.

**Neu `ausweichen`** in jeder Eingabe: derselbe Knopf, der im Menü
bestätigt. Zwei Knöpfe wären auf einem Telefon zwei zu viel, und auf
einem Gamepad läge der zweite auf einer Taste, die niemand sucht.

**Im Browser wirklich benutzt**, nicht nur auf Vorhandensein geprüft:
Knopf angetippt → Bildsumme 4.161.941 → 7.794.934, der Lauf fing an.
Daumen aufgesetzt → Ring erscheint dort; 200 Bildpunkte gezogen →
Ausschlag genau **−48** (Ringradius). Stick voll links über 75 Bilder →
Figur **−74,88** Bildpunkte; voll rechts über 150 Bilder → **+89,15**.

**Ein echter Fehler aus der Konsole:** `setPointerCapture` wirft
`NotFoundError`, wenn es zu der Fingernummer keinen aktiven Finger gibt.
Unbehandelt brach das den Rest des Aufrufs ab — und weil
`e.preventDefault()` danach stand, **scrollte die Seite in genau diesem
Fall unter dem Daumen weg**. Jetzt abgefangen, abgewehrt wird vor dem
Greifen. Vorher sechs `Uncaught NotFoundError`, jetzt keiner.

**Zwei eigene Messfehler**, beide durch Misstrauen gegen die eigene Zahl
gefunden: Die Bildschleife stand still (`requestAnimationFrame` feuerte
**0-mal in 1500 ms**, weil die Ansicht verborgen war) — drei sehr
verschiedene Eingaben ergaben dreimal exakt dieselbe Zahl. Und beim
zweiten Anlauf fing ich den Rückruf **meiner eigenen** Zählschleife ein
statt der des Spiels; auffällig wurde das erst an der Gegenprobe „ändert
sich das Bild überhaupt?" — Antwort: um 0. **Merksatz:** Bevor man aus
einer Bildmessung etwas schließt, prüft man, ob sich das Bild bewegt.
