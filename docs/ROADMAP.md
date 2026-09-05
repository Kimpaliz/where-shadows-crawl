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

---

# Was Janniks zweite Liste vom 05.09.2026 wirklich verlangt

Wörtlich bestellt: *„Nur lobby beitritt, kein lokal auf der selben
tastatur"* · eine Werteliste mit fünf Schadensarten, Krit je Art,
Modifiern, Widerständen, Karten-Chancen, AoE, Zusatzprojektilen,
Ausweichen · Ausweichen als Sprung · Level-up als **Kartenhand** mit
Seltenheiten und Meta-Karten · mehr Partikel · *„coole monster mit mehr
mechaniken statt nur folgen und schiessen"* · *„boss monster!"* ·
Beutetruhen · Inventar · schwebende Schadenszahlen mit Krit · bessere,
womöglich bewegte Sprites · Abklingzeit-Anzeige an den Angriffen ·
*„Das spiel über github erreichbar machen für freunde! also
webadresse!"* · *„endlich lobbycode"* · *„spielbar auf desktop und
handy!!!!!"*

**Sieben Befunde, alle am Bestand gemessen:**

**1 · Es sind nicht zwanzig Wünsche, sondern zwei Bündel.** Das eine
ist ein **Fundament** (Werte, Schadensarten, Krit) mit dem **Inhalt
darauf** (Karten, Monster, Bosse, Optik) — dort hängt alles
aneinander. Das andere ist die **Auslieferung** (Lobby, Webadresse,
Handy), und es hängt an keinem einzigen Wert. Beide lassen sich
deshalb gleichzeitig bauen, und genau das ist der Grund, warum diese
Liste an einem Tag angefangen werden kann.

**2 · Fünfundvierzig Werte sind keine fünfundvierzig Felder.** Heute
hat `spiel/werte.mjs` acht feste Felder, und jede Anzeige, jede Karte
und jede Prüfung zählt sie einzeln auf. Bei fünfundvierzig — davon
rund fünfundzwanzig, die nur Varianten je Schadensart sind — bricht
das: Wer einen vergisst, merkt es nie. Werte werden deshalb eine
**Tabelle**, aus der Anzeige, Karten und Prüfung entstehen, und die
Schadensart-Varianten werden **erzeugt** statt abgetippt.

**3 · Die halbe Werteliste ist ohne die Kartenhand wertlos.**
*„Chance auf bestimmte level up karten erhöhen"*, *„Chance seltenere
karten zu finden"* und *„Level up karten Modifier"* sind drei Werte,
die gar nichts messen können, solange Karten keine Seltenheit haben.
Werte-Fundament und Kartenhand sind ein Vorhaben in zwei Schritten,
kein Vorhaben und ein späteres.

**4 · „Nur Lobby-Beitritt" beantwortet eine offene Entscheidung und
macht Code tot.** Der Vorgang *„Koop über das Netz oder nur an einem
Rechner?"* ist damit entschieden: über das Netz. Die vier
Tastaturbelegungen in `runtime/eingabe.js` sind ab dann kein Feature
mehr, sondern Altlast — ein Rechner steuert eine Figur.

**5 · Die Webadresse kostet die Privatheit des Repositorys.** GitHub
Pages veröffentlicht im kostenlosen Tarif nur aus einem
**öffentlichen** Repository. Wer die Adresse will, macht den ganzen
Quelltext und die ganze Versionsgeschichte sichtbar. Das ist keine
technische Frage und die einzige Entscheidung in dieser Liste, die
nur Jannik treffen kann.

**6 · Der Lobbycode braucht eine Vermittlung, und die ist immer
fremd.** Zwei Browser hinter zwei Routern finden sich nicht von
allein. Die Spieldaten laufen danach direkt von Rechner zu Rechner;
**nur das Kennenlernen** geht über einen fremden Dienst. Das ist der
kleinste Bruch mit *„kein Firebase, kein Hosting, keine Anmeldung,
keine Datenbank"*, der die Sache überhaupt möglich macht — es entsteht
kein Konto, keine Datenbank und keine laufende Rechnung. Bleibt der
Rest: Hinter manchen Netzen kommt gar keine direkte Verbindung
zustande. Das lässt sich nicht wegbauen, nur ehrlich melden.

**7 · Der angenehme Befund: der Regelkern ist für das Netz schon
gebaut.** Gesäter Zufall, fester Schritt von 1/60 s, kein `Date.now()`,
kein `Math.random()`, kein DOM — jede dieser Entscheidungen steht seit
dem ersten Tag im Code, und `pruefe-kern.mjs` erzwingt sie. Über die
Leitung müssen deshalb **nur Eingaben**: zwei Achsen und ein Knopf je
Spieler. Das ist der Unterschied zwischen einem Umbau und einer
Ergänzung.

**Der Risikobefund:** *„Exakt top down, Pixelgrafik"* rechnet auf
480 x 270 — ein Bild im Verhältnis 16:9. Ein hochkant gehaltenes
Telefon ist etwa 9:19,5. Wer beides will, muss entweder quer erzwingen
oder das Sichtfeld ändern, und das Sichtfeld ist Balance: Wer weniger
sieht, weicht schlechter aus.

---

## Phase 12 — Das Werte-Fundament

Vorgang: #60

Aus acht festen Feldern wird eine Werte-Tabelle mit fünf
Schadensarten, Krit, Modifiern und Widerständen. Ausweichen kommt als
erste Mechanik dazu, die einen eigenen Wert hat.

**Warum zuerst:** Karten, Monster und Anzeige lesen alle drei aus
dieser Tabelle. Wer sie später umbaut, baut sie dreimal.

**Fertig, wenn:** Die Kette ist grün, die Tabelle trägt jeden Wert aus
Janniks Liste, und eine Prüfung belegt, dass kein Wert ohne Wirkung im
Spiel steht.

### 12.1 · Die fünf Schadensarten sind ein Katalog

Vorgang: #61

`schnitt` · `wucht` · `feuer` · `frost` · `fluch`. Sie haben Namen,
Farbe und die Angabe, ob sie an der Rüstung vorbeigehen.

**Fertig, wenn:** Jede Waffe im Katalog trägt eine Schadensart, und
die Katalogprüfung besteht darauf.

### 12.2 · Werte sind eine Tabelle, keine Felder

Vorgang: #62

Die Schadensart-Varianten werden erzeugt, nicht abgetippt.

**Fertig, wenn:** Ein neuer Wert ist ein Eintrag und keine Zeile
Programm, und die Anzeige zählt keinen Wert mehr einzeln auf.

### 12.3 · Krit, Modifier und Widerstand in einer Rechnung

Vorgang: #63

Grundschaden, flacher Zuschlag, Prozentsatz, Gruppenbonus, Kritwurf,
Widerstand — in dieser Reihenfolge und an **einer** Stelle.

**Fertig, wenn:** Die Reihenfolge steht als begründeter Kommentar im
Code, und eine Prüfung fängt ihr Vertauschen.

### 12.4 · Ausweichen als Sprung

Vorgang: #64

Ein Satz in Blickrichtung, kurz unverwundbar, danach gesperrt.
Reichweite und Abklingzeit sind Werte.

**Fertig, wenn:** Die Eingabe trägt `ausweichen`, und der Sprung ist
eine Bewegung über mehrere Schritte statt eines Sprungs im Raum.

---

## Phase 13 — Die Kartenhand

Vorgang: #65

Der Aufstieg wird eine Hand voll Karten am unteren Bildrand: drei zur
Wahl, anklickbar, mit Titel, Werten in Grün und Seltenheit.

**Warum hierher:** Sie ist der einzige Ort, an dem drei Werte aus
Phase 12 überhaupt etwas messen können.

**Fertig, wenn:** Eine Karte ist ein Eintrag im Katalog, Seltenheit
wirkt auf ihre Zahlen, und Meta-Karten ändern eine Regel statt eines
Werts.

### 13.1 · Eine Karte ist ein Katalogeintrag

Vorgang: #66

Heute erzeugt `spiel/stufen.mjs` Karten aus einer Werteliste. Künftig
gibt es einen Kartenkatalog mit Titel, Text, Seltenheit und Wirkung.

**Fertig, wenn:** Eine neue Karte ist ein Eintrag und keine Zeile
Programm.

### 13.2 · Seltenheit bestimmt Zahlen und Ziehchance

Vorgang: #67

**Fertig, wenn:** Die Werte für „seltenere Karten finden" und
„bestimmte Karten häufiger" wirken messbar auf die Ziehstatistik.

### 13.3 · Meta-Karten ändern eine Regel

Vorgang: #68

Nicht `+5 Schaden`, sondern „deine Geschosse durchschlagen einen
Gegner mehr" oder „Ausweichen setzt eine Waffe sofort bereit".

**Fertig, wenn:** Mindestens fünf Meta-Karten existieren, und jede
ändert etwas, das kein Zahlenwert ist.

### 13.4 · Die Hand am unteren Bildrand

Vorgang: #69

Drei Karten wie in der Hand gehalten; angeklickt hebt sich eine hervor
und wird lesbar.

**Fertig, wenn:** Im Browser mit Maus **und** mit dem Daumen bedient,
nicht nur geprüft, dass die Karten da sind.

---

## Phase 14 — Monster mit Mechaniken und Hauptleute

Vorgang: #70

*„Coole monster mit mehr mechaniken statt nur folgen und schiessen"* —
heute gibt es drei Verhalten: geradeaus, schwankend, speiend.

**Fertig, wenn:** Mindestens sechs unterscheidbare Verhalten
existieren, und jedes stellt dem Spieler eine andere Frage.

### 14.1 · Verhalten ist ein Katalogeintrag

Vorgang: #71

**Fertig, wenn:** Ein neues Verhalten ist ein Eintrag, und die
Katalogprüfung besteht auf einem Sprite dazu.

### 14.2 · Gegner haben Widerstände

Vorgang: #72

Das Feld, das Phase 12 in der Rechnung schon erwartet.

**Fertig, wenn:** Mindestens eine Gegnerart ist gegen eine
Schadensart deutlich zäher, und der Prüfstand misst den Unterschied.

### 14.3 · Zwei Hauptleute mit eigenem Auftritt

Vorgang: #73

**Fertig, wenn:** Eine Hauptmannswelle sieht anders aus als eine
normale, nicht nur schwerer.

---

## Phase 15 — Truhen, Beute und Inventar

Vorgang: #74

*„Loot chest die in der welle gefunden werden für enden der wellen
öffnen"* und *„Inventar übersicht"*.

**Hängt zusammen mit Phase 2** (Besitz): Das Inventar dort ist
dasselbe Inventar. Diese Phase liefert, was hineinkommt.

**Fertig, wenn:** Eine Truhe fällt in der Welle, wird aufgehoben und
am Wellenende geöffnet, und was herauskommt, liegt danach im Inventar.

### 15.1 · Die Truhe als Ding, das fällt

Vorgang: #75

**Fertig, wenn:** Truhen erscheinen mit messbarer Häufigkeit und sind
im Dunkeln auffindbar.

### 15.2 · Öffnen am Wellenende

Vorgang: #76

**Fertig, wenn:** Das Öffnen ist ein eigener Moment mit eigener
Anzeige, nicht eine Zeile im Ladenbildschirm.

---

## Phase 16 — Sichtbare Angriffe

Vorgang: #77

*„Optisch ansprechendere Angriffe und klarer zu erkennen"* ·
*„floating schadenanzeigen, auch mit krit"* · *„Ausgerüstete angriffe
werden angezeigt und bekommen eine abklingzeit anzeige"* ·
*„mehr partikel effekte"*.

**Der Befund dahinter:** Man kann heute nicht sehen, was gerade
passiert. Das ist keine Verschönerung, sondern fehlende Rückmeldung —
und der Grund, warum sich ein Bau nicht anfühlt wie ein Bau.

**Fertig, wenn:** Ein Zuschauer kann ohne Erklärung sagen, welche
Schadensart gerade getroffen hat und welche Waffe gleich bereit ist.

### 16.1 · Je Schadensart ein erkennbares Zeichen

Vorgang: #78

**Fertig, wenn:** Fünf Trefferformen, im Bild bei echter Größe
unterscheidbar — gemessen, nicht behauptet.

### 16.2 · Schwebende Zahlen mit Krit

Vorgang: #79

**Fertig, wenn:** Ein Krit ist auf einen Blick von einem normalen
Treffer zu unterscheiden.

### 16.3 · Die Angriffsleiste mit Abklingzeit

Vorgang: #80

**Fertig, wenn:** Jede angelegte Waffe hat ein Feld, das sichtbar
füllt, und es steht dort, wo es nicht im Weg ist.

---

## Phase 17 — Die Webadresse und das Telefon

Vorgang: #81

*„Das spiel über github erreichbar machen für freunde! also
webadresse!"* und *„spielbar auf desktop und handy!!!!!"*.

**Warum das die wichtigste Phase ist:** Bis sie fertig ist, hat Jannik
sein eigenes Spiel nie mit jemandem gespielt.

**Fertig, wenn:** Ein Freund öffnet eine Adresse auf dem Telefon,
tippt einen Lobbycode ein und spielt mit.

### 17.1 · Veröffentlichen über GitHub Pages

Vorgang: #82

**Fertig, wenn:** Ein Push auf `main` erneuert die Seite, und alle
Pfade sind relativ — sonst läuft es örtlich und bleibt dort weiß.

### 17.2 · Bedienung mit dem Daumen

Vorgang: #83

**Fertig, wenn:** Auf 375 x 812 Bildpunkten ist das Spiel bedienbar,
ohne dass die Seite unter dem Daumen wegscrollt.

### 17.3 · Der Lobbycode

Vorgang: #84

**Fertig, wenn:** Zwei Browser auf verschiedenen Rechnern finden sich
über sechs vorlesbare Zeichen.

### 17.4 · Ein Rechner, eine Figur

Vorgang: #85

Die vier Tastaturbelegungen fallen weg.

**Fertig, wenn:** `BELEGUNGEN` ist verschwunden, und keine Prüfung
vermisst es.

---

## Phase 18 — Das Auswertungsprotokoll

Vorgang: #86

Janniks Ansage: *„und ganz wichtig. ein auswertungs protokoll!"*, und
kurz darauf die Klarstellung, wozu: *„das protokoll dient nur der
auswertung so das du später die schwierigkeit anpassen kannst"*.

**Damit ist es kein Feature, sondern ein Werkzeug.** Kein Bildschirm,
kein Menüpunkt, nichts, was ein Spieler je sieht. Es läuft im
Prüfstand und beantwortet eine einzige Frage: An welcher Schraube muss
man drehen?

**Der Entwurfsbefund:** Fast jede Zahl aus Janniks Liste ist von außen
sichtbar, wenn man zwei aufeinanderfolgende Weltzustände vergleicht —
auch die, die nach einem Ereignis klingen. Ein Gegner, der in einer
Abtastung noch stand und in der nächsten fehlt, ist gestorben; seine
letzte Position kennt man aus der vorigen. Das erste Mal
`leben < lebenMax` ist der erste Treffer. Deshalb braucht das
Protokoll **keinen einzigen Haken im Regelkern**: Es ist ein
Beobachter, der abtastet und nichts verändert. Ein Beobachter, der
beobachtet, was er selbst verändert, misst sich selbst.

**Der Zweck bestimmt, welche Zahl etwas wert ist.** Jede Kennzahl muss
auf eine Stellschraube zeigen, die es wirklich gibt —
`dichteDerWelle`, `budgetDerWelle`, `istElitewelle` in
`spiel/katalog/wellen.mjs`, `LEBEN_JE_WELLE`, `SCHADEN_JE_WELLE`,
`TEMPO_JE_WELLE`, `TEMPO_DECKEL` in `spiel/katalog/gegner.mjs`. Eine
Kennzahl ohne Schraube beschreibt, sie hilft nicht.

**Und eine Warnung, die dieses Projekt teuer gelernt hat:** An einem
Messabend lagen fünf von sechs Fehlern in den **Messungen**, nicht im
Gemessenen. Zu jeder Kennzahl gehört deshalb eine Gegenprobe, die
belegt, dass sie sich bewegt, wenn sich das Gemessene bewegt.

**Fertig, wenn:** Ein Lauf liefert eine Tabelle, zwei Läufe mit
derselben Saat liefern dieselbe, und zu jeder auffälligen Zahl steht
dabei, an welcher Schraube man drehen müsste.

### 18.1 · Der Beobachter tastet ab, statt zu haken

Vorgang: #87

**Fertig, wenn:** Keine Datei unter `spiel/` hat für das Protokoll
eine Zeile bekommen, und die Kennzahlen stimmen trotzdem.

### 18.2 · Runde, Spieler, Gegner

Vorgang: #88

Dauer bis zum letzten Gegner, Restzeit, gleichzeitige Gegner je
Zeitmarke, Tode, Lebenspunkte zu den Zeitmarken, Anteil der Gegner,
die beim ersten Treffer sterben, Zeit vom ersten Treffer bis zum Tod,
Entfernung beim Sterben.

**Fertig, wenn:** Wo Jannik nach „in der Regel" fragt, steht ein
Median mit Spanne und kein Mittelwert — ein Mittelwert kann von zwei
Ausreißern erfunden sein.

### 18.3 · Beute, Werte, Powerscaling

Vorgang: #89

Erschienenes gegen Aufgesammeltes, Stufe je Wellenende, und die eine
Zahl, auf die alles hinausläuft: Wächst der Spieler schneller oder
langsamer als die Nacht?

**Fertig, wenn:** Das Verhältnis von Schadensleistung zu
Lebenspunkte-Bedarf steht je Welle in der Tabelle.

### 18.4 · Zwei Stände vergleichen

Vorgang: #90

Schraube drehen, messen, vergleichen — das ist der ganze Zweck.

**Fertig, wenn:** Ein Aufruf zeigt, was sich zwischen zwei Läufen
verschoben hat, ohne dass man zwei Tabellen nebeneinanderlegt.

### 18.5 · Jede Kennzahl hat eine Gegenprobe

Vorgang: #91

**Fertig, wenn:** Für mindestens vier Kennzahlen ist belegt, dass sie
sich bewegen, wenn man an ihrer Schraube dreht — mit Zahl vorher und
nachher.
