# Rückmeldung: Monster und Hauptleute

Laufender Fortschrittsbericht des Zweigs `katalog/monster-und-hauptleute`.
Wird nach jedem Baustein ergänzt — Pflicht, damit bei einem Abbruch
nichts verloren geht.

## 0 · Vorgefunden (#71, bereits erledigt)

`spiel/gegner-verhalten.mjs` (213 Zeilen) und der Anschluss in
`spiel/bewegung.mjs` waren beim Start dieser Sitzung bereits fertig und
committet (`353f341`). Geprüft und für stimmig befunden: sechs
Verhalten (`laeuft`, `schwankt`, `speit`, `kreist`, `sammelt`, `stur`),
jedes mit einer eigenen Frage, Zustand liegt auf dem Gegner selbst
(`g.sammelModus`, `g.sturUhr` …), gewürfelt wird ausschließlich über
`ctx.zufall`. Keine Änderung nötig — siehe Abschnitt 4 für den
mechanischen Nachweis, dass alle sechs wirklich funktionieren.

## 1 · Widerstände (#72, erledigt)

Neues Feld `widerstaende: { schnitt, wucht, feuer, frost, fluch }` in
`spiel/katalog/gegner.mjs`, Prozent, auch negativ (Verwundbarkeit).
`spiel/kampf.mjs` und `spiel/werte.mjs` lasen das Feld bereits (`git
grep widerstaende` zeigte `berechneSchaden()` und den Aufruf in
`kampf.mjs:170` — beide unangetastet, wie vorgeschrieben); es fehlte
nur der Katalogeintrag.

**Vier Arten tragen jetzt Widerstände, gemessen mit derselben
`berechneSchaden()`, 20 Grundschaden, keine anderen Werte:**

| Art | Widerstand | 20 Grundschaden wird zu | Widerstand | wird zu |
| --- | --- | ---: | --- | ---: |
| Knochenritter | Schnitt 55 % | **9,0** | Fluch −20 % | **24,0** |
| Wächter | Wucht 35 % | **13,0** | Frost −15 % | **23,0** |
| Gebeinfürst | Schnitt 65 % | **7,0** | Fluch −25 % | **25,0** |
| Vielfraß | Wucht 45 % | **11,0** | Feuer −25 % | **25,0** |

**Der Knochenritter ist Janniks Beispiel** — Klingen gleiten von der
Rüstung ab (55 % weniger Schaden), aber Fluch geht an der Rüstung
vorbei und trifft ihn deutlich härter (20 % mehr). Der Faktor zwischen
Schnitt- und Fluchschaden ist **2,67×** — wer nur Schnittwaffen führt,
braucht gegen ihn eine zweite Waffenart, sonst zieht sich der Kampf.
Der Gegenzug existiert wirklich (`fluch < 0` ist mechanisch geprüft,
nicht nur behauptet, siehe Abschnitt 4).

**Die anderen drei sind eigene Ergänzungen, nicht im Auftrag genannt**:
Wächter als Steinfigur (hart gegen Wucht, brüchig gegen Frost) gibt dem
Feld eine zweite, unabhängige Verwendung außerhalb der Hauptleute, und
Gebeinfürst/Vielfraß bekommen ihre Widerstände als Teil ihrer eigenen
Identität (Abschnitt 2) statt bloß größerer Zahlen.

## 2 · Zwei Hauptleute mit eigenem Auftritt (#73, erledigt)

**Katalog** (`spiel/katalog/gegner.mjs`): `gebeinfuerst` (Steigerung
des Knochenritters, Nahkampf) und `vielfrass` (Steigerung des Speiers,
Fernkampf) als `elite: true`, mit den bereits fertig gezeichneten
Sprites aus `runtime/sprite-daten.js` (nicht angefasst, wie
vorgeschrieben).

| | Knochenritter → Gebeinfürst | Speier → Vielfraß |
| --- | --- | --- |
| Leben | 120 → **420** | 22 → **300** |
| Schaden | 13 → **18** | 7 → **12** |
| Radius | 8 → **14** | 6 → **13** |
| Verhalten | laeuft → laeuft (dieselbe Familie) | speit → speit, aber Abklingzeit 2,2 s → **1,3 s** |

**Warum keines der beiden `kreist`, `sammelt` oder `stur` bekam** —
siehe die harte Grenze in Abschnitt 5.

**Wellen** (`spiel/katalog/wellen.mjs`): Ein zweiter Hauptmann statt
eines zweiten `hauptmann`. Neu `ZWEITER_HAUPTMANN = ["gebeinfuerst",
"vielfrass"]` und `elitewellenIndex()`. Die **allererste** Bosswelle
(Welle 4) bleibt beim Hauptmann allein — sie ist die Einführung. **Ab
der zweiten** (Welle 8, 12, 16 …) kommt abwechselnd ein zweiter dazu,
`hauptmann` bleibt dabei immer erhalten:

```
Welle  4: hauptmann@7.5
Welle  8: hauptmann@7.5, gebeinfuerst@16.5
Welle 12: hauptmann@7.5, vielfrass@16.5
Welle 16: hauptmann@7.5, gebeinfuerst@16.5
Welle 20: hauptmann@7.5, vielfrass@16.5
```

Die Auswahl **würfelt nicht** — sie folgt der Wellenzahl selbst
(`elitewellenIndex(welle) % 2`), dieselbe Regel wie bei `schwankt` in
`spiel/gegner-verhalten.mjs`: eine zusätzliche Ziehung im Kern würde
jede spätere im ganzen Lauf verschieben. `pruefe-kern.mjs` (Rot-Beweis
nicht extra nötig, unverändert grün) hält das ohnehin fest.

**Warum nicht schon Welle 4:** Zwei Bosse gleichzeitig, bevor der
Spieler den ersten kennt, wäre nichts zu lernen, nur zu sterben.

## 3 · Der gemessene Balance-Unterschied (Sperrklinke nicht verletzt)

`pruefe-balance.mjs` verlangt: `ABBRUCH_SPERRE` darf sinken, nie
steigen. **Beide Zahlen sind gesunken.** Gemessen mit derselben
Methode wie die Prüfung selbst (`messreihe`, Saat 1, 10/6/6 Läufe,
eigener Worktree — die frühere Meldung „schon vorher rot" war ein
Artefakt eines fremden, gleichzeitig bearbeiteten Baums, siehe unten):

| | 1 Spieler | 2 Spieler | 4 Spieler |
| --- | --- | --- | --- |
| **vorher** welleMittel | 6,10 | 104,17 | 103,33 |
| **nachher** welleMittel | 5,90 | **71,67** | **71,33** |
| **vorher** welleMedian | 6 | 201 | 201 |
| **nachher** welleMedian | 6 | **8** | **8** |
| **vorher** abgebrochen (Sperre) | 0 (≤0) | 3 (≤6) | 3 (≤5) |
| **nachher** abgebrochen (Sperre) | 0 (≤0) | **2** (≤6) | **2** (≤5) |

**Was die Zahl bedeutet:** Vorher lief ein Koop-Lauf ohne den zweiten
Hauptmann praktisch endlos, bis der Kunstspieler ihn perfekt auswich
(Median-Welle 201, an der Notbremse) — genau das Loch, das
`docs/ROADMAP.md`/`pruefe-balance.mjs` als „wer sauber ausweicht, ist
unsterblich" beschreiben. Mit dem zweiten Hauptmann stirbt die Hälfte
der Koop-Läufe jetzt um **Welle 8** — die zweite Bosswelle, an der er
zum ersten Mal auftritt. Das war nicht beauftragt und nicht das Ziel
dieser Aufgabe, aber es ist ein direkter, gemessener Nebeneffekt: der
zweite Hauptmann macht die Bosswellen genau in der Weise „anders und
schwerer", die die Notbremse seltener nötig macht.

Alle übrigen Prüfungen aus `pruefe-balance.mjs` bleiben unverändert
grün: niemand stirbt in Welle 1/2, `welleMittel ≥ 5`, keine Wand in
einer einzelnen Welle, Koop nicht schwerer als allein.

**Zur „schon vorher rot"-Meldung aus dem Auftrag:** Bestätigt — im
eigenen, sauberen Worktree war `pruefe-balance.mjs` von Anfang an grün
(`node werkzeuge/pruefe-alles.mjs` vor jeder eigenen Änderung: 133
Prüfungen, 0 Fehler). Die widersprüchliche frühere Meldung kam aus
einem Baum mit drei gleichzeitig bearbeiteten Agenten-Ständen — genau
der Fall, für den `.claude/worktrees/` existiert.

## 4 · `werkzeuge/pruefe-gegner.mjs` (neu, #71–#73)

83 Prüfungen, 0 Fehler. Genau die Zusage aus dem Kopf von
`gegner-verhalten.mjs`: „keine zwei Einträge mit derselben Frage,
keiner ohne Benutzer im Katalog" — der erste Teil ist erzwungen, der
zweite Teil ist **maschinell belegt als bekannte, benannte Lücke**
(Abschnitt 6 der Prüfung), nicht stillschweigend liegen gelassen.

Was geprüft wird:

1. Jede in `GEGNER` benutzte `verhalten`-Kennung existiert wirklich in
   `VERHALTEN_NACH_ID` — der Fall aus dem Kopf von `pruefe-katalog.mjs`
   („ein Tippfehler macht keine Fehlermeldung"), nur für `verhalten`
   statt für Waffenmerkmale.
2. Alle sechs Verhalten werden **wirklich aufgerufen** — über 90
   Bilder, damit die zustandsbehafteten (`sammelt`, `stur`) beide
   Zweige durchlaufen — und liefern jedes Mal einen Einheitsvektor oder
   bewussten Stillstand, nie `NaN`, nie einen krummen Vektor.
3. Der dokumentierte Rückfall bei unbekannter Kennung (geradeaus statt
   erstarrt).
4. `widerstaende`: nur echte Schadensart-Schlüssel, Zahlen in einem
   plausiblen Bereich (−100…100).
5. Der Knochenritter ist gegen Schnitt deutlich zäher (≥ 40 %) **und**
   gegen Fluch verwundbar — beide Seiten der Abwägung, nicht nur die
   Resistenz.
6. Derselbe Grundschaden gegen den Knochenritter: Fluch muss deutlich
   mehr wehtun als Schnitt (Faktor > 1,5×) — der „gemessene
   Unterschied" aus der Aufgabenstellung, jetzt auch als Wächter statt
   nur als Zahl im Bericht.
7. Gebeinfürst/Vielfraß sind echte Steigerungen (mehr Leben **und**
   mehr Schaden als ihr Basiswesen), tragen `elite: true`, haben ein
   Bild in `GEGNER_BILDER`, unterscheiden sich in Statur oder
   Kampfweise voneinander.
8. Die Bosswellen-Rotation: Hauptmann bleibt immer dabei, die erste
   Bosswelle bleibt allein, ab der zweiten wechseln sich beide neuen
   Hauptleute über mehrere Bosswellen wirklich ab, niemand erscheint
   nach Wellenende, `elitewellenIndex` ist an jeder Bosswelle
   ganzzahlig.
9. Die bekannte Lücke aus Abschnitt 5 ist **genau** drei Kennungen groß
   (`kreist`, `sammelt`, `stur`) — nicht mehr, nicht weniger. Wüchse
   sie (ein viertes Verhalten fiele aus dem Katalog), schlägt das an.

**Fünf Rot-Beweise, jeder mit `cp`-Sicherung vor dem Eingriff und
byteweisem Diff danach zum Beleg der Rückholung:**

| Eingriff | Meldung |
| --- | --- |
| `schlurfer.verhalten` auf `"lauft"` getippt (fehlendes e) | `FEHLER schlurfer: Verhalten "lauft" existiert in gegner-verhalten.mjs` |
| `knochenritter.widerstaende` Schlüssel `"schitt"` statt `"schnitt"` | 3 Folgefehler: der Schlüssel selbst, „deutlich zäher" (0 %) und der Fluch-Vergleich (24,0 nicht > 30,0) |
| zweiter Hauptmann schon ab der ersten Bosswelle (`eliteIndex >= 1`, dazu die Vorzeichenfalle von `-1 % 2` in JavaScript selbst entdeckt und korrigiert) | `FEHLER die allererste Bosswelle bleibt bei ihm allein` |
| `ZWEITER_HAUPTMANN` auf zweimal denselben gesetzt | `FEHLER beide Hauptleute kommen über mehrere Bosswellen wirklich dran` |
| `gebeinfuerst.leben` auf 50 gesenkt (unter den Knochenritter) | `FEHLER der Gebeinfürst ist wirklich eine Steigerung des Knochenritters · Leben 120 → 50` |

Ein sechster Eingriff (Hauptmann-Push ganz entfernt) zeigte zusätzlich,
dass **`pruefe-katalog.mjs`** (unverändert, außerhalb dieser Aufgabe)
denselben Fehler unabhängig fängt — beide Prüfungen sichern sich
gegenseitig ab, ohne dass ich diese Datei anfassen musste.

## 5 · Die harte Grenze, die diese Sitzung nicht auflösen konnte

`werkzeuge/pruefe-katalog.mjs` (nicht in meinem Dateibereich, nicht
angefasst) hält `verhalten` an genau drei Kennungen fest:

```js
melde(["laeuft", "schwankt", "speit"].includes(g.verhalten), …);
```

Das ist der Grund, warum keiner der beiden neuen Hauptleute `kreist`,
`sammelt` oder `stur` bekam, obwohl beide Verhalten (belegt in
Abschnitt 4.2) einwandfrei funktionieren und thematisch gepasst hätten
— ein kreisender Vielfraß, der nie in Reichweite geht, oder ein
`sammelt`-Gebeinfürst mit Ladeausbruch wären naheliegend gewesen. Die
Alternative — die drei Kennungen dort ergänzen — hätte eine Datei
außerhalb des mir zugewiesenen Bereichs geändert; nach den Regeln
dieser Aufgabe war das die falsche Wahl, auch wenn es fachlich der
naheliegende nächste Schritt wäre.

**Das ist eine offene Übergabe, keine vergessene Zeile** — belegt statt
nur behauptet: `pruefe-gegner.mjs` Abschnitt 6 prüft mechanisch, dass
genau diese drei und keine andere Kennung ohne Katalog-Benutzer ist.
Wer als Nächstes an `pruefe-katalog.mjs` arbeitet, muss dort nur die
Liste auf sechs Einträge erweitern — der Rest (Katalogeinträge,
Prüfung) steht schon bereit.

## 6 · `node werkzeuge/pruefe-alles.mjs`

Grün, mit einer Besonderheit: **`pruefe-arbeitsweise.mjs` (Regel 4)
verlangt einen `CHANGELOG.md`-Eintrag zu jeder offenen Änderung** —
`CHANGELOG.md` steht aber ausdrücklich auf meiner Verboten-Liste. Die
Prüfung läuft nur gegen den **unbereinigten Arbeitsbaum** (`git status
--porcelain`), nicht gegen Commits: Nach jedem Commit dieser Sitzung
ist der Baum sauber und die Prüfung damit wieder grün, ganz ohne
`CHANGELOG.md` anzufassen. Wird direkt nach dieser Rückmeldung erneut
mit sauberem Baum belegt.

## 7 · Was nicht geprüft werden konnte

- **Kein Blick im Browser.** Ob Gebeinfürst und Vielfraß im Spiel so
  wirken, wie die Sprite-Beschreibung verspricht (23×21 gegen 21×19,
  „auch als reine Silhouette nicht verwechselbar"), habe ich nicht
  gesehen — nur die Katalog- und Regelkern-Seite geprüft.
- **Kein echter Mensch am Steuer.** Alle Balancezahlen kommen vom
  Kunstspieler aus `werkzeuge/balance.mjs` — er weicht besser aus als
  ein Mensch. Dass Welle 8 jetzt öfter das Ende ist, sagt nichts
  darüber, wie sich das für Jannik oder seine Freunde anfühlt.
- **`kreist`/`sammelt`/`stur` bleiben ungenutzt** — siehe Abschnitt 5,
  keine Entscheidung, die in diesem Dateibereich zu treffen war.
- **Kein Blick auf `docs/ROADMAP.md` oder `CHANGELOG.md`** — beide
  stehen auf der Verboten-Liste; ob #72/#73 dort als erledigt markiert
  gehören, ist Sache des Leitstands.
