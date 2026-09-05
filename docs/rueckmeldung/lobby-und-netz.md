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

---

## Baustein 3 · Lobby und Verbindung (05.09.2026)

Janniks Ansagen: *„Nur lobby beitritt, kein lokal auf der selben
tastatur."* · *„endlich lobbycode."*

### Der Lobbycode

Sechs Zeichen aus **31** — ohne 0, O, 1, I und L. Das ist Rechnung, nicht
Vorsicht: Der Code wird **vorgelesen**. Wer eine Null hört und ein O
tippt, landet in einer Lobby, die es nicht gibt, und bekommt dieselbe
Meldung wie bei einem echten Tippfehler. Fehlen beide Zeichen ganz, kann
die Verwechslung nicht entstehen. 31^6 = **887.503.681** Möglichkeiten.

Getippt wird ohne Rücksicht auf Groß- und Kleinschreibung: Im Browser mit
`8hm9ff` beigetreten, gesucht wurde `8HM9FF`.

### Ein Rechner, eine Figur

Die vier Tastaturbelegungen sind weg. Die eine übrige nimmt **WASD und
die Pfeiltasten zugleich** — vorher gehörten die Pfeile Spieler 2, jetzt
ist niemand mehr da, dem sie wegzunehmen wären.

Im Browser gemessen, beide am selben Jäger:

| Taste | Wanderung der Figur |
| --- | ---: |
| `A` über 75 Bilder | **−79,56** (nach links) |
| `ArrowRight` über 150 Bilder | **+175,16** (nach rechts) |

Neu ist `macheFlanken()`: Über die Leitung kommen **rohe** Eingaben, keine
Flanken. Bildete jeder Rechner sie anders, wählte derselbe Knopfdruck bei
zwei Leuten verschiedene Karten — und die Welten liefen auseinander, ohne
dass irgendwo ein Fehler erschiene. Deshalb entstehen sie an einer Stelle,
aus denselben Rohwerten, für die eigene und die fremden Eingaben gleich.

### Der Befund, der Jannik betrifft: der Vermittler leitet nicht weiter

Die Lobby geht auf, gegen den **echten** öffentlichen Vermittler — Code
`HRUCV2`, dann `JAFG3P`, dann `8HM9FF`. Der Wirt steht in seiner Liste,
die Kennung ist belegt (eine zweite Anmeldung darauf bekommt korrekt
`ID-TAKEN`).

**Aber es kommt keine Runde zustande.** Mit nackten WebSockets gemessen,
ohne eine Zeile Spielcode:

| Fall | Absender danach | Empfänger |
| --- | --- | --- |
| nur dasitzen | offen | — |
| nur Lebenszeichen | offen | — |
| Angebot an eine Kennung, die es **nicht** gibt | **zu (Code 1000)** | — |
| Angebot an eine Kennung, die es **gibt** | **zu (Code 1000)** | **nichts** |

Der Vermittler nimmt also die Anmeldung an und beantwortet Lebenszeichen,
schließt aber jeden, der ein Angebot **weiterreichen** will — und stellt
nichts zu. Das Protokoll hier folgt der Beschreibung; der Dienst hält sie
gerade nicht ein. Der Weg ist gebaut und lesbar, die Verbindung kam in
dieser Umgebung nicht zustande.

**Das ist eine Entscheidung über einen fremden Dienst**, und die trifft
Jannik: einen anderen Vermittler nehmen, einen eigenen betreiben, oder
warten. Solange das offen ist, hängt niemand — siehe nächster Absatz.

### Zwei eigene Fehler, beide beim Messen gefunden

**1 · Das Wartebild war eine Sackgasse.** „VERBINDEN" hatte weder eine
Meldungszeile noch einen Weg zurück. Jede Fehlermeldung schreibt nach
`#lobbymeldung` — und das Element gab es auf diesem Bild **nicht**. Der
Gast stand deshalb für immer vor `Suche die Lobby … `, obwohl die
Verbindung längst aufgegeben hatte. Genau der Fall, den Jannik
ausdrücklich nicht wollte.

**2 · Für den Gast galt die Trennung als belanglos.** Im Code stand
wörtlich „nach dem Aufbau belanglos" — richtig, aber der Gast war noch
gar nicht aufgebaut. Jetzt unterscheidet die Sitzung beides.

Nach beiden Reparaturen im Browser nachgemessen — der Gast bekommt nach
acht Sekunden:

> Der Vermittler hat die Verbindung abgebrochen, bevor die Lobby gefunden
> war. Das ist ein fremder Dienst — versuch es gleich noch einmal.

dazu einen Knopf `ABBRECHEN`. Kein Ladebalken ohne Ende.

**Ein Textfehler nebenbei:** „noch 3 **Platze** frei" — der Umlaut wandert
beim Beugen mit. Jetzt „Plätze".

### Was ich im Browser wirklich geklickt habe

Lobby aufmachen (dreimal, mit echtem Vermittler) · Code abgelesen · in
einem **zweiten Tab** beigetreten, klein getippt · Wartebild und Meldung
gelesen · `ABBRECHEN` · `ALLEIN SPIELEN` → die Arena erscheint, Jäger und
Fackel stehen · mit `A` und `ArrowRight` gelaufen.

---

## Baustein 4 und 5 · Gleichlauf und wenn einer wegbricht (05.09.2026)

### Über die Leitung gehen nur Eingaben

Der Regelkern ist gesät und rechnet in festen Schritten — genau dafür
wurde er so gebaut. Deshalb reisen **zwei Achsen und ein Knopf** je
Spieler und Tick, gepackt in **drei Byte**. Eine Welle mit achtzig
Gegnern sechzigmal je Sekunde zu verschicken wären ein paar hundert
Kilobyte je Sekunde.

### Die gemessene Verzögerung: 50,0 ms

Der Gleichschritt schickt die Eingabe des Bildes N für Tick **N+3**.
Gemessen mit demselben Takt, den `runtime/start.js` fährt:

```
VERZUG            : 3 Ticks
SCHRITT           : 0.016666666666666666 s  (60 Ticks je Sekunde)
gedrueckt in Bild : 5
gewirkt in Tick   : 7
Abstand           : 3 Ticks
in Millisekunden  : 50.0 ms
```

Drei Ticks sind die Grenze, unterhalb derer man eine Verzögerung nicht
mehr als Verzögerung empfindet, sondern höchstens als „etwas
schwammig". **Allein gibt es sie gar nicht:** Ohne Mitspieler wird kein
Gleichschritt angelegt, die eigene Eingabe wirkt sofort — 50 ms Preis
ohne Gegenwert wären ein schlechter Handel.

⚠️ **Nicht gemessen ist die Zeit auf der Leitung selbst.** Sie kommt zu
den 50 ms hinzu, und weil keine Verbindung zustande kam (siehe
Baustein 3), gibt es dafür keine Zahl.

### Was `pruefe-netz.mjs` beweist — 22 Prüfungen, ohne Browser

Zwei Welten, dieselbe Saat, **3600 Schritte** (eine volle Minute):

1. Gleiche Eingabefolgen → derselbe Zustand, Zahl für Zahl.
2. Eine um **einen Tick verschobene** Folge → ein *anderer* Zustand.
3. Und der Abdruck muss drei Zeitpunkte desselben Laufs unterscheiden
   können.

Der dritte ist der wichtigste, und er hat sofort etwas gefangen —
siehe unten.

### Der Fehler, den die eigene Gegenprobe gefunden hat

Die Welt **fror bei Tick 1391 ein.** Bei einem Aufstieg geht sie in die
Phase `wahl` und bleibt dort stehen, bis jemand eine Karte nimmt; im
Spiel tut das `runtime/oberflaeche.js`, das im Prüfstand nichts zu
suchen hat. Die Marken bei 1799 und 3599 waren dadurch **zeichengleich**:

```
t=1000 phase=welle     welle=1 ticks=1001 gegner=  9
t=1799 phase=wahl      welle=1 ticks=1391 gegner= 18
t=3599 phase=wahl      welle=1 ticks=1391 gegner= 18
```

Die Gleichlauf-Prüfung hätte **zweimal dieselbe eingefrorene Welt**
verglichen — grün, ganz gleich was der Gleichlauf tut. **61 % der 3600
Schritte haben nichts gemessen.** Jetzt schaltet der Prüfstand die
Phasen selbst weiter (immer die erste Karte, im Laden nichts kaufen —
ohne Zufall, damit die Entscheidung nicht selbst eine Quelle von
Unterschieden wird).

### Rot-Beweise

| gebrochen | was meldete | rot |
| --- | --- | :-: |
| Lockstep prüft die Vollständigkeit nicht mehr | 6 Fehler, u. a. „ohne die Eingabe des anderen läuft kein Tick" | ✓ |
| das **letzte** statt des ersten Wortes gilt | „ein zweites Mal dieselbe Eingabe ändert nichts · bekam x=0.5 statt −1" | ✓ |
| Eingaben wirken überhaupt nicht (`schrittImLauf(welt, [])`) | „eine um einen Tick verschobene Eingabefolge ergibt einen anderen Zustand" | ✓ |
| die Saat reist nicht mit (zweiter Lauf andere Saat) | „gleiche Saat und gleiche Eingaben … · ab Marke 0 verschieden" | ✓ |
| das Packen ist nicht stabil | „eine gepackte Eingabe bleibt beim zweiten Umlauf gleich" | ✓ |

**Ein Rot-Beweis ging beim ersten Anlauf daneben**, und das ist der
lehrreiche: Ich ersetzte `folge[t]` durch `folge[0]` — die Prüfung blieb
**grün**, weil `folge[0]` bei beiden Folgen verschieden ist. Die
Sabotage bildete den Fehler gar nicht ab. Erst `[]` (gar keine
Eingaben) trifft den Fall, den die Prüfung fangen soll.

**Und ein zweiter Fund im eigenen Prüfstand:** Mit abgeschaltetem
Vollständigkeits-Wächter lief `while (l.holeTick())` **endlos**, weil
`holeTick()` dann nie `null` gibt — der Rot-Beweis hing statt rot zu
werden. Die Schleifen sind jetzt begrenzt.

### Wenn einer wegbricht

Wer **2 Sekunden** nichts schickt, wird übersprungen. Seine Figur bleibt
stehen und verschwindet **nicht** — ein Jäger, der sich auflöst, wäre für
die anderen eine Falschaussage über die Welt, und die Plätze dürfen nicht
verrutschen (sonst bekäme Spieler 2 die Figur von Spieler 3). Vier
Prüfungen decken das ab, alle rot bewiesen.

Zwei Sekunden sind lang genug, dass ein kurzer Aussetzer niemanden
hinauswirft, und kurz genug, dass niemand glaubt, das Spiel sei
abgestürzt.

Gegen einzelne verlorene Pakete schleppt jede Nachricht die letzten
**8** Eingaben mit — bei drei Byte je Stück ist das billiger, als etwas
nachzufordern.

### Solo ist nachweislich unberührt

Der Umbau hätte das Alleinspielen kaputt machen können. Im Browser
nachgemessen: `ALLEIN SPIELEN` → Arena erscheint, `D` über 100 Bilder →
Figur **+80,66** nach rechts, und nach 1800 weiteren Ticks bewegt sich
das Bild weiterhin (die Welle läuft durch).

---

## Was in `runtime/oberflaeche.js` noch auf die alte Spielerzahlwahl zeigt

Das ist eine **fremde Datei** — ich habe sie nicht angefasst. Nach dem
Umbau ist dort ungenutzt:

| Stelle | was |
| --- | --- |
| `zeichneVorspiel()` (Zeile 198) | wird von **keiner** Zeile mehr gerufen — `runtime/start.js` zeigt jetzt die Lobby |
| `menue.spielerzahl` (207, 219, 223) | nur noch innerhalb von `zeichneVorspiel` benutzt |
| `macheMenue()` (Zeile 251) | gibt weiterhin `spielerzahl: 1` zurück; das Feld liest niemand mehr |
| die Zeilen `J1 WASD · LEERTASTE` … `J4 ZIFFERNBLOCK` (211–216) | beschreiben die vier Belegungen, die es nicht mehr gibt |

`macheMenue()` selbst wird weiter gebraucht (`sperre`, `ladenZeiger`,
`wahlZeiger`) — es geht **nur** um `spielerzahl` und `zeichneVorspiel`.

---

## Was ich nicht prüfen konnte

1. **Eine echte Runde zu zweit.** Der Vermittler stellt nichts zu
   (Baustein 3, mit nackten WebSockets gemessen). Gleichlauf und
   Lockstep sind deshalb **ohne Browser** bewiesen, aber nie über eine
   echte Leitung gelaufen.
2. **Die Zeit auf der Leitung.** Ohne Verbindung keine Zahl.
3. **Ein echtes Telefon.** Alles am Telefon ist im nachgebildeten
   Gerät gemessen (375 x 812 und 736 x 414, `pointer: coarse`,
   5 Berührungspunkte) — nicht auf Glas.
4. **Der Pages-Ablauf.** Er lässt sich hier nicht ausführen; geprüft
   sind die Datei gegen das Schema und die Pfade.
5. **Echte Fingerdrücke.** Die Browser-Ansicht rendert nicht, während
   sie verborgen ist; Stick und Knopf wurden mit echten
   `PointerEvent`s angesteuert, die dieselben Behandler durchlaufen —
   aber nicht mit einem Finger.
6. **Gamepad.** Kein Gerät zum Anstecken.
