# Changelog-Teil · Das Angebot an den Vermittler

Für die Übernahme nach `CHANGELOG.md`. Der Zweig
`koop/vermittler-angebot` fasst `CHANGELOG.md` nicht selbst an — dort
arbeiten am 05.09.2026 mehrere Stränge gleichzeitig, und eine gemeinsam
beschriebene Datei wäre ein Konflikt in jedem einzelnen Merge.

---

## Die Verbindung steht (05.09.2026)

Die Lobby war gebaut, die Prüfkette grün — **und es kam keine
Verbindung zustande.** Notiert stand, der öffentliche PeerJS-Vermittler
reiche Angebote grundsätzlich nicht weiter. **Das war falsch.**

Der Vermittler ist in Ordnung. Er verwirft nur, was nicht aussieht wie
die Nachricht einer echten PeerJS-Gegenstelle — und zwar **wortlos**:
Er schließt die Verbindung des Absenders mit Code **1000**, und 1000
heißt in WebSocket-Sprache „normal geschlossen". Ein Ablehnen sieht
damit aus wie ein ordentliches Auflegen, und genau daran ist die erste
Diagnose gescheitert. `netz/verbindung.mjs` schickte
`localDescription.toJSON()`, also `{ type, sdp }` — die Beschreibung,
aber nicht die Hülle darum.

**Gemessen** in vier Runden mit nackten WebSockets gegen den echten
Dienst, jeder Fall mindestens zweimal, die Arten ineinander verzahnt,
damit Schwanken des Dienstes kein Muster vortäuschen kann:

| Art | verlangt | entbehrlich |
| --- | --- | --- |
| `OFFER` | `sdp`, `type`, `connectionId`, `label`, `serialization` | `reliable`, `browser` |
| `ANSWER` | `sdp`, `type`, `connectionId` | die übrigen vier |
| `CANDIDATE` | `candidate`, `type`, `connectionId` | die übrigen vier |

**`OFFER` ist die strengste Art** — deshalb war es so schwer zu finden:
Wer an einer Antwort oder einer Wegbeschreibung prüft, hält die schmale
Form für ausreichend, denn dort kommt sie durch. Ohne `label` oder ohne
`serialization` fiel ein Angebot in **allen drei** Läufen durch.

Neu `netz/vermittler-format.mjs`. Geschickt wird für alle drei Arten
dieselbe volle Hülle — genau das, was eine echte PeerJS-Gegenstelle
sendet; sie kam in jedem einzelnen Lauf durch, und **eine** Form ist
eine Stelle, an der man sich irren kann, statt dreier. Beim Empfangen
wird auch die nackte Form noch angenommen: Dort entscheidet die Form
nicht mehr über das Ankommen, und eine Ablehnung wäre nur eine zweite
Art zu scheitern.

Die `connectionId` kommt vom Anrufenden und wird vom Antwortenden
**zurückgespiegelt**, statt neu erfunden — sonst sähe der Vermittler
zwei Leitungen, und die Antwort gehörte zu keinem Angebot. Dazu ein
Halt für Wegbeschreibungen, die fertig sind, bevor die Kennung da ist:
Beim Antwortenden ist das der Normalfall in den ersten Millisekunden,
und ungültig hinausgeschickt hätten sie die Leitung wieder gekostet.

Zwei Kommentarblöcke richtiggestellt (`netz/broker.mjs`,
`netz/sitzung.mjs`), die den falschen Befund festhielten. Eine falsche
Notiz ist an dieser Stelle teurer als keine — sie schickt den nächsten
Leser in die falsche Richtung.

**Merksatz:** Ein fremder Dienst, der ohne Fehlermeldung auflegt, ist
zuerst ein Verdacht gegen die eigene Nachricht, nicht gegen ihn.

`werkzeuge/pruefe-netz.mjs` **31 → 38 Prüfungen**, Teil 5. Sie stellt
die Messung bewusst **nicht** nach — eine Prüfkette, die an einem
fremden Dienst hängt, ist ab dessen nächster Störung rot; sie prüft,
dass die Hülle die gemessenen Pflichtfelder trägt. **Rot-Beweis** mit
zehn einzelnen Mutationen, alle mit Rückgabewert 1, Datei danach
bytegleich (SHA-256).

**Nachgewiesen, nicht behauptet.** Im Browser mit den echten Modulen
über den echten Vermittler: `RTCDataChannel` `readyState: open` auf
beiden Seiten, ICE-Paar nominiert, **200 von 200** Nachrichten
angekommen, 19 102 Byte hin und 14 212 Byte zurück, Umlauf Median
**0,6 ms**. Danach eine ganze Runde zu zweit in zwei Tabs: Lobby
aufgemacht, Code abgelesen, beigetreten, angefangen, gespielt bis zum
Endbildschirm — beide Bildschirme zeichengleich (J1 Stufe 2, 23
erschlagen; J2 Stufe 2, 22 erschlagen), 60 Nachrichten je Sekunde in
jede Richtung. Ehrlich dazu: Beide Gegenstellen liefen auf demselben
Rechner, das ICE-Paar ist host ↔ host. Die Durchquerung zweier fremder
Adressumsetzungen ist damit **nicht** bewiesen.

**Nebenbefund, nicht behoben:** Bricht ein Spieler weg, läuft die
laufende Welle korrekt weiter (`WEG_NACH_SEKUNDEN` greift) — aber im
**Krämer** hängt die Runde für immer, weil
`welt.spieler.every((s) => s.bereit)` auf einen Spieler wartet, den es
nicht mehr gibt. Am Bildschirm nachgestellt. Der Befund ist älter als
diese Änderung und war nur nie sichtbar, weil vorher nie eine
Verbindung zustande kam; die Behebung ist eine Regelentscheidung und
liegt in `runtime/oberflaeche.js`.
