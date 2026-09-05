# Angriffe sichtbar machen — Trefferzeichen, Krit, Angriffsleiste, Krämer-Frist

Zweig `bild/angriffe-und-anzeige`. Vorgänge #78, #79 (Trefferzeichen und
Krit), #80 (Angriffsleiste), #93 (der Krämer wartet ewig).

Diese Datei wächst mit jedem Schritt um eine Zeile. Sie ersetzt keinen
Eintrag im Changelog — `CHANGELOG.md` gehört nicht zu den Dateien
dieses Auftrags und wurde nicht angefasst.

---

## Schritt 1 · Die vorhandene Arbeit nachgeprüft

Der erste Commit (`97a1d9a`) kam aus einer abgebrochenen Sitzung und war
ungeprüft. Nachgesehen wurde, ob die Felder, die er liest, überhaupt
existieren:

| Geprüft | Ergebnis |
| --- | --- |
| `TREFFER` in `runtime/sprite-daten.js` | vorhanden, fünf Arten — die Datei war schon im Ausgangsstand, obwohl der Commit sie nicht anfasst |
| `bild.l` / `bild.mx` / `bild.my` | `baueBild()` gibt genau diese Form zurück |
| `ZEICHEN_BREITE`, `ZEICHEN_HOEHE`, `VORSCHUB`, `bekannteZeichen` | alle vier aus `runtime/schrift.js` exportiert |
| `welt.zahlen`, `welt.funken` | von `spiel/welt.mjs` angelegt, getaktet und gefiltert; `z.hoch` wächst mit `dt * 16` |
| Lebensdauern 0,18 / 0,3 / 0,7 / 0,8 | stimmen zwischen `spiel/kampf.mjs` und `runtime/zeichnen.js` überein |
| Die fünf `TREFFER`-Schlüssel | genau die fünf `ART_IDS` — keine Übersetzungstabelle nötig |

**Der Zustand der Zeichenfläche stimmt.** `zeichneStaub` läuft
innerhalb von `c.translate(-kamera.x, -kamera.y)` (Zeile 499 bis 616)
und rechnet deshalb in Weltkoordinaten; `zeichneTrefferZeichen` und
`zeichneZahlen` laufen **nach** `c.restore()` und ziehen die Kamera von
Hand ab. Beides passt zu seiner Seite des `restore()`.

**Drei Zahlen im Kommentar über `KRIT_WEISS` standen daneben** und sind
korrigiert: 50,2 → **49,9**, 69,8 → **68,8**, 59,1 → **58,3**. Die
Schlussfolgerung war davon unberührt — 0,30 bleibt der größte Anteil,
der beide Schranken hält —, aber eine Zahl im Kommentar ist eine
Behauptung wie jede andere. Beide Schranken laufen jetzt als Prüfung
mit, statt nur dazustehen.

---

## Schritt 2 · Wie „unterscheidbar" gemessen ist

Die Frage war: Kann man die fünf Trefferzeichen bei **echter Größe**
(9 × 9 Bildpunkte) auseinanderhalten?

**Der erste Anlauf war eine Messung, die nichts misst.** Er verglich die
Zeichen Bildpunkt für Bildpunkt über dem Bannkreis-Boden. Die Zahlen
sahen gut aus — bis die Gegenprobe kam:

| | mittlerer Abstand je Bildpunkt |
| --- | ---: |
| `frost` gegen **sich selbst**, um 1 px versetzt | **241,5** |
| sieben der zehn echten Paare | darunter |

Gemessen wurde Versatz, nicht Unterschied.

**Der zweite Anlauf trennt zwei Kanäle**, wie das Auge bei 9 × 9: welche
Farbe der Fleck hat und welche Form. Nur der Farbkanal (Mittelfarbe über
die gemalten Punkte, Riemersma-Abstand) ist versatzfest:

| | Farbe | Form (1 − IoU) |
| --- | ---: | ---: |
| `frost` gegen sich selbst, 1 px versetzt | **0,0** | 0,70 |
| `feuer` Bild 1 gegen Bild 2 (dasselbe Zeichen beim Verglimmen) | **53,1** | 0,49 |
| schwächstes echtes Paar (`schnitt`/`wucht`) | **125,9** | 0,75 |
| stärkstes echtes Paar (`schnitt`/`feuer`) | 383,0 | 0,69 |

Der Formkanal hält beide Gegenproben für „verschieden" und ist damit als
alleiniges Maß widerlegt. Der Farbkanal trennt sauber: Faktor **2,4**
zwischen der stärksten Gegenprobe und dem schwächsten echten Paar.

**Die Schranke ist 90 und keine neue Zahl** — genau diese benutzt
`werkzeuge/pruefe-werte.mjs` schon für „zwei Arten, die man auf dem
Bildschirm nicht trennen kann, sind keine zwei Arten". Sie liegt im
Abstand zwischen 53,1 und 125,9.

Alle zehn Paare, Farbkanal: schnitt/wucht 125,9 · frost/fluch 153,7 ·
wucht/fluch 170,0 · wucht/frost 255,2 · schnitt/fluch 280,2 ·
feuer/frost 282,0 · feuer/fluch 285,5 · wucht/feuer 306,2 ·
schnitt/frost 381,1 · schnitt/feuer 383,0.

---

## Schritt 3 · Die Angriffsleiste (#80)

**Wo sie liegt: dicht über der Spielertafel**, also über dem unteren
Bildrand statt an ihm — `y = HOEHE − 30`, drei Bildpunkte hoch, ein
Bildpunkt Luft zur Tafel darunter.

Der untere Rand ist der umkämpfteste Streifen des Spiels: unten links
der Daumen, unten rechts der Ausweichknopf, dazu die Kartenhand eines
anderen Auftrags. Nach oben ist der einzige Weg, der niemandem etwas
wegnimmt.

**An der Tafel und nicht in einer Ecke**, weil Waffen jemandem gehören:
Bei vier Jägern braucht jeder seine eigenen, und eine feste Ecke kann
nur einen bedienen. So wächst die Anzeige von selbst mit der
Spielerzahl. Nicht **an der Figur** in der Welt — dort läge sie unter
dem Licht und wäre am dunklen Rand des Bannkreises nicht zu lesen.

Ein Feld je Waffe nebeneinander; bei sechs Waffen auf 112 Bildpunkten
bleiben je 17. Die Farbe ist die der Schadensart — dieselbe, in der
gleich Trefferzeichen und Schadenszahl erscheinen. Ein eigener Ton für
„voll" war der erste Entwurf und wurde verworfen: Er hätte die
Zugehörigkeit ausgerechnet in dem Augenblick gelöscht, in dem gleich das
Trefferzeichen derselben Farbe erscheint.

**Der Nenner kommt aus `abklingzeit()`**, derselben Funktion, mit der
`spiel/kampf.mjs` die Abklingzeit setzt. Eine eigene Formel wäre bei
Hast still falsch gelaufen — der Kern rechnete kürzer, die Leiste liefe
weiter über die alte Strecke, ohne eine Meldung. Genau dafür gibt es
eine Prüfung mit 100 Hast.

---

## Schritt 4 · Die Frist im Krämer (#93)

`bedieneLaden` wartete auf `jeder ist bereit`. Wer die Verbindung
verliert, wird nie bereit — die Runde stand für alle still.

**Ein Befund, der die Meldung im Auftrag schärft:** Ein weggebrochener
Platz liefert **nicht** `undefined`. `netz/lockstep.mjs` füllt in
`holeTick()` jede fehlende Stelle mit `ruhendeEingabe()` auf, also
`{ x: 0, y: 0, ausweichen: false }`. Die Zeile `if (!e || s.bereit)
continue;` greift somit gar nicht; der Platz läuft ganz normal durch die
Schleife und drückt nur nie einen Knopf. Das Ergebnis ist dasselbe
Hängen, die Ursache eine andere.

**Daraus folgt die Wahl der Lösung.** Von `runtime/oberflaeche.js` aus
ist „weg" von „rührt sich gerade nicht" **nicht unterscheidbar** — beide
senden exakt dieselben Nullen. Das ist kein Mangel, sondern die
Antwort: In beiden Fällen soll es weitergehen. Gezählt wird deshalb
**Stille**, nicht Verbindung.

| | |
| --- | --- |
| Frist | **20 s** — ein Abbruch ist meistens ein Aussetzer und kein Weggang |
| Sichtbar ab | **10 s** vorher, als Zähler neben dem `LOS`-Feld |
| Zurückgesetzt durch | jede Regung, auch das Blättern durch die Angebote |
| Allein | keine Frist — dort wartet niemand, und der Krämer soll in Ruhe zu lesen sein |

Gezählt wird in **Ticks**, nicht in Sekunden: `bedieneLaden` wird genau
einmal je Simulationsschritt gerufen, eine Uhr wäre auf zwei Rechnern
verschieden. Die Zähler liegen am **Menü** — Laufzeitzustand —, nicht an
`welt.spieler`. `s.zustand` ist eine Kette ohne Rückweg (`lebt` →
`liegt`); wer weg ist, ist eine Frage der Verbindung und keine
Spielregel, und ein Wiedereinstieg wäre über den Zustand für immer
verbaut. `spiel/` weiß von alldem nichts.

Die Zähler setzen sich bei jedem Krämer selbst zurück, erkannt an der
Welle — damit kommt der Eingriff ohne eine Änderung an
`runtime/start.js` aus.
