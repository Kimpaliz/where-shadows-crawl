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

---

## Schritt 5 · Im Browser nachgesehen

Chrome, eigener Vorschauserver auf Port **8155**, eigener Tab. Vor jeder
Messung wurde `location.port` geprüft — mit gutem Grund, siehe unten.

### Die Angriffsleiste füllt wirklich

Eine laufende Welle, 25 Sekunden, **1280 Bilder**, in jedem davon war die
Anzeige auf dem Schirm:

| | |
| --- | ---: |
| verschiedene Füllstände | **27** |
| Spanne | 0 bis 106 Bildpunkte (die volle Breite) |
| Bilder mit voller Leiste | 689 |
| Bilder beim Laden | 591 |

Die Zwischenstufen liegen dicht (0 · 4 · 8 · 13 · 17 · 21 · 25 · 29 ·
34 · 38 · 42 · 46 · 50 · 55 · 59 …) — die Leiste läuft durch, sie
springt nicht. Der Ton war durchgehend `rgb(130,136,150)`, also
`#828896`, die Artfarbe von `schnitt`; die Sichel ist eine
Schnittwaffe.

### Die fünf Trefferzeichen durch den echten Zeichenweg

`ladeSprites()` im Browser aufgerufen und die **wirklich gerenderten**
Bildpunkte ausgelesen — nicht die Rasterdaten aus der Quelldatei. Die
Mittelfarben stimmen mit der Node-Messung **auf die Nachkommastelle**
überein (125,9 · 153,7 · 170,0 · 255,2 · 280,2 · 282,0 · 285,5 · 306,2 ·
381,1 · 383,0). Alle fünf sind 9 × 9 mit Mittelpunkt 4,4; `feuer` trägt
zwei Bilder, die übrigen eines.

Im Bild nebeneinander betrachtet: Flamme, Frostkristall und Fluchring
heben sich sofort ab; `schnitt` ist die dünnste und `wucht` die
unauffälligste Form auf dem grauen Boden — genau das Paar, das mit
125,9 auch rechnerisch am engsten liegt.

### Der Krit

**Ein Krit ist im Spiel ohne gekauften Gegenstand unmöglich:**
`krit_chance` hat den Grundwert 0. In 1280 Bildern gespielter Welle kam
folgerichtig keiner vor.

Deshalb durch den **echten Zeichenweg** gerendert (`zeichne` →
`zeichneZahlen` → `zahlStil` → Ziffernblitter) mit einer gebauten Welt,
in der `welt.zahlen` von Hand gefüllt ist:

| | normal | Krit |
| --- | ---: | ---: |
| Ton | `#828896` | `#a8acb6` |
| Bildpunkte im Bild | 34 | **88** |
| Text | `37` | `37!` |
| Größe | 1 | **2** |

Im Bild ist der Krit deutlich größer, heller und trägt das
Ausrufezeichen.

### Wo die Leiste auf dem Handy landet

Gemessen wurden die Bildschirmrechtecke, nicht geschätzt.

| | Leiste | Ausweichknopf | Abstand |
| --- | --- | --- | ---: |
| quer 812 × 375 | x 365–448, y 270–272 | x 691–791 | **243 px** seitlich frei |
| hoch 375 × 812 | x 146–229, y 488–490 | x 254–354, y 687–787 | **197 px** darüber |

Der Daumen-Stick hat kein festes Feld: `stickfeld` nimmt die halbe
Bildschirmseite, und Ring und Knopf (`stickring`, `stickknopf`) stehen
im Ruhezustand auf `opacity: 0` außerhalb des Bildes — sie erscheinen
dort, wo der Finger aufsetzt. Die Leiste sitzt waagerecht in der Mitte
(45 bis 55 % der Breite) und damit in dem Streifen, den beim
Querhalten weder der linke noch der rechte Daumen bedeckt.

### Die Frist im Krämer, sichtbar

Zwei Spieler, J2 seit 13 Sekunden still: In seiner `LOS`-Zeile steht
rechts eine rote **7**, in J1s Zeile nichts. Gegenproben im selben
Lauf: beide aktiv → kein Zähler (0 Bildpunkte), allein → kein Zähler
(0 Bildpunkte).

---

## Schritt 6 · Was das Bild kostet

Gemessen in Chrome gegen die **Fassungen von vor der Änderung**, aus
git geholt und parallel geladen, damit beide auf derselben Welt und
demselben Boden laufen. Median aus neun Bündeln zu 200 beziehungsweise
400 Aufrufen — einzelne Aufrufe sind zu kurz für die Auflösung von
`performance.now()`.

**Trefferzeichen, Staub und Zahlen** (`zeichne`, ein Spieler):

| Last | vorher | nachher | Aufschlag |
| --- | ---: | ---: | ---: |
| 0 Funken, 0 Zahlen | 0,399 ms | 0,385 ms | **±0** (Rauschen) |
| 12 Funken, 8 Zahlen | 0,404 ms | 0,706 ms | **+0,302 ms** |
| 30 Funken, 20 Zahlen | 0,528 ms | 0,908 ms | **+0,380 ms** |

Ohne Treffer auf dem Schirm kostet die Änderung **nichts** — die
Schleifen laufen dann über leere Listen. Der Aufschlag wächst zudem
schwächer als die Menge: dreimal so viele Funken kosten nur ein
Viertel mehr, weil der Staub je Korn ein einzelner Bildpunkt ist.

**Die Angriffsleisten** (`zeichneAnzeige`):

| | vorher | nachher | Aufschlag |
| --- | ---: | ---: | ---: |
| 1 Spieler, 1 Waffe | 0,1045 ms | 0,1048 ms | +0,0003 ms |
| 1 Spieler, 6 Waffen | 0,1052 ms | 0,1105 ms | +0,0053 ms |
| 4 Spieler, 6 Waffen | 0,1520 ms | 0,1665 ms | **+0,0145 ms** |

Vierundzwanzig Leisten kosten zusammen **ein Sechzigstel** dessen, was
die Trefferzeichen im Kampf kosten.

---

## Was ich nicht prüfen konnte

* **Einen Krit aus dem Spiel heraus.** Die Grundchance ist 0; es
  bräuchte einen gekauften Gegenstand und einen glücklichen Wurf. Der
  Zeichenweg ist durchgespielt, der Weg über die Würfel nicht.
* **Alle fünf Trefferzeichen im Kampf.** In den gespielten Läufen waren
  nur Schnittwaffen zu haben, also war nur das Schnittzeichen zu sehen.
  Die übrigen vier sind über den echten Zeichenweg belegt, nicht über
  eine Waffe in der Hand.
* **Ein echter Verbindungsabbruch.** Für #93 gab es keinen zweiten
  Rechner. Belegt sind die Rechnung, die Anzeige und die Gegenproben —
  nicht der Ernstfall.
* **Ein echtes Telefon.** Gemessen wurde die Bildschirmgröße im
  Browser, nicht Glas unter einem Daumen.
* **Die Bildrate im Spielbetrieb.** Die Messung oben ist die Zeit der
  Zeichenfunktionen, nicht die Bildrate der laufenden Seite: Mein
  eigener Abtaster liest je Bild die Leinwand aus und drückt sie damit
  selbst auf rund 51 Bilder je Sekunde.

## Zwei eigene Fehler

**Die erste Unterscheidbarkeits-Messung war wertlos.** Sie verglich
Bildpunkt für Bildpunkt und maß damit Versatz statt Unterschied — das
Ergebnis stand erst fest, als die Gegenprobe „dasselbe Zeichen, um
einen Bildpunkt verschoben" höher lag als sieben echte Paare. Ohne
diese Gegenprobe wäre eine plausible Tabelle entstanden, die nichts
bedeutet.

**Eine fremde Sitzung hat meinen Browsertab auf Port 8154 umgeleitet**,
mitten in der Messreihe. Aufgefallen, weil die Tab-Meldung plötzlich
einen anderen Hafen nannte; die Screenshots davor zeigten bereits ein
fremdes Spiel. Seitdem ein eigener Tab und `location.port` als erste
Zeile jeder Messung.

## Zum Changelog

`CHANGELOG.md` gehört nicht zu den Dateien dieses Auftrags und ist
unberührt. `pruefe-arbeitsweise.mjs` verlangt einen Changelog-Eintrag
nur für **offene** Änderungen; nach dem Commit ist die Kette grün. Der
inhaltliche Nachweis steht hier und in den Commit-Nachrichten.
