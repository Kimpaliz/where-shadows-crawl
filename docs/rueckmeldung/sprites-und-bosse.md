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

Rot-Beweis siehe Abschnitt „Geprüft" am Ende dieser Datei.
