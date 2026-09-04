# Fahrplan

Jede Phase (`##`) ist ein Sammelvorgang, jeder Schritt (`###`) ein
Vorgang mit **einem** Fertig-Kriterium. Lassen sich für einen Schritt
zwei Kriterien nennen, sind es zwei Schritte — sonst gibt es keinen
Zeitpunkt, an dem man ihn guten Gewissens schließt.

Der **Stand** einer Phase steht nicht hier, sondern im Vorgang
(Regel 14). Diese Datei trägt die Begründung.

---

# Was Janniks Liste vom 05.09.2026 wirklich verlangt

Fünf Wünsche, wörtlich: Inventarsystem · endlos generierte Welt wie in
*Death Must Die* · Arena-Modus (aktuell vorhanden) · Karawanen-Modus
mit der Kutsche als Lichtquelle und einem Händler darauf · Ausrüstung
und Waffen.

**Sechs Befunde, alle am Bestand gemessen:**

**1 · „Arena Modus (aktuell vorhanden)" ist der wichtigste Satz.** Er
macht aus dem ganzen Spiel *einen Modus von mehreren*. Heute gibt es
keinen Modus-Begriff: `spiel/lauf.mjs` kennt genau einen Ablauf und
`spiel/welt.mjs` genau eine Arena. Das ist ein struktureller Eingriff
und kein Feature — und er kommt deshalb zuerst.

**2 · Der Bannkreis ist tragend.** Gemessen an 11 Stellen in vier
Dateien: `arenaRadius()`, `welt.arena.radius`, das Setzen der Gegner
auf den Rand, `haltImKreis()` für Spieler und Gegner, die
Kameraklemmung und der einmal gemalte Scheibenboden. Der
Karawanen-Modus hat keinen Kreis — die Welt zieht an der Kutsche
vorbei. **Das ist die eine teure Sache in der Liste.**

**3 · Karawane und „endlos generierte Welt" sind dasselbe System.**
Beide brauchen eine Welt, die nicht aus einer festen Scheibe besteht,
sondern aus erzeugten Stücken, die nachwachsen. Wer eines von beiden
baut, hat das andere fast geschenkt — **also zusammen bauen und nicht
nacheinander.**

**4 · Inventar, Ausrüstung und Waffen sind ein System, nicht drei.**
Alle drei sind „Besitz": eine Liste von Dingen, von denen manche
angelegt sind. Heute hat der Spieler `waffen[]` (sechs Plätze,
angelegt) und `gegenstaende[]` (nur Kennungen; die Werte werden beim
Kauf **für immer** eingerechnet und nie wieder abgezogen). Das
Inventar verallgemeinert beides — und der Umbau von „für immer
eingerechnet" auf „angelegt und ablegbar" ist der eigentliche Inhalt.

**5 · Der angenehme Befund: Der Händler auf der Kutsche ist derselbe
Krämer.** Er verkauft „zwischen den Runden" — genau der Zeitpunkt, an
dem heute `oeffneKraemer()` läuft, und der wird an **einer** Stelle
gerufen. Es ändert sich die Rahmung, nicht der Aufbau.

**6 · Der schöne Befund: Die Kutsche als Lichtquelle ist fast schon
gebaut.** `welt.fackeln` ist bereits eine **Liste** von Lichtern mit
Ort und Reichweite, und die Lichtrechnung läuft über diese Liste. Eine
Kutsche ist ein Licht, das sich bewegt — das ist eine Zeile, die den
Ort je Bild nachführt. Was **nicht** gebaut ist: dass dieses Licht das
Spielziel ist. Fällt die Kutsche, ist der Lauf vorbei; das ist eine
Verliererbedingung und die gibt es heute nur für Spieler.

**Der Risikobefund:** Mehrere Modi sind mehrere Balance-Räume. Der
Prüfstand misst heute genau einen. Er muss den Modus als Parameter
bekommen — billig, solange es erst einen gibt, teuer danach.

---

# Was nicht in der Reihenfolge steht

Diese Punkte hängen an keiner Phase und können jederzeit dazwischen:

- **Ton.** Es gibt keinen. Ausdrücklich nicht gefordert.
- **Weitere Waffen, Gegner, Fundstücke.** Je ein Katalogeintrag; ein
  neuer Gegner braucht zusätzlich ein Raster in
  `runtime/sprite-daten.js`, und die Prüfung besteht auf beidem.
- **Die zehn Sprite-Fassungen** aus der Pixel-Werkstatt — vier Jäger,
  drei Knochenritter, drei Schlurfer, alle gemessen. Es fehlt nur
  Janniks Wahl.
- **Netz-Koop.** Die Entscheidung steht in `SPIEL.md` 11.

---

## Phase 1 — Der Modus-Begriff

Vorgang: #1

Aus „dem Spiel" wird „ein Modus des Spiels". Arena bekommt einen Namen,
und der Ablauf fragt den Modus, statt ihn zu kennen.

**Warum zuerst:** Ohne ihn ist jeder zweite Modus eine Verzweigung
mitten im Regelkern, und die bekommt man nie wieder heraus.

**Umbau ohne sichtbare Änderung** (Regel: Umbau und Inhalt trennen):
Am Spiel darf sich nichts ändern, und genau das lässt sich beweisen.

**Fertig, wenn:** Ein Balancelauf mit festen Saaten liefert vor und
nach dem Umbau **dieselben** Zahlen, und die Kette ist grün.

### 1.1 · Ein Modus ist ein Eintrag, kein Zweig

Vorgang: #2

Ein Katalog `spiel/katalog/modi.mjs` mit einem Eintrag „Arena": Name,
Weltform, Ablauf, Verliererbedingung.

**Fertig, wenn:** `starteLauf` bekommt einen Modus gereicht und der
Regelkern enthält kein `if (modus === …)`.

### 1.2 · Die Verliererbedingung kommt aus dem Modus

Vorgang: #3

Heute steht „alle liegen" fest in `schritt()`. Der Karawanen-Modus
verliert anders (die Kutsche fällt).

**Fertig, wenn:** Die Bedingung steht im Moduskatalog und `schritt()`
ruft sie, ohne sie zu kennen.

### 1.3 · Der Prüfstand kennt den Modus

Vorgang: #4

**Fertig, wenn:** `balance.mjs --modus arena` läuft und die Tabelle
sagt, welcher Modus gemessen wurde.

### 1.4 · Modusauswahl im Vorspiel

Vorgang: #5

**Fertig, wenn:** Die Wahl steht neben der Spielerzahl und wird mit
derselben Achse und demselben Knopf bedient.

---

## Phase 2 — Besitz: Inventar, Ausrüstung, Waffen

Vorgang: #6

Janniks Wünsche 1 und 5. Ein Inventar mit Plätzen; Ausrüstung wird
**angelegt** statt für immer eingerechnet.

**Warum früh:** Es hängt an keinem Modus und macht jeden Modus besser.
Und es ist der Umbau, der `laden.mjs` von „Werte für immer addieren"
befreit — je später, desto mehr hängt daran.

**Fertig, wenn:** Ein Stück ablegen und wieder anlegen führt zu
**bitgleichen** Werten, und ein Balancelauf mit festen Saaten ändert
sich durch den Umbau nicht.

### 2.1 · Werte = Grundwerte plus Angelegtes

Vorgang: #7

Heute rechnet `laden.mjs` gekaufte Werte direkt und dauerhaft in
`spieler.werte`. Das wird zu einer Rechnung aus Grundwerten und dem,
was gerade angelegt ist.

**Fertig, wenn:** Bei gleichem Besitz kommen dieselben Zahlen heraus
wie vorher — an einem Balancelauf mit festen Saaten belegt.

### 2.2 · Vier Ausrüstungsplätze

Vorgang: #8

Kopf, Leib, Hand, Ring. Genug zum Abwägen, wenig genug zum
Überblicken.

**Fertig, wenn:** Ein Platz nimmt genau ein Stück, und das Verdrängte
landet im Inventar statt zu verschwinden.

### 2.3 · Das Inventar mit Grenze

Vorgang: #9

Zwanzig Plätze. Eine Grenze macht aus „mitnehmen" eine Entscheidung.

**Fertig, wenn:** Ein volles Inventar nimmt nichts mehr auf und sagt
das, statt still zu schlucken.

### 2.4 · Vergleichen und Tauschen auf dem Bildschirm

Vorgang: #10

**Fertig, wenn:** Beim Anwählen eines Stücks steht der Unterschied zum
angelegten daneben — grün, was besser wird, rot, was schlechter.

### 2.5 · Waffen ziehen ins Inventar um

Vorgang: #11

Die sechs Waffenplätze werden Ausrüstungsplätze einer eigenen Art.
⚠️ Ausrüstung darf **nie** um die sechs Waffenplätze konkurrieren
(`ZWEITE-VORLAGE.md` 2) — sonst stirbt eines der beiden Systeme.

**Fertig, wenn:** Verschmelzen funktioniert unverändert und der
Wächter hält fest, dass Ausrüstung keinen Waffenplatz belegt.

---

## Phase 3 — Götter und Segen

Vorgang: #12

Die Aufstiegskarten kommen aus dem Vorrat eines gewählten Gottes statt
aus einem flachen Topf. Segen haben Stufen und greifen ineinander.

**Warum hier:** Die billigste Änderung aus `ZWEITE-VORLAGE.md` —
`spiel/stufen.mjs` zieht schon vier Karten aus gewichteten Werten — mit
der größten Wirkung darauf, wie sich ein Lauf anfühlt.

**Fertig, wenn:** Ein Balancelauf je Gott erzeugt einen erkennbar
anderen Endbau.

### 3.1 · Ein Gott als Kartenvorrat

Vorgang: #13

**Fertig, wenn:** `ziehKarten` bekommt einen Gott und zieht
nachweislich nur aus dessen Vorrat.

### 3.2 · Segen mit Stufen

Vorgang: #14

**Fertig, wenn:** Eine Stufe 3 kann nachweislich nicht als erste Karte
erscheinen.

### 3.3 · Gottwahl im Vorspiel

Vorgang: #15

**Fertig, wenn:** Die Wahl steht neben Spielerzahl und Modus.

---

## Phase 4 — Zufallseigenschaften

Vorgang: #16

Ein Fundstück ist ein Grundstück plus ein bis vier gewürfelte
Eigenschaften; die Seltenheit bestimmt, wie viele.

**Warum vor der fallenden Beute:** So verkauft der Krämer schon
gewürfelte Ausrüstung, und der Erzeuger ist erprobt, **bevor** es ein
Fallsystem gibt. Zwei ungeprüfte Systeme auf einmal einzuführen heißt,
keines von beiden beurteilen zu können.

**Fertig, wenn:** Zwei Angebote desselben Grundstücks unterscheiden
sich nachweislich, und über 40 Läufe kommt keine Eigenschaft in mehr
als der Hälfte aller Stücke vor.

### 4.1 · Der Eigenschaften-Erzeuger

Vorgang: #17

**Fertig, wenn:** Aus Grundstück und Saat entsteht wiederholbar
dasselbe Stück.

### 4.2 · Seltenheit bestimmt die Zahl der Eigenschaften

Vorgang: #18

**Fertig, wenn:** Ein Stück der höchsten Seltenheit trägt nachweislich
mehr Eigenschaften als eines der niedrigsten.

### 4.3 · Eigenschaften mit Merkmalsbezug

Vorgang: #19

Eine Eigenschaft, die nur auf `Schnitt`-Waffen wirkt, macht aus einem
Fund eine Bauentscheidung.

**Fertig, wenn:** Mindestens eine Eigenschaft wirkt nur auf ein
Merkmal, und die Prüfung belegt, dass sie sonst nichts tut.

---

## Phase 5 — Beute, die fällt

Vorgang: #20

Hauptleute und seltene Gegner lassen Ausrüstung fallen statt nur Gold.

**Fertig, wenn:** Ein Hauptmann lässt nachweislich ein Stück fallen,
das sich von allem im Krämerangebot unterscheidet.

### 5.1 · Falltabellen je Gegnerart

Vorgang: #21

**Fertig, wenn:** Die Wahrscheinlichkeit steht im Katalog und nicht im
Programm.

### 5.2 · Ausrüstung aufheben wie Gold

Vorgang: #22

**Fertig, wenn:** Die Aufsammelreichweite gilt dafür wie für Gold, und
was liegen bleibt, ist am Wellenende weg.

### 5.3 · Sichtbar, was da liegt

Vorgang: #23

**Fertig, wenn:** Man sieht am Boden, welcher Seltenheit ein
liegendes Stück ist, ohne darüberzulaufen.

---

## Phase 6 — Welt ohne Kreis

Vorgang: #24

Janniks Wunsch 2, und die Grundlage für Wunsch 4. Die Welt besteht
nicht mehr aus einer festen Scheibe, sondern aus erzeugten Stücken,
die nachwachsen.

**Warum das teure Stück:** Der Bannkreis steckt an 11 Stellen in vier
Dateien — Gegner setzen, Spieler und Gegner halten, Kamera klemmen,
Boden malen. Alle vier müssen eine Weltform fragen, statt einen Kreis
anzunehmen.

**Fertig, wenn:** Der Arena-Modus läuft über die neue Weltform und
liefert bei festen Saaten **dieselben** Zahlen wie vorher — der Umbau
ist damit bewiesen, bevor irgendetwas Neues darauf steht.

### 6.1 · Die Weltform als Begriff

Vorgang: #25

Eine Weltform beantwortet drei Fragen: Wo darf ein Ding sein? Wo
erscheinen Gegner? Was sieht die Kamera?

**Fertig, wenn:** „Kreis" ist eine Weltform unter anderen und der
Regelkern kennt `arena.radius` nicht mehr direkt.

### 6.2 · Boden in Stücken statt als Scheibe

Vorgang: #26

Heute wird der Boden **einmal** in eine Leinwand gemalt. Eine endlose
Welt kann das nicht.

**Fertig, wenn:** Der Arena-Modus sieht danach bildpunktgleich aus wie
vorher.

### 6.3 · Stücke wachsen nach

Vorgang: #27

**Fertig, wenn:** Man kann zehn Minuten in eine Richtung laufen, ohne
dass die Welt endet oder der Speicher wächst.

### 6.4 · Gesät und wiederholbar

Vorgang: #28

**Fertig, wenn:** Dieselbe Saat erzeugt zweimal dieselbe Welt — an
denselben Bildpunkten belegt.

---

## Phase 7 — Biome

Vorgang: #29

Der dunkle Wald, aus dem Janniks Karawanen-Modus besteht, ist das
erste Biom. Ein Biom bestimmt Boden, Bewuchs, Gegnermischung und
Sichtweite.

**Fertig, wenn:** Zwei Biome unterscheiden sich messbar in Boden,
Gegnermischung **und** Helligkeit — nicht nur in der Farbe.

### 7.1 · Ein Biom ist ein Katalogeintrag

Vorgang: #30

**Fertig, wenn:** Ein neues Biom braucht keine Zeile Programm.

### 7.2 · Der dunkle Wald

Vorgang: #31

**Fertig, wenn:** Bäume versperren nachweislich den Weg und die
Sichtweite ist messbar kleiner als in der Arena.

### 7.3 · Übergänge zwischen Biomen

Vorgang: #32

**Fertig, wenn:** Man sieht, dass sich die Gegend ändert, bevor sie
sich geändert hat.

---

## Phase 8 — Der Karawanen-Modus

Vorgang: #33

Janniks Wunsch 4. Man eskortiert eine Kutsche durch den dunklen Wald.
**Die Kutsche ist die Lichtquelle.** Auf ihr sitzt der Händler und
verkauft zwischen den Runden.

**Warum hier und nicht früher:** Er setzt Phase 1 (Modus), 6 (Welt
ohne Kreis) und 7 (Biome) voraus. Vorher gebaut wäre er drei Umbauten
in einem.

**Fertig, wenn:** Ein Lauf von Anfang bis Ende ist spielbar, und der
Prüfstand misst ihn wie den Arena-Modus.

### 8.1 · Die Kutsche als Ding mit Leben

Vorgang: #34

**Fertig, wenn:** Sie fährt, sie nimmt Schaden, und wenn sie fällt, ist
der Lauf vorbei — über die Verliererbedingung aus Phase 1.

### 8.2 · Die Kutsche ist das Licht

Vorgang: #35

`welt.fackeln` ist bereits eine Liste; ein wanderndes Licht ist eine
Zeile, die den Ort nachführt.

**Fertig, wenn:** Das Licht sitzt auf der Kutsche, und wer sich zu weit
entfernt, steht im Dunkeln — messbar an der Helligkeit am Spielerort.

### 8.3 · Die Kutsche steht nicht still

Vorgang: #36

Sie fährt in Etappen; zwischen zwei Etappen ist Rast. Das ist der
Takt, den heute die Welle vorgibt.

**Fertig, wenn:** Eine Etappe endet von selbst und geht in die Rast
über.

### 8.4 · Der Händler auf der Kutsche

Vorgang: #37

Derselbe Krämer, anders gerahmt.

**Fertig, wenn:** Der Laden öffnet in der Rast und `oeffneKraemer()`
ist unverändert.

### 8.5 · Gegner kommen von hinten und von der Seite

Vorgang: #38

In der Arena strömen sie von einem Kreisrand. Hier gibt es keinen.

**Fertig, wenn:** Kein Gegner erscheint im Sichtfeld, und keiner
erscheint so weit weg, dass er nie ankommt.

---

## Phase 9 — Danmaku für die Hauptleute

Vorgang: #39

Angekündigte Geschossmuster.

⚠️ Dichte wächst **unterlinear** mit der Spielerzahl, und feindliche
Geschosse sind heller als eigene — sonst ist der Bildschirm zu viert
unlesbar. Ein Muster ohne sichtbare Ankündigung erzeugt Tode, die
niemand hätte vermeiden können.

**Fertig, wenn:** Jedes Muster hat eine sichtbare Ankündigung, und ein
Bildpunktvergleich belegt, dass feindliche Geschosse heller sind als
eigene.

### 9.1 · Ein Muster ist ein Katalogeintrag

Vorgang: #40

**Fertig, wenn:** Ein neues Muster braucht keine Zeile Programm.

### 9.2 · Die Ankündigung

Vorgang: #41

**Fertig, wenn:** Zwischen Ankündigung und Schuss liegt eine messbare
halbe bis ganze Sekunde.

### 9.3 · Eigene und feindliche Geschosse trennen

Vorgang: #42

**Fertig, wenn:** Der Helligkeitsabstand ist gemessen und ein Wächter
hält ihn fest.

---

## Phase 10 — Fortschritt zwischen den Läufen

Vorgang: #43

Freischaltungen, die einen Lauf überdauern, gespeichert im Browser.

**Warum zuletzt:** Er lohnt sich erst, wenn ein Lauf es wert ist,
wiederholt zu werden.

**Fertig, wenn:** Ein Spielstand übersteht das Schließen des Browsers,
und eine kaputte oder alte Fassung führt zu einem sauberen Neuanfang
statt zu einem Absturz.

### 10.1 · Ein Spielstand mit Fassungsnummer

Vorgang: #44

**Fertig, wenn:** Ein Spielstand ohne Fassungsnummer wird verworfen
statt falsch gelesen.

### 10.2 · Was sich freischalten lässt

Vorgang: #45

**Fertig, wenn:** Mindestens eine Freischaltung ist im Spiel sichtbar
und im Spielstand nachweisbar.

---

---

## Phase 11 — Koop über das Netz

Vorgang: #53

Janniks Entscheidung vom 05.09.2026: *„Koop über webbrowser zugleich."*
Also nicht nur an einem Rechner, sondern gleichzeitig, im Browser,
über das Internet.

**Warum diese Phase billig ist — und nur, solange man nichts kaputt
macht:** Der Regelkern rechnet gesät und in festen Schritten von 1/60
Sekunde. Zwei Rechner, die dieselbe Saat und dieselben Tastendrücke
bekommen, rechnen **dieselbe Welt** aus. Über die Leitung müssen
deshalb nur zwei Achsen und ein Knopf je Spieler und Bild — ein paar
Byte statt der ganzen Welt.

⚠️ **Damit sind die Regeln aus `CLAUDE.md` ab jetzt tragend statt
ordentlich.** Ein `Math.random` in `spiel/`, ein Blick auf die
Wanduhr, ein Bildtakt statt des festen Schritts: Jedes davon lässt die
beiden Rechner auseinanderlaufen, und zwar **langsam** — man merkt es
erst nach Minuten, wenn die Welten sich schon widersprechen. Der
Wächter `pruefe-kern.mjs` hält alle drei bereits fest; er ist ab dieser
Entscheidung kein Ordnungsdienst mehr, sondern die Sicherung.

**Der offene Punkt ist die Vermittlung** (Vorgang #46): Zwei Rechner
hinter zwei Routern finden sich nicht von allein.

**Fertig, wenn:** Zwei Browser auf zwei Rechnern spielen dieselbe
Nacht, und ein Vergleich der Weltzustände nach fünf Minuten zeigt
**keinen** Unterschied.

### 11.1 · Der Gleichlauf ist beweisbar

Vorgang: #54

Bevor irgendetwas über die Leitung geht: Zwei Welten im selben Prozess,
gefüttert mit denselben Eingaben, müssen nach zehn Minuten Spielzeit
bitgleich sein.

**Fertig, wenn:** Ein Werkzeug vergleicht beide Welten Feld für Feld
und meldet null Unterschiede — und meldet welche, wenn man absichtlich
ein `Math.random` einbaut.

### 11.2 · Eingaben statt Weltzustand über die Leitung

Vorgang: #55

**Fertig, wenn:** Was gesendet wird, ist nachweislich nur die Eingabe
— zwei Achsen und ein Knopf je Spieler und Bild.

### 11.3 · Verzögerung aushalten

Vorgang: #56

Eine Leitung braucht Zeit. Beide Rechner müssen einen Moment warten
oder vorausrechnen, sonst ruckelt es bei jedem Paket.

**Fertig, wenn:** Bei 80 ms künstlicher Verzögerung läuft das Spiel
sichtbar flüssig, und der Gleichlauf aus 11.1 hält weiter.

### 11.4 · Die Vermittlung

Vorgang: #57

Der Weg, auf dem sich zwei Rechner finden — siehe Vorgang #46.

**Fertig, wenn:** Zwei Leute an verschiedenen Orten spielen zusammen,
ohne dass einer etwas installiert.

### 11.5 · Wenn einer wegbricht

Vorgang: #58

**Fertig, wenn:** Ein abgebrochener Mitspieler beendet nicht den Lauf
der anderen, und das Spiel sagt, was passiert ist.
