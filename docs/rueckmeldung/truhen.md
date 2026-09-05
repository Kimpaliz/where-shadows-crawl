# Rückmeldung: Truhen (Phase 15, Vorgänge #75/#76)

Laufender Fortschrittsbericht des Zweigs `regeln/truhen`.

## 1 · Der Regelkern steht (erledigt, 05.09.2026)

Neu `spiel/truhen.mjs`: eine Truhe fällt selten von einem toten Gegner
(`pruefeTruhenfall`, eingehängt in `spiel/beute.mjs` `lassBeuteFallen`),
wird wie Grabgold aufgehoben (`bewegeTruhen`), bleibt aber **ungeöffnet**
im Gürtel liegen (`spieler.truhen`, ein Zähler) — erst
`spiel/welt.mjs` `beendeWelle()` öffnet am Wellenende alle getragenen
Truhen aller Spieler auf einmal (`oeffneTruhen`) und hält die Welt dafür
für `TRUHEN_ANZEIGE_SEKUNDEN` (1,4 s) in einer neuen Phase
`welt.phase === "truhen"` an (`fortschreiteTruhen`), bevor sie zu
„laden" oder „gewonnen" weiterzieht — genau dem Ziel, zu dem sie ohne
Truhe direkt gegangen wäre.

**Die wichtigste Entscheidung: ein eigener Zufallsstrom.** Truhenfall
und -inhalt werden aus `welt.truhenZufall` gezogen —
`abgeleitet(saat, "truhen")` aus `spiel/zufall.mjs`, bisher ungenutzt
vorbereitet, jetzt zum ersten Mal wirklich gebraucht. Damit verschiebt
kein Truhenfall `welt.zufall` (Wellenpläne, Kritwürfe, Krämerangebote)
— nachgewiesen in `werkzeuge/pruefe-truhen.mjs`: 5.000 Truhenfall-
Versuche lassen `welt.zufall.zustand()` bitgleich stehen.

**Die zweitwichtigste: „truhen" ist zeitgesteuert, nicht spieler-
gesteuert.** Anders als „wahl" (Kartenaufstieg) braucht das Öffnen
keine Entscheidung — der Inhalt steht fest, sobald die Welle endet.
`spiel/welt.mjs` `schritt()` behandelt die Phase deshalb **selbst**,
am Anfang der Funktion:

```js
if (welt.phase === "truhen") return fortschreiteTruhen(welt, SCHRITT);
if (welt.phase !== "welle") return welt.phase;
```

Dadurch laufen `werkzeuge/balance.mjs` (`spieleLauf`) und
`spiel/lauf.mjs` (`schrittImLauf`) **ohne eine einzige eigene Änderung**
durch den neuen Moment hindurch — beide rufen für jede Phase außer
„wahl" ohnehin `schritt()` auf. Das war eine bewusste Entscheidung
gegen die naheliegendere Lösung (eine dritte Sonderbehandlung neben
„wahl" und „laden" in `spiel/lauf.mjs`/`runtime/start.js`), weil
`spiel/lauf.mjs` **nicht** in meiner Dateiliste stand und
`werkzeuge/balance.mjs` überhaupt nicht angefasst werden sollte.

Fundstücke aus `spiel/laden.mjs` wurden bisher inline in `kaufe()`
angewendet. Herausgelöst nach `wendeGegenstandAn(spieler, id)` (neu
exportiert), damit eine Truhe sich **exakt** wie ein Kauf anfühlt —
`kaufe()` ruft jetzt dieselbe Funktion. Eine Waffe aus einer Truhe
nutzt `nimmWaffe()` unverändert (verschmilzt, wenn möglich); ist der
Gürtel voll und nichts zum Verschmelzen da, wird die Waffe **nicht
verworfen**, sondern zum halben Preis (`VERKAUFS_ANTEIL`, wie
`verkaufe()`) in Gold umgewandelt — kein Fund verschwindet spurlos.

## 2 · Gemessen: wie oft, wie viel, wie glücklich (05.09.2026)

**Wie viele fallen.** `TRUHEN_CHANCE_JE_TOD = 0.0025` (0,25 % je
getötetem Gegner). Kalibriert an echten Läufen (`werkzeuge/balance.mjs`,
1 Spieler): Ein Lauf tötet im Mittel rund 1.000 Gegner, von 51 (Tod in
Welle 1) bis über 6.000 (langer Notbremsen-Lauf). Über 60 simulierte
Läufe (Kunstspieler aus `werkzeuge/balance.mjs`): **4,18 Truhen je Lauf
im Mittel**, 25 von 60 Läufen sahen mindestens eine — „ein Fund", kein
Dauerregen.

**Wie viele ankommen.** Von 251 gefallenen Truhen wurden **237
aufgehoben (94,4 %)** — obwohl der Kunstspieler Truhen **nicht** gezielt
ansteuert (`botEingabe` in `werkzeuge/balance.mjs` kennt nur
`welt.gegner` und `welt.beute`, nicht `welt.truhen` — das ist Absicht,
ich habe diese Datei nicht angefasst). Die hohe Quote kommt daher, dass
eine Truhe genau dort fällt, wo gerade gekämpft wurde, und der Bot sich
ohnehin viel dort bewegt. Zum Vergleich: Grabgold verliert laut
bestehender Notiz in `spiel/beute.mjs`/`docs/` rund 17 % — Truhen kommen
messbar zuverlässiger an, ohne dass ich dafür etwas Besonderes eingebaut
hätte.

**Was herauskommt und wie Glück wirkt.** Vier Sorten, gewichtet
(`GRUND_GEWICHT`: gold 35, wissen 20, gegenstand 25, waffe 20 von 100).
Glück verschiebt das Gewicht von Gold zu Fundstück/Waffe (gedeckelt,
Gold bleibt immer möglich, mindestens 8 von dann noch 78). Gemessen in
`werkzeuge/pruefe-truhen.mjs` (400 Öffnungen je Messung, feste Saat,
Glück **bei jeder einzelnen Öffnung neu gesetzt** — siehe Fehler 3
unten): **Glück 0 → 35,0–38 % Gold-Anteil, Glück 200 → rund 10 %.**
Deutlich und reproduzierbar unterschiedlich.

## 3 · Die Anzeige — genau das, was noch fehlt

**Ich habe keine Zeile in `runtime/*` geändert.** Der Zustand ist so
gebaut, dass eine Anzeige ihn nur noch malen muss:

| Feld | wann gesetzt | Bedeutung |
| --- | --- | --- |
| `welt.phase === "truhen"` | `beendeWelle()`, wenn mindestens eine Truhe getragen wurde | die Welt hält für den Öffnen-Moment an |
| `welt.truhenErgebnis` | Array, sonst `null` | eine Zeile je geöffneter Truhe, siehe Feldliste unten |
| `welt.truhenZeit` | Sekunden bis zum automatischen Weiterziehen | zählt in `schritt()` selbst herunter, keine Anzeige-Logik nötig |
| `welt.truhen` | Array `{x, y, vx, vy, hupf}` | Truhen, die **am Boden liegen** (noch nicht aufgehoben) — für das Sprite `truheZu` (`runtime/sprite-daten.js`, 9×7) |
| `spieler.truhen` | Zahl je Spielfigur | wie viele ungeöffnete Truhen diese Figur **gerade trägt** (vor dem Wellenende) |

**`welt.truhenErgebnis`, Feld für Feld** (ein Eintrag je geöffneter
Truhe):

| Feld | Typ | wann gesetzt | Bedeutung |
| --- | --- | --- | --- |
| `spielerId` | Zahl | immer | welche Figur (`welt.spieler[i].id`) die Truhe getragen hat |
| `sorte` | `"gold"` \| `"wissen"` \| `"gegenstand"` \| `"waffe"` | immer | welche Art Fund |
| `name` | Text | immer | Anzeigename, auch bei Gold/Wissen gesetzt (z. B. „Goldhaufen") |
| `text` | Text | immer | ein Satz Flavor |
| `menge` | Zahl | immer | bei `gold`/`wissen`: wie viel; bei `gegenstand`/`waffe`: immer `1` |
| `id` | Text | nur `gegenstand`/`waffe` | Katalogkennung (`spiel/katalog/gegenstaende.mjs`/`waffen.mjs`) — für Symbol/Sprite |
| `selten` | Zahl 0–3 | nur `gegenstand` | Seltenheitsstufe, wie bei Krämer-Angeboten |
| `stufe` | 1 oder 2 | nur `waffe` | Waffenstufe |
| `voll` | `true` | nur wenn eine Waffe wegen vollem Gürtel zu Gold wurde | für einen anderen Anzeigetext als „normales" Gold |

**Was die Anzeige konkret bräuchte** (nicht gebaut, hier nur benannt):

1. In `runtime/start.js` `wendeAn()` einen Zweig `else if (welt.phase === "truhen") { schrittImLauf(welt, eingabenDesTicks); }` — sonst ruft niemand `schritt()` während dieser Phase, und die Welt bleibt für immer stehen (der Fall, den `werkzeuge/pruefe-truhen.mjs` als Rot-Beweis stellt, siehe unten). Kein Spielerknopf nötig, nur der Aufruf selbst.
2. In `bild()` (ebenfalls `runtime/start.js`) einen Zweig neben `welle`/`wahl`/`laden`, sonst fällt „truhen" auf `zeichneEnde(...)` (den Endbildschirm) durch — das wäre sichtbar falsch.
3. Eine neue `zeichneTruhen(ctx, welt)` in `runtime/oberflaeche.js`, die `welt.truhenErgebnis` durchgeht — der zweite Bildrahmen von `DINGE.truheAuf` (Lichtpuls, `runtime/sprite-daten.js`) passt gut zu genau diesem Moment.
4. Für die am Boden liegenden Truhen (`welt.truhen`) ein Aufruf in `runtime/zeichnen.js` neben dem bestehenden Beute-Zeichenpass, mit `DINGE.truheZu`. „Im Dunkeln auffindbar" (Vorgabe aus #75) ist damit nicht von mir gelöst — das ist reine Lichtfrage (Fackel steht in der Mitte) und gehört der Anzeige.

## 4 · Balance vorher/nachher — die gemessene Veränderung

Genau der Fall, den die Aufgabe „unvermeidlich" nennt. Gemessen mit
`node werkzeuge/pruefe-balance.mjs` und den exakten `REIHEN` daraus
(1 Spieler × 10 Läufe, 2 × 6, 4 × 6, feste Saat 1):

| | 1 Spieler | 2 Spieler | 4 Spieler |
| --- | --- | --- | --- |
| **vorher** abgebrochen | 0/10 | 3/6 | 3/6 |
| **nachher** abgebrochen | **1/10** | 2/6 | 3/6 |
| Sperrklinke (`ABBRUCH_SPERRE`) | 0 | 6 | 5 |

**1 Spieler reißt die Sperrklinke** (0 erlaubt, 1 gemessen) — mit einer
ersten Fassung von `TRUHEN_CHANCE_JE_TOD = 0,005` (0,5 %). Am genauen
Lauf nachgesehen: Saat 3909 (der vierte der zehn Testläufe) starb vorher
in Welle 4, danach lief er bis zur Notbremse (Welle 201). Kein
Programmfehler — dieselbe Welt bis zur ersten Truhe ist bitgleich (der
eigene Zufallsstrom verschiebt `welt.zufall` nicht), aber sobald die
Figur durch die Truhe stärker wird, ändert sich ihr Verhalten (mehr
Gold → öfter `wuerfleNeu()` im Laden → **das** verschiebt `welt.zufall`
ab dort für den Rest des Laufs) — genau der Mechanismus aus der
Aufgabenstellung, nur einen Schritt indirekter als „die Truhe würfelt
selbst". Passt außerdem zur bereits dokumentierten Eigenschaft des
endlosen Modus: laut `werkzeuge/pruefe-balance.mjs` sind die Läufe
„zweigipflig" (frühe Tode **oder** sehr lange Läufe, „nichts
dazwischen") — jeder zusätzliche Machtschub kann einen Grenzfall über
diese Kippe schieben.

**Reagiert:** `TRUHEN_CHANCE_JE_TOD` auf **0,0025** (0,25 %) halbiert.
Damit bestehen alle drei Reihen wieder innerhalb der Sperrklinke (Tabelle
oben, „nachher"-Zeile). Das ist eine echte Abwägung, kein Nullen des
Effekts: 2 Spieler sinken von 3/6 auf 2/6 (Truhen helfen dort spürbar),
4 Spieler bleiben bei 3/6. Bei 0,005 (der ersten Fassung) blieben 2 und
4 Spieler ebenfalls innerhalb der Sperrklinke — nur 1 Spieler riss sie.
Ich habe **nicht** versucht, die Regression auf exakt 0 zu drücken, so
lange das noch weitere Tuning-Runden gegen einen einzelnen Kunstspieler-
Lauf bedeutet hätte — das wäre nach `werkzeuge/pruefe-balance.mjs`
eigener Kopfnotiz genau das „Zahlendrehen gegen einen Bot", von dem dort
schon abgeraten wird. `pruefe-balance.mjs` selbst wurde **nicht**
geändert — die Sperrklinke steht unverändert bei 0/6/5, wie gefordert.

## 5 · Rot-Beweise (05.09.2026)

Jede neue Zusicherung in `werkzeuge/pruefe-truhen.mjs` mindestens einmal
absichtlich gebrochen, den Fehlschlag gesehen, zurückgesetzt (`git diff`
vor/nach je leer):

| Eingriff | Meldung |
| --- | --- |
| `pruefeTruhenfall` nutzt `welt.zufall` statt `welt.truhenZufall` | „5000 Truhenfall-Versuche verschieben welt.zufall nicht · 3166426700 gegen 77" (und zwei weitere) |
| Wache am Anfang von `fortschreiteTruhen` entfernt | „nach Ablauf wechselt die Phase zum vorgemerkten Ziel" |
| `zieheKategorie` ignoriert `glueck` (fest auf 0) | „viel Glück senkt den Gold-Anteil klar messbar · 50.7 % gegen 51.2 %" |
| **`schritt()` in `spiel/welt.mjs` behandelt „truhen" nicht mehr** | „…und `schritt()` bringt die Phase von allein weiter · nach 10000 Schritten" **und** „ein echter Lauf endet regulär, auch wenn er durch „truhen" läuft · Endphase truhen nach 72000 Schritten" |

Der letzte Eingriff ist der wichtigste — genau der Fall aus der
Kopfnotiz „STILLE FALLEN" in `spiel/welt.mjs` (neue Phase, die die Runde
hängen lässt, ohne dass etwas rot wird). Mit dem Eingriff blieb die
Welt 72.000 Schritte lang in „truhen" stehen, statt „gewonnen"/
„verloren" zu erreichen — die Prüfung hat das gefangen.

Beim Bauen selbst zwei eigene Fehler gefunden, **beide über den
Rot-Beweis, nicht vorher gesehen**:

1. **`fortschreiteTruhen` ohne Phasenwache.** Ein zweiter Aufruf
   *nachdem* die Phase schon gewechselt hatte, überschrieb `welt.phase`
   mit `null` (`welt.truhenWeiter` war da schon `null`). In `schritt()`
   passiert das nie (die Wache dort lässt „truhen" nur genau einmal pro
   Wechsel durch), aber die Funktion war trotzdem nicht robust gegen
   sich selbst — jetzt mit eigener Wache.
2. **Mein eigener Glück-Test hätte fast nichts gezeigt.** `glueck` wurde
   nur **einmal** vor der Messschleife gesetzt statt in jeder Iteration
   — ein Fundstück wie „Grabkerze" ändert selbst Glück
   (`spiel/katalog/gegenstaende.mjs`), also driftete die
   „ohne Glück"-Messreihe über 400 Öffnungen langsam nach oben und
   glich sich der „mit Glück"-Reihe an (38,0 % gegen 37,0 % statt eines
   klaren Unterschieds). Erst ein Reset in jeder Iteration zeigte den
   wahren Effekt (siehe Abschnitt 2).

## Geprüft

- `node werkzeuge/pruefe-truhen.mjs`: **3943 Prüfungen, 0 Fehler**.
- `node werkzeuge/pruefe-balance.mjs`: **27 Prüfungen, 0 Fehler** (mit
  `TRUHEN_CHANCE_JE_TOD = 0,0025`; siehe Abschnitt 4 für die genauen
  Zahlen davor/danach).
- `node werkzeuge/pruefe-alles.mjs`: alle Prüfungen bestanden, solange
  der Arbeitsbaum sauber ist (`arbeitsweise` verlangt einen
  `CHANGELOG.md`-Eintrag bei offenen Änderungen — die Datei ist für
  diese Aufgabe gesperrt, also **nach jedem Commit** grün, nicht davor;
  mit offenen, unbestätigten Änderungen bewusst rot, wie es soll).
  Ausgabe außerhalb des Projektordners abgelegt.
- Jede neue Prüfung einmal rot gemacht (Abschnitt 5).

## Was ich nicht prüfen konnte

- **Keine echte Anzeige gesehen** — `runtime/*` war gesperrt, also lief
  nichts davon je in einem Browser. Ob `DINGE.truheAuf`/`truheZu` im
  echten Bild neben Boden, Licht und Nebel gut aussehen, kann ich nicht
  beurteilen.
- **Kein zweiter/vierter Spieler von Hand durchgespielt** — nur über den
  Kunstspieler aus `werkzeuge/balance.mjs` gemessen. Ob sich das
  Öffnen zu mehreren richtig anfühlt (alle Ergebnisse auf einmal, ein
  fester Moment für alle), ist ungeprüft.
- **Die 0,25 %-Chance ist eine Abwägung, kein bewiesenes Optimum.** Sie
  hält die bestehende Sperrklinke ein, aber „fühlt sich die Häufigkeit
  richtig an" kann nur ein Mensch beim Spielen beurteilen.
- **Kein Bosswellen-Bezug.** Chance und Inhalt hängen heute nicht davon
  ab, ob ein Hauptmann in der Welle stand — bewusst einfach gehalten,
  nicht gemessen, ob das fehlt.
