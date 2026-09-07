# Fehlerbuch

Die Regel, aus der dieses Buch entstand, im Wortlaut des
Auftraggebers: *„Du solltest dir andauernd alle Fehler notieren und
dokumentieren, um sie nicht zu wiederholen, und dir den Kontext dazu
notieren, um zu verstehen, warum und wieso."*

Dieses Buch ist die Rohdatensammlung: jeder Fehler mit dem Zustand, in
dem er entstand, und der Zahl, die ihn belegt. Die Fälle mit dem Vermerk
*(Startkapital)* stammen aus dem Projekt, in dem die Methode entstand
(ein Spiel mit eigenem Echtzeit-Renderer, 09/2026) — sie
sind übertragbar und haben dort schon einmal Zeit gekostet; dieses
Projekt muss sie nicht noch einmal bezahlen.

## Wie eingetragen wird

**Sofort, wenn der Fehler auffällt** — nicht am Ende der Arbeit, denn
dann fehlt der Kontext, der ihn erklärt. Vier Zeilen genügen:

| Feld | was hineingehört |
| --- | --- |
| **Was ich tat** | die Handlung, nicht die Absicht |
| **Was herauskam** | die Zahl oder Meldung, die stutzig machte |
| **Warum** | die Ursache, nicht das Symptom |
| **Woran ich es früher merke** | die Gegenprobe für das nächste Mal |

Wer einen Fehler einträgt, prüft, ob seine **Klasse** schon existiert.
Ein neuer Fall unter einer bekannten Klasse ist wertvoller als eine neue
Klasse — er zeigt, dass die Regel noch nicht greift.

---

## A · Die falsche Größe messen

Die naheliegende Zahl misst etwas anderes als das, was ein Mensch sieht.

### A1 · Mittelwert über alles, obwohl die Sache 2 % bedeckt *(Startkapital)*

**Was ich tat:** Drei Stellschrauben gemessen, jeweils als mittlere
Änderung über alle 65.536 Bildpunkte.
**Was herauskam:** Alle drei schienen wirkungslos — 0,08 Stufen.
**Warum:** Die Sache lag auf 2,3 % der Fläche; die übrigen 97,7 %
verdünnten jede Zahl um den Faktor vierzig. Wo sie lag, wirkte sie
längst. Derselbe Fehler passierte am selben Tag noch einmal mit einem
anderen Feld (14.400 Zellen, 200 betroffene).
**Woran ich es früher merke:** Vor jeder Mittelung fragen, **worüber**
gemittelt wird. Deckt die Sache weniger als die Hälfte ab, ist der
Mittelwert über alles die falsche Zahl.

### A2 · Eine feste Messsekunde, obwohl das System schwingt *(Startkapital)*

**Was ich tat:** Einen Füllstand „bei Sekunde 28" gemessen, dreimal mit
verschiedenen Schwellen.
**Was herauskam:** 40 %, 62 %, 65 % — dreimal eine Schwelle gesetzt,
dreimal falsch.
**Warum:** Das System ist zeitperiodisch; der Wert pendelt von selbst.
Eine feste Messsekunde erwischt mal Berg, mal Tal.
**Woran ich es früher merke:** Liefert dieselbe Messung bei zwei Läufen
verschiedene Zahlen, ist die Zeitachse Teil des Problems — dann Spitze
oder Mittel über eine ganze Periode nehmen.

### A3 · Eine fremde Zahl heißt „max" und ist ein Perzentil *(Startkapital)*

**Was ich tat:** Doku-Zahlen gegen einen Messbericht geprüft; 130,1
gegen 130,4 sah nach einer Abweichung aus.
**Warum:** Die Spalte hieß „max" und enthielt das 99,9-Perzentil —
Absicht, aber der Name log.
**Woran ich es früher merke:** Bevor eine fremde Zahl als Abweichung
gilt, nachsehen, **wie** sie gerechnet wird.

---

## B · Eine Messung, die gar nichts misst

Der Aufbau ist so gebaut, dass er das Ergebnis nicht zeigen kann.

### B1 · Eine Ersetzung, die nichts ersetzte *(Startkapital)*

**Was ich tat:** Absichtlich einen Fehler eingebaut, um zu prüfen, ob
eine Wache anschlägt. Sie schlug nicht an — ich hielt sie für blind.
**Warum:** Den Suchtext gab es in der Datei gar nicht; die Gegenprobe
hatte nichts geändert.
**Woran ich es früher merke:** Jede Ersetzung prüft vorher, ob ihre
Marke **vorkommt**, und bricht sonst ab:
`if (!s.includes(MARKE)) process.exit(1);`

### B2 · Fünf Messwerte, fünfmal dieselbe Zahl *(Startkapital)*

**Was ich tat:** Eine Konstante in fünf Stufen gepatcht und je gemessen
— im selben Prozess.
**Warum:** `import()` cached; das Modul wurde einmal geladen.
**Woran ich es früher merke:** Jeder gepatchte Wert braucht einen
**frischen Prozess** (`spawnSync`), sonst ist die Messreihe wertlos.

### B3 · Ein Ergebnis, das zu ordentlich ist, um wahr zu sein *(Startkapital)*

**Was ich tat:** Jeden Export gegen den Suchraum gehalten, um tote zu
finden.
**Was herauskam:** **191 von 191** angeblich ohne Leser — auch die
Konstante, die nachweislich ein Dutzend Dateien importiert.
**Warum:** Das Suchmuster war auf dem Weg durch die Shell kaputtgegangen
(`\\b` wurde zum Backspace-Zeichen) und konnte nichts treffen.
**Woran ich es früher merke:** Ein perfektes Ergebnis ist zuerst ein
Verdacht **gegen die Messung**. Jede Inventur trägt eine Gegenprobe mit
einem Namen, dessen Ergebnis bekannt ist — findet sie ihn nicht, bricht
sie ab, statt eine schöne Liste zu drucken.

### B4 · Die Prüfung hält ihre eigene Begründung für den Fehler *(Startkapital)*

**Was ich tat:** Eine Prüfung geschrieben, die verbotene Wörter in der
Doku findet („ist live", „erledigt"), und sie laufen lassen.
**Was herauskam:** Sie meldete ausgerechnet `docs/REGELN.md` — die
Datei, in der steht, dass diese Wörter dort nicht stehen dürfen.
Derselbe Fehler war Wochen vorher schon einmal da: Ein Wächter gegen
zwei Funktionsaufrufe fand sie in dem Kommentar, der erklärt, warum
sie entfernt wurden.
**Warum:** Eine Textsuche unterscheidet nicht zwischen **nennen** und
**behaupten**. Jede Regel, die ein Wort verbietet, muss dieses Wort
aufschreiben, um sich zu erklären.
**Woran ich es früher merke:** Jede Prüfung, die nach Wörtern sucht,
nimmt vorher das Zitierte heraus — Backticks, Anführungszeichen,
Codeblöcke, und bei Quelltext die Kommentare. Faustregel: **Wer eine
Regel maschinell prüft, prüft zuerst, ob die Regel selbst durchfällt.**

**Dritter Vorfall am selben Tag, andere Ausprägung:** Ein Wächter fand
ein Muster in **seiner eigenen Datei** — weil der Kommentar, der den
behobenen Fehlalarm erklärte, den Fehlalarm wörtlich zitierte. Für
Prüfungen, die Muster *suchen* statt Regeln zu prüfen, greift das
Herausnehmen des Zitierten nicht: Dort ist das Muster selbst der
Inhalt. Deshalb gilt dort die umgekehrte Regel — **den Fall
beschreiben, statt ihn hinzuschreiben.** Ein Wächter, der sich selbst
ausnimmt, hätte stattdessen ein Loch, in dem ein echtes Geheimnis
liegen könnte.

**Und ein vierter, eine Ebene tiefer:** Dieselbe Prüfung schlug gegen
ihre eigene **Vorlage** an — das Wort „fertig" stand im Suchmuster,
und „Fertig, wenn:" ist das Abnahmekriterium, das die Vorlage genau
dort verlangt. Eine Bedingung ist keine Behauptung. **Wer ein Wort
verbietet, prüft die eigenen Vorlagen dagegen**, bevor er es
aufnimmt.

---

### B5 · Die Eingabe kam nie an — und die Messung sah aus wie ein Befund

Um den Truhen-Moment im Browser zu sehen, wurde die Figur über
synthetische Tastenereignisse bewegt: `new KeyboardEvent("keydown",
{ key: "d" })`. Sie bewegte sich nicht. Zwei Wellen lang sah es so aus,
als würde die Truhenphase gar nicht ausgelöst — der Schluss lag nahe
und wäre falsch gewesen.

`runtime/eingabe.js` liest `e.code` (`"KeyD"`), nicht `e.key`. Das
Ereignis kam an, trug aber nichts, was die Eingabe kennt:
`tasten.add(undefined)`. Kein Fehler, keine Meldung, keine Bewegung.

**Woran ich es früher merke:** Bevor aus dem Ausbleiben einer Wirkung
ein Befund über das Programm wird, muss die **Ursache** nachgewiesen
sein — hier: bewegt sich die Figur überhaupt? Ein Steuerweg, den man
selbst nachbaut, gehört einmal an einer Sache geprüft, die sichtbar
reagiert, bevor man mit ihm misst.

---

## C · Werkzeugfallen dieser Umgebung (Windows, Git-Bash, Node)

Nichts davon hat mit einem Projekt zu tun — alles davon hat schon Zeit
gekostet. Diese Fälle gelten auf diesem Rechner **immer**.

### C1 · Die Shell frisst Backslashes und Backticks *(Startkapital)*

`node -e "…"` und Bash-Heredocs werten in doppelten Anführungszeichen
aus: `C:\Users\Name\…` kommt als `UsersName…` an, `\\n` wird zu `\n`, ein
Regex mit Backticks trifft nie.
**Woran ich es früher merke:** Alles mit Backslash, Backtick oder Regex
geht als **Datei** ins Scratchpad (mit dem Schreibwerkzeug angelegt),
nie als `-e`-Argument oder Heredoc. Und: Windows-Node versteht den
Git-Bash-Pfad `/c/Users/…` nicht — in Node-Argumenten immer
`C:/Users/…` schreiben.

### C2 · `$1` und `$'` im Ersatztext von `String.replace` *(Startkapital)*

`"$1" + 489` liest JavaScript als Gruppe 14; ein Ersatztext, der `$'`
enthält, fügt **alles nach dem Treffer** ein — eine Datei wuchs so von
6.426 auf 13.020 Zeilen.
**Woran ich es früher merke:** Ein Ersatztext, den ich nicht selbst
kontrolliere, gehört nie als Zeichenkette in `replace` — entweder eine
Funktion als Ersatz oder `slice` und Zusammensetzen. Nach jeder
Ersetzung die Dateigröße ansehen.

### C3 · CRLF gegen LF *(Startkapital)*

Textersetzungen mit `\n`-Suchmustern treffen auf CRLF-Dateien nichts;
in Regexen passt `$` ohne `\r?` davor nie, und `.` trifft kein `\r`.
**Woran ich es früher merke:** Beim Suchen `\r?\n` verwenden oder das
Edit-Werkzeug nehmen. Beim Einfügen die Zeilenenden der Zieldatei
übernehmen.

### C4 · `cat -A` und `grep` zeigen das CR nicht an *(Startkapital)*

Die Textwerkzeuge dieser Git-Bash entfernen das CR, **bevor** sie es
anzeigen. Eine heile CRLF-Datei sah dadurch kaputt aus und wäre beinahe
„repariert" worden; umgekehrt bestand einmal jede Datei eine
CRLF-Prüfung, weil `$'\r'` als leeres Muster ankam.
**Woran ich es früher merke:** Zeilenenden nie mit `grep` oder `cat -A`
beurteilen — `file <datei>` nehmen oder die Bytes zählen. Und
`git show HEAD:datei` liefert den LF-normalisierten Blob, der für
Zeilenenden-Vergleiche unbrauchbar ist.

### C5 · Ein `*/` mitten in einen Kommentarblock gesetzt *(Startkapital)*

Beim Bearbeiten eines langen `/* … */`-Kopfes sieht man den Ausschnitt,
nicht die Klammer darum — ein eingefügtes `*/` machte die Datei zu
ungültigem JavaScript.
**Woran ich es früher merke:** Nach jeder Änderung an einem Dateikopf
`node --check` laufen lassen. Kostet nichts, fängt genau das.

---

### C6 · `git checkout --` holt die eigene, ungespeicherte Arbeit weg

Nach einem Rot-Beweis wurde `spiel/katalog/gegner.mjs` mit
`git checkout -- <datei>` zurückgesetzt. Der Befehl holt den Stand aus
dem Index — und dort lagen meine eigenen, noch nicht committeten
Zuweisungen **nie**. Zwei Gegner standen wieder auf ihrem alten
Verhalten, die Kopfnotiz war die alte, und die Prüfung sagte plötzlich
wieder „2 Fehler", wo eben noch 0 standen.

Derselbe Fall ist im Age-of-Beast-Wiki schon einmal passiert. Er trifft
immer dieselbe Stelle: den Rot-Beweis, weil man dafür absichtlich etwas
kaputt macht und hinterher zurücklegen will.

**Woran ich es früher merke:** Erst committen, dann Rot-Beweise. Wo das
nicht geht, die Datei vorher ins Scratchpad kopieren und von dort
zurücklegen — nicht aus dem Index. Und nach dem Zurücklegen die
Prüfzahl vergleichen: Sie muss wieder die von vorher sein.

---

## D · Die eigene Erwartung ist falsch, nicht der Code

### D1 · Das Fließgleichgewicht *(Startkapital)*

Ein Wert kehrte nach einer Störung nicht auf 100 % zurück, sondern blieb
bei 62 % — zwei Schwellen wurden gesetzt, beide falsch. 62 % **war** das
Gleichgewicht des Systems; es gab keinen Fehler.
**Woran ich es früher merke:** Bevor eine Zahl als Fehler gilt, fragen,
ob das System sie so **haben muss** — und gegen das im selben Lauf
gemessene Gleichgewicht prüfen, nicht gegen eine geratene Zahl.

### D2 · Die frisch geschriebene rote Prüfung *(Startkapital)*

Drei neue Prüfungen an einem Tag waren beim ersten Lauf rot — alle drei
Male war die Erwartung falsch, nicht der Code.
**Woran ich es früher merke:** Wenn eine frische Prüfung sofort rot ist,
ist die Erwartung der wahrscheinlichere Fehler.

---

## E · Was in keiner Prüfung läuft, geht still kaputt

### E1 · Das Werkzeug außerhalb der Kette *(Startkapital)*

Ein Bauwerkzeug, dessen Ergebnis Menschen benutzten, lief in **null**
Prüfungen mit. Vier Defekte sammelten sich an; der sichtbarste: ein
Knopf tat nichts, ohne jede Fehlermeldung.
**Woran ich es früher merke:** Jedes Werkzeug, dessen Ergebnis jemand
benutzt, gehört in die Prüfkette — und jede Ersetzung prüft ihr
Ergebnis, bevor sie schreibt.

### E2 · Eine Zahl, die neben der Wahrheit steht *(Startkapital)*

`const ARTEN = 3;` stand neben der Liste mit den drei Einträgen. Zwei
Zahlen für dieselbe Sache gehen gut, bis jemand eine ändert — dieselbe
Falle steckt in jeder Prosazahl („zwölf Bytes", „20 Prüfungen"), die
eine Konstante wiederholt.
**Woran ich es früher merke:** Eine Zahl, die aus einer Liste folgt,
**wird berechnet** oder verweist auf die eine Stelle, die sie führt.

---

### E3 · Eine Prüfung, die hängt statt rot zu werden

`werkzeuge/pruefe-netz.mjs` räumte die Kartenwahl mit

```js
while (s.offeneWahlen > 0 && s.karten?.length) nimmKarte(welt, s, 0);
```

ab — abgeschrieben aus `werkzeuge/balance.mjs`, wo dieselbe Schleife
seit jeher `schutz++ < 40` trägt. **Der Zähler ging beim Übernehmen
verloren.**

Die Schleife endet nur, wenn `nimmKarte()` die Wahl auch wirklich
abräumt. Beim Rot-Beweis eines anderen Wächters tat sie das nicht — und
der Prozess lief **297 Minuten mit 17.791 Sekunden Rechenzeit** auf
einem Kern weiter. Niemand merkte es: Ein hängender Prozess meldet
nichts, die Kette war grün (sie startet ihre Läufe einzeln), und in der
Aufgabenliste stand nur „vor 5 h gestartet". Aufgefallen ist es dem
Auftraggeber, weil die Anzeige eine Laufzeit von 300 Minuten zeigte.

Der Agent, der die Schleife gebaut hat, hatte den Fall sogar gemeldet —
„mit abgeschaltetem Wächter lief eine Schleife im Prüfstand endlos statt
rot zu werden" — und ihn als danebengegangenen Rot-Beweis abgehakt,
statt ihn zu beheben und den Prozess zu beenden.

**Woran ich es früher merke:** Jede `while`-Schleife, deren Ende an
einem **Rückgabewert** oder an fremdem Zustand hängt statt an einer
Laufvariablen, die sich im Rumpf garantiert ändert, bekommt einen
Zähler — und der Zähler **meldet**, statt still abzubrechen. Eine
Prüfung, die hängt, ist schlimmer als eine, die fehlschlägt: Die eine
sieht aus wie Arbeit, die andere wie ein Fehler.

Der Beleg ist die Dauer, nicht die Meldung: Derselbe Zustand, der vorher
297 Minuten lief, wird jetzt in **unter einer Sekunde** rot.

---

### E4 · Eine Prüfung, deren Stichprobe zu klein für ihre Behauptung ist

`werkzeuge/pruefe-balance.mjs` lief auf 10, 6 und 6 Läufen und schrieb
dazu „allein endet jeder Lauf", abgesichert durch `ABBRUCH_SPERRE[1] =
0`. Über 120 Läufe gemessen endete zur selben Zeit **jeder fünfte
Alleinlauf nicht** (26 von 120, 21,7 %). Die Prüfung war jahrelang grün
und hat nie gemessen, was sie behauptet.

Aufgefallen ist es an einem Widerspruch: Eine Änderung senkte die
Abbrüche über 120 Läufe von 26 auf 16 — **und machte die Prüfung rot**
(0 → 1 bei zehn Saaten). Ein Wächter, dessen Urteil bei einer echten
Verbesserung umkippt, misst Rauschen.

**Woran ich es früher merke:** Wo eine Prüfung über einen **Anteil**
urteilt (Siegquote, Abbruchquote, Todeshäufung), muss die Stichprobe
zur Aussage passen. Faustregel aus diesem Fall: Bei zehn Läufen ist
alles unter 20 % nicht von null zu unterscheiden. Und: Eine Prüfung,
die eine absolute Aussage macht („jeder", „nie", „immer"), muss sie
mit ihrer eigenen Stichprobe belegen können — sonst gehört die Aussage
abgeschwächt, nicht die Stichprobe geglaubt.

---

### E5 · Ein Versprechen, das nie auflöst, verschluckt alles danach

`runtime/vollbild.js` sollte zwei Dinge tun — ins Vollbild gehen und
das Querformat festnageln —, und tat beides in der einzig möglichen
Reihenfolge, weil `screen.orientation.lock` **nur im Vollbild** erlaubt
ist:

```js
try { await document.documentElement.requestFullscreen(...); } catch { }
try { await screen.orientation.lock("landscape"); } catch { }
```

Sieht richtig aus, und beide Aufrufe sind einzeln abgesichert. Der
Fehler steckt nicht im `catch`, sondern im `await`: **Ein Versprechen,
das weder erfüllt noch abgelehnt wird, löst keinen `catch` aus — es
hält die Funktion einfach an.** Die zweite Zeile lief nie.

Gemessen am 05.09.2026 im Browser:

| `requestFullscreen()` | Ausgang |
| --- | --- |
| ohne Nutzergeste | abgelehnt nach **0 ms** |
| **mit** Nutzergeste, von einer Richtlinie gesperrt | **hängt** — 2.503 ms ohne Ergebnis |

Damit fiel die halbe Ansage des Auftraggebers still aus: Das Vollbild
kam nicht, und quer war es auch nicht. Keine Fehlermeldung, keine
Konsolenzeile, keine rote Prüfung.

**Woran es beinahe nicht aufgefallen wäre:** Beim direkten Aufruf aus
der Konsole kamen **beide** Aufrufe an, beim echten Knopfdruck nur
einer. Ich hätte den Unterschied für eine Eigenheit des Messwerkzeugs
halten können. Er war der Befund.

**Woran ich es früher merke:** Ein `await` auf eine fremde Zusage ist
eine Wette darauf, dass sie überhaupt beantwortet wird. Wo danach noch
etwas Wichtiges steht, gehört ein Zeitlimit davor
(`Promise.race([zusage, frist])`) — und wo die Zusage später doch
eintrifft, ein Horcher, der das Versäumte nachholt
(`fullscreenchange`). Das gilt für jede Browser-API, die auf eine
Nutzerentscheidung oder eine Richtlinie warten kann: Vollbild,
Berechtigungen, Zwischenablage, Geräte.

**Und für die Prüfung dieselbe Regel, eine Ebene höher:** Der erste
Rot-Beweis ließ `pruefe-app.mjs` mitsamt der Kette hängen — Node brach
mit „unsettled top-level await" ab (Code 13) statt zu melden, was
fehlt. Ein Wächter, der genau bei dem Fehler hängt, den er sucht, ist
ein halber Wächter. Mit eigenem Zeitlimit meldet er jetzt in unter
einer Sekunde: **„lock wurde nie gerufen"**.

---

### E6 · Der Nachbarschaftsindex reicht denselben Nachbarn zweimal durch

`spiel/gitter.mjs` schlüsselt seine Zellen mit
`cx * 73856093 ^ cy * 19349663` und prüft die Zelle danach **nicht**
nach. Zwei verschiedene Zellen können sich damit eine Liste teilen, und
`umkreis()` reicht deren Inhalt beim Absuchen eines Kreises zweimal
durch.

Gemessen am 06.09.2026 auf einem Ring aus 24 Gegnern: Die Pechfackel
(drei Ziele) verbrauchte alle drei, aber nur **zwei** Gegner nahmen
Schaden — einer bekam ihn doppelt. Kein Absturz, keine Fehlermeldung;
im Spiel sieht das aus wie ein Gegner, der „zufällig" schneller
stirbt, während ein anderer stehenbleibt.

Der Unterschied zu den Geschossen, die dasselbe Raster benutzen und
seit jeher heil sind: Die prüfen `getroffen.has(g)` **im
Rückruf** und tragen sofort ein. Wer stattdessen erst eine Liste
sammelt, sortiert und danach austeilt, hat die Dublette schon in der
Liste.

**Woran ich es früher merke:** Jede Rasterabfrage darf mehr liefern,
als im Kreis liegt — das steht im Kommentar der Datei. Was dort nicht
steht: Sie darf auch **dasselbe** zweimal liefern. Wer aus `umkreis()`
sammelt, dedupliziert; wer direkt austeilt, trägt vor dem Austeilen
ein. Zweiter Fallstrick derselben Familie: Die Abfrage muss den
**Körperradius** des Gesuchten mitrechnen. `umkreis(x, y, r)` mit einer
Trefferprüfung auf `r + g.radius` findet die dicken Gegner am äußeren
Rand nur zufällig — je nach Zellgröße.

---

### E7 · Der Rand fällt aus seinem eigenen Bereich

Ein Kreisausschnitt prüft mit `kosinus >= Math.cos(bogen / 2)`, ob eine
Richtung dazugehört. Die äußersten gezeichneten Klingen liegen
konstruktionsbedingt **auf** genau diesem Rand — nur entsteht ihr
Richtungsvektor über zwei Multiplikationen und eine Addition, die
Grenze dagegen über einen direkten `Math.cos`. Beide Wege enden ein
paar Bitstellen auseinander.

Ergebnis am 06.09.2026: Bei Sense und Richtschwert lagen je zwei von
acht bzw. fünf Klingen „außerhalb" ihres eigenen Ausschnitts. Die
Prüfung hat es gefunden, das Auge hätte es nie gesehen.

**Woran ich es früher merke:** Überall, wo eine Grenze auf **beiden**
Seiten aus verschiedenen Rechenwegen entsteht und der Gleichstand der
Normalfall ist (Ränder, Anschläge, exakte Vielfache), gehört eine
ausdrückliche, benannte Toleranz hin — nicht ein `>=` und die Hoffnung.
Und die Toleranz braucht eine Begründung in ihrer eigenen Einheit:
„1e-9 im Kosinus sind bei diesen Winkeln rund ein Milliardstel
Bogenmaß" ist eine, „ein bisschen Luft" nicht.

---

### E8 · Was zwischen zwei Wellen wartet, verfällt nicht

Zwischen zwei Wellen läuft **kein** Schritt: `starteWelle()` setzt die
Welt neu auf, aber niemand zählt Uhren herunter. Alles, was beim
Wellenende noch lief, wartet und läuft in der nächsten Welle weiter.

`starteWelle()` leerte Gegner, Geschosse, Beute, Truhen, Funken und
Zahlen — die laufenden Nahkampfschwünge (`spiel/schwung.mjs`) fehlten
in der Liste. Ein Schwung, der im letzten Bild einer Welle begann,
eröffnete damit die nächste: in einer Richtung, in der der Gegner von
vorhin stand, mit dem Schaden von **vor** dem Aufstieg.

Über 600 gemessene Läufe ändert die Aufräumzeile keinen einzigen Wert —
der Fall ist selten. Falsch war er trotzdem.

**Woran ich es früher merke:** Wer dem Spielerzustand ein Feld
hinzufügt, das eine **Uhr** trägt (Restzeit, Fortschritt, Abklingen),
sucht `starteWelle()` auf und fragt: Gehört das hier in die
Aufräumliste? Die Liste ist die vollständige Antwort auf „was überlebt
eine Wellenpause" — und sie ist nur so vollständig wie ihr letzter
Eintrag.

---

## F · Zu viel Kontext in einer Sitzung

### F1 · Zwei Besitzer für dieselbe Datei *(Startkapital)*

Einem Agenten wurden zwei Dateien zugewiesen — und zwanzig Minuten
später selbst angefasst. Deshalb gibt es `WORKCLAIM.md`.
**Woran ich es früher merke:** Der Schnitt wird aufgeschrieben, bevor
der erste Agent läuft — und gelesen, bevor ich selbst etwas anfasse.

### F2 · Eine Zahl aus dem Gedächtnis *(Startkapital)*

In einen Agentenauftrag wurde „die letzte Nummer ist 106" geschrieben.
Es war 107. In einer anderen Sitzung wurde ein Werkzeugname genannt,
den es nie gab.
**Woran ich es früher merke:** In einen Auftrag gehört keine Zahl und
kein Dateiname aus dem Gedächtnis — entweder nachzählen oder den
Agenten zählen lassen.

---

### F3 · Zwei Agenten ohne Worktree im selben Checkout

Vier Agenten wurden mit angeforderter Worktree-Isolation gestartet, in
**zwei Doppelaufrufen**. Die zwei aus dem ersten Aufruf bekamen **keinen**
Worktree und arbeiteten im Hauptcheckout — zusammen mit dem Leitstand,
der dort gleichzeitig einen Doku-Zweig anlegte.

Die Folge steht unzweideutig im Reflog:

```
HEAD@{4} checkout: moving from regeln/kartenhand to katalog/monster-und-hauptleute
HEAD@{3} checkout: moving from katalog/monster-und-hauptleute to regeln/truhen
HEAD@{2} checkout: moving from regeln/truhen to doku/workclaim-runde2
HEAD@{1} commit: Karten: eine Karte ist ein Katalogeintrag (#66)
```

Drei Beteiligte zogen einander den Zweig unter den Füßen weg. Der
Kartenhand-Agent committete seine 1.215 Zeilen auf den **Doku-Zweig des
Leitstands**, ohne es zu merken.

**Wahrscheinliche Ursache:** Kurz zuvor wurde `.claude/worktrees/` per
`rm -rf` geräumt, während ein Worktree noch `locked` war. Danach legten
zwei gleichzeitige Anforderungen im selben Moment an — und zwei davon
gingen leer aus, ohne Fehlermeldung.

**Was dabei zusätzlich schiefging:** Ein Agent maß in diesem vermischten
Baum `pruefe-balance.mjs` und meldete vier Fehler als *vorbestehenden
Zustand*. Sie waren ein Artefakt der halbfertigen Dateien dreier
Sitzungen; im sauberen Worktree war die Kette grün. **Eine Messung in
einem Baum, den mehrere gleichzeitig beschreiben, misst nichts.**

**Woran ich es früher merke:** Ein Agent, der isoliert arbeiten soll,
prüft das **selbst und als Erstes**:

```
git rev-parse --git-dir
```

Im Hauptcheckout gibt das `.git`, in einem Worktree einen Pfad unter
`.git/worktrees/<name>`. Steht dort `.git`, hält er an, statt zu
arbeiten — genau das hat der Monster-Agent von sich aus getan und damit
den Schaden begrenzt. Dazu: Agenten mit Worktree-Isolation **nicht
mehrere im selben Aufruf** starten, und der Leitstand fasst den
Hauptcheckout nicht an, solange welche laufen.

---

### F4 · Zwei Messskripte, die dieselbe Quelldatei verstellen

Um `SALVEN_AUFSCHLAG` zu bestimmen, schrieben zwei Messskripte
nacheinander verschiedene Werte in `spiel/salven.mjs`, ließen je einen
eigenen Node-Prozess laufen (wegen des Modulcaches, Fall B2) und
stellten die Datei im `finally` wieder her. Jedes für sich richtig
gebaut.

**Beide liefen gleichzeitig.** Das zweite hatte sich beim Start das
„Original" gemerkt — den Stand von *vor* meiner Arbeit. Als es Minuten
später fertig wurde, schrieb es genau diesen Stand zurück und
**löschte damit eine fertige, geprüfte Änderung** (die Aufschlagtabelle
je Salvenform), die inzwischen entstanden war.

Aufgefallen ist es an einer Fehlermeldung, die zuerst wie ein Tippfehler
aussah: `does not provide an export named 'AUFSCHLAG_JE_FORM'` — obwohl
die Prüfung wenige Minuten zuvor genau damit grün gelaufen war. Der
Blick in die Datei zeigte den alten Inhalt.

Verschärfend: Ich hatte den zweiten Job für tot gehalten, weil seine
Ausgabedatei nur die Kopfzeile enthielt und `Get-CimInstance` ihn nicht
zeigte — ich hatte nach dem falschen Muster gefiltert. **Ein Job, den
man nicht findet, ist nicht beendet.**

**Woran ich es früher merke:** Ein Messskript, das die Quelle ändert,
ist ein Schreiber wie jeder andere und gehört unter dieselbe Regel wie
zwei Agenten in einer Datei (F1). Drei Konsequenzen:

1. **Nie zwei davon gleichzeitig**, und nie eines nebenher, während an
   derselben Datei gearbeitet wird.
2. Besser: auf einer **Kopie** in einem eigenen Ordner messen, statt am
   Arbeitsstand. Dann kann kein `finally` etwas kaputt machen.
3. Vor dem Weiterarbeiten prüfen, ob der Job wirklich weg ist — und
   zwar am Prozess, nicht an seiner Ausgabedatei. Ein Hintergrundjob,
   dessen Wrapper beendet ist, läuft weiter.

Der Rettungsanker war, dass die Änderung klein und ihr Wortlaut noch im
Sitzungsverlauf stand. Wäre sie eine Stunde Arbeit gewesen, wäre sie
weg gewesen — es gab keinen Commit. **Committen, bevor ein Messlauf
startet, der schreibt.**

---

## Was daraus folgt

Die drei wirksamsten Gewohnheiten aus diesen Fällen:

1. **Vor jeder Mittelung fragen, worüber gemittelt wird.** (Klasse A)
2. **Jede Ersetzung prüft vorher, ob ihre Marke vorkommt.** (Klasse B, C)
3. **Eine rote frische Prüfung ist zuerst ein Verdacht gegen die
   Erwartung**, nicht gegen den Code. (Klasse D)
