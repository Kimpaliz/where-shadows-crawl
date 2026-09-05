# Das Angebot an den Vermittler — was gemessen ist

Arbeitsstrang `koop/vermittler-angebot`, begonnen am 05.09.2026 auf
`a3ea0c2` (Zweig `koop/lobby-und-netz`).

Die Lobby war vollständig gebaut und die Prüfkette grün — **und es kam
keine Verbindung zustande.** Notiert stand, der öffentliche
PeerJS-Vermittler reiche Angebote grundsätzlich nicht weiter. Das war
falsch. Diese Datei sammelt je Schritt eine Zeile, dazu die Messungen
und die Rot-Beweise.

---

## Schritt 1 · Die Hülle (05.09.2026)

**Befund:** Der Vermittler ist in Ordnung. Er verwirft nur, was nicht
aussieht wie die Nachricht einer echten PeerJS-Gegenstelle — und zwar
**wortlos**: Er schließt die Verbindung des Absenders mit Code
**1000**, und 1000 heißt in WebSocket-Sprache „normal geschlossen". Ein
Ablehnen sieht damit aus wie ein ordentliches Auflegen. Genau daran ist
die erste Diagnose gescheitert.

`netz/verbindung.mjs` schickte, was der Browser liefert:

```
gegen.localDescription.toJSON()   →   { type, sdp }
```

Das ist die Beschreibung — aber nicht die Hülle, in der der Vermittler
sie erwartet.

### Gemessen: welche Felder wirklich verlangt werden

Vier Runden mit nackten WebSockets gegen den echten Dienst
(`wss://0.peerjs.com/peerjs`), ohne eine Zeile Spielcode: je zwei
frische Anmeldungen, **eine** Nachricht, dann 3,5–4 s zuhören. Notiert
wurde, ob der Empfänger etwas bekommt und ob der Absender getrennt
wird.

| Art | verlangt (gemessen) | entbehrlich (gemessen) |
| --- | --- | --- |
| `OFFER` | `sdp`, `type`, `connectionId`, `label`, `serialization` | `reliable`, `browser` |
| `ANSWER` | `sdp`, `type`, `connectionId` | `label`, `reliable`, `serialization`, `browser` |
| `CANDIDATE` | `candidate`, `type`, `connectionId` | dieselben vier |

**`OFFER` ist die strengste Art, und das ist der Grund, warum es so
schwer zu finden war.** Wer an einer Antwort oder einer Wegbeschreibung
prüft, hält die schmale Form für ausreichend — sie kommt dort durch.

Runde 3 hat genau das abgesichert: **alle drei Arten mit denselben
Feldsätzen, ineinander verzahnt**, damit Schwanken des fremden Dienstes
kein Muster nach Art vortäuschen kann.

| Feldsatz | OFFER | ANSWER | CANDIDATE |
| --- | --- | --- | --- |
| schmal `{kern, type, connectionId}` | abgelehnt | durch | durch |
| voll `+label, reliable, serialization` | **durch** | durch | durch |
| ohne `label` | abgelehnt | durch | durch |
| ohne `reliable` | **durch** | durch | durch |
| ohne `serialization` | abgelehnt | durch | durch |

Runde 4, je **drei** Läufe, alle drei einig:

| Fall | Ergebnis |
| --- | --- |
| `{sdp, type, connectionId, label, serialization}` | durch · durch · durch |
| dasselbe ohne `label` | abgelehnt(1000) ×3 |
| dasselbe ohne `serialization` | abgelehnt(1000) ×3 |
| dasselbe ohne `connectionId` | abgelehnt(1000) ×3 |
| volle Hülle (das, was gebaut wurde) | durch · durch · durch |

Die Angabe aus dem Auftrag — `{sdp, type, connectionId, browser}` sei
die Untergrenze — trägt **nicht**: Dieser Satz wurde in Runde 1 und 2
je zweimal **abgelehnt**. Es fehlten `label` und `serialization`, und
`browser` ist entbehrlich. Die Untergrenze war eine gemessene, aber
eine an einem zu großen Satz abgelesene.

⚠️ Gemessen ist, dass die Felder **da sein** müssen — **nicht**, dass
ihr Wert eine Rolle spielt. Die Werte wurden nicht variiert. Deshalb
stehen im Code die Werte, die nachweislich durchkamen, und keine selbst
ausgedachten.

### Was gebaut wurde

Neu `netz/vermittler-format.mjs` (`verpackeSignal`, `entpackeSignal`,
`kennungAusSignal`, `neueVerbindungsKennung`). Geschickt wird für alle
drei Arten **dieselbe volle Hülle**: Sie ist genau das, was eine echte
PeerJS-Gegenstelle sendet, kam in jedem einzelnen Lauf durch, und eine
Form ist eine Stelle, an der man sich irren kann, statt dreier.

**Streng beim Senden, nachsichtig beim Empfangen.** `entpackeSignal`
nimmt auch die nackte Form an. Beim Senden entscheidet die Form, ob die
Nachricht überhaupt ankommt; beim Empfangen wäre eine Ablehnung nur
eine zweite Art zu scheitern.

**Die `connectionId`** kommt vom Anrufenden und wird vom Antwortenden
**zurückgespiegelt** (`kennungAusSignal`), statt neu erfunden — sonst
sähe der Vermittler zwei Leitungen, und die Antwort gehörte zu keinem
Angebot. Sie stammt aus `Math.random`, und das ist hier ausdrücklich
richtig: `netz/` ist nicht `spiel/`. Der gesäte Strom gehört der
Simulation, aus der zwei Rechner **dieselben** Zahlen ziehen müssen;
eine Verbindungskennung ist das Gegenteil — sie soll auf jedem Rechner
verschieden sein. Käme sie aus dem gesäten Strom, bekämen zwei Gäste
derselben Runde dieselbe Kennung.

**Ein Halt für zu frühe Wegbeschreibungen:** Der Antwortende hat in den
ersten Millisekunden noch keine Kennung. Seine ICE-Wege gingen sonst
ungültig hinaus, der Vermittler trennte, und die Leitung käme nie
zustande. `wartendeSignale` hält sie, bis die Kennung aus dem Angebot
da ist.

**Zwei Kommentarblöcke richtiggestellt** (`netz/broker.mjs`,
`netz/sitzung.mjs`): Beide behaupteten, der Dienst reiche grundsätzlich
nichts weiter. Eine falsche Notiz an dieser Stelle ist teurer als keine
— sie schickt den nächsten Leser in die falsche Richtung.

### Rot-Beweis (Regel 4)

`werkzeuge/pruefe-netz.mjs` wächst um Teil 5, **31 → 38 Prüfungen**.
Zehn Mutationen an `netz/vermittler-format.mjs`, jede einzeln, Datei
danach jedes Mal zurückgelegt:

| gebrochen | Fehler |
| --- | ---: |
| Hülle ohne `label` | 1 |
| Hülle ohne `serialization` | 1 |
| Hülle ohne `connectionId` | 4 |
| `type` trägt die Nachrichtenart statt der Verbindungsart | 1 |
| Beschreibung flach statt unter `sdp` | 2 |
| Auspacken gibt die ganze Hülle statt der Beschreibung | 2 |
| Auspacken lehnt die nackte Form ab | 1 |
| Auspacken wirft, statt `null` zu geben | 1 |
| Kennung wird erfunden statt gespiegelt | 1 |
| jede Leitung bekommt dieselbe Kennung | 1 |

Alle zehn mit Rückgabewert 1. Datei danach **bytegleich** (SHA-256
verglichen), Kette wieder `38 Prüfungen, 0 Fehler`.

**Warum die Prüfung die Zahlen nicht selbst nachstellt:** Dafür
bräuchte sie den fremden Dienst, und eine Prüfkette, die an einem
fremden Dienst hängt, ist ab dessen nächster Störung rot. Sie prüft
stattdessen, dass die Hülle die gemessenen Pflichtfelder **trägt** —
fällt eines wieder heraus, ist die Verbindung wieder tot, und das
merkte man sonst erst im Browser an einem Wartebild ohne Grund.

---

## Schritt 2 · Die Leitung steht wirklich (05.09.2026)

„Das Angebot kam an" ist nicht dasselbe wie „die Leitung steht". Der
Briefträger nimmt den Brief an; ob ihn jemand liest, ist eine zweite
Frage. Deshalb hier der Nachweis **am geöffneten Datenkanal**, nicht am
weitergereichten Angebot.

Gemessen in einem echten Browser (Chromium) auf einer vom
Vorschau-Server ausgelieferten Seite. Getrieben wurden die **echten**
Module — `netz/sitzung.mjs` mit `eroeffne()` und `tritteBei()` — über
den **echten** öffentlichen Vermittler; nichts nachgebaut, nichts
abgekürzt.

⚠️ **Der Vorschau-Server lief auf Port 8151, nicht 8144.** Auf 8144
lief bereits ein Server einer anderen Sitzung, der einen **anderen
Zweig** ausliefert — dort zu messen hätte fremden Code gemessen.
`werkzeuge/vorschau.mjs` gehört nicht zu den Dateien dieses Auftrags
und wurde deshalb nicht geändert, sondern für die Messung daneben
nachgebaut (gleiche Typen, gleiches `no-store`).

### Was direkt am Browser-Objekt abgelesen wurde

`RTCPeerConnection` wurde mitgeschnitten, damit die Zahlen vom Browser
kommen und nicht aus unserer eigenen Hülle:

| | Wirt | Gast |
| --- | --- | --- |
| `connectionState` | `connected` | `connected` |
| `iceConnectionState` | `connected` | `connected` |
| Datenkanal | `spiel` | `spiel` |
| `readyState` | **`open`** | **`open`** |
| `ordered` / `maxRetransmits` | `false` / `0` | `false` / `0` |
| ICE-Paar (`nominated`, `succeeded`) | host ↔ host, UDP | host ↔ host, UDP |
| Bytes auf dem Paar (gesendet / empfangen) | 1267 / 1543 | 1543 / 1267 |

Der Datenkanal ist also **offen**, und er ist der, den
`netz/verbindung.mjs` bestellt (unzuverlässig und ungeordnet — genau
die zwei Eigenschaften, die dort begründet stehen).

### Und er trägt Daten — in beide Richtungen

Erstens von selbst, noch ohne Zutun: Der Gast bekam **Platz 1**
zugeteilt, und diese Zahl reist ausschließlich über den Datenkanal
(`{art:"platz"}`). Umgekehrt stand beim Wirt der Name **„Gast"** in der
Platzliste — der kam über dieselbe Leitung (`{art:"hallo"}`). Beide
Seiten meldeten `verbunden: true`, und dieser Wert ist im Code direkt
`kanal.readyState === "open"`.

Zweitens gezählt, mit 200 Nachrichten Wirt → Gast, die der Gast
jeweils zurückschickte:

| | |
| --- | ---: |
| gesendet Wirt → Gast | **200** |
| angekommen beim Gast | **200** (Verlust 0,0 %) |
| Nutzdaten beim Gast | **19 102 Byte** |
| zurück beim Wirt | **200** |
| Nutzdaten beim Wirt | **14 212 Byte** |
| Umlauf Median | **0,6 ms** |
| Umlauf min / p95 / max | 0,2 / 0,8 / 1,0 ms |

⚠️ **Was diese Verzögerung ist und was nicht.** Sie ist an der echten
Verbindung gemessen, nicht gerechnet — aber das gewählte ICE-Paar ist
**host ↔ host**: Beide Gegenstellen liefen auf demselben Rechner. Die
0,6 ms sind die Kosten von WebRTC und der Schleife, **nicht** die eines
Weges über zwei Router. Was hier bewiesen ist: Der Vermittler stellt
die Angebote zu, der Aufbau läuft durch, der Kanal öffnet und trägt
Daten. Was **nicht** bewiesen ist: dass die Durchquerung zweier
fremder Adressumsetzungen gelingt — dafür bräuchte es zwei Rechner in
zwei Netzen. Bei einer symmetrischen Adressumsetzung hilft STUN
nachweislich nicht, und ein TURN-Server gehört nicht zum Projekt
(siehe `netz/verbindung.mjs`).

Danach wurden alle vier Sitzungen ordentlich beendet
(`connectionState: closed`), damit am fremden Dienst nichts offen
stehen bleibt.

---

## Schritt 3 · Eine echte Runde zu zweit (05.09.2026)

Zwei Browser-Tabs, beide auf `http://127.0.0.1:8151/`, keine Attrappe
und keine Abkürzung: die normale Oberfläche, der normale Lobbycode, der
öffentliche Vermittler.

### Was wirklich geklickt wurde

| | Tab A | Tab B |
| --- | --- | --- |
| Name getippt | `ANKA` | `BOLKO` |
| geklickt | **LOBBY AUFMACHEN** | **EINER LOBBY BEITRETEN** |
| dann | Code abgelesen: **V6ZGA8** | Code `V6ZGA8` getippt, **BEITRETEN** |
| dann | **ANFANGEN** | — |

Alles davon waren **echte Mausklicks** auf die echten Knöpfe.

### Was zu sehen war

Nach dem Aufmachen stand in Tab A „DEIN LOBBYCODE · V6ZGA8" und
darunter die Liste `★ ANKA (du)` / `noch 3 Plätze frei`. Nach dem
Beitritt stand in **Tab B** `★ ANKA` / `· BOLKO (du)` / `noch 2 Plätze
frei` — und in **Tab A** zur selben Zeit `★ ANKA (du)` / `· BOLKO` /
`noch 2 Plätze frei`. Beide Listen kommen über den Datenkanal; das ist
der erste sichtbare Beweis, dass die Leitung trägt.

Danach lief die Runde durch: Nacht 1 → **DER KRÄMER — VOR NACHT 2** →
Nacht 2 → **DIE NACHT LEHRT DICH ETWAS** (Aufstiegskarten) →
Endbildschirm.

### ⚠️ Die Tasten mussten von Hand ausgelöst werden

Beide Automatisierungswege liefern **keine brauchbare Taste**:

| Weg | was ankam |
| --- | --- |
| Browserfenster (`computer key`) | `keydown` kommt an, aber **`e.code` ist leer** |
| echtes Chrome über die Erweiterung | **gar kein `keydown`** |

`runtime/eingabe.js` bildet auf `e.code` ab (`KeyW`, `KeyA`, …), also
ist beides unbrauchbar. Die Tasten wurden deshalb mit
`dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA" }))`
ausgelöst — **durch genau den Horcher**, den das Spiel registriert hat,
und mit demselben `code`, den eine echte Taste liefern würde. Die
Mausklicks oben sind davon nicht betroffen; die waren echt.
Ehrlich gesagt: Eine Tastatur unter einem Finger war es nicht.

### Gemessen: die Eingabe des einen erreicht den anderen

Die Zahl `65278` ist die ruhende Eingabe (`x=0, y=0`); alles andere ist
Bewegung. Mitgeschnitten wurde auf der Transportebene, also am
eingehenden Datenkanal.

| gedrückt in | was der **andere** Tab empfing |
| --- | --- |
| Tab A: `KeyD` (rechts), 1,5 s | Tab B sah **Platz 0**: roh `130302` → `x = 1, y = 0`, Tick 15779 |
| Tab B: `KeyW`+`KeyA` (hoch-links), 1,5 s | Tab A sah **Platz 1**: roh `0` → `x = −1, y = −1`, Tick 17065 |

Beide Achsen unterscheiden sich zwischen den zwei Fällen — wäre ein
Platz vertauscht oder eine Achse verdreht, fiele es hier auf. Nach dem
Loslassen ging beides zurück auf `65278`.

Dauerlast während der Runde: **60,5 Nachrichten je Sekunde hinaus, 60,0
herein**; über die Runde **21 393 hinaus und 21 393 herein** in Tab A.
Der Wirt sendet `platz: 0` und empfängt `platz: 1`.

**Das ist zugleich der stärkste Beleg:** Der Gleichschritt rechnet
einen Tick erst, wenn die Eingabe des anderen da ist
(`netz/lockstep.mjs`). Dass beide Tabs über 21 000 Ticks
durchgelaufen sind, ist nur möglich, wenn die Post ununterbrochen in
**beide** Richtungen ankam. Bliebe sie aus, stünde das Bild.

### Beide Bildschirme zeigten dasselbe

Im Krämer stand in **beiden** Tabs `J1 24 GOLD` / `J2 30 GOLD`, und
jeder Auswahlbalken stand dort, wohin ihn **sein eigener** Tab bewegt
hatte (links `BERNSTEIN`, rechts `NEU 5`) — jeder steuert seine Spalte,
beide sehen beide. Am Ende stand in beiden Tabs zeichengleich:

```
DIE NACHT BEHÄLT EUCH — BIS NACHT 2
J1  STUFE 2  23 ERSCHLAGEN
J2  STUFE 2  22 ERSCHLAGEN
```

Zwei Browser, dieselben Zahlen, und **verschiedene** Zahlen je Spieler
(23 gegen 22) — es waren wirklich zwei Jäger in einer Welt.

### Nebenbefund: kein Tab wurde gedrosselt

Die Falle aus dem Auftrag wurde geprüft, bevor gemessen wurde: beide
Tabs meldeten `document.visibilityState === "visible"` und **720 bzw.
721 Bilder in 3 Sekunden** (~240 fps). Ein gedrosselter Hintergrundtab
hätte den Gleichschritt für beide angehalten — das lag hier nicht vor.

---

## Schritt 4 · Wenn einer wegbricht (05.09.2026)

Neue Lobby (`25PVC3`), beide drin, Nacht 1 gestartet — und dann der
Tab des Gastes **geschlossen**, mitten in der laufenden Welle.

### In der Welle: der andere läuft weiter ✔

Gemessen am Bild selbst, fünf Aufnahmen im Sekundentakt direkt nach dem
Wegbrechen: **fünf verschiedene** Bilder. Die Welle lief weiter, und
ANKA konnte sich danach noch bewegen (Bild vor und nach dem Laufen
verschieden). Der Endbildschirm kam nicht, die Lobby kam nicht zurück
— es lief einfach weiter. Auch die Aufstiegskarten danach ließen sich
nehmen.

Das ist die Mechanik aus `runtime/start.js`: Wer länger als
`WEG_NACH_SEKUNDEN = 2` fehlt, wird über `gleichschritt.meldeWeg()`
übersprungen. Sie greift.

### Im Krämer: die Runde hängt ✗ — ein echter Befund

Sobald der Lauf in ein **Menü** kommt, ist Schluss. `bedieneLaden` in
`runtime/oberflaeche.js` endet mit

```
return welt.spieler.every((s) => s.bereit);
```

Ein weggebrochener Spieler bekommt vom Gleichschritt die **ruhende**
Eingabe eingesetzt — er drückt also nie, und `s.bereit` wird nie wahr.

Am Bildschirm nachgestellt: ANKA ging auf `LOS` und drückte; ihre
Spalte zeigt **BEREIT** in Grün, die Spalte des längst geschlossenen
J2 zeigt weiter `LOS`. Sechs Aufnahmen im Sekundentakt danach:
**alle sechs gleich** — das Bild steht. Vorher, in derselben Sitzung,
waren fünf Aufnahmen fünfmal verschieden. Dieselbe Sperre gilt beim
Aufstiegsmenü, wo unten „J2 WARTET" für einen Spieler steht, den es
nicht mehr gibt.

**Damit ist die Antwort auf Schritt 4 zweigeteilt:** In der Welle läuft
der andere weiter statt einzufrieren — im Krämer nicht, dort ist die
Runde zu Ende, ohne dass es jemand sagt.

### Dieser Befund gehört nicht zu dieser Reparatur

Er ist **älter** als sie und war bis heute nur nicht sichtbar: Vor dem
Einpacken des Angebots kam nie eine Verbindung zustande, also konnte
auch nie eine wegbrechen. Behoben wird er hier **nicht** —
`runtime/oberflaeche.js` und `spiel/` gehören nicht zu diesem Auftrag,
und die saubere Lösung ist eine Regelentscheidung, keine Reparatur:
Ein weggebrochener Spieler müsste im Menü als „zählt nicht mit" gelten
(etwa `every((s) => s.bereit || s.weg)`), und dafür braucht die Welt
eine Marke, die sie heute nicht hat. Wer das entscheidet, sollte
gleich mitentscheiden, was mit seiner Beute und seinem Platz geschieht.

### Ein eigener Messfehler, unterwegs gefunden

Der erste Fortschrittsmesser zählte `RTCDataChannel.send`. Nach dem
Wegbrechen des **letzten** Gastes gibt es aber gar keinen Kanal mehr —
der Zähler stand auf 0, und ich hätte um ein Haar „der Wirt friert
ein" gemeldet. Tatsächlich lief das Spiel; nur die Post hatte keinen
Empfänger mehr. Aufgefallen daran, dass der Auswahlbalken im Krämer
auf Tastendruck **trotzdem** wanderte.

**Merksatz:** Ein Zähler am Ausgang misst nicht, ob das Spiel läuft —
er misst, ob jemand zuhört. Was das Bild tut, fragt man das Bild.
Der zweite Messer nimmt deshalb die Leinwand selbst.

---

## Was ich nicht prüfen konnte

1. **Zwei Rechner in zwei Netzen.** Alles lief auf einem Rechner; das
   nominierte ICE-Paar ist host ↔ host. Bewiesen ist die Vermittlung
   und der Kanal — **nicht**, dass zwei fremde Adressumsetzungen
   durchquert werden. Bei einer symmetrischen Adressumsetzung hilft
   STUN nachweislich nicht, und einen TURN-Server hat das Projekt
   nicht (`netz/verbindung.mjs`).
2. **Kein Telefon.** Die Handy-Bedienung wurde nicht angefasst.
3. **Keine echte Tastatur.** Die Tasten kamen aus `dispatchEvent`,
   weil beide Automatisierungswege kein brauchbares `e.code` liefern.
   Die Mausklicks waren echt.
4. **Nur zu zweit.** Drei oder vier Gäste am selben Wirt sind
   ungeprüft; der freie Platz und die Sternform (`netz/sitzung.mjs`)
   sind damit nur zur Hälfte belegt.
5. **Der Wert der Hüllenfelder.** Gemessen ist, dass `label`,
   `serialization` und `connectionId` **da sein** müssen — nicht, dass
   ein anderer Wert als der eingesetzte durchkäme.
6. **Was der Vermittler morgen tut.** Er ist ein fremder Dienst ohne
   Zusage. Die Prüfkette hängt bewusst nicht an ihm; sie prüft die
   Form, nicht die Erreichbarkeit.
7. **Der Krämer-Befund ist nicht behoben**, nur belegt — siehe
   Schritt 4.

## Nicht angefasst

`spiel/`, `runtime/zeichnen.js`, `runtime/oberflaeche.js`,
`runtime/sprites.js`, `runtime/sprite-daten.js`, `runtime/palette.js`,
`runtime/eingabe.js`, `runtime/start.js`, `index.html`, `CHANGELOG.md`,
`docs/ROADMAP.md`, `docs/SPIEL.md`, `WORKCLAIM.md`,
`werkzeuge/pruefe-alles.mjs`, `werkzeuge/vorschau.mjs`.

Geändert wurden nur `netz/vermittler-format.mjs` (neu),
`netz/verbindung.mjs`, `netz/broker.mjs`, `netz/sitzung.mjs`,
`werkzeuge/pruefe-netz.mjs` und die beiden Dokumente dieses Auftrags.
`runtime/lobby.js` brauchte keine Änderung — der Fehler saß eine Ebene
tiefer.
