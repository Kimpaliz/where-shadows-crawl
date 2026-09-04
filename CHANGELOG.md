# Änderungen

Oben das Neueste. Jeder Eintrag sagt **was**, **warum** und **womit
gemessen** — nicht nur, dass etwas anders ist.

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
