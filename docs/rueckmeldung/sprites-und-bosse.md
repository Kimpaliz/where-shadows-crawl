# Rückmeldung: Sprites und Bosse

Laufender Fortschrittsbericht des Zweigs `bild/sprites-und-bosse`. Wird
nach jedem Baustein ergänzt — Pflicht, damit bei einem Abbruch nichts
verloren geht.

## 1 · Trefferzeichen für die fünf Schadensarten (erledigt)

Neuer Export `TREFFER` in `runtime/sprite-daten.js`, fünf Einträge:
`schnitt`, `wucht`, `feuer`, `frost`, `fluch` — genau diese fünf
Schlüssel, damit ein künftiger Aufruf `TREFFER[schadensart]` ohne
Übersetzungstabelle funktioniert. Alle 9×9, nicht gedreht (wie `DINGE`
— ein Treffer hat keinen Ort mit Blickrichtung, nur einen Ort).

| Art | Silhouette | Farben (Palettennamen) |
| --- | --- | --- |
| schnitt | dicke Diagonale, Blutstropfen an beiden Enden | kontur, eisenHell, blutHell |
| wucht | kompakter Kreuzschlag, Schutt in den Ecken | eisenHell, eisen, eisenDunkel |
| feuer | Flammenzunge, unten breit, oben spitz | glut, flamme, flammeHell |
| frost | dünner Achtstrahl-Stern mit Ästen an den Kardinalspitzen | frost, frostHell |
| fluch | Ring mit vier Widerhaken, Augenschlitz in der Mitte (einziges mit Loch) | bann, bannHell, kontur |

**Gemessen, nicht nur angesehen:** Alle fünf gegen den hellsten
Bannkreis-Bodenton (`boden2`, Leuchtdichte 52,8 von 255 bei
`0,2126·R+0,7152·G+0,0722·B`) geprüft. Erster Entwurf von `wucht` nutzte
Steintöne (`steinHell`/`stein`/`steinDunkel`) — auf dem Steinboden fast
unsichtbar: hellste Farbe 74,2, Abstand nur 21,4. Am gerenderten Bild
gesehen (siehe unten), nicht erraten. Jetzt Eisentöne, Abstand 83,2.
Alle fünf liegen jetzt zwischen 46,1 (fluch) und 105,5 (frost) Abstand.

**Animation:** `feuer` trägt zusätzlich `bilder: [bild0, bild1]` —
Bild 0 ist die volle Flamme, Bild 1 dieselbe Flamme kleiner und ohne
weißglühenden Kern (das Verglimmen über die 0,3 s Lebensdauer des
Treffers). Das ist die erste Nutzung der neuen `bilder`-Möglichkeit im
Format, siehe Abschnitt 4.

**Wirklich angesehen:** Mit einem eigenen Node-Skript gerendert (PNG
über `node:zlib`, keine Abhängigkeit, Methode wie in Scotophobia/
Pixel-Werkstatt) — einmal groß mit Raster, einmal in echter 9×9-Größe
auf dem echten Bannkreis-Boden-Ton. Der `wucht`-Kontrastfehler wurde
so gefunden, nicht durch die Zahlen allein.

## 2 · Zwei Bosse (erledigt)

`GEGNER_BILDER.gebeinfuerst` (23×21, Steigerung des Knochenritters —
Krone, Eisenreste, glimmender Rune-Riss, Umhang breiter als die
Schultern mit fünf Zacken am Saum) und `GEGNER_BILDER.vielfrass`
(21×19, Steigerung des Speiers — bewusst breiter als hoch, Geschwüre,
gedrungen). Beide direkt in `GEGNER_BILDER`, nicht in einem separaten
Topf: `runtime/sprites.js` lädt diesen Katalog unverändert, sobald
`spiel/katalog/gegner.mjs` die beiden IDs bekommt, erscheinen sie ohne
jede weitere Grafikänderung.

**Gemessen** (mit `dreheRaster`/`pruefeRaster` aus dem echten
`runtime/sprites.js`, nicht nachgebaut):

| | gebeinfuerst | vielfrass |
| --- | ---: | ---: |
| Größe | 23 × 21 | 21 × 19 |
| Abweichung 0°/180° | 306 Bildpunkte | 178 Bildpunkte |
| schlimmster Schwund beim Drehen | 0 % (100 % erhalten) | 0 % (100 % erhalten) |
| größte zusammenhängende Fläche | 311/311 (100 %) | 254/254 (100 %) |

Zum Vergleich: Die Prüfung verlangt nur ≥4 Bildpunkte Abweichung und
höchstens 30 % Schwund — beide liegen weit darüber bzw. darunter.

**Wirklich angesehen:** alle 16 Richtungen jedes Bosses gerendert
(PNG, echte Größe, auf Bannkreis-Boden). Beim ersten Entwurf von
`gebeinfuerst` fiel dabei ein Problem auf, das keine Zahl gezeigt
hätte: Krone und Umhang liefen beide spitz zu, die ganze Silhouette
las sich als Raute/Diamant statt als Figur mit Kopf und Umhang. Der
Umhang bleibt jetzt breit und reißt erst am Saum in Zacken auf, statt
gleichmäßig zu spitzen — danach liest sich die Figur als „großer
vermummter Untoter", nicht als Edelstein.

## 3 · Truhen (erledigt)

`DINGE.truheZu` (9×7) und `DINGE.truheAuf` (9×9). Wie jedes `DINGE`
nicht gedreht und ohne Katalogeintrag ladbar — `runtime/sprites.js`
baut sie über den bestehenden `dinge`-Zweig in `ladeSprites()`
automatisch mit, `sprites.dinge.truheZu` / `.truheAuf` sind ab sofort
verfügbar.

`truheAuf` trägt den ersten wirklichen Gebrauch von `bilder` (siehe
Abschnitt 4): zwei Bilder, der Goldschein pulsiert zwischen hell
(`goldHell` im Kern) und gleichmäßig warm (nur `gold`) — das macht die
Truhe im Dunkeln eher auffindbar als ein stehendes Bild.

---

Rot-Beweis siehe Abschnitt „Geprüft" am Ende dieser Datei.
