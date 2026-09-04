# Änderungen

Oben das Neueste. Jeder Eintrag sagt **was**, **warum** und **womit
gemessen** — nicht nur, dass etwas anders ist.

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
