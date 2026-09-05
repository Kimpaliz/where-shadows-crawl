# Rückmeldung: Sprites und Bosse

Laufender Fortschrittsbericht des Zweigs `bild/sprites-und-bosse`. Wird
nach jedem Baustein ergänzt — Pflicht, damit bei einem Abbruch nichts
verloren geht.

## 1 · Trefferzeichen für die fünf Schadensarten (erledigt, 05.09.2026)

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

## 2 · Zwei Bosse (erledigt, 05.09.2026)

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

## 3 · Truhen (erledigt, 05.09.2026)

`DINGE.truheZu` (9×7) und `DINGE.truheAuf` (9×9). Wie jedes `DINGE`
nicht gedreht und ohne Katalogeintrag ladbar — `runtime/sprites.js`
baut sie über den bestehenden `dinge`-Zweig in `ladeSprites()`
automatisch mit, `sprites.dinge.truheZu` / `.truheAuf` sind ab sofort
verfügbar.

`truheAuf` trägt den ersten wirklichen Gebrauch von `bilder` (siehe
Abschnitt 4): zwei Bilder, der Goldschein pulsiert zwischen hell
(`goldHell` im Kern) und gleichmäßig warm (nur `gold`) — das macht die
Truhe im Dunkeln eher auffindbar als ein stehendes Bild.

## 4 · Animation als Möglichkeit im Format (erledigt, 05.09.2026)

`runtime/sprites.js` kannte vor dieser Aufgabe **keine** Einzelbilder —
`baueBild(sprite, ersatz, richtung)` liest ausschließlich
`sprite.bild`, ein einziges Raster. Das ist geprüft, nicht vermutet
(siehe Datei, `baueBild`/`alleRichtungen`/`ladeSprites`).

**Die Erweiterung im Format** (nicht in `sprites.js`, das ist verboten
für diese Aufgabe): Ein Sprite kann zusätzlich `bilder: [bild0, bild1,
...]` tragen. `bild` bleibt Pflicht und ist **immer** `bilder[0]` —
jeder heutige Aufrufer, der nur `sprite.bild` kennt, sieht also
einfach das erste Bild und funktioniert unverändert. Genutzt bei
`TREFFER.feuer` (Flamme verglimmt) und `DINGE.truheAuf` (Lichtpuls).
Beide Male geprüft: `bild === bilder[0]` (per `JSON.stringify`-
Vergleich) und jeder Rahmen dieselbe Größe wie `bild`.

### Der Aufruf, den ein künftiger Bild-Agent braucht

`baueBild` selbst **nicht ändern** — stattdessen eine neue, rein
additive Funktion daneben, die nichts am bestehenden Verhalten rührt:

```js
// runtime/sprites.js — neu, additiv, ändert baueBild/alleRichtungen/
// ladeSprites() nicht:
function baueBildfolge(sprite, ersatz, richtung) {
  const rahmen = sprite.bilder ?? [sprite.bild];
  return rahmen.map((bild) => baueBild({ bild, zeichen: sprite.zeichen }, ersatz, richtung));
}

// Für ein gedrehtes Wesen mit Bildfolge, alle 16 Richtungen:
function alleRichtungenBildfolge(sprite, ersatz) {
  const raus = [];
  for (let r = 0; r < RICHTUNGEN; r++) raus.push(baueBildfolge(sprite, ersatz, r));
  return raus; // [richtung][bildIndex] = {l, breite, hoehe, mx, my}
}
```

**Warum additiv statt `ladeSprites()` umzubauen:** Würde
`alleRichtungen()` selbst geändert, damit jeder Eintrag ein Array
statt eines einzelnen Bildes ist, bräche das **jeden** Aufrufer in
`runtime/zeichnen.js`, der heute `sprites.gegner[id][richtung]` direkt
als zeichenbares Bild verwendet — ein Umbau, der weit über diese
Aufgabe hinausgeht und nichts mit Grafik zu tun hat. Mit der additiven
Funktion bleibt `ladeSprites()` unverändert, und ein Bild-/Logik-Agent
kann gezielt einzelne Sprites (z. B. `dinge.truheAuf`) auf die
Bildfolge umstellen, ohne den Rest anzufassen.

**Was zusätzlich gebraucht wird, außerhalb von `runtime/sprites.js`:**
Ein Zeitgeber je Instanz in `runtime/zeichnen.js` (oder im
Spielzustand), der bei jedem Bild `Math.floor(alter / dauerJeBild) %
rahmen.length` bildet und damit in die Bildfolge indiziert — die
Sprite-Daten sagen nur, *welche* Bilder es gibt, nicht *wie schnell*
sie wechseln. Eine Bilddauer steht deshalb bewusst nicht in
`sprite-daten.js`: Das wäre Spielverhalten, nicht Grafik.

**Für ein Gehen** (Janniks Beispiel) bräuchte ein Wesen zusätzlich pro
Richtung mehrere Bilder, nicht nur eines — heute hat jedes
`GEGNER_BILDER`-Wesen ein Bild, das in 16 Richtungen **gedreht** wird.
Eine Gangart bräuchte `bilder` **vor** der Drehung (wie oben skizziert)
und vervielfacht damit die vorgehaltenen Bilder um die Bildanzahl der
Gangart (z. B. 3 Gehbilder × 16 Richtungen = 48 statt 16 pro Wesen).
Das ist machbar, aber eine Entscheidung für den Bild-Agenten, der das
tatsächlich baut — hier nur der Weg dorthin, keine Vorwegnahme.

---

## Geprüft

`node werkzeuge/pruefe-sprites.mjs`: **146 Prüfungen, 0 Fehler**
(vorher 110, mit den bestehenden Prüfungen allein — und davon 2 rot,
solange die neue Ausnahme für die beiden Bosse fehlte). 36 neue
Prüfungen: 8 Trefferzeichen-Kontrastprüfungen, Silhouetten-Prüfung für
alle 9 gedrehten Wesen (7 Gegner + Jäger + 2 Bosse), Bildfolgen-
Unversehrtheit für die 2 animierten Sprites (je 3 Prüfungen), plus die
2 neuen Bosse, die jetzt automatisch durch alle bestehenden
Raster-/Dreh-/Kanten-Prüfungen laufen.

**Jede neue Prüfung einmal absichtlich rot gemacht, Datei danach mit
`git checkout --` zurückgeholt:**

| Prüfung | Eingriff | Meldung |
| --- | --- | --- |
| Silhouette erkennbar | Nahtzeile zwischen Kopf und Umhang des Gebeinfürsten geleert | `Silhouette ist ein Stück, nicht Staub · 151/273 zusammenhängend (55 %)` |
| Trefferzeichen-Kontrast | `wucht` zurück auf Steintöne gesetzt | `hellste Farbe hebt sich vom Bannkreis-Boden ab · Abstand 19.4 (Boden höchstens 52.8)` |
| `bild` ist `bilder[0]` | ein Bildpunkt in `truheAuf.bild` geändert, `bilder[0]` unverändert gelassen | `dinge/truheAuf: bild ist bilder[0]` |
| Rahmen heil / gleiche Größe | eine Zeile in `feuer.bilder[1]` um einen Bildpunkt gekürzt | `treffer/feuer: Rahmen 1 ist ein heiles Raster · Zeile 2 ist 8 breit, erwartet 9` |

Die erste kleine Silhouetten-Probe (ein einzelner isolierter
Bildpunkt) fiel **nicht** durch — bei 311 Bildpunkten bewegt ein
einzelner Ausreißer die 90-%-Schwelle nicht. Erst das Durchtrennen
zweier ganzer Zeilen (Kopf von Umhang getrennt) hat gezeigt, dass die
Prüfung wirklich greift. Notiert, damit die Schwelle nicht für
überempfindlich gehalten wird, wo sie nur robust gegen einzelne
Zierpunkte ist (Blutstropfen bei `schnitt`, Schutt bei `wucht` sollen
ja gerade **nicht** anschlagen).

`node werkzeuge/pruefe-alles.mjs` — grün (Ausgabe in
`../lauf-nach-sprites.txt` außerhalb des Projektordners abgelegt, wie
gefordert).

**Wirklich im Browser angesehen:** `node werkzeuge/vorschau.mjs`
gestartet (Port 8144), das Hauptmenü und der Titelbildschirm laden
ohne Konsolenfehler. Die neuen Sprites selbst erscheinen dort **nicht**
sichtbar — Bosse brauchen einen Katalogeintrag (nicht meine Aufgabe),
Trefferzeichen brauchen einen Aufruf in `runtime/zeichnen.js` statt der
bisherigen Funken-Quadrate (ebenfalls nicht meine Aufgabe), Truhen
brauchen einen Spawn-Punkt in der Spiellogik. Deshalb wie in der
Aufgabenstellung vorgesehen: alle neuen Sprites zusätzlich mit einem
eigenen Node-Skript zu PNG gerendert (Methode aus dem Skill
`pixel-werkstatt`, `png.mjs` über `node:zlib`) — einmal groß mit
Raster, einmal in echter Größe auf dem echten Bannkreis-Bodenton, bei
den Bossen zusätzlich in 8 Richtungen. Genau dabei wurde der
`wucht`-Kontrastfehler und die „Raute statt Figur"-Silhouette des
ersten Gebeinfürst-Entwurfs gefunden — an keiner Zahl, am Bild.

**Was ich nicht prüfen konnte:** wie die Sprites tatsächlich neben
Boden, Licht und Nebel im laufenden Spiel wirken (dafür fehlen die
Katalog- und Zeichenpass-Anschlüsse, die einem anderen Agenten
gehören), und keine echte Bildschirmgröße/Skalierung — nur die
native Bildpunktgröße.

## Zusammenfassung in Zahlen

| Neu | Anzahl | Größe(n) | Farben je Sprite |
| --- | ---: | --- | ---: |
| Trefferzeichen | 5 | 9 × 9 | 2–3 |
| Bosse | 2 | 23 × 21, 21 × 19 (beide ungerade) | 7–9 |
| Truhen | 2 | 9 × 7, 9 × 9 | 6–7 |
| Bildfolgen | 2 (feuer, truheAuf) | je 2 Rahmen | — |

Nicht bearbeitet, niedrigste Priorität laut Auftrag: **Verbesserung
der sechs bestehenden Gegner-Sprites.** Sie liegen unverändert; keiner
davon zeigte in dieser Sitzung einen gemessenen Mangel (anders als am
04.09.2026 bei den Nachtzehrer-Sprites, wo `pixel-werkstatt` echte
Fehler fand). Wer hier weitermacht, sollte zuerst denselben
Silhouetten-/Kontrast-Maßstab aus dieser Aufgabe auf die sechs
bestehenden Arten anwenden, statt nach Gefühl zu ändern.
