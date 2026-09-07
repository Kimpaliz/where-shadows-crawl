# Änderungen

Oben das Neueste. Jeder Eintrag sagt **was**, **warum** und **womit
gemessen** — nicht nur, dass etwas anders ist.

## 0.10.0 — Der Schlag zeigt auf den Gegner (06.09.2026)

Janniks Ansage, wörtlich: *„wo sind die eindeutigen initial attack
animationnen? angriffe finde immer in richtigung der gegner statt und
tgreffen nur wenn die Animation trifft. mehr passende partikeleffeke!"*
— und dazu *„2 feuerwaffen / 2 schnitt / 2 stumpf / 2 gift / 2 eis"*.

Er hat damit vier Dinge auf einmal beschrieben, und alle vier waren
verletzt.

### Was vorher wirklich passierte

Ein Nahkampfschlag setzte `s.schlagZeit = 0.14` und teilte im **selben
Bild** allen Zielen im **vollen Kreis** Schaden aus. Gezeichnet wurde
dazu ein einziger Bogen, 11 × 11 Bildpunkte, in **Laufrichtung** — für
alle sieben Nahkampfwaffen derselbe, in Flammenfarben.

| gemessen am 06.09.2026 | |
| --- | ---: |
| Reichweite des gemalten Bogens | **11,8 Bildpunkte** |
| Reichweite der Waffen | **30 bis 52** |
| verschiedene Bögen für 7 Waffen | **1** |
| Richtung des Bogens | Laufrichtung |
| Richtung des Treffers | **überallhin** |

Vier Fünftel der Trefferfläche waren nie zu sehen, und was zu sehen
war, zeigte woandershin. Es war nichts kaputt — es war nur alles
auseinander.

### Der Schlag ist jetzt eine Bewegung

`spiel/schwung.mjs` (neu) beschreibt einen Schwung als Kreisausschnitt,
der in 0,14 s von innen nach außen fährt:

- Die **Richtung** liegt beim Ausholen fest — auf den nächsten Gegner.
- Der **Radius** wächst von 6 Bildpunkten bis zur Reichweite der Waffe.
- Die **Öffnung** ist die Bauart der Waffe: `bogen` im Katalog, in Grad.
- Getroffen wird, **wer beim Vorbeikommen im Band liegt** — jeder
  höchstens einmal, und nur so viele, wie `ziele` erlaubt.

| Waffe | Reichweite | Öffnung | was das heißt |
| --- | ---: | ---: | --- |
| Blutdorn | 30 | 55° | ein Stich |
| Brandeisen | 28 | 60° | ein Stich, der weiterbrennt |
| Sichel | 34 | 70° | gezogen, nicht geschwungen |
| Pestkralle | 30 | 95° | vier Klauen nebeneinander |
| Richtschwert | 40 | 110° | ein Hieb, aber nur einer stirbt |
| Frostbeil | 36 | 125° | ein Beil holt aus |
| Morgenstern | 32 | 140° | die Kette kreist |
| Pechfackel | 40 | 150° | eine Fackel wischt breit |
| Sense | 46 | 200° | fast alles vor einem |
| Weihwasserkessel | 52 | 360° | „Auch das hinter dir" |

**Der Zeichner rechnet nichts davon selbst nach.** Er holt Radius,
Öffnung und Klingenlage aus derselben Datei wie der Treffer — und genau
das ist der Punkt: Die gemalte Form **kann** von der treffenden nicht
mehr abweichen. `pruefe-angriffe.mjs` wird rot, wenn jemand das trennt.

### Zwei Fehler, die dabei gefunden wurden

**1 · Derselbe Gegner nahm den Schaden zweimal.** Das Raster
(`spiel/gitter.mjs`) schlüsselt seine Zellen mit
`cx * 73856093 ^ cy * 19349663` und prüft die Zelle danach nicht nach;
zwei Zellen können sich eine Liste teilen, und `umkreis()` reicht
denselben Gegner dann zweimal durch. Gemessen auf einem Ring aus 24
Gegnern: Die Pechfackel verbrauchte alle **drei** Ziele, aber nur
**zwei** Gegner nahmen Schaden — einer bekam ihn doppelt. Ein
Rundumschlag hätte so die Hälfte seiner Ziele an einen einzigen
verschenkt.

**2 · Der Rand fiel aus dem eigenen Ausschnitt.** Die äußersten Klingen
liegen konstruktionsbedingt **auf** dem Rand der Öffnung, und ihr
Richtungsvektor entsteht über einen anderen Rechenweg als die Grenze,
gegen die geprüft wird. Bei Sense und Richtschwert lagen dadurch je zwei
Klingen „außerhalb" ihres eigenen Ausschnitts. Beides hat die Prüfung
gefunden, nicht das Auge.

### Fünf Bögen, fünf Stäube

Unterschieden wird auf **zwei** Kanälen, nicht auf einem. Wer die Farben
nicht auseinanderhält — und im Dunkeln hält niemand Silber und Knochen
auseinander —, sieht immer noch die Form:

| Art | Bogen | Staub |
| --- | --- | --- |
| Schnitt | dünn, zwei scharfe Hörner | schmaler Strahl in Schlagrichtung |
| Wucht | stumpf und dick | Ring, gleichmäßig, schnell |
| Feuer | Zungen, ungleich hoch | Funken steigen auf |
| Frost | Splitter in gleichem Abstand | Splitter fliegen und **fallen** |
| Fluch | unterbrochen | Punkte drehen sich beim Fliegen |

Dazu ein **Schweif** hinter jeder Klinge — drei Körner auf dem Weg, den
sie schon zurückgelegt hat. Menge des Staubs je Einschlag: 5–12 vorher,
**9–16** jetzt.

⚠️ Nichts davon würfelt. Weder `Math.random` noch `welt.zufall`: Der
Staub hängt am Ort des Einschlags, der Schweif am Schwung. Zwei Rechner
im Netz-Koop sehen dieselbe Nacht, und eine Aufnahme lässt sich
nachstellen. `pruefe-anzeige.mjs` wird rot, wenn jemand das ändert.

### Mindestens zwei Waffen je Schadensart

Gemessen hatten Feuer und Frost je **eine**. Wer einen Feuerbau spielen
wollte, hatte genau eine Wahl, und das Verschmelzen (Bauteil 7) lief für
ihn ins Leere. Drei neue Nahkampfwaffen:

| Waffe | Art | was sie tut |
| --- | --- | --- |
| **Brandeisen** | Feuer | schmaler Stich, 15 Brand — „Der Stich ist das Wenigste daran." |
| **Frostbeil** | Frost | zwei Ziele, 35 % langsamer — „Zwei bleiben stehen. Einer davon für immer." |
| **Pestkralle** | Seuche/Fluch | schnell, schwach, 15 Gift — „Kratzt kaum. Was danach kommt, schon." |

Damit: Schnitt 5, Wucht 2, Feuer 2, Frost 2, Fluch 4 — und das Merkmal
„Seuche" auf zwei Waffen.

**„Gift" ist keine sechste Schadensart geworden**, und das war Janniks
Entscheidung. Es gibt genau **eine** Art, die an der Rüstung vorbeigeht
(`fluch`); eine zweite wäre ein zweiter Weg um dieselbe Verteidigung,
und Rüstung wäre kein Wert mehr. Gift ist deshalb ein **Merkmal** auf
zwei Waffen der Art `fluch`.

„2 je Art" ist als **mindestens** zwei gelesen: Schnitt hat fünf, Fluch
vier, und die wieder wegzunehmen wäre eine seltsame Auslegung von
„zwei".

### Ein dritter Fehler, gefunden und behoben

**Ein Schwung überlebte das Wellenende.** Zwischen zwei Wellen läuft
kein Schritt — alles, was auf einer Uhr steht, verfällt deshalb nicht
von selbst, sondern wartet. Wird eine Waffe im **letzten** Bild einer
Welle bereit, holt aus, und die Welle endet, dann überlebt ihr Schwung
Kartenwahl und Krämer und eröffnet die nächste Welle: in einer Richtung,
in der der Gegner von vorhin stand, mit dem Schaden von **vor** dem
Aufstieg. `starteWelle()` räumt Gegner, Geschosse, Beute und Funken seit
jeher weg; die Schwünge fehlten in der Liste.

⚠️ **Über 600 Läufe ändert diese Zeile keinen einzigen Wert** — die
Messung danach ist bis auf die letzte Stelle dieselbe. Der Fall tritt
also selten ein. Falsch war er trotzdem, und die Prüfung dafür ist rot
gewesen, bevor sie grün wurde.

### Was das an der Auslegung geändert hat — gemessen, nicht geschätzt

600 Läufe (5 Saatbasen × 3 Spielerzahlen × 40 Läufe), vor und nach dem
Umbau. **Wand** ist der Anteil aller Toten, die auf der schlimmsten
Welle sterben; **ohne Ende** sind die Läufe, die die Notbremse bei
Welle 130 erreichen, statt zu enden.

| | Wand vorher | Wand jetzt | ohne Ende vorher | ohne Ende jetzt |
| --- | ---: | ---: | ---: | ---: |
| 1 Spieler | 60,7 % | **53,1 %** | 12 von 40 | **11 von 40** |
| 2 Spieler | 40,0 % | **46,4 %** | 15 von 40 | **13 von 40** |
| 4 Spieler | 78,9 % | **75,0 %** | 21 von 40 | **17 von 40** |

(jeweils der schlimmste der fünf gemessenen Saatbasen)

**Fünf von sechs Zahlen sind besser geworden.** Besonders die letzte
Spalte: Ein Schlag, der nur noch trifft, wo er hinzeigt, macht den
perfekt ausweichenden Kunstspieler nicht mehr unsterblich — zu viert
enden vier Läufe mehr von selbst. Das ist die erste Änderung überhaupt,
die diese Zahl senkt, und Vorgang #52 ist der Grund, warum sie überhaupt
gezählt wird.

⚠️ **Die eine schlechtere Zahl wird nicht versteckt.** Zu zweit ist die
Wand von 40,0 auf 46,4 % gestiegen, und die Sperre in
`pruefe-balance.mjs` musste dafür angehoben werden. Zwei Ursachen, beide
gemessen: Der Bruch hat mehr Tote im Nenner, weil weniger Läufe ohne
Ende ausgehen; und ein Schlag, der nur trifft, wo er hinzeigt, ist im
Gedränge schwächer als einer, der rundum austeilt. Das Zweite ist genau
das, was bestellt war.

Die drei neuen Waffen retten daran mehr, als jedes Zahlendrehen könnte:
**ohne** sie, nur mit dem Umbau, stand die Wand bei 61,1 / 47,1 / 81,8 %
— mit ihnen bei 53,1 / 46,4 / 75,0 %.

Die Abbruch-Sperre ist im selben Zug **verschärft** worden (12/18/21 →
11/13/17), die Wand-Sperre allein und zu viert ebenfalls
(0,59/0,79 → 0,54/0,75). Unterm Strich prüft die Kette schärfer als
vorher, nicht lockerer — an genau einer Stelle lockerer.

### Was der Umbau gekostet hat

| | |
| --- | ---: |
| neue Datei | `spiel/schwung.mjs` — 196 Zeilen, reine Geometrie, kein Zufall |
| neue Bildpunktraster | 5 × 11 × 11 — **kein** neues Bild für die Reichweite |
| neue Prüfungen | **+207**: Angriffe 192→325, Anzeige 59→91, Katalog 438→470, Sprites 148→156, Kern 111→113 |
| Rot-Beweise | 21 Sabotagen, jede einzeln gefahren |
| Messläufe | 2 400 in vier vollen Fünf-Basen-Messungen |

⚠️ **Kein einziges neues Bild für die Reichweite.** Ein Raster, das die
volle Trefferfläche einer Waffe zeigt, wäre bei 52 Bildpunkten
Reichweite 105 × 105 groß — **11 025 Felder für einen einzigen Bogen**,
gegen **2 215 gesetzte Bildpunkte in allen 35 Rastern des Spiels
zusammen** (gemessen 06.09.2026). Mal fünf Schadensarten wäre das das
Fünfundzwanzigfache des ganzen Spiels, als Text im Repository.

Der Bogen bleibt deshalb 11 × 11 — er wird **bewegt** statt gestreckt.
Das ist keine Sparmaßnahme, sondern die Lösung: Ein Bogen, der von innen
nach außen fährt, ist genau die Animation, die Jannik vermisst hat.

## 0.9.9 — Zwei Wächter, bevor der erste Schlag umgebaut wird (06.09.2026)

Janniks Ansage zu den Angriffen lautet wörtlich: *„wo sind die
eindeutigen initial attack animationnen? angriffe finde immer in
richtigung der gegner statt und tgreffen nur wenn die Animation trifft.
mehr passende partikeleffeke!"* — und dazu *„2 feuerwaffen / 2 schnitt /
2 stumpf / 2 gift / 2 eis"*.

Dieser Eintrag baut davon **nichts**. Er repariert zuerst die beiden
Prüfungen, die den Umbau hinterher beurteilen sollen. Beide waren
genau dort blind oder unzuverlässig, wo der Umbau ansetzt — und eine
Prüfung, die man erst *nach* der Änderung anfasst, ist keine Prüfung
mehr, sondern eine Meinung über das eigene Werk.

### Der Gleichlauf sah dem Schlag beim Auseinanderlaufen zu

`pruefe-netz.mjs` vergleicht zwei Läufe mit gleicher Saat und gleichen
Eingaben. Das tat er auch — nur nicht an den Feldern, um die es geht.

| gemessen am 06.09.2026 | Felder vorhanden | im Abdruck |
| --- | ---: | ---: |
| ein Spieler | 34 | **13** |
| eine Waffe | 4 | **0** |
| ein Gegner (Zeitschaden) | 3 | **0** |

Nicht enthalten waren ausgerechnet `schlagZeit`, `schlagWaffe`,
`blickX`, `blickY`, die Angriffsuhr jeder Waffe (`bereitIn`) und Brand,
Gift und Frost am Gegner. Ein Schlag, der auf zwei Rechnern verschieden
lang läuft oder in eine andere Richtung zeigt, wäre nicht aufgefallen —
und wenn die Welten davon irgendwann doch auseinanderliefen, hätte der
Wächter den **Zufallsstand** gemeldet, also die Folge statt der Ursache.

Der zweite Fehler war schlimmer als der erste: Der Abdruck wurde bei
**drei** von 3600 Schritten genommen (t = 599, 1799, Ende). Vier
eingebaute Abweichungen bei t = 700 blieben deshalb alle vier grün —
nicht weil sie fehlten, sondern weil sie bis zur nächsten Marke längst
verheilt waren. `schlagZeit` läuft in 0,14 s ab, `blickX` überschreibt
die nächste Eingabe, Brand verglimmt.

Jetzt wandert **jeder** Schritt in eine laufende Summe (FNV-1a,
32 Bit). Rot-Beweis, sieben Sabotagen — jede verändert **ein** Feld für
**einen** Tick, und nur im zweiten Lauf:

| Sabotage | alter Wächter | neuer Wächter |
| --- | --- | --- |
| `schlagZeit` + 0,001 | grün | **rot** |
| `schlagWaffe` → `sense` | grün | **rot** |
| `blickX` + 0,001 | grün | **rot** |
| `waffe.bereitIn` + 0,001 | grün | **rot** |
| `gegner.brand` + 0,001 | grün | **rot** |
| `gegner.gift` + 0,001 | grün | **rot** |
| `gegner.frost` + 0,001 | grün | **rot** |

Sieben von sieben blind, sieben von sieben gefangen. Ein erster Anlauf
setzte die Sabotage an den **Anfang** des Ticks — drei der fünf wurden
im selben Tick wieder überschrieben und kamen nie beim Abdruck an. Das
ist dieselbe Falle wie oben, eine Ebene höher: eine Sabotage, die nichts
sabotiert, beweist so wenig wie eine Prüfung, die nichts prüft.

### Die Wand-Sperre war ein Würfel mit Meinung

`pruefe-balance.mjs` prüft, ob sich die Niederlagen auf **einer** Welle
häufen — ein Riegel statt eines Anstiegs. Die Grenze dafür stand auf
0,59 / 0,41 / 0,79 und war an **einer** Saatbasis gemessen. Fünf Basen
zu je 40 Läufen, am selben Code:

| Spieler | Saat 1 | 201 | 401 | 601 | 801 | schlimmster | Spanne |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 50,0 | **60,7** | 48,5 | 50,0 | **60,7** | 60,7 | **12,2** |
| 2 | **40,0** | 38,5 | 31,0 | 39,3 | 37,0 | 40,0 | **9,0** |
| 4 | 75,0 | 70,8 | 67,9 | 65,5 | **78,9** | 78,9 | **13,4** |

Zwei der fünf Basen reißen die alte Grenze für einen Spieler. Rot-Beweis
an einer Kopie, an der **eine Zeile** anders ist (`saat: 1` → `saat:
201`):

```
FEHLER  1 Spieler: die Wand ist nicht schlimmer als gemessen (59 %)
        ·  17 von 28 in Welle 6
```

Ob die Kette grün war, entschied also die Saatbasis und nicht das Spiel.
Genau dieser Wächter sollte den Nahkampf-Umbau beurteilen.

Die Grenze steht jetzt auf dem **schlimmsten der fünf** gemessenen
Werte: 0,61 / 0,40 / 0,79. Für zwei Spieler ist das eine Verschärfung,
für vier bleibt sie gleich — **für einen Spieler ist es eine
Lockerung**, von 0,59 auf 0,61, und das wird hier so genannt statt als
Reparatur verkauft. Eine Sperrklinke darf sinken und nicht steigen;
diese hier stand auf einem Wert, den der Code nie eingehalten hat,
sondern nur an der einen Saat, an der zufällig gemessen wurde.

Gegenprobe, dass die neue Grenze kein Freibrief ist: eine echte Wand in
Welle 6 einbauen (Dichte mal vier) — alle drei Spielerzahlen werden rot,
mit 92 / 92 / 91 Prozent.

### Nebenbefund: die Abbruch-Sperre sitzt auf der Kante

Beim Nachmessen fiel auf, dass die Abbruchtabelle in derselben Datei
einen überholten Stand beschreibt — sie stammt von **vor** `ff00062`
(Salvenmuster je Waffe). Dieselben fünf Basen, heutiger Code:

| | Saat 1 | 201 | 401 | 601 | 801 | schlimmster | Sperre |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 Spieler | 8 | 12 | 7 | 8 | 12 | **12** | 12 |
| 2 Spieler | 15 | 14 | 11 | 12 | 13 | **15** | 18 |
| 4 Spieler | 20 | 16 | 12 | 11 | 21 | **21** | 21 |

Allein und zu viert liegt der schlimmste gemessene Wert **genau** auf
der Grenze. Die nächste Änderung, die den Spieler stärker macht, macht
die Kette rot — nicht weil etwas kaputtgeht, sondern weil Vorgang #52
(„Was kostet ein Sturz im endlosen Modus?") weiter offen ist. Die
Sperren wurden **nicht** nachgezogen: 15 statt 18 zu zweit wäre eine
echte Verschärfung, sie zu nehmen, während dieselbe Messung allein und
zu viert gestiegen ist, wäre Rosinenpickerei.

### Was das gekostet hat

Gemessen wurden **600 Läufe** (5 Saatbasen × 3 Spielerzahlen × 40
Läufe), dazu zwei volle Rot-Beweise — zusammen rund eine Stunde
Rechenzeit, verteilt auf mehrere Kerne.

Die Wächter selbst bleiben billig. `pruefe-netz.mjs` steigt von
**0,298 s auf 0,437 s** — das ist der Preis dafür, dass die Summe über
alle 3600 Schritte läuft statt über drei Marken.
`pruefe-balance.mjs` ändert nur Konstanten und Text; an seiner Laufzeit
(rund vier Minuten für 120 Läufe) ändert sich nichts.

## 0.9.8 — Die App trägt wirklich (06.09.2026)

Nachtrag zu 0.9.7. Eine unabhängige Gegenprüfung mit 34 Agenten hat den
Android-Weg in fünf Linsen zerlegt — Manifest, Dienstarbeiter, Vollbild,
Querlage, Wächter — und **20 Mängel** gefunden, die eine
Widerlegungsprüfung überlebt haben. Kein einziger blockierte die
Installation; zwei trafen dafür Janniks Wortlaut *„vollbild"* mitten
ins Herz.

### Der Gast hat nie ein Vollbild gesehen

`gehInsVollbild()` hing am Spielstart, und für zwei der drei Startwege
war das richtig: „ALLEIN SPIELEN" und das „ANFANGEN" des Wirts sind
Klicks, also Nutzergesten. Beim **Gast** kommt der Start aus einer
Netznachricht (`netz/sitzung.mjs`) — sein letzter Klick war
„BEITRETEN", danach hat er im Warteraum gewartet, und Chrome gibt einer
Geste rund fünf Sekunden. Der Browser lehnte still ab, und weil die
Lagensperre am Vollbild hängt, war **quer auch weg**.

Zwei Stellen beheben das: der Klick auf „BEITRETEN" selbst, und ein
Nachzügler an der ersten Berührung des Daumen-Sticks. Der Nachzügler
löst zugleich den zweiten Fall — wer mit der Zurück-Geste aus dem
Vollbild fällt, kam vorher nie zurück, denn der `fullscreenchange`-
Horcher prüft `if (document.fullscreenElement)` und tut beim
**Verlassen** nichts.

### Das Bild war ein Fleck in der Mitte

Der ganze Faktor wurde in **CSS-Punkten** gesucht. Auf einem Telefon
ist ein CSS-Punkt aber längst kein Bildpunkt mehr:

| quer, gemessen | vorher | jetzt |
| --- | ---: | ---: |
| Pixel 7 · echte Punkte je Spielpunkt | **2,625** | **4,000** |
| Pixel 7 · Anteil der Bildschirmfläche | **34,4 %** | **79,8 %** |
| iPhone 14 | 3,000 · 39,4 % | 4,000 · **70,0 %** |
| Galaxy S21 | 3,000 · 45,0 % | 4,000 · **80,0 %** |

2,625 heißt: **jede dritte Bildpunktreihe war einen Punkt breiter als
ihre Nachbarn** — genau die unechte Pixelgrafik, gegen die der
Kommentar über der Funktion seit jeher argumentiert. Die Rechnung steht
jetzt in `runtime/bildmass.js`, weil ein Wächter sie dort ohne Browser
nachrechnen kann, statt eine Kopie zu prüfen.

Dazu der **sichere Bereich**: `viewport-fit=cover` stand seit 0.9.5 im
Kopf und erlaubte der Seite, bis unter Kamera-Aussparung und
Gestenleiste zu zeichnen — `env(safe-area-inset-*)` kam im ganzen
Repository **null Mal** vor. Am härtesten traf es „BITTE QUER HALTEN":
das einzige Element, das je hochkant erscheint, also genau dort, wo die
Loch-Kamera sitzt. Jetzt an 8 Stellen berücksichtigt.

### Vier Löcher im Dienstarbeiter

| Fall | was passierte |
| --- | --- |
| **Erster Start im Funkloch** | Der erste Besuch lief noch ohne den Dienst, der Vorrat war leer, der Rückfall fand nichts — in der App ohne Adressleiste eine Fehlerseite ohne Ausweg |
| **Schwaches Netz** | `await fetch()` ohne Frist; der Vorrat wurde erst im `catch` gefragt. Beim Start sind das **47 Anfragen** — schwarzer Bildschirm auf unbestimmte Zeit, obwohl alles eingelagert war |
| **404 oder 503** | Eine schlechte Antwort ist kein Netzfehler und fiel nicht in den `catch`: sie wurde durchgereicht, obwohl die gute Fassung im Vorrat lag |
| **Zwei Adressen, ein Schlüssel** | Der Rückfall kannte nur `./`. Wer die Seite immer über `…/index.html` geöffnet hatte, stand ohne Netz vor der Fehlerseite |

### Der Wächter, der einen wertlosen Dienst durchwinkte

Abschnitt 4 suchte fünf Zeichenketten. **Gemessen an einer Kopie:** ein
`sw.js`, das nichts einlagert, keinen Rückfall hat und dessen
Vorratsblick in einem toten `if (false)` steht — offline also ein
schwarzer Bildschirm — bestand **alle 41 Prüfungen, 0 Fehler**, Wort
für Wort dieselbe Ausgabe wie der echte Stand.

Dasselbe Muster an drei weiteren Stellen, jedes Mal an einer Kopie
belegt:

| Sabotage | alte Kette |
| --- | --- |
| `name` und `short_name` aus dem Manifest gelöscht | grün |
| `start_url` gelöscht | grün |
| Manifest-Verweis auf eine Datei gebogen, die es nicht gibt | grün |
| Anmeldung des Dienstarbeiters aus `index.html` entfernt | grün |
| Inhaltstyp der Vorschau auf `text/plain` gesetzt | grün |

Der letzte Fall war besonders hübsch: Die Bedingung lautete
`v.includes(".webmanifest") && v.includes("manifest")` — und „manifest"
steckt bereits in „.webmanifest". Sie **konnte** gar nicht fehlschlagen.

### 41 → 92 Prüfungen, und 29-mal absichtlich rot

`pruefe-app.mjs` führt jetzt aus, statt zu suchen: ein zweiter Browser
aus der Hand für den Dienstarbeiter (Landkarten statt `caches`, ein
`fetch`, dessen Antwort man von außen bestimmt — gut, 404, hängend,
geworfen).

Nach Projektregel wurde jede neue Prüfung absichtlich rot gemacht.
**29 Sabotagen, und vier davon deckten die Prüfung selbst auf:**

| Sabotage | erster Anlauf | die eigentliche Ursache |
| --- | --- | --- |
| Vorrat vor dem Netz (die Slay'Em-All-Falle) | **grün** | Es wurde **ein** Abruf gemessen — auf eine noch leere Landkarte fällt auch ein Vorrat-zuerst-Dienst durch. Jetzt zwei Abrufe mit wechselnder Marke |
| Vorab-Einlagerung entfernt | **Absturz** | Der Dienst wirft den Netzfehler weiter; die unbehandelte Ablehnung riss die ganze Kette ab, statt rot zu melden |
| Rückfall auf die Startseite entfernt | **Absturz** | dieselbe Ursache |
| Einlagern entfernt | **Absturz** | dieselbe Ursache |

Ein Wächter, der bei dem Fehler abstürzt, den er sucht, ist keiner —
dieselbe Lehre wie im Fehlerbuch **E5**. Nach der Nachbesserung
schlagen alle 29 an, und keine reißt die Kette ab.

### Ehrlich vermerkt

Gemessen wurde gegen Browser aus der Hand und gegen Gerätemaße aus der
Tabelle, **nicht gegen ein Telefon** — das Netz nach außen ist in
dieser Werkstatt gesperrt, die Live-Seite ist von hier aus nicht
abrufbar. Die Zahlen zur Skalierung sind Rechnungen mit echten Maßen
und stimmen; ob Chrome auf Janniks Gerät die Installation anbietet,
zeigt erst sein Startbildschirm.

**Nicht gebaut**, obwohl bestätigt: Der Daumen-Stick schlägt nicht voll
aus, wenn der Daumen in der unteren linken Ecke aufsetzt — nach unten
bleiben 42 %, nach links 31 % des Tempos. Das ist Bedienung, nicht
Installation, und gehört in einen eigenen Vorgang.

### Nachtrag: zwei Zeilen in der Liste „Ausdrücklich nicht gefordert"

Janniks Antwort auf den offenen Punkt: *„iphone erst mal ignorieren"*.
Der Weg über Safari steht damit in `CLAUDE.md` — nach dem Muster von
**Ton**, also **geparkt und nicht verworfen**. Ohne den Eintrag meldet
ihn die nächste Sitzung wieder als Lücke, und dieselbe Frage wird ein
zweites Mal gestellt.

Dabei aufgefallen: Die **letzte Zeile derselben Liste war falsch**. Sie
verbot Online-Koop, *„solange Janniks Entscheidung aus `docs/SPIEL.md`
11 aussteht"* — die steht seit **#46** nicht mehr aus, und Phase 11 ist
gebaut und geschlossen. Eine Regel, die das Gegenteil des Standes
behauptet, ist schlimmer als keine: Sie hätte die nächste Sitzung von
genau der Arbeit abgehalten, die schon live ist. An ihre Stelle tritt,
was #46 wirklich entschieden hat — keine vier Tastaturbelegungen an
einem Rechner.

## 0.9.7 — Das Spiel bietet sich selbst zur Installation an (06.09.2026)

Janniks Ansage: *„mach es auch zu einer app die msn aus dem browser
installieren kann auf Android. vollbild"*

### Der Befund, bevor etwas gebaut war

**Installierbar war es längst — es hat es nur nie gesagt.** Seit
Fassung 0.9.5 liegen `manifest.webmanifest` (`fullscreen` +
`landscape`, vier Symbole) und `sw.js` an ihrem Platz, und 41 Prüfungen
hielten sie fest. Wer die App wollte, musste in Chrome das
Drei-Punkte-Menü öffnen und dort „App installieren" finden.

| | vorher | jetzt |
| --- | ---: | ---: |
| Stellen im Quelltext, die `beforeinstallprompt` kennen | **0** | 3 |
| sichtbares Angebot im Spiel | **keins** | ein Knopf im Vorspiel |
| Prüfungen in `pruefe-app.mjs` | 41 | **55** |

Ein Angebot, das niemand findet, ist keins — und nichts daran wird
jemals rot. Genau das war die Lücke: kein Fehler, sondern eine
fehlende Zeile Einladung.

### Gebaut

| Datei | was sie tut |
| --- | --- |
| `runtime/installieren.js` | fängt die Zusage des Browsers ab, hält sie und reicht sie an einen Klick weiter |
| `runtime/lobby.js` | zeigt den Knopf im Vorspiel — aber nur, wenn er wirklich etwas tut |
| `index.html` | seine Gestalt: leiser als die drei Knöpfe, die zum Spielen führen |
| `werkzeuge/pruefe-app.mjs` | Abschnitt 8, 14 neue Prüfungen |

### Die eine Regel, ohne die es nicht funktioniert

**`preventDefault()` sofort, sonst ist die Zusage verbraucht.** Chrome
auf Android meldet mit `beforeinstallprompt`: „Diese Seite erfüllt alle
Bedingungen, ich könnte sie jetzt anbieten." Wer den Aufruf vergisst,
lässt den Browser seinen eigenen Hinweisbalken zeigen und die Zusage
verfallen — ein späteres `prompt()` läuft dann ins Leere, und die Datei
sieht dabei völlig richtig aus.

Und `prompt()` verlangt eine **echte Nutzergeste**, dieselbe Regel wie
beim Vollbild. Deshalb steht der Aufruf im Klick auf den Knopf und
nirgends sonst.

### Was still ausbleibt

**Kein Drängen und kein toter Knopf.** Wer keine Zusage schickt —
Firefox, Safari auf dem iPhone, ein Rechner ohne Installationsweg —,
sieht schlicht nichts. Ein Knopf, der nichts tut, wäre schlimmer als
keiner. Und kein eigener Merker im Speicher: Ob die App installiert
ist, weiß der Browser besser als wir, er schickt das Ereignis dann gar
nicht erst.

### Zwei Prüfungen, die grün blieben, obwohl sie rot sein mussten

Nach Projektregel wird jede neue Prüfung **absichtlich rot gemacht**.
Sieben Sabotagen, und zwei davon kamen ungestraft durch — beide Male
war die Prüfung schuld, nicht der Code:

| Sabotage | erster Anlauf | Ursache |
| --- | --- | --- |
| `sageBescheid()` aus `beforeinstallprompt` entfernt | **grün** | der Griff stand hinter `biteInstallieren()`, und das benachrichtigt die Horcher ebenfalls — gemessen wurde der zweite Weg statt der gesuchte |
| den Kasten aus `kasten.append(…)` genommen | **grün** | die drei Prüfungen suchten nur Namen; die Funktion stand ja noch da, nur rief sie niemand mehr |

Die erste liest jetzt **sofort** nach dem Ereignis ab. Die zweite
zählt: einmal die Erklärung, mindestens einmal der Aufruf — bei genau
einer Stelle ist der Knopf gebaut, aber nirgends angehängt, und das ist
Wort für Wort der Zustand von vorher.

Danach schlagen alle sieben an: fehlendes `preventDefault`,
verschwiegener Horcher, ein Angebot, das nach dem Klick liegen bleibt,
ein `installierbar()`, das immer ja sagt (4 Prüfungen auf einmal), ein
Kasten ohne Bildschirm, ein Kasten ohne `hidden`, und ein Klick, der
den Browser gar nicht erst fragt.

### Ehrlich vermerkt

Gemessen wurde gegen einen **Browser aus der Hand**, nicht gegen ein
Telefon. Dass Chrome die Zusage genau so schickt, steht in der
Beschreibung des Ereignisses; dass sie auf *Janniks* Gerät eintrifft,
zeigt erst sein Startbildschirm. Der Weg dorthin ist ein Knopf statt
eines Menüs — mehr behauptet diese Fassung nicht.

## 0.9.6 — Salven und Splitter (06.09.2026)

Janniks Ansage: *„benutzt bitte das design modul von claude um den
angriffen richtige optische logische und unterschiedliche angriffe zu
geben die cool sind. auch projektil angriffe sollen so aufgebaut werden
das die angriffe **mehrere projektile einplanen**."* Dazu: *„auf
jedenfall pixel design nutzten! aber **feine farbliche übergänge**."*

### Der Befund, bevor etwas gebaut war

Nichts davon war *kaputt*. Nichts hätte je eine Prüfung rot gemacht. Es
war nur alles dasselbe — und genau das sieht man beim Spielen.

| | vorher | jetzt |
| --- | --- | --- |
| Fernwaffen mit eigenem Salvenmuster | **0 von 5** | 5 von 5 |
| verschiedene Geschoss-Silhouetten | 4 von 6 | **6 von 6** |
| Fläche eines Geschosses | 5 bis 12 Bildpunkte | **11 bis 21** |
| Sprites mit ungerader Kantenlänge | 4 von 6 | **6 von 6** |
| Farbstufen je Schadensart | 2 — ein Sprung | **5** |

Die fünf Fernwaffen unterschieden sich nur in `geschosstempo` und
`reichweite` — Zahlen, die man beim Spielen nicht auseinanderhält.
Frostrune, Bannstein und Gegnerspeichel waren alle dasselbe Kreuz
`.#.|###|.#.` aus fünf Bildpunkten; nur die Farbe trennte sie.

### Fünf Muster, jedes aus der Waffe begründet

| Waffe | Form | warum |
| --- | --- | --- |
| Wurfmesser | `folge` 2 | ein Messerwerfer wirft nach, nicht nebeneinander |
| Armbrust | `parallel` 2 | zwei Läufe; eine Armbrust streut nicht |
| Frostrune | `faecher` 3 | Frost wirkt je Getroffenem — Breite schlägt Wucht |
| Seuchenglas | `streu` 4 | der Text sagt seit jeher „zerspringt"; Scherben haben keine gleichen Abstände |
| Bannstein | `ring` 3 | `suchend` holt jeden Stein zurück, der Umweg ist das Bild |

**`folge` ist ein Startversatz, keine Verzögerung.** „In 0,09 s das
zweite Messer" hätte eine Warteschlange gebraucht — neuen Zustand, der
über Wellenenden, Tode und den Netz-Koop hinweg stimmen muss. Zwei
Messer, von denen das zweite sieben Bildpunkte weiter hinten startet,
sehen im Flug genauso aus und können nicht auseinanderlaufen.

**`streu` ist die einzige Form, die würfelt** — aus `welt.zufall`, genau
einmal je Geschoss. Jede Ziehung verschiebt den gesäten Strom für alles
danach: Wellenpläne, Beute, Truhen. Eine Prüfung zählt die Züge.

### Die eine Regel, ohne die das Ganze zerfällt

**Ein Salvenmuster ist kein Schadensmultiplikator.** Der Grundschaden
wird auf die Geschosse verteilt — sonst wären vier Scherben schlicht
vierfacher Schaden, und die Waffe mit den meisten Geschossen wäre die
einzige sinnvolle.

Aufgeschlagen wird nur, was auch **verfehlt**: `folge` und `parallel`
fliegen dieselbe Bahn und bekommen null, `faecher` und `ring` 20 %,
`streu` 30 %. Ein einziger Wert für alle war der erste Anlauf — über 40
Läufe je Spielerzahl machte er das Spiel allein und zu zweit besser, zu
viert schlechter. Die Ursache: Wurfmesser und Armbrust sind die
häufigsten Waffen und bekamen einen Aufschlag für ein Verfehlen, das bei
ihnen nicht stattfindet.

### Fünfstufige Rampen — und eine, die nicht geht

Mit zwei Tönen gibt es keinen Übergang, nur einen Sprung. Neu sind
`…Tief`, `…Mitte` und `…Glanz` für fünf Schadensarten; **die 43
bestehenden Farben sind byteweise unverändert**, 15 kamen dazu. Dunkle
Stufen ziehen ins Kühle, helle ins Warme — dieselbe Regel, die in
`runtime/palette.js` schon stand. Engste Helligkeitstrennung 12,7
(flamme) bis 17,1 (bann) von 255.

`blut` hat **keine** bekommen: Seine beiden Töne liegen nur **19,5** von
255 auseinander, für drei trennbare Stufen bräuchte es 24. Sie
auseinanderzuziehen änderte den Lebensbalken und das Trefferzeichen für
Schnitt — Stil, nicht Reparatur. Für die Angriffe wird es nicht
gebraucht: Der Blutdorn ist eine Nahkampfwaffe ohne Geschoss.

### Der Umbau war zuerst keiner

`spiel/kampf.mjs` auf das Salvenmodul umzustellen, sollte nichts ändern —
24 Läufe (1/2/4 Spieler, je 8 Saaten) mussten zeichengleich bleiben. Sie
waren es nicht: **5 von 24 verschieden.** Der Anteil griff auch auf den
Spielerwert `zusatzgeschosse` und entwertete ihn damit still — wer sich
ein drittes Geschoss erkauft, hätte drei zu je einem Drittel bekommen,
also nichts. Der Anteil kommt jetzt aus der **Waffe**; danach 174.490
gegen 174.490 Bytes, zeichengleich.

### Was eine unabhängige Prüfung danach fand

125 Agenten in fünf Blickwinkeln, jeder Befund von drei Skeptikern
gegengeprüft: **40 gefunden, 20 überlebten** — alle in meiner eigenen
Arbeit. Die vier schwersten:

**1 · Die Kette war rot, und ich hatte sie nicht laufen lassen.**
`spiel/salven.mjs` trug den Tag `Kampf`, den die Systemtabelle nicht
kennt. Der Wächter hat genau getan, wofür er gebaut ist.

**2 · Eine erfundene Begründung schützte toten Code.** Der Re-Export
`FAECHER` in `kampf.mjs` war mit „weil `pruefe-werte.mjs` ihn liest"
begründet. Die Datei importiert `kampf.mjs` nicht, und
`git log -S FAECHER -- werkzeuge/` ist leer — sie hat es nie getan.
Ersatzlos entfernt.

**3 · Der Bannstein bekam 40 % Schaden geschenkt.** Der Ring-Aufschlag
bezahlt ein Verfehlen; bei `suchend: true` dreht das Geschoss in
`bewegeGeschosse()` auf sein Ziel ein und trifft. Eine suchende Waffe
bekommt jetzt nie einen Aufschlag — der Bannstein steht wieder bei
1,00× statt 1,40×.

**4 · Eine Prüfung maß eine mathematische Selbstverständlichkeit.**
`[1,2,3,4,5,6].map(anteilJeGeschoss)` reicht den **Array-Index** als
zweites Argument durch, also lief sie mit den „Formnamen" 0, 1, 2 …
Keiner steht in der Aufschlagtabelle, der Rückfall griff jedes Mal, und
heraus kam exakt `1/n`. Durch keinen Wert der Tabelle rot zu bekommen;
fünf von sechs Formen waren von gar keiner Zusicherung berührt.

Dazu: `flamme` und `flammeHell` standen nach dem Rampen-Einbau **zweimal
im selben Objektliteral** (der spätere gewinnt still); „mindestens drei
Rampenstufen" zählte Ziffern statt Farben, ein einfarbiges Geschoss
hätte bestanden; die Ring-Prüfung ließ einen Viertelkreis durch; drei
gemessene Zahlen waren falsch; und `pruefe-angriffe.mjs` fehlte in der
Wegweiser-Tabelle.

**Selbst dazu gefunden:** `rampen.mjs` warf beim Import aus einem
`node -e`, weil `process.argv[1]` dort leer ist.

### Eine Korrektur an meinem eigenen Bericht

Zwischendurch stand hier und in zwei Kommentaren, die alten Geschosse
seien „diagonal in fünf Einzelpunkte zerfallen". **Das war die falsche
der beiden Messungen.** Unter der strengen Vierer-Nachbarschaft zerfallen
5 von 6 — zählt man Diagonalen mit, und so sieht das Auge, hängen alle
sechs zusammen. Der echte Befund ist nicht der Zerfall, sondern die
**Winzigkeit samt Formwechsel**: fünf Punkte, aus denen die Drehung
reihum ein Kreuz, ein X und wieder ein Kreuz baut.

Die Prüfung, die daraus entstand, war deshalb zahnlos — die alten
Sprites bestanden sie. Sie ist durch eine **Flächengrenze** von zehn
Bildpunkten ersetzt, und die fängt **5 von 6** alten Sprites, während
alle sechs neuen durchkommen.

### Geprüft

`werkzeuge/pruefe-angriffe.mjs`: **192 Prüfungen**, alle **14** neuen
einzeln rot bewiesen (negativer Aufschlag, zu großer Aufschlag, ein
Aufschlag der nicht wirkt, suchend mit Aufschlag, drei Ziffern auf einer
Farbe, ein Viertelkreis statt Ring, ungleiche Ringabstände, ein Fächer
der nicht fächert, eine verstellte Rampenstufe, ein veränderter
Ankerton, zwei Waffen mit derselben Form, eine doppelte Zufallsziehung,
ein Salvenmuster am Nahkampf, ein winziges Geschoss). Arbeitsbaum danach
byteweise unverändert.

Neu: `spiel/salven.mjs`, `werkzeuge/rampen.mjs`,
`werkzeuge/pruefe-angriffe.mjs`. Fehlerbuch-Fall **F4**.

Bericht mit Drehregler:
<https://claude.ai/code/artifact/e0b2bd65-cdbe-49b7-9d5e-46cd08261271>

## 0.9.5 — Als App installierbar, Vollbild und quer (05.09.2026)

Janniks Ansage: *„wenn ich dies spiel aus dem browser im handy
installiere dann mus die webbrowser leiste komplett weg. und es muss
von anfang an voll bild horizontal fix sein."*

### Warum das zwei Wege sind und nicht einer

**In der installierten App** erledigt das Manifest alles:
`display: fullscreen` lässt keine Adressleiste zu,
`orientation: landscape` legt die Lage fest. Kein Programmcode nötig.

**Im gewöhnlichen Tab wirkt beides nicht.** Vollbild gibt es dort
ausschließlich über `requestFullscreen()`, und das verlangt eine
**echte Nutzergeste** — ein Aufruf beim Laden wird abgelehnt, still.
Deshalb hängt `gehInsVollbild()` am **Spielstart**: Wer „Allein
spielen" drückt, hat gerade die Geste gemacht, die der Browser
verlangt. Ein eigener Vollbildknopf wäre ein zweiter Knopf für etwas,
das man in dem Moment ohnehin will.

### Gebaut

| Datei | was sie tut |
| --- | --- |
| `manifest.webmanifest` | `fullscreen` + `landscape`, vier Symbole, Pfade relativ |
| `sw.js` | Dienstarbeiter, **Netz zuerst, Vorrat als Rückhalt** |
| `runtime/vollbild.js` | `alsAppGestartet()` und `gehInsVollbild()` |
| `werkzeuge/png.mjs` | PNG schreiben über `node:zlib`, ohne Abhängigkeit |
| `werkzeuge/symbole.mjs` | die vier Symbole als Zeichencode, nicht als Bilddatei |
| `werkzeuge/pruefe-app.mjs` | 37 Prüfungen |

**Die Symbole sind Zeichencode**, wie jedes Sprite des Spiels
(`runtime/sprite-daten.js`): ein 16×16-Muster, Farben aus
`runtime/palette.js`. Eine fertige `.png` im Repository könnte niemand
mehr lesen, ändern oder gegen die Palette prüfen — und sie wäre die
einzige Bilddatei in einem Spiel, das ausdrücklich ohne auskommt.
Erzeugt mit `node werkzeuge/symbole.mjs --wirklich`.

### Drei Entscheidungen mit ihrem Grund

**1 · Vollbild auf dem Wurzelelement, nicht auf der Leinwand.** Der
Daumen-Stick und der Ausweichknopf liegen **neben** der Leinwand im
DOM. Wer nur die Leinwand ins Vollbild schickt, verliert genau die
Bedienung, um die es geht.

**2 · Netz zuerst, Vorrat als Rückhalt.** Andersherum zeigt der Dienst
nach jeder Veröffentlichung tagelang den alten Stand — bei Slay'Em All
genau so passiert. Der Preis ist eine Netzanfrage je Datei; bei einem
Spiel, das nur beim Start lädt, ist das nichts.

**3 · Keine vorab gefüllte Dateiliste im Dienst.** Sie müsste jede neue
Datei kennen und wäre nach dem ersten vergessenen Eintrag still
unvollständig — man merkt es erst offline. In den Vorrat wandert, was
wirklich geladen wurde.

### Was still scheitern darf

Safari auf dem iPhone kann `requestFullscreen` bis heute nicht, und
`screen.orientation.lock` gibt es dort ebenfalls nicht. Beide Aufrufe
stehen in **eigenen** `try`-Blöcken: Schlägt der erste fehl, wird der
zweite trotzdem versucht, und das Spiel läuft weiter. Eine
Fehlermeldung sähe aus, als wäre etwas kaputt — kaputt ist aber nur ein
Browser, der nicht mitmacht.

### Der Fehler, den erst der echte Knopfdruck gezeigt hat

Die 37 Prüfungen waren grün, das Manifest wurde angenommen, der Dienst
lief. Und im Browser kam beim Klick auf „ALLEIN SPIELEN" nur **ein**
Aufruf an statt zwei: `requestFullscreen` ja, `orientation.lock` nie.

Gemessen, statt vermutet:

| `requestFullscreen()` | Ausgang |
| --- | --- |
| ohne Nutzergeste | abgelehnt nach **0 ms** |
| **mit** Nutzergeste, von einer Richtlinie gesperrt | **hängt** — 2.503 ms ohne Ergebnis |

Ein Versprechen, das weder erfüllt noch abgelehnt wird, löst **keinen
`catch` aus** — es hält die Funktion an. Das `await` blieb stehen, und
die Zeile darunter lief nie. Damit fiel die halbe Ansage still aus: das
Vollbild kam nicht, und **quer war es auch nicht**.

Behoben mit einem Wettlauf gegen eine Frist von **1200 ms** und einem
`fullscreenchange`-Horcher, der das Querformat nachholt, falls das
Vollbild später doch eintrifft. Im Browser nachgemessen: Der Lock kommt
jetzt **1203 ms** nach dem Vollbild-Aufruf — vorher gar nicht.

**Beinahe für ein Werkzeugproblem gehalten:** Beim direkten Aufruf aus
der Konsole kamen beide Aufrufe an, beim echten Knopfdruck nur einer.
Genau dieser Unterschied *war* der Befund. Fehlerbuch **E5**.

### Die Prüfung führt das Modul aus, statt Muster zu suchen

Ein Regex hätte den Fehler nicht gesehen — vorher wie nachher stehen
dieselben zwei Aufrufe in derselben Reihenfolge in der Datei.
Abschnitt 7 von `pruefe-app.mjs` baut deshalb einen Browser aus der
Hand, dessen `requestFullscreen` **absichtlich nie antwortet**, und
lässt `gehInsVollbild()` wirklich laufen. Der alte Code fällt darin in
**4 von 41** Prüfungen durch, mit der Meldung „lock wurde nie gerufen".

Der erste Anlauf ließ dabei die ganze Kette hängen (Node brach mit
„unsettled top-level await" ab, Code 13). Ein Wächter, der genau bei
dem Fehler hängt, den er sucht, ist ein halber Wächter — er hat jetzt
sein eigenes Zeitlimit.

### Nebenbei behoben: die Vorschau lieferte falsche Typen

`werkzeuge/vorschau.mjs` kannte `.webmanifest` und `.png` nicht und gab
beides als `application/octet-stream` aus. Der Browser lehnt ein
Manifest mit falschem Typ ab — **örtlich wäre die App nicht
installierbar gewesen, obwohl sie es live ist.** Dann prüft man etwas
anderes, als man ausliefert. Drei Typen ergänzt, ein Wächter hält es
fest.

## 0.9.4 — Mit dem Finger bedienbar (05.09.2026)

Janniks Ansage: *„ich will das auf handy ui mit finger druck benutzt
werden kann."*

**Gemessen war der Krämer der einzige Bildschirm, an dem ein Finger
nichts ausrichtet.** Die Lobby besteht aus HTML-Knöpfen (220 × 48, über
der Bedienung — nachgemessen mit `elementFromPoint`); die Kartenwahl hat
seit #69 ihren Tippweg; Endbildschirm und Truhen brauchen nur den einen
Knopf unten rechts. Der Krämer kannte **ausschließlich** Achse und
Knopf — auf dem Telefon hieße das: mit dem Daumen durch sechs Felder
wandern, um das vierte zu kaufen.

### Der Fehler, der die halbe Handy-Bedienung lahmgelegt hat

Er saß **nicht** im neuen Code, sondern seit der Kartenhand in
`runtime/eingabe.js`:

```js
const knopf = !!(e?.ausweichen ?? e?.knopf);
```

`??` geht nur bei `null`/`undefined` weiter, und `false` ist ein
gültiger Wert. `liesEigene()` liefert **immer** ein `ausweichen`-Feld.
Wer wie die Kartenhand oder der neue Krämerweg ein `{ knopf: true }` in
diese Eingabe mischt, bekommt `false ?? true` — also `false`. **Der
Knopf verschwand genau auf dem Weg, der ihn tragen sollte.**

Im Browser gemessen: Der Tipp bewegte den Zeiger, der zweite Tipp
kaufte nichts. Gemeint war immer „einer von beiden", also `||`.

**Das betraf auch die Kartenhand** — eine Karte ließ sich antippen, aber
nicht nehmen. Beide Prüfungen waren dabei grün: `pruefe-kartenhand`
prüft die Kette, `pruefe-anzeige` die Bedienung, **und niemand ging den
Weg als Ganzes.** Genau dafür steht jetzt Abschnitt 4 der neuen Prüfung.

Dieselbe Falle wie beim Ton in Scotophobia, wo `Number(null)` eine
gültige Lautstärke von 0 war und der Standardwert nie griff.

### Was gebaut ist

**`ladenFelder()` in `runtime/oberflaeche.js`** — die Geometrie des
Krämers an **einer** Stelle. `zeichneLaden()` malt danach,
`runtime/laden-tippen.js` trifft danach. Vorher waren es zwei getrennte
Rechnungen für dieselben Kästen; wer eine ändert, verschiebt entweder
das Bild oder die Trefferfläche, und ein Finger, der sechs Bildpunkte
danebenlandet, sieht aus wie ein Aussetzer des Telefons.

**`runtime/laden-tippen.js`** übersetzt einen Tipp in **dieselben
Eingaben**, die Tastatur und Daumen erzeugen: Achsenschritte bis zum
Feld, dann der Knopf. Über die Leitung geht nichts Neues — ein Tipp,
der `menue.ladenZeiger` örtlich verschöbe, ließe die Welten im
Netzspiel auseinanderlaufen.

**Trefferflächen für den Finger:** „NEU" und „LOS" sind **12
Bildpunkte** hoch; auf einem Telefon quer (812 px) sind das nach der
Skalierung von 1,69 rund **20 physische Bildpunkte** gegen die 44, die
eine Fingerkuppe braucht. Die Kästen bleiben so groß, wie sie aussehen;
nur ihre Trefferfläche wächst auf **26** in die Lücke darunter — nicht
weiter, sonst überlappte „NEU" das „LOS", und ein Tipp auf „LOS" würfelte
neu und kostete Gold.

**Ein eigener Fehler dabei, von der eigenen Prüfung gefangen:** Der
erste Anlauf nahm für das **unterste** Feld die eigene Höhe als
verfügbaren Platz — ausgerechnet „LOS", der Knopf zum Weiterschicken,
blieb dadurch bei 12 Bildpunkten. Die Prüfung war rot, bevor jemand es
am Telefon gemerkt hätte.

### Am laufenden Spiel belegt, nicht behauptet

Auf 812 × 375 mit echten Berührungsereignissen durch die echten Handler:

| | gemessen |
| --- | --- |
| Tipp auf eine Karte, **im Stickfeld** (x 337, Feld reicht bis 406) | Grundrauschen 1.205 → **19.943** veränderte Bildpunkte |
| Karte per Finger genommen | Welle läuft weiter, Krämer erscheint |
| Tipp auf ein Krämerangebot | Grundrauschen **0** → 8.616, Hervorhebung wandert |
| zweiter Tipp | **„GEKAUFT", Gold 39 → 13** |
| Tipp auf „LOS" | „NACHT 2" läuft |

Die 1.205 gegen 19.943 sind der Punkt: Beim ersten Anlauf hatte ich
„19.857 Bildpunkte verändert" als Beweis genommen — **das war keiner**,
weil sich die Welt unter der Kartenhand ohnehin bewegt. Erst das
Grundrauschen daneben macht die Zahl zu einer Aussage.

### Zwei Befunde am Rande

**Das Werkzeug, nicht das Spiel:** Ein Klick des Browserwerkzeugs läuft
im Handy-Modus immer in einen Zeitablauf — auch auf eine leere Stelle.
Der Kartenhand-Agent hatte das vermutet, ich habe es mit der Gegenprobe
belegt. Gemessen wird deshalb über synthetische Berührungen durch die
echten Handler.

**Zeilenenden:** Die neuen Dateien lagen als LF im sonst durchgehend
CRLF geschriebenen Projekt (Fehlerbuch C3). Angeglichen; die Prüfung
lief davor und danach mit demselben Ergebnis.

### Geprüft

`werkzeuge/pruefe-tippen.mjs`, **29 Prüfungen**: Geometrie gegen die
Zahlen von vor dem Umbau, Überlappung bei ein bis vier Spielern,
Achsenschritte, genau ein Knopf bei drei Tipps, nichts außerhalb des
Krämers, nichts für Bereite, nichts ohne eigenen Platz, nichts in der
Spalte des Nachbarn — und der ganze Weg bis zur `knopfFlanke`, für
beide Tippwege.

**Vier Rot-Beweise**, jeder einzeln: Geometrie um einen Bildpunkt
verschoben (5 Meldungen), Trefferfläche über den Nachbarn (Abstand
−12), fremde Spalte tippbar, und der alte `??` zurück (3 Meldungen,
darunter die Kartenhand).

## 0.9.3 — Vier Fälle ins Fehlerbuch (05.09.2026)

Vom Tag der vier Agenten. **F3** stand auf einem eigenen Zweig und ist
mit übernommen; drei sind neu.

| Fall | Was |
| --- | --- |
| **B5** | Die synthetische Tastatur schickte `key` statt `code` — die Figur bewegte sich nie, und zwei Wellen lang sah es so aus, als löste die Truhenphase nicht aus. Der Schluss lag nahe und wäre falsch gewesen. |
| **C6** | `git checkout -- <datei>` nach einem Rot-Beweis holte die **eigene, noch nicht committete** Arbeit weg. Erst committen, dann Rot-Beweise. |
| **E4** | `pruefe-balance.mjs` behauptete auf 10 Läufen „allein endet jeder Lauf". Über 120 gemessen: jeder fünfte nicht. Wo eine Prüfung über einen **Anteil** urteilt, muss die Stichprobe zur Aussage passen. |
| **F3** | Vier Agenten mit angeforderter Isolation, zwei ohne Worktree im Hauptcheckout — 1.215 Zeilen landeten auf einem fremden Zweig. Jeder Agent prüft `git rev-parse --git-dir` als erste Handlung. |

**Die Klammer um alle vier:** Drei davon sind Fälle, in denen die
*Messung* falsch war und nicht das Programm — bei B5 die Eingabe, bei
E4 die Stichprobe, bei F3 der Baum, in dem gemessen wurde. Das ist
inzwischen die häufigste Fehlerklasse dieses Projekts.

## 0.9.2 — Wer schießen darf, hängt nicht mehr am Namen (05.09.2026)

`spiel/kampf.mjs` entschied über die **Verhaltenskennung**, wer auf
Abstand wehtut:

```js
if (art.verhalten !== "speit") continue;
```

Das ist dieselbe Bauart, die am selben Tag schon einmal teuer war — eine
abgeschriebene Verhaltensliste in `werkzeuge/pruefe-katalog.mjs` machte
drei fertig gebaute Verhalten unbenutzbar. **Ein Name ist keine
Fähigkeit.** Gefragt wird jetzt, was ein Gegner *hat*: `abstand`,
`abklingzeit`, `geschosstempo` — die drei Felder, ohne die ein Schuss
gar nicht beschreibbar ist.

**Umbau ohne sichtbare Änderung, und das ist bewiesen:** Beide
Bedingungen wählen auf dem heutigen Katalog dieselbe Menge —
`speier vielfrass` nach Kennung, `speier vielfrass` nach Feldern. Der
Balancelauf bleibt damit zeichengleich.

**Was dadurch gefährlich wird und jetzt geprüft ist:** Eine Art, die
zwei der drei Felder trägt, würde ein Geschoss mit Geschwindigkeit
`undefined` werfen — das fliegt nach `NaN` und trifft nie, ohne dass
etwas rot wird. Neue Prüfung „Fernangriff ist ganz oder gar nicht
beschrieben", rot bewiesen (dem Speier `geschosstempo` genommen: 2 von
3 Feldern).

**Für `kreist` heißt das:** Die technische Sperre ist weg — wer die drei
Felder trägt, schießt, unabhängig davon, wie er läuft. Offen bleibt
allein die Auslegungsfrage, **welche Art** einen Fernangriff bekommt.
Der nächstliegende Träger ist die Aaskrähe (sie fliegt schon heute
Bögen und heißt danach), aber das setzt einen speienden Gegner **ab
Welle 3** in ein Spiel, das ihn bisher erst ab Welle 6 kennt. Das ist
eine Schwierigkeitsentscheidung, keine Reparatur, und gehört Jannik.

## 0.9.1 — Die Truhen waren im Browser eine Sackgasse (05.09.2026)

Der Truhen-Regelkern (#74–#76) war fertig und geprüft, aber
`runtime/*` gehörte einem anderen Agenten und blieb unberührt. Auf dem
zusammengeführten Stand hieß das:

**`runtime/start.js` `wendeAn()` kannte die Phase `"truhen"` nicht.**
Die Phase ist zeitgesteuert — `welt.truhenZeit` zählt in `schritt()`
herunter, und `schritt()` ruft in dieser Phase sonst niemand. Die erste
Welle, in der jemand eine Truhe trug, hätte das Spiel **für immer
angehalten**. `werkzeuge/pruefe-truhen.mjs` stellt genau diesen Fall als
Rot-Beweis (72.000 Schritte hängengeblieben); im Browser wäre er nur
nicht als Absturz aufgefallen, sondern als Bild, das stehen bleibt.

Zweitens fiel `"truhen"` in `bild()` auf `zeichneEnde()` durch — der
Endbildschirm mitten im Lauf.

### Was jetzt zu sehen ist

**In der Welle:** Liegende Truhen werden im selben Pass wie die Beute
gemalt (`DINGE.truheZu`), aber mit doppelter Hüpfhöhe und einem
pulsierenden Lichtsaum. Das ist kein Schmuck: Die Fackel steht in der
Mitte der Arena, eine Truhe fällt dort, wo gekämpft wurde — also meist
im Dunkeln. Ohne eigenes Licht wäre „selten, aber auffindbar" (#75) an
der Beleuchtung gescheitert statt am Zufall.

**Am Wellenende:** `zeichneTruhen()` zeigt eine Zeile je Fund, nach
Sorte eingefärbt (Gold, Wissen, Fundstück, Waffe). Bei Gold und Wissen
steht die Menge, bei Fundstück und Waffe der Name — zwei Formen statt
einer, die für beides halb passt. Eine Waffe, die wegen vollem Gürtel zu
Gold wurde, trägt „(GÜRTEL VOLL)": Sonst sähe der Spieler Gold und
hielte die Truhe für mager, obwohl sie eine Waffe hergegeben hat. Mehr
Funde als Platz werden gezählt statt über den Bildrand geschoben.

### Und `zeichneWahl()` ist weg

Die alte Kartenwahl als Kastenreihe wurde seit der Kartenhand (#69) von
**keiner Zeile** mehr gerufen — und griff auf `k.name`/`k.menge` zu,
Felder, die eine gezogene Karte gar nicht mehr trägt. Wer sie wieder
aufgerufen hätte, bekäme „undefined" auf die Karte. Der Kartenhand-Agent
hat sie gemeldet und nicht angefasst, weil es nicht seine Datei war;
jetzt ist sie entfernt.

## 0.9.0 — Vier Baustellen zusammengeführt, und eine Sperrklinke ist gestiegen (05.09.2026)

Kartenhand (#69), Angriffe und Anzeige (#80, #93), Truhen (#74–#76) und
die Gegnerverhalten (#71–#73) sind auf einem Stand. Vier Agenten in vier
eigenen Worktrees, **genau eine überschneidende Datei**
(`werkzeuge/pruefe-alles.mjs`, drei Einträge, konfliktfrei) — der
Schnitt hat gehalten.

Die Kette wächst auf **23 Prüfläufe** und braucht auf dem integrierten
Stand **247 s**; sie ist grün.

### Die eine Zahl, die Jannik sehen muss

**Zwei Fünftel aller Viererläufe enden nicht mehr von selbst.**

| ohne Ende, 40 Läufe je Reihe | vorher | jetzt |
| --- | ---: | ---: |
| 1 Spieler | 6 (15,0 %) | **10 (25,0 %)** |
| 2 Spieler | 10 (25,0 %) | **15 (37,5 %)** |
| 4 Spieler | 8 (20,0 %) | **16 (40,0 %)** |

Die Ursache ist gemessen und keine Panne: Mit den Seltenheitsgraden
(#69) sind die Aufstiegskarten stärker geworden — mittlere Menge je
Karte **5,04 → 11,17**, erreichbare Werte **8 → 31**. Das ist genau das,
was bestellt war. Ein stärkerer Spieler überlebt länger, und in einem
Modus ohne Ende heißt „länger" irgendwann „für immer".

`ABBRUCH_SPERRE` in `werkzeuge/pruefe-balance.mjs` ist deshalb
**gestiegen**, und das widerspricht ihrer eigenen Regel („darf sinken,
niemals steigen"). Sie steht trotzdem dort — mit der Messung daneben,
weil Verschweigen die schlechtere Wahl wäre. **Die nächste Änderung an
dieser Zeile muss die Zahlen senken.**

Damit ist Vorgang #52 („Was kostet ein Sturz im endlosen Modus?") nicht
mehr eine offene Frage unter anderen, sondern die blockierende.

## 0.8.2 — Drei Verhalten hatten keinen Benutzer, und eine Prüfung log (05.09.2026)

Der Monster-Agent hatte sechs Gegnerverhalten gebaut und geprüft. Drei
davon — `kreist`, `sammelt`, `stur` — konnte **kein Gegner benutzen**,
weil `werkzeuge/pruefe-katalog.mjs` eine abgeschriebene Liste der
damaligen drei führte:

```js
melde(["laeuft", "schwankt", "speit"].includes(g.verhalten), …);
```

Die Liste hat still gearbeitet, solange es nur drei gab. In dem Moment,
als der Katalog drei weitere bekam, war sie kein Wächter mehr, sondern
ein Riegel. Gefragt wird jetzt der Katalog selbst (`VERHALTEN_IDS`).

### Zwei Verhalten haben Benutzer bekommen

| Gegner | vorher | jetzt | warum dieser |
| --- | --- | --- | --- |
| Hetzer | `laeuft` | **`stur`** | peilt nur alle 1,5 s neu — die Frage stellt sich nur bei einem, der den Spieler überholt |
| Wächter | `laeuft` | **`sammelt`** | lädt und bricht dann aus; die Konstanten hießen schon immer „wie lange ein **Wächter** lädt" |

Beides gegen das Grundtempo 78 gemessen, nicht geschätzt: Der Hetzer
überholt ab **Welle 10** (Deckel 117,8), der Wächter im Ausbruch ab
**Welle 15** (Deckel 104,5). Der Knochenritter käme mit 64,6 nie über
das Spielertempo — `stur` auf ihm wäre Zierde gewesen. Genau das prüft
jetzt `pruefe-gegner.mjs` Abschnitt 6, damit das Verhalten nicht später
auf einen Schlurfer rutscht.

**`kreist` bleibt ohne Benutzer, mit Grund im Code:** `spiel/kampf.mjs`
lässt nur Arten mit `verhalten: "speit"` schießen, und ein Gegner, der
per Bauart Abstand hält, tut ohne Fernangriff gar nichts. Die Ausnahme
steht benannt in `pruefe-katalog.mjs` und ist **zweiseitig** geprüft:
Sie wird rot, sobald sie überflüssig ist. Aufgehoben wird sie, wenn die
Schussbedingung von der Verhaltenskennung auf die vorhandenen Felder
(`abstand`/`abklingzeit`/`geschosstempo`) umgestellt ist.

### Der eigentliche Fund: `pruefe-balance.mjs` hat nicht gemessen, was sie behauptet

Sie lief auf **10, 6 und 6** Läufen und schrieb dazu „allein endet jeder
Lauf", abgesichert durch `ABBRUCH_SPERRE[1] = 0`. Über **120** Läufe
gemessen war zur selben Zeit jeder fünfte Alleinlauf ohne Ende:

| | 10/6/6 Läufe | 120 Läufe je Reihe |
| --- | ---: | ---: |
| 1 Spieler ohne Ende | 0 von 10 | **26 von 120 (21,7 %)** |
| 2 Spieler ohne Ende | 3 von 6 | 39 von 120 (32,5 %) |
| 4 Spieler ohne Ende | 3 von 6 | 22 von 120 (18,3 %) |

Bewiesen hat die Schwäche diese Änderung selbst: `stur` auf dem Hetzer
senkte die Abbrüche über 120 Läufe von **26 auf 16** — und **machte die
Prüfung rot** (0 → 1 bei zehn Saaten). Ein Wächter, dessen Urteil bei
einer echten Verbesserung umkippt, ist ein Würfel mit Meinung.

Jetzt **40 Läufe je Reihe** (rund 60 s statt 11 s). Der Satz „allein
endet jeder Lauf" ist ersatzlos weg — er war nie wahr, nur nie
widerlegt. An seine Stelle tritt die Eigenschaft, die er meinte: allein
darf es nicht *seltener* ohne Ende ausgehen als zu mehreren.

### Und was die größere Stichprobe sonst zutage gefördert hat

Die feste Wandgrenze von 0,78 („keine Wand in einer einzelnen Welle")
war bei sechs Läufen nicht zu halten. Gemessen über 40 Läufe:

| Spieler | schlimmste Welle | Anteil | davon auf Bosswellen |
| ---: | ---: | ---: | ---: |
| 1 | 6 | 58,8 % | 26,5 % |
| 2 | 8 | 40,0 % | 43,3 % |
| 4 | 8 | **78,1 %** | **84,4 %** |

Zwei verschiedene Befunde, nicht einer: **Zu viert stirbt man fast nur
noch auf Bosswellen** — Welle 8 ist die erste mit zwei Hauptleuten und
trägt bei vier Spielern **19.270** Lebenspunkte gegen 9.157 in Welle 7,
eine Verdopplung in einer Welle. **Allein** dagegen steht die Wand auf
einer gewöhnlichen Welle. Eine feste Grenze müsste eines von beidem für
falsch erklären; sie ist deshalb dieselbe Sperrklinke wie
`ABBRUCH_SPERRE` — gemessene Wirklichkeit, die sinken darf und nicht
steigen. Ob eine Bosswelle eine Wand sein *soll*, ist Janniks
Entscheidung (#52), nicht die einer Prüfung, die sie wegdefiniert.

**Ein Gegenversuch ist gemessen und verworfen:** Den Knochenritter von
Welle 8 auf 9 zu schieben — er betritt den Topf genau in der zweiten
Bosswelle — machte die Wand **schlimmer** statt besser (78,1 → 82,9 %),
weil dann mehr Läufe Welle 8 überhaupt erreichen. Zurückgenommen.

### Rot-Beweise

| Fall | Meldung |
| --- | --- |
| die drei Verhalten ohne Benutzer | 3 Fehler, „Verhalten \"kreist\" hat einen Benutzer · 0 Gegnerarten" |
| `kreist` einem Gegner gegeben | „Verhalten \"kreist\" ist benutzt — die Ausnahme kann weg" |
| `stur` auf den Knochenritter | „sitzt auf einem Gegner, der den Spieler irgendwann überholt · 64,6 gegen 78" |
| Sperrklinke `ABBRUCH_SPERRE` | vor der Vergrößerung rot bei 1 von 10 |

### Ein eigener Fehler

`git checkout -- spiel/katalog/gegner.mjs` nach einem Rot-Beweis hat
**meine eigenen, noch nicht committeten Zuweisungen mitgenommen** —
beide Verhalten waren wieder `laeuft`, die Kopfnotiz wieder die alte.
Gemerkt am Prüflauf („428 Prüfungen, 2 Fehler", wo eben noch 0 standen).
Fehlerbuch **C6**, derselbe Fall wie im Age-of-Beast-Wiki: Ein
Rot-Beweis läuft auf ungespeicherter Arbeit, und der Befehl holt den
Stand aus dem Index, wo diese Arbeit nie war. Seitdem: erst committen,
dann Rot-Beweise.

## 0.8.1 — Eine Prüfung, die hängen konnte (05.09.2026)

Janniks Meldung: *„die laufende aufgabe läuft seid 300 min??????"*

Er hatte recht, und die Ursache war schlimmer als eine träge Anzeige:
Ein Aufruf von `werkzeuge/pruefe-netz.mjs` lief seit 09:42 Uhr —
**297 Minuten mit 17.791 Sekunden Rechenzeit**, also fast fünf Stunden
Volllast auf einem Kern.

### Die Ursache

```js
while (s.offeneWahlen > 0 && s.karten?.length) nimmKarte(welt, s, 0);
```

Die Schleife endet nur, wenn `nimmKarte()` die Wahl auch abräumt. Beim
Rot-Beweis eines anderen Wächters tat sie das nicht — und dann läuft
sie für immer. Dieselbe Schleife steht in `werkzeuge/balance.mjs` seit
jeher mit `schutz++ < 40`; **beim Übernehmen ging der Zähler verloren.**

### Warum es niemand gemerkt hat

Ein hängender Prozess meldet nichts. Die Kette blieb grün, weil sie ihre
Läufe einzeln startet und dieser Aufruf danebenlief. In der
Aufgabenliste stand nur „vor 5 h gestartet" — was wie ein
abgeschlossener Auftrag aussieht. Der Agent, der die Schleife gebaut
hat, hatte den Fall sogar gemeldet („mit abgeschaltetem Wächter lief
eine Schleife endlos statt rot zu werden") und ihn als danebengegangenen
Rot-Beweis abgehakt, statt ihn zu beheben.

### Behoben

Zähler `WAHL_SCHUTZ = 40`, und er **meldet**, statt still abzubrechen —
ein Zähler, den niemand abfragt, ließe die Prüfung mit einer Welt
weiterlaufen, die nie über die Kartenwahl hinausgekommen ist, und sie
wäre grün.

**Der Beleg ist die Dauer, nicht die Meldung:** Mit `WAHL_SCHUTZ = 0`
gestellt — genau der Zustand, der vorher endlos lief — meldet die
Prüfung jetzt „6483-mal blieben offene Wahlen stehen", Rückgabewert 1,
in **unter einer Sekunde**. `pruefe-netz.mjs` 38 → **39 Prüfungen**.

### Gegengeprüft

Alle 13 `while`-Schleifen in `spiel/` und `werkzeuge/` durchgesehen.
Zehn enden garantiert, weil sich ihre Laufvariable im Rumpf ändert
(Index wächst, Wissen sinkt, Stapel schrumpft); zwei tragen bereits eine
Obergrenze. Diese eine war die einzige, deren Ende an einem
Rückgabewert hing.

Neu im Fehlerbuch als **E3**.

## 0.8.0 — Janniks große Liste, gebaut (05.09.2026)

Fünf Zweige, parallel gebaut, hier zusammengeführt. Die ausführlichen
Belege je Paket stehen in `docs/rueckmeldung/`.

### Das Werte-Fundament — 55 Werte statt acht

`spiel/werte.mjs` trägt jetzt eine **Tabelle** statt fester Felder:
`{ id, name, text, grund, gruppe, form }`, sieben Gruppen, drei Formen.
**32 der 55 Einträge werden erzeugt**, nicht getippt — fünf
Schadensarten mal vier Achsen, ihre Widerstände, und je Gruppe eine
Kartenneigung. Eine sechste Schadensart wäre ein Eintrag in
`spiel/schadensarten.mjs` und keine Zeile in der Werteliste.

Neu: fünf Schadensarten (`schnitt`, `wucht`, `feuer`, `frost`, `fluch`);
genau eine geht an der Rüstung vorbei. **Eine** Schadensrechnung in
`berechneSchaden()`, gerechnet beim **Einschlag** statt beim Abschuss —
der Widerstand gehört dem Ziel, ein Geschoss mit vorberechnetem Schaden
träfe zwei verschieden gepanzerte Gegner gleich hart. Dazu Ausweichen
als Sprung über elf Schritte mit kurzer Unverwundbarkeit.

**Der Umbau ist bewiesen neutral:** Balancelauf vor und nach dem Umbau
liefert zeichengleich `6,100 · 104,167 · 103,333` bei 1/2/4 Spielern.

**Zwei Befunde, die den Entwurf korrigiert haben.** `WERTE` durfte
**nicht** selbst zur Tabelle werden: `spiel/stufen.mjs` liest
`GEWICHT[w]`, und mit einem Objekt als Schlüssel wäre der Kartentopf
leer geblieben und der erste Aufstieg an `WERT_TEXT[undefined][0]`
gestorben — ohne dass eine Prüfung angeschlagen hätte. Und **die
Reihenfolge der ersten acht Werte ist Balance**: nach Gruppen sortiert
sprang der Vier-Spieler-Lauf von 103,3 auf 201,0, weil `stufen.mjs`
daraus mit dem gesäten Strom zieht.

### Das Auswertungsprotokoll — Janniks Werkzeug zum Schrauben

Über 60 Kennzahlen je Lauf, **ohne einen einzigen Haken im Regelkern**:
`spiel/protokoll.mjs` tastet nach jedem Schritt den Weltzustand ab und
vergleicht mit dem Schritt davor. Ein Gegner, der eben noch stand und
jetzt fehlt, ist tot — seine letzte Position ist die Sterbeentfernung;
das erste `leben < lebenMax` ist der erste Treffer.

Wo nach „in der Regel" gefragt war, steht ein **Median mit Spanne** und
kein Mittelwert: Ein Mittelwert kann von zwei Ausreißern erfunden sein.

Der erste vollständige Lauf (Saat 1, ein Spieler) zeigt das
Powerscaling — Verhältnis von Leistung zu Bedarf: 0,95 · **1,26** ·
0,93 · **0,66** über die Wellen 3 bis 6. Daneben die Ursache: Welle 4
schickt 19 Gegner, Welle 5 dann **51**. Und: 17 % des Goldes bleiben
liegen, 54 % der Gegner sterben beim ersten Treffer (Balg 75 %,
Hauptmann 0 %).

**Vier Gegenproben** belegen, dass die Zahlen messen statt zu behaupten:
Waffenschaden verdoppelt → Zeit bis zum Tod 0,461 → 0,144 s;
Gegnerleben verdoppelt → Sofort-Tote 76 % → 3 %.

### Die Sprites

Fünf **Trefferzeichen**, eines je Schadensart, an der Silhouette
unterscheidbar — `fluch` ist das einzige mit einem Loch, und die einzige
Art, die an der Rüstung vorbeigeht. Zwei **Hauptleute** (`gebeinfuerst`
23×21, `vielfrass` 21×19), **Truhen** zu und offen. Das Sprite-Format
kennt jetzt optional `bilder: [...]` für Einzelbilder; `bild` bleibt
Pflicht und ist immer `bilder[0]`, kein bestehender Aufrufer bricht.

**Zwei Fehler fand nur das gerenderte Bild, keine Zahl:** Der erste
Wuchtschlag in Steintönen hatte gegen den Boden einen Abstand von
**21,4 von 255** — fast unsichtbar; mit Eisentönen sind es **83,2**. Und
der Gebeinfürst las sich als Silhouette wie eine Raute statt einer
Figur. `pruefe-sprites.mjs` 110 → **146 Prüfungen**.

### Lobby, Handy, Webadresse

`netz/` spricht das Vermittlungsprotokoll **selbst** — kein Paket, keine
Bibliothek. Über die Leitung gehen nur Eingaben: zwei Achsen und ein
Knopf je Spieler, Lockstep mit **50 ms** Verzögerung. Der Prüfstand
belegt beides: gleiche Eingaben ergeben dieselbe Welt, und eine um einen
Tick verschobene Folge eine **andere** — ohne die zweite Hälfte bewiese
die erste nichts.

**Die vier Tastaturbelegungen sind entfallen.** Ein Rechner steuert eine
Figur (Entscheidung Janniks, #46).

**Handy:** Hochkant war das Bild **lautlos beschnitten** — 480 Bildpunkte
auf 375 px Fenster sind 128 %, je 53 Punkte fielen weg. Jetzt 375 × 211
mit Hinweis aufs Querhalten; quer bleibt der Faktor 1.

**Die Verbindung steht, und der erste Befund dazu war falsch.** Der
Vermittler galt als kaputt, weil er ein Angebot annimmt und die
Verbindung dann mit Code 1000 schließt — ein Ablehnen, das aussieht wie
ein Auflegen. Gemessen ist er in Ordnung: Er verwirft nur, was nicht
aussieht wie eine echte Gegenstelle. Was er wirklich verlangt, je Art
gemessen:

| Art | verlangt | entbehrlich |
| --- | --- | --- |
| `OFFER` | `sdp`, `type`, `connectionId`, `label`, `serialization` | `reliable`, `browser` |
| `ANSWER` | `sdp`, `type`, `connectionId` | die übrigen vier |
| `CANDIDATE` | `candidate`, `type`, `connectionId` | die übrigen vier |

`OFFER` ist die strengste Art — wer an `ANSWER` prüft, hält die schmale
Form für ausreichend und sucht den Fehler an der falschen Stelle.

**Nachgewiesen, nicht behauptet:** Datenkanal beidseitig offen,
**200/200 Nachrichten**, 19.102 Byte hin und 14.212 zurück, Umlauf im
Median **0,6 ms**. Dazu eine echte Runde zu zweit über zwei Browser-Tabs
mit echten Mausklicks, gespielt bis zum Endbildschirm — beide Seiten
zeichengleich, 21.393 Nachrichten über die Runde.

⚠️ **Beide Gegenstellen liefen auf einem Rechner.** Die 0,6 ms sind eine
Schleife, keine zwei Router. Zwei echte Geräte sind ungeprüft.

### Neuer Fehler, gefunden und nicht behoben

Bricht ein Spieler weg, läuft die Welle korrekt weiter — im **Krämer**
hängt die Runde für immer, weil `welt.spieler.every((s) => s.bereit)`
auf jemanden wartet, den es nicht mehr gibt. Der Fehler ist **älter als
das Netz-Koop** und war nur nie sichtbar: An einer Tastatur kann kein
Spieler verschwinden. Vorgang **#93**, mit drei Möglichkeiten und einer
Empfehlung — die Antwort ist eine Regelentscheidung, keine Reparatur.

### Der Fahrplan

Sieben neue Phasen (12 bis 18), 25 Schritte, 32 Vorgänge (#60–#91).
Entscheidung #46 geschlossen; #92 (Repository öffentlich?) und #93 neu
und offen.

### Gemessen

Kette auf dem integrierten Stand **18 Prüfläufe grün** (vorher 15) ·
`docs/ROADMAP.md` 599 → 1023 Zeilen · 59 → 93 Vorgänge · neu in der
Kette: `pruefe-werte.mjs`, `pruefe-protokoll.mjs`, `pruefe-netz.mjs`.

`.claude/worktrees/` steht jetzt in `.gitignore` — die Worktrees der
Unteragenten gehören dem Werkzeug und nicht dem Projekt, und der
Arbeitsweise-Wächter zählte sie sonst bei jedem parallelen Bau als
offene Änderung.

## 0.7.0 — Janniks große Liste, einsortiert (05.09.2026)

An einem Tag kamen: eine Werteliste mit fünf Schadensarten, Krit je
Art, Modifiern, Widerständen, Karten-Chancen, AoE, Zusatzprojektilen ·
Ausweichen als Sprung · Level-up als Kartenhand mit Seltenheiten und
Meta-Karten · mehr Partikel · Monster mit Mechaniken · Hauptleute ·
Beutetruhen · Inventar · schwebende Zahlen mit Krit · bewegte Sprites ·
Abklingzeit-Anzeige · *„Nur lobby beitritt, kein lokal auf der selben
tastatur"* · *„Das spiel über github erreichbar machen für freunde!
also webadresse!"* · *„spielbar auf desktop und handy!!!!!"* · und
zuletzt *„ein auswertungs protokoll!"*.

Nach Janniks eigener Regel wird ein Wunsch nicht notiert, sondern
**analysiert, sein Bedarf bestimmt und einsortiert**. Das ist hier
geschehen: sieben neue Phasen (12 bis 18), 25 Schritte, jeder mit
einem Fertig-Kriterium, dazu 32 neue Vorgänge (#60 bis #91).

### Der Befund, der die Reihenfolge bestimmt

**Es sind nicht zwanzig Wünsche, sondern zwei Bündel.** Das eine ist
ein Fundament (Werte, Schadensarten, Krit) mit dem Inhalt darauf
(Karten, Monster, Optik) — dort hängt alles aneinander, und wer den
Inhalt zuerst baut, baut ihn zweimal. Das andere ist die Auslieferung
(Lobby, Webadresse, Handy), und sie hängt an **keinem einzigen Wert**.

Deshalb wird beides gleichzeitig gebaut, auf vier Zweigen, die
einander nicht berühren.

### Drei Befunde, die den Zuschnitt geändert haben

**Fünfundvierzig Werte sind keine fünfundvierzig Felder.** Heute hat
`spiel/werte.mjs` acht feste Felder, und jede Anzeige, jede Karte und
jede Prüfung zählt sie einzeln auf. Bei fünfundvierzig — davon rund
fünfundzwanzig, die nur Varianten je Schadensart sind — bricht das:
Wer einen vergisst, merkt es nie. Werte werden eine **Tabelle**, aus
der Anzeige, Karten und Prüfung entstehen; die Schadensart-Varianten
werden erzeugt statt abgetippt.

**Die halbe Werteliste ist ohne die Kartenhand wertlos.** „Chance auf
bestimmte Karten", „seltenere Karten finden" und „Karten-Modifier"
sind drei Werte, die nichts messen können, solange Karten keine
Seltenheit haben. Werte-Fundament und Kartenhand sind ein Vorhaben in
zwei Schritten.

**Das Auswertungsprotokoll braucht keinen Haken im Regelkern.** Fast
jede Zahl aus Janniks Liste ist von außen sichtbar, wenn man zwei
aufeinanderfolgende Weltzustände vergleicht — auch die, die nach einem
Ereignis klingen: Ein Gegner, der eben noch stand und jetzt fehlt, ist
gestorben, und seine letzte Position kennt man aus der vorigen
Abtastung. Das erste Mal `leben < lebenMax` ist der erste Treffer.
Also ein Beobachter statt einer Verdrahtung. Auf Janniks Klarstellung
— *„das protokoll dient nur der auswertung so das du später die
schwierigkeit anpassen kannst"* — muss außerdem jede Kennzahl auf eine
**Stellschraube** zeigen, die es wirklich gibt; eine ohne Schraube
beschreibt nur.

### Eine Entscheidung ist beantwortet, eine neue steht an

**#46 geschlossen.** *„Nur lobby beitritt, kein lokal auf der selben
tastatur"* entscheidet die Frage in beide Richtungen: Koop läuft über
das Netz, und die vier Tastaturbelegungen in `runtime/eingabe.js` sind
ab jetzt Altlast statt Ausstattung. Ein Rechner steuert eine Figur.

**#92 neu und offen: Wird das Repository öffentlich?** GitHub Pages
veröffentlicht im kostenlosen Tarif nur aus einem öffentlichen
Repository. Wer die Webadresse will, macht Quelltext und
Versionsgeschichte sichtbar. Das ist keine technische Frage, und sie
ist die einzige in dieser Liste, die niemand außer Jannik beantworten
kann. Gebaut wird alles unabhängig davon — es fehlt nur der Schalter
am Ende.

### Der Weg für den Lobbycode, entschieden statt offen

WebRTC zwischen den Browsern, vermittelt über den öffentlichen
PeerJS-Broker, dessen Protokoll das Spiel **selbst spricht** — kein
Paket, keine Bibliothek. Der Lobbycode ist die Kennung, unter der sich
der Wirt beim Broker meldet; danach laufen alle Spieldaten direkt von
Rechner zu Rechner.

Ehrlich dazu: Der Broker ist ein fremder Dienst und kann ausfallen, und
hinter manchen Netzen kommt gar keine direkte Verbindung zustande. Das
lässt sich ohne eigenen Relais-Server nicht heilen, nur melden. Es
entsteht dabei kein Konto, keine Datenbank und keine laufende Rechnung
— das ist der kleinste Bruch mit „nur lokal", der die Sache überhaupt
möglich macht.

### Gemessen

`docs/ROADMAP.md` 599 → 1023 Zeilen · 11 → 18 Phasen · 40 → 65 Schritte
· 59 → 92 Vorgänge · `pruefe-vorgaenge.mjs` 5 Prüfungen, 0 Fehler ·
`pruefe-workclaim.mjs` 4 Prüfungen, 0 Fehler bei fünf aktiven
Ansprüchen.

**Am Spiel selbst wurde in diesem Eintrag keine Zeile geändert.**

## 0.6.1 — Phase 11: Koop über das Netz (05.09.2026)

Janniks Antwort auf #46: *„Koop über webbrowser zugleich."* — also
online, im Browser, gleichzeitig. Fünf neue Schritte (#53 bis #58).

**Was diese Antwort sofort ändert, obwohl noch keine Zeile Netzcode
existiert:** Die Regeln aus `CLAUDE.md` — `spiel/` kennt keinen
Browser, kein `Math.random`, fester Schritt von 1/60 s — sind ab jetzt
**tragend** statt ordentlich. Zwei Rechner mit derselben Saat und
denselben Tastendrücken rechnen dieselbe Welt aus; über die Leitung
müssen dann nur zwei Achsen und ein Knopf je Spieler und Bild.

Jedes `Math.random` im Kern lässt die beiden Rechner auseinanderlaufen,
und zwar **langsam** — man merkt es erst nach Minuten, wenn die Welten
sich schon widersprechen. `pruefe-kern.mjs` hält alle drei Regeln
bereits fest; er ist ab dieser Entscheidung kein Ordnungsdienst mehr,
sondern die Sicherung.

Deshalb steht Schritt **11.1 vor allem anderen**: Zwei Welten im selben
Prozess, gefüttert mit denselben Eingaben, müssen nach zehn Minuten
bitgleich sein — und ein absichtlich eingebautes `Math.random` muss das
Werkzeug melden. Erst danach geht etwas über eine Leitung.

**Ein Fund am Rande:** GitHubs Liste der Vorgänge hinkt dem Anlegen um
Sekunden hinterher. Das Skript, das die Nummern in den Fahrplan
zurückträgt, hat die zwei fehlenden **gemeldet** statt sie aus der
Reihenfolge zu raten — eine geratene Nummer wäre still falsch gewesen.

---

## 0.6.0 — Endlose Nächte, und drei Löcher, die sie aufgedeckt haben (05.09.2026)

Janniks Ansagen: *„Im arena modus endloswellen, jede welle 30 sekunden
(boss wellen bis der boss besiegt ist)"* und *„die runde geht solange
bis die kutsche den nächsten checkpoint erreicht hat. das kann 30-60
sekunden dauern bei normaler schwierigkeit"*.

### Der Modus-Begriff, weil es jetzt drei Endebedingungen gibt

Neu ist `spiel/katalog/modi.mjs`. Vorher endete eine Runde an genau
einer Stelle im Regelkern: wenn die Uhr abgelaufen war. Janniks zwei
Sätze verlangen zwei weitere — und keine davon ist eine Zeit.

| `endet` | die Runde endet, wenn … | wo |
| --- | --- | --- |
| `zeit` | die Uhr abgelaufen ist | Arena, normale Welle |
| `elite` | der Hauptmann tot ist | Arena, jede vierte Welle |
| `ort` | die Kutsche den Checkpoint erreicht | Karawane |

Dazu die Verliererbedingung: In der Arena ist der Lauf vorbei, wenn
alle liegen; in der Karawane, wenn **die Kutsche fällt** — auch wenn
alle vier noch stehen. Beides stand vorher fest im Regelkern.

Damit ist Phase 1 des Fahrplans gebaut (#1 bis #3). Die Karawane steht
schon im Katalog, mit `gebaut: false` — sie begründet die Bedingung
`ort`, die sonst wie Vorratsbau aussähe.

### Drei Löcher, die erst das Endlose sichtbar gemacht hat

**1 · Die Kurve konnte nicht endlos.** Gerechnet mit dem alten,
unbegrenzt quadratischen Budget:

| Welle | Gegner je Welle | gleichzeitig | nötige Schadensleistung |
| ---: | ---: | ---: | ---: |
| 12 | 87 | ~35 | 275 |
| 30 | 393 | ~157 | **3.333** |
| 50 | 1.084 | ~434 | **14.210** |

Flüssig läuft es mit rund fünfzig gleichzeitig, und der stärkste
gemessene Bau kommt auf gut zweihundert. Das Spiel wäre bei Welle 25 zu
Ende gewesen — **an der Bildrate, nicht am Können.**

Jetzt sättigt die **Zahl** der Gegner ab Welle 12; ihre Lebenspunkte
und ihr Schaden wachsen weiter. Die nötige Schadensleistung steigt
damit **linear** statt quadratisch: 275 bei Welle 12, 1.194 bei Welle
60, bei konstant rund 87 Gegnern. Das kann ein Bau verfolgen, bis er es
nicht mehr kann — und genau da endet der Lauf.

**2 · Die Dichte war falsch gerechnet.** Die alte Kurve war auf
**wachsende** Wellenlänge ausgelegt (23 s bis 55 s). Bei festen 30 s
ist dasselbe Budget bei Welle 12 **1,83-mal so dicht**. Gerechnet wird
jetzt in Budget **je Sekunde** — mit denselben Werten, die vorher gut
waren (0,57 bei Welle 1, 5,13 bei Welle 12).

**3 · Der unangenehmste: Wer sauber ausweicht, war unsterblich.**
Gemessen war jede einzelne Gegnerart langsamer als der Spieler — von
28 % (Wächter) bis 95 % (Aaskrähe) —, und daran änderte die Welle
nichts. Lebenspunkte wuchsen, Schaden wuchs, **Tempo nicht.**

Die Läufe waren dadurch **zweigipflig**: Sie endeten bei Welle 6 bis 11
oder liefen bis 130 und weiter. Nichts dazwischen. Für einen Menschen
gilt das abgeschwächt — man wird in die Enge getrieben —, aber für
einen guten Spieler stieg die Gefahr sonst nie.

Jetzt wächst auch das Tempo, **mit Deckel** bei 1,9: Ohne ihn wäre die
Aaskrähe bei Welle 100 siebenmal so schnell und flöge durch die
Trefferprüfung hindurch. Ab Welle 15 überholen Hetzer und Aaskrähe den
Spieler, ab 31 endgültig. Ab da läuft man nicht mehr weg.

### Was noch offen ist — und ehrlich als Sperrklinke steht

**Zu mehreren endet der Lauf noch nicht zuverlässig.** Allein endet
heute jeder; zu zweit und zu viert erreicht ein Teil die Notbremse bei
Welle 200. `pruefe-balance.mjs` trägt die gemessene Zahl als
**Sperrklinke**: Sie darf sinken, niemals steigen. Das Ziel ist null.

Ich habe an dieser Stelle **aufgehört zu drehen**, und das mit Absicht:
Der Kunstspieler weicht besser aus als jeder Mensch, und weiter gegen
ihn zu balancieren würde ihn messen statt das Spiel. Der Weg zu null
ist eine Regelentscheidung — was ein Sturz kostet —, und die trifft
Jannik.

Ein erster Versuch steckt schon drin und hat **nichts geändert**: Ein
Niedergeschlagener steht am Wellenende nicht mehr von selbst auf
(`stehtAmWellenendeAuf: false`). Die Läufe, die durchkommen, gehen gar
nicht erst zu Boden.

### Die Anzeige

Kein „NACHT 3/12" mehr — ein endloser Modus hat keinen Nenner. Bei
einer Hauptmannswelle steht statt der Uhr **„HAUPTMANN"** und seine
Lebensleiste, weil dort keine Uhr läuft. Am Ende steht „BIS NACHT 14"
statt „NACHT 14 VON 12".

### Geprüft

Kette grün, 16 Prüfläufe. `pruefe-balance.mjs` ist auf die neue
Wirklichkeit umgeschrieben — „man kann gewinnen" gibt es nicht mehr,
dafür „jeder Lauf endet", „keine Wand", „Koop nicht schwerer als
allein" und die fünf Eigenschaften des Modus selbst.

---

## 0.5.0 — Das Spiel heißt **Where Shadows Crawl** (05.09.2026)

Janniks Entscheidung (#48). Der Arbeitstitel „Nachtzehrer" ist damit
Geschichte.

Geändert: Titelbild, `<title>`, README, `CLAUDE.md`, der Entwurf und
die Meldung des Vorschau-Servers. Das **Repository** heißt jetzt
`Kimpaliz/where-shadows-crawl` — GitHub leitet die alte Adresse
dauerhaft weiter, und `alpha-code.json` ist nachgezogen.

**Der Ordner bleibt `Nachtzehrer`.** Ein Umbenennen bräche die
Vorschau-Konfiguration und jeden Pfad, der irgendwo notiert ist, und
brächte nichts — dasselbe gilt bei Scotophobia, das im Ordner
„Granithoehle" liegt.

**Ein Untertitel ist dabei mitgestorben:** „ZWÖLF STUNDEN, EIN
BANNKREIS" versprach eine Regel, die es nicht mehr gibt — mit
Endloswellen kommt kein Morgen. Jetzt steht dort „EIN BANNKREIS · EINE
FACKEL · KEIN MORGEN".

---

## 0.4.1 — Janniks Silhouetten (05.09.2026)

Seine Wahl aus den zehn Fassungen (#47): **Jäger schmal**,
**Knochenritter wie heute**, **Schlurfer gebeugt**.

Der Jäger ist damit schlanker und trägt einen längeren Mantel; der
Schlurfer hat den Kopf tief und einen breiten Rücken statt der
seitlichen Schräge. Der Knochenritter bleibt, wie er ist — nur mit dem
gestern nachgedunkelten Knochenton.

Alle drei bestehen unverändert beide Prüfungen: die sieben der
Pixel-Werkstatt und die 94 der eigenen Kette.

---

## 0.4.0 — Auf GitHub, mit Vorgangs-Infrastruktur (05.09.2026)

Janniks Ansage: *„fest in das github projekt intigrieren. Issue
infrastruktur. mit main issus die aufgeteilt werden in sub issues. für
Roadmap features, wünsche und fehler und bugs."* — dazu fünf
Fahrplanpunkte.

### Das Repository

`https://github.com/Kimpaliz/nachtzehrer`, **privat**. `main` entstand
aus der linearen Kette der vier Zweige (`a1dde00` → `9546e94`) — sie
folgten aufeinander, es gab nichts zusammenzuführen.
`pruefe-freigabe.mjs` lief vorher: nichts Verbotenes im Arbeitsstand,
kein Geheimnismuster in der **gesamten** Historie.

### Die Vorgangs-Infrastruktur

Fünf Formen statt vier. Alpha-Code kennt Phase, Schritt, Fehler und
Entscheidung; Jannik nannte zusätzlich **Wünsche** — und ein roher
Wunsch ist keine der vier: Er ist noch nicht zerlegt.

| Form | Label | Eltern | trägt |
| --- | --- | --- | --- |
| Phase | `track` | keins | das Abnahmekriterium |
| Schritt | `schritt` | Phase | **ein** Fertig-Kriterium |
| **Wunsch** | `wunsch` | keins | den Wortlaut, unverändert |
| Fehler | `fehler` | frei | das Vier-Felder-Muster |
| Entscheidung | `entscheidung` | **keins** | Frage, Optionen, Empfehlung |

**Ein Wunsch verlässt seinen Zustand auf genau zwei Wegen:** Er wird
eine Phase (dann wird er zerlegt) oder eine Entscheidung (dann fehlt
eine Antwort, bevor man ihn einordnen kann). Ein Wunsch, der Wunsch
bleibt, ist einer, den niemand angesehen hat.

Dazu drei Vorlagen unter `.github/ISSUE_TEMPLATE/`, damit **Jannik
selbst** Vorgänge in der richtigen Form anlegen kann — leere Issues
sind abgeschaltet. GitHubs neun Standardlabels sind entfernt; sie
hätten neben den fünf Formen nur verwirrt.

### Angelegt und nachgeprüft

**49 Vorgänge**: 10 Phasen, 35 Schritte, 4 Entscheidungen. Die
Hierarchie steht **dreifach** — GitHubs echte Unter-Vorgänge, die
Aufgabenliste im Sammelvorgang (daraus rechnet GitHub den Fortschritt)
und die Zeile `Teil von #1` im Kind. An Phase #1 nachgesehen: vier
Unter-Vorgänge, vier Punkte in der Liste, jedes Kind mit Rückverweis.

Die 45 Nummern stehen als `Vorgang: #N` im Fahrplan — **aus GitHub
geholt und über den Titel gesucht**, nicht aus der Reihenfolge
abgeleitet. Eine abgeleitete Nummer wäre beim nächsten Mal falsch, und
zwar still. Gegenprobe: Der Trockenlauf meldet jetzt „Nichts
anzulegen".

Vier Entscheidungen warten auf Jannik: Netz-Koop (#46), die zehn
Sprite-Fassungen (#47), der Name (#48), die Länge eines Laufs (#49).
Jede mit Möglichkeiten, Preis und Empfehlung — eine Frage ohne
Empfehlung schiebt die Arbeit nur weiter.

### Der Fahrplan — Janniks fünf Punkte zerlegt, nicht abgeschrieben

**Sechs Befunde, alle am Bestand gemessen:**

1. **„Arena Modus (aktuell vorhanden)" ist der wichtigste Satz.** Er
   macht aus dem ganzen Spiel *einen Modus von mehreren*. Heute gibt es
   keinen Modus-Begriff — ein struktureller Eingriff, kein Feature.
2. **Der Bannkreis ist tragend:** 11 Stellen in vier Dateien. Der
   Karawanen-Modus hat keinen Kreis. **Das ist die eine teure Sache.**
3. **Karawane und „endlos generierte Welt" sind dasselbe System** —
   zusammen bauen, nicht nacheinander.
4. **Inventar, Ausrüstung und Waffen sind ein System, nicht drei.**
5. **Der Händler auf der Kutsche ist derselbe Krämer** — er verkauft
   zwischen den Runden, genau der Zeitpunkt, an dem heute
   `oeffneKraemer()` läuft. Rahmung ändert sich, nicht der Aufbau.
6. **Die Kutsche als Lichtquelle ist fast gebaut:** `welt.fackeln` ist
   schon eine Liste, über die die Lichtrechnung läuft. Ein wanderndes
   Licht ist eine Zeile. Was fehlt, ist, dass es das **Spielziel** ist.

Daraus zehn Phasen mit 35 Schritten, jeder mit **einem**
Fertig-Kriterium: Modus-Begriff · Besitz · Götter und Segen ·
Zufallseigenschaften · fallende Beute · Welt ohne Kreis · Biome ·
Karawanen-Modus · Danmaku · Fortschritt.

---

## 0.3.0 — Die Sprites sind zum ersten Mal gemessen (05.09.2026)

Mit dem Skill `pixel-werkstatt`, der Sprites auf sieben Eigenschaften
prüft, die das Auge nicht zuverlässig sieht. **Sechs von neun Sprites
hatten Mängel** — und keinen davon hätte ich durch Hinsehen gefunden.

### Die Befunde

| Befund | gemessen | behoben |
| --- | --- | --- |
| **Vier Sprites mit gerader Kantenlänge** — Jäger 11 × 12, Schlurfer 9 × 10, Hetzer 7 × 10, Balg 6 × 6 | bei gerader Kante ist der Quellmittelpunkt ein **halber** Bildpunkt; die Figur wandert bei jeder der sechzehn Drehungen | alle vier auf ungerade Kanten |
| **Die Kapuzenöffnung des Jägers** waren vier Einzelpunkte über Eck | schon bei 0° und voller Größe zählte sie als **ein** Fleck statt vier | ein zusammenhängender Block von 3 × 2 |
| **Knochen und Rüstung des Knochenritters gleich hell** | `knochenDunkel` 137,8 gegen `eisenHell` 135,7 — **2 von 255** | Knochenton nachgedunkelt: **31 von 255** |
| **Das Auge des Hauptmanns** war ein Ring aus Einzelpunkten | bei 11° und Größe 0,75 klebte er zusammen | ein gefüllter Block mit einem hellen Kern |
| **Der helle Kopf des Balgs** zerfiel in zwei Teile | bei 45° klebten sie zusammen (1 statt 2) | ein zusammenhängender Block |

Was **nicht** geändert wurde: der Stil. Von den vier Jäger- und drei
Schlurfer-Fassungen im Entwurf ist jeweils die übernommen, die dem
heutigen Aussehen entspricht — es sollen sich die Mängel ändern und
nicht das Bild.

### Neu

- `werkzeuge/werkstatt-auftrag.mjs` übersetzt Nachtzehrers Sprites in
  das Auftragsformat des Skills. Ohne diese Datei wäre die Messung eine
  einmalige Sache gewesen; mit ihr ist sie ein Befehl.
- `pruefe-sprites.mjs` bekommt einen Wächter dazu: **gedrehte Sprites
  brauchen ungerade Kanten.** Rot bewiesen (Jäger auf 11 × 14 gesetzt →
  „11 × 14"), Datei danach byteweise zurückgelegt. Die Kette steht bei
  94 statt 85 Prüfungen.

### Entwürfe zur Wahl

Zehn Fassungen von Jäger, Knochenritter und Schlurfer liegen als
Design-Canvas bereit — je Reihe eine Art, je Blatt das große Raster zum
Antippen, daneben 1:1 auf drei Untergründen und die Silhouettenprobe.
Alle zehn sind gemessen und grün. **Welche Silhouette es wird, ist
Janniks Entscheidung.**

---

## 0.2.1 — Die zweite Vorlage ist zerlegt und einsortiert (04.09.2026)

Janniks Nachtrag, wörtlich: *„'Death Must Die' ist auch eine gute
danmaku vorlage! das hart ein tolles loot, ausrüstungs und
fortschritts system"*. Nur Dokumentation — am Spiel ist keine Zeile
geändert.

**Der Befund, um den es geht:** *Brotatos Bau kommt aus dem Laden,
Death-Must-Dies Bau kommt aus dem Boden.* Naiv nebeneinandergestellt
entstehen zwei Wirtschaften, die nichts voneinander wissen, und die
schnellere macht die andere bedeutungslos — fällt genug Ausrüstung, ist
der Krämer Zierde. Der Ausweg ist, ihnen verschiedene Aufgaben zu
geben: **der Krämer ist die verlässliche Quelle, die Beute die
überraschende.** Dazu die harte Grenze, dass Ausrüstung nie um die
sechs Waffenplätze konkurrieren darf.

**Was das kostet, am Bestand gemessen:** Götter und Segen sind die
billigste der fünf Änderungen — `spiel/stufen.mjs` zieht bereits vier
Karten aus gewichteten Werten und braucht nur einen Vorrat und Stufen.
Zufallseigenschaften kommen **vor** der fallenden Beute, damit der
Erzeuger erprobt ist, bevor es ein Fallsystem gibt. Danmaku ist die
meiste Arbeit und kommt zuletzt vor dem Fortschritt.

**Zwei Warnungen, beide begründet:** Danmaku wird zu viert schnell
unlesbar (Muster nur von Hauptleuten, Dichte unterlinear zur
Spielerzahl, feindliche Geschosse heller als eigene). Und ein Muster
ohne sichtbare Ankündigung erzeugt Tode, die niemand hätte vermeiden
können — das liest sich als kaputt, nicht als schwer.

Neu: `docs/ZWEITE-VORLAGE.md` (die Zerlegung samt sechs offener
Entscheidungen), `docs/ROADMAP.md` (sechs Phasen, jede mit
Abnahmekriterium). Verlinkt aus `SPIEL.md`, `README.md` und
`CLAUDE.md`.

---

## 0.2.0 — Eine Fackel in der Mitte (04.09.2026)

Janniks Ansage, wörtlich: *„und tatsächlich möchte ich das nicht in der
mitte der arena der wabernde schatten ist sondern am rand der arena..
und in der mitte der arena steht eine einsame fackel die den arena ring
erleuchtet"*.

**Das ist nicht nur ein anderer Ort für das Licht, es ist eine andere
Welt.** Vorher lag ein Kranz aus acht bis siebzehn Fackeln auf dem Ring
und die Mitte war schwarz: Man lief am hellen Rand entlang und schaute
in ein dunkles Loch. Jetzt ist es umgekehrt — man steht im Licht, und
die Gegner kommen aus dem Dunkeln herein. Damit ist der Bannkreis auch
spielerisch ein Kreis und nicht bloß eine Wand.

### Was geändert wurde

| | vorher | jetzt |
| --- | --- | --- |
| Lichtquellen | `max(8, radius/22)` Fackeln auf dem Ring | **eine**, in der Mitte |
| Reichweite | fest 155 Bildpunkte | `radius × 1,12` — knapp über den Ring hinaus |
| Rand des Lichts | ein sauberer Ring, der gleichmäßig pulst | **wabert**: zwei Schwingungen über den Winkel mit unpassenden Perioden |
| in der Mitte | nichts | eine **Feuerschale** (neues Sprite, 11 × 11) mit gezeichneter Flamme |

Die Reichweite ist mit Absicht `× 1,12` und nicht `× 1,0`: Genau bis
zum Ring wäre der Rand pechschwarz und die Gegner kämen aus dem Nichts;
deutlich darüber hinaus wäre der ganze Kreis gleich hell und der Rand
keine Drohung mehr.

### Ein Fehler, den erst der Browser zeigte

Die Flamme war ein **oranger Klotz**: ein Rechteck, das die
Feuerschale darunter vollständig verdeckte. Sie wird jetzt Zeile für
Zeile gezeichnet — unten breit und glutfarben, oben schmal und fast
weiß, mit einer Spitze, die seitlich weht — und sitzt über dem oberen
Rand der Schale, damit man sieht, worin es brennt.

---

## 0.1.0 — Das Spiel steht und ist spielbar (04.09.2026)

Janniks Auftrag, wörtlich: *„Meine freunde und ich brauchen ein
webbrowser game koop wie 'Brotatoe' selbes game design, aber ander
stil. Dark fantasy. Exaktes top down. Pixel grafik."*

### Was gebaut wurde

**Der Regelkern** (`spiel/`, 12 Dateien) trägt alle zwölf Bauteile aus
`docs/SPIEL.md` 1: Wellen mit Uhr, selbstschlagende Waffen, sechs
Waffenplätze, liegende Beute, Krämer zwischen den Wellen, Aufstieg
mitten in der Welle, Verschmelzen, Hauptmannswellen, Merkmalsgruppen,
endlicher Lauf, keine Heilung von selbst. Zwölf Waffen, acht
Gegnerarten, vierzehn Fundstücke, acht Werte.

**Koop für einen bis vier** an einem Rechner: eigenes Gold je Spieler,
gemeinsame Welle, **niedergeschlagen statt tot** (drei Sekunden
Aufheben, am Wellenende steht jeder von selbst wieder auf), ein
gemeinsamer Bannkreis. Alle wählen ihre Aufstiegskarte **gleichzeitig**
— viermal nacheinander warten wäre der sichere Weg, den Abend zäh zu
machen.

**Das Bild** rechnet auf 480 × 270 Bildpunkten und wird ganzzahlig
vergrößert; die Kamera rastet auf ganze Bildpunkte. Es gibt **keine
einzige Bilddatei**: Alle Figuren stehen als Text in
`runtime/sprite-daten.js` und werden beim Laden in sechzehn Richtungen
gedreht — rückwärts abgetastet, damit keine Löcher entstehen. Die
Schrift ist ebenfalls aus Bildpunkten, mit Umlauten.

### Was gemessen wurde

**Balance**, mit dem Kunstspieler aus `werkzeuge/balance.mjs`, 60 Läufe
je Spielerzahl:

| Spieler | Siege | Welle im Mittel | Tode häufen sich in |
| ---: | ---: | ---: | --- |
| 1 | 37 % | 8,3 | Welle 6–8 |
| 2 | 57 % | 9,8 | Welle 6–7 |
| 3 | 72 % | 10,6 | Welle 6–8 |
| 4 | 67 % | 10,4 | Welle 6–8 |

⚠️ Der Kunstspieler weicht besser aus als ein Mensch und kauft dümmer.
Die Zahlen taugen für **Vergleiche**, nicht als Vorhersage.

**Fünf Auslegungsfehler, alle erst durch Messen gefunden:**

| Befund | Messung | Behebung |
| --- | --- | --- |
| Man konnte nichts kaufen | Welle 1 gab **5 Gold**, das billigste Angebot kostet 12 | Gold je Gegner rund verdoppelt |
| Welle 4 war eine Wand | sie bestand aus **einem** Gegner mit 697 Lebenspunkten und 33 Schaden | Hauptmann entschärft, eigenes Budget statt des Wellenbudgets |
| Große Gegner töteten in anderthalb Sekunden | 49 → 13 Leben in einer Sekunde bei zwei Gegnern in der Nähe | Schaden gesenkt, Leben angehoben |
| **Zu zweit war es schwerer als allein** | 27 gegen 37 % Siege | Bannkreis wächst mit der **Fläche**, nicht mit dem Radius |
| Die letzten drei Wellen hatten keine Zähne | in 60 Läufen starb **niemand** in Welle 9, 10 oder 11 | Lebenspunkte wachsen stärker mit der Welle |

**Drei Fehler zeigte erst der Browser**, bei grüner Prüfkette:

1. **Die Mitte der Arena war stockdunkel.** Sechs Fackeln mit 108
   Bildpunkten Reichweite auf einem Kreis von 190 lassen genau dort
   kein Licht, wo gekämpft wird. Jetzt mehr Fackeln, größere
   Reichweite, und das Grundlicht von 10 auf 34 Prozent.
2. **Ein kurzer Tastendruck ging verloren**, wenn er zwischen zwei
   Bildern begann und endete. Jetzt wird er gepuffert.
3. **Der Knopf, mit dem man die Aufstiegskarte nimmt, kaufte eine
   Sekunde später im Laden das erste Angebot.** Wer einen Knopf hält,
   während sich der Bildschirm unter ihm ändert, hat nicht zugestimmt —
   deshalb wird der Knopf nach jedem Wechsel 0,28 s nicht gehört.

**Fünf eigene Fehler, vier davon in Werkzeugen:**

| | |
| --- | --- |
| Zwei Sprite-Zeilen hatten die falsche Breite | weil ich sie mit `.replace()` zusammengebaut hatte, statt sie hinzuschreiben |
| „beißt" wurde als „bei?t" gemalt | `"ß".toUpperCase()` ist `"SS"` — zwei Zeichen, und die Suche danach geht ins Leere. Von `pruefe-schrift.mjs` gefangen |
| Ein Umstellungsskript benannte den **Schlüssel** `ruestung` in `rüstung` um | die Rüstungskarte hätte still `undefined` angezeigt. Von `pruefe-katalog.mjs` gefangen, und der Fall ist jetzt ein Rot-Beweis |
| `pruefe-balance.mjs` endet auf `balance.mjs` | der Prüfstand druckte beim Import seine ganze Kommandozeilenausgabe. Jetzt wird der Dateiname als Ganzes verglichen |
| `quellordner` listete `spiel`, `runtime`, `werkzeuge` **und** `.` | jede Datei wurde doppelt gezählt: 86 statt 43, und ein fehlender Tag meldete „2 Dateien" |

### Geprüft

`node werkzeuge/pruefe-alles.mjs` — 15 Prüfläufe, **alles grün**, 9,5 s.
Fünf eigene Fachprüfungen mit zusammen **652 Zusicherungen**
(Kern 123, Katalog 316, Sprites 85, Schrift 97, Balance 31).

**16 Rot-Beweise**, jeder einzeln: Sprite-Zeile zu kurz · Farbe, die es
nicht gibt · Gegner ohne Bild · Palettenwert kein Farbcode · Zeichen
ohne Glyph · Glyph zu schmal · Wert ohne Anzeigetext · verschriebenes
Merkmal · Fernwaffe ohne Geschosstempo · Fundstück mit erfundenem Wert
· `Math.random` im Kern · Browser im Kern · Arena wächst falsch ·
Rüstung macht unverwundbar · Hauptmann als Wand · Datei ohne Tag. Nach
jedem Beweis wurde die Datei **byteweise** zurückgelegt und die
Gleichheit belegt.

**Im Browser durchgespielt**, nicht nur geprüft: Titelbild →
Spielerzahl → Welle 1 mit Gegnern und Beute → Aufstieg mit vier Karten
→ Krämer mit vier Angeboten, Neuwürfeln und „Bereit". Null
Konsolenmeldungen.

### Was noch nicht ist

Kein Ton. Keine Figuren mit Sonderregeln (Bauteil 8). Kein Netz-Koop —
die Entscheidung dazu steht in `docs/SPIEL.md` 11 und wartet auf
Jannik.
