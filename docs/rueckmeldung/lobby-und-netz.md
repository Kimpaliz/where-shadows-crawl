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

---

## Baustein 2 · Das Telefon (05.09.2026)

Janniks Ansage: *„spielbar auf desktop und handy!!!!!"*

### Der Fehler, den das Messen gefunden hat

Hochkant war das Spiel **abgeschnitten**, und zwar lautlos. Gemessen am
05.09.2026 im Browser bei 375 x 812 Bildpunkten:

| | vorher | jetzt |
| --- | ---: | ---: |
| Leinwand (CSS-Bildpunkte) | 480 x 270 | **375 x 211** |
| Anteil der Fensterbreite | **128,0 %** | 100,0 % |
| abgeschnitten rechts | **53** Bildpunkte | **0** |

`Math.max(1, Math.floor(…))` hielt den Faktor auch dann bei 1, wenn gar
kein Platz für 480 Bildpunkte war; `overflow: hidden` schnitt links und
rechts je 53 Bildpunkte ab. Man sah den Bannkreis nicht mehr ganz, ohne
dass irgendwo ein Fehler erschien.

### Die Entscheidung: quer ganzzahlig, hoch verkleinert

**Hochkant gibt es keinen ganzzahligen Faktor** — 480 passt nicht in
375. Die Wahl steht also nicht zwischen „ganz" und „krumm", sondern
zwischen „krumm" und „abgeschnitten". Ein vollständiges Bild mit
ungleichen Bildpunkten ist besser als ein sauberes Raster, von dem ein
Fünftel fehlt. Dazu der Hinweis `BITTE QUER HALTEN`.

**Quer bleibt es ganzzahlig**, gemessen:

| Fenster | Leinwand | Faktor | Breite | Höhe |
| --- | --- | ---: | ---: | ---: |
| 736 x 414 (Telefon quer) | 480 x 270 | 1 | 65,2 % | 65,2 % |
| 812 x 375 | 480 x 270 | 1 | 59,1 % | 72,0 % |

Faktor 1 ist auf einem Telefon mit dreifacher Bildpunktdichte genau
**3 Gerätepunkte je Spielpunkt** — sauberer geht es nicht. Deshalb ein
schwarzer Rand statt eines krummen Faktors, wo ein ganzer möglich ist.
Der Bruchfaktor wäre quer 1,389 gewesen.

### Stick und Knopf

Der Stick nimmt die **ganze linke Hälfte**: Der Daumen setzt die Mitte
dort, wo er zuerst aufkommt. Ein kleines festes Feld wäre blind zu
treffen zu schwer — man schaut beim Spielen auf die Mitte des Bildes.
Der Knopf unten rechts misst **100 x 100** Bildpunkte (Mindestmaß für
ein Bedienziel ist 44).

Beide speisen **denselben** Weg wie die Tastatur (`tasten`/`frisch`)
statt eines zweiten Pfads — ein kurzer Tipp ist dadurch genauso vor dem
Verlorengehen geschützt wie ein kurzer Tastendruck.

Eingeblendet wird nur bei `(pointer: coarse)` **und**
`maxTouchPoints > 0`. `coarse` allein wäre zu großzügig: Ein Laptop mit
Touchscreen hätte den Stick mitten im Bild, obwohl eine Maus daneben
liegt. Am Schreibtisch gemessen: `coarse: false`, `maxTouchPoints: 0`,
Bedienung **nicht** sichtbar.

### Im Browser wirklich benutzt

Nicht geprüft, ob ein Knopf da ist — gedrückt:

| gemacht | gemessen |
| --- | --- |
| Knopf unten rechts angetippt | Bildsumme der Leinwand 4.161.941 → 7.794.934 — der Lauf hat angefangen |
| Daumen bei (150, 320) aufgesetzt | Ring und Knopf erscheinen genau dort, `zieht` gesetzt |
| 200 Bildpunkte nach links gezogen | Ausschlag genau **−48** (der Ringradius), nicht −200 |
| Stick voll links, 75 Bilder | die Figur wandert **−74,88** Bildpunkte |
| Stick voll rechts, 150 Bilder | die Figur wandert **+89,15** Bildpunkte |
| losgelassen | Achse auf null, Ring verschwindet |

### Zwei eigene Messfehler, beide vom Verdacht gegen die eigene Zahl gefunden

**1 · Die Bildschleife stand still.** Meine erste Messung meldete für
drei sehr verschiedene Eingaben **dreimal exakt dieselbe Zahl**, bis auf
die zweite Nachkommastelle und die Anzahl der Bildpunkte. Genau das
Muster aus dem Fehlerbuch. Nachgemessen:
`requestAnimationFrame` feuerte **0-mal in 1500 ms**, weil die
Browser-Ansicht verborgen war — gemessen wurde ein eingefrorenes Bild.

**2 · Ich habe meine eigene Prüfschleife eingefangen.** Der zweite
Anlauf taktete die Bildschleife von Hand. Er nahm aber den Rückruf
meiner *eigenen* Zählschleife aus Messfehler 1, die sich immer wieder
neu anmeldete. Auffällig wurde es erst an der Gegenprobe „ändert sich
das Bild überhaupt?" — Antwort: um **0**. Erst danach war die Messung
belastbar (Bildunterschied 3.632.993 beim Start des Laufs).

**Merksatz:** Bevor man aus einer Bildmessung etwas schließt, prüft man,
ob sich das Bild überhaupt bewegt.

### Ein echter Fehler, den die Konsole gefunden hat

`setPointerCapture` wirft `NotFoundError`, wenn es zu der Fingernummer
gerade keinen aktiven Finger gibt. Der Fehler war **unbehandelt** und
brach den Rest des Aufrufs ab — und weil `e.preventDefault()` danach
stand, **scrollte die Seite in genau diesem Fall unter dem Daumen weg**.
Jetzt abgefangen, und abgewehrt wird vor dem Greifen. Gegenprobe mit
denselben Ereignissen: vorher sechs `Uncaught NotFoundError`, jetzt
`geworfen: null`.
