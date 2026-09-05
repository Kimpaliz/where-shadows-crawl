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
