# Regeln

Diese Regeln gelten ausnahmslos — in jedem Alpha-Code-Projekt gleich.
Die mechanisch prüfbaren laufen in `werkzeuge/pruefe-alles.mjs` mit.
Regel 9 bis 12 kamen später dazu — aus dem Nachrüsten einer
gewachsenen Webapp im Wirkbetrieb (02.09.2026). Regel 13 bis 15 aus
einem Regelsatz, der sich in einem Projekt mit zwei Agenten und echten
Nutzern bewährt hat (04.09.2026): Trennung von Begründung und Stand,
kein Zustand in der Doku, erzwungene Sprachtrennung. Regel 16 kam am
selben Tag dazu: Fahrplan, Fehlerberichte und offene Problematiken
werden Vorgänge und in Unter-Vorgänge geteilt.

## 1 · Niemals direkt auf `main`

Jede Änderung entsteht auf einem Zweig. Auch die kleinste, auch reine
Dokumentation. Auf einem Zweig kostet ein Irrtum nichts: Zweig
wegwerfen, fertig.

## 2 · Ein Zweig je System

Wird ein System geändert, bekommt es seinen eigenen Zweig. Zwei Systeme
in einem Zweig sind ein Fehler, auch wenn beides klein ist — ein Zweig,
der eine Sache tut, lässt sich als Ganzes annehmen oder als Ganzes
verwerfen; sobald zwei Sachen darin stecken, hängt das Gute am
Schlechten.

**Die Systeme dieses Projekts**, ihre Tags und Zweignamen.
*(Beim Einrichten füllen: eine Zeile je System. Der Tag steht in jeder
Quelldatei als `[Aufgabe: <Tag>]`; `pruefe-tags.mjs` liest diese Tabelle
als die eine Quelle der zugelassenen Tags.)*

| System | Tag | Zweigname | Bereiche/Dateien |
| --- | --- | --- | --- |
| Regelkern — die Simulation, browserfrei | `Regelkern` | `regeln/…` | `spiel/*.mjs` |
| Katalog — Waffen, Gegner, Gegenstände, Wellen | `Katalog` | `katalog/…` | `spiel/katalog/` |
| Bild — Zeichnen, Pixelraster, Sprites, Palette | `Bild` | `bild/…` | `runtime/zeichnen*.js`, `runtime/sprites*.js` |
| Bedienung — Eingabe, Menüs, Laden, Spielstand | `Bedienung` | `bedienung/…` | `runtime/start.js`, `runtime/eingabe.js`, `index.html` |
| Koop — mehrere Spieler, später über das Netz | `Koop` | `koop/…` | noch leer, siehe `docs/SPIEL.md` 11 |
| Prüfungen und Werkzeuge | `Prüfwesen` | `pruefung/…` | `werkzeuge/` |
| Dokumentation | `Doku` | `doku/…` | `docs/`, `README.md` |

## 3 · Nach jeder Änderung wird gefragt

Ist ein Zweig fertig und grün, wird **gefragt**, ob er nach `main`
soll. Nicht angenommen, nicht stillschweigend gemacht. Die Antwort gibt
der Auftraggeber — je Einzelfall. Dasselbe gilt für alles, was nach außen geht:
Veröffentlichen, Deploys, Etiketten, Sichtbarkeit des Repositorys.

## 4 · Alles steht im Changelog

Jede einzelne Änderung wird in `CHANGELOG.md` genau dokumentiert —
oben, mit dem **Warum** und den **Messungen**, nicht nur dem Was.
Ausnahmslos: auch Doku-Änderungen, auch Einzeiler.

## 5 · Workclaim: erst lesen, dann eintragen, dann schreiben

Bevor irgendetwas geschrieben wird, wird `WORKCLAIM.md` gelesen. Steht
ein Bereich dort unter fremdem Besitz, wird er **nicht angefasst** —
Zugriff nur mit ausdrücklicher Erlaubnis des Besitzers oder des Auftraggebers.
Wer selbst arbeitet, trägt vorher Bereich, Besitzer, Ziel und Startzeit
ein und setzt die Zeile nach getaner Arbeit auf `frei`.

## 6 · Jede Datei sagt, wozu sie da ist

Jede Quelldatei beginnt mit einer Kopfnotiz, die drei Fragen
beantwortet: **Was** tut sie? **Warum** ist sie so gebaut (die
Entscheidung, nicht die Syntax)? **Mit wem** arbeitet sie zusammen?
In den ersten Zeilen steht ihr Funktions-Tag `[Aufgabe: <Tag>]` aus der
Tabelle in Regel 2.

## 7 · Jeder Fehler wird sofort notiert

In `docs/FEHLERBUCH.md`, nach dem dortigen Vier-Felder-Muster — nicht
am Ende der Arbeit, denn dann fehlt der Zustand, der ihn erklärt.

## 8 · Jede Zahl ist gemessen — und der Messweg steht dabei

Nicht geschätzt, nicht aus einem Kommentar übernommen, nicht aus dem
Gedächtnis. Jede Aussage über **Größe, Tempo oder Bestand** trägt die
Zahl **und den Weg, auf dem sie entstanden ist** — der Befehl, das
Werkzeug, der Lauf. Eine Zahl ohne Messweg kann niemand nachprüfen und
niemand widerlegen; sie ist eine Behauptung in Zahlenform.

Eine Zahl, die aus einer Liste folgt, wird berechnet oder verweist auf
die eine Stelle, die sie führt — nie danebengeschrieben.

Und: **„Das war vorher auch schon so" ist ohne Beleg keine Aussage.**
Wer den alten Zustand anführt, misst ihn — aus `git show`, aus einer
Sicherung, aus dem laufenden System. Sonst wird aus einer Erinnerung
eine Tatsache.

## 9 · Exakter Umfang

Geändert wird nur der angeforderte Bereich. Eine kreative Nebenänderung
braucht einen eigenen Auftrag — auffallen darf sie, gebaut wird sie
nicht nebenbei. Und: **Ein roter Ausgangsstand wird zuerst gemeldet,
nicht überbaut.** Jeder Abschluss nennt auch, was **bewusst nicht
geändert** wurde, und bei allem, was ein Produktivsystem berührt, den
Rückrollweg.

## 10 · Keine Datei über 1.000 Zeilen

**Keine Datei wächst unbemerkt über 1.000 Zeilen** (`alpha-code.json` →
`zeilengrenze`). Wird die Grenze erreicht, wird die Datei **geteilt** —
nicht geduldet, nicht begründet, und die Grenze wird nicht angehoben.

**Beim Teilen gilt dreierlei:**

1. Jeder neue Teil bekommt seine **Kopfnotiz** nach Regel 6: Was ·
   Warum · „Arbeitet zusammen mit" · Tag.
2. Die Teile **nennen einander namentlich** in dieser Zusammenarbeit.
   Zwei Dateien, die voneinander nichts wissen, sind keine Aufteilung,
   sondern zwei Hälften ohne Naht — wer die eine liest, ahnt die andere
   nicht.
3. Der Schnitt folgt dem **Thema**, nicht der Zeilenzahl. Wer bei Zeile
   1.000 trennt, erzeugt zwei unverständliche Dateien statt einer langen.

Bestehende Großdateien sind dokumentierte Altlasten in
`docs/ALTLASTEN.md`: Sie wachsen **nie** wieder, und beim nächsten
fachlichen Eingriff wird der berührte Teil zuerst herausgelöst. Das ist
der einzige Fall, in dem eine Datei über der Grenze stehen bleiben darf
— beim Nachrüsten eines gewachsenen Projekts wäre alles andere ein
Vorwand für einen riskanten Komplettumbau.

Zwei Zusätze, beide teuer gelernt:

- **Eine hereinkopierte Datei ist keine Altlast.** Die Liste ist für
  das, was beim Nachrüsten schon da war. Was später aus einem anderen
  Projekt übernommen wird und die Grenze **schon beim Ankommen** reißt,
  wird **beim Kopieren** aufgeteilt — nicht danach. „Danach" kommt nie,
  und die Altlastenliste wäre genau der Ort, an dem das begründet
  aussieht.
- **Neues kommt in einen thematischen Ordner**, nicht in eine
  wachsende Sammeldatei. Eine Datei namens `utils`, `helpers` oder
  `common` ist keine Fläche, sondern ein Sammelbecken: Sie hat kein
  Thema, also auch keinen Grund, jemals aufzuhören zu wachsen.

## 11 · Nichts Verbotenes im Repository

Keine echten Kunden-, Spieler- oder Personendaten. Keine Passwörter,
Tokens oder privaten Schlüssel — auch nicht „nur kurz zum Testen",
denn die Git-Historie vergisst nichts. Keine Binärprogramme, Archive
oder Mitschnitte. Dateinamen bleiben ASCII (Windows-, Build- und
Cloud-Werkzeuge stolpern sonst); **Inhalte** tragen echte Umlaute.

## 12 · Projektgrenzen sind Verträge

Hat dieses Projekt einen Nachbarn (zweites Repository, gemeinsame
Datenbank, gemeinsamer Rechner), steht die Grenze in
`docs/PROJEKTGRENZE.md`: wer was besitzt, und dass die einzige
erlaubte Verbindung ein **versionierter, lesender Vertrag** ist — nie
kopierter Quelltext, nie geteilte Tokens. Geteilte Ressourcen (etwa
eine gemeinsame Regeldatei) bekommen einen eigenen Wächter.

## 13 · Begründung und Stand sind zwei Dinge

**Doku trägt die Begründung**: Zielbild, Messungen, verworfene
Alternativen, das Abnahmekriterium. **Der Stand lebt woanders** — dort,
wo er beim Ändern der Wirklichkeit mitgeändert wird:

- Gibt es einen **Vorgangs-Tracker** (GitHub Issues, Jira …), gehört
  der Stand dorthin. Eine Übersicht ist dann eine **Abfrage**
  (`gh issue list --label track --state open`), keine gepflegte Datei —
  eine gepflegte Übersicht ist selbst wieder Doku, die veraltet.
- Gibt es keinen, gehört er in **eine** benannte Datei, nie verstreut.

Drei Folgerungen, die man leicht übersieht:

1. **Ein Vorgang für eine Phase existiert, _bevor_ die Phase beginnt** —
   nicht erst, wenn sie endet. Sonst wandert der Stand in der
   Zwischenzeit doch wieder dorthin, wo er nicht hingehört: in
   Commit-Texte und Dokumente.
2. **Eine offene Entscheidung ist ein eigener Vorgang**, kein Absatz
   in einem Phasen-Vorgang. Sie hat eine **andere Lebensdauer** als die
   Arbeit, die auf ihr wartet — und überlebt sie oft.
3. **Weichen Vorgang und Dokument voneinander ab, gilt das Dokument.**
   Dort steht die Begründung; im Vorgang steht nur der Stand.

Abgeschlossene Pläne wandern nach `docs/history/` — **dort darf Status
stehen**, weil sie nicht mehr behaupten, die Gegenwart zu beschreiben.

## 14 · Kein Dokument behauptet einen Zustand

„Ist live", „noch offen", „erledigt", „nächster Schritt" — und ein
**Häkchen an einem Plan-Schritt** ist dieselbe Aussage in kürzerer
Form. Alle fallen unter dieselbe Regel, und der Grund ist immer
derselbe: **Sie veralten lautlos.** Nichts wird rot, niemand merkt es,
und das Dokument sagt weiter, was einmal galt — und wird geglaubt,
weil es im Repository steht.

**Ein datierter Vermerk ist dagegen ein Nachweis und bleibt.**
„Gemessen am 12.03.2026", „abgerufen am …" behaupten nichts über
jetzt; das Datum legt sie trocken. Wer eine Zustandsaussage braucht,
schreibt sie datiert — dann ist sie in einem Jahr nicht falsch,
sondern alt.

`werkzeuge/pruefe-doku-status.mjs` erzwingt das für `docs/`.

## 15 · Die Sprachtrennung wird festgelegt und erzwungen

Fast jedes Projekt trennt irgendwann zwischen **Bezeichnern**
(Variablen, Funktionen, Datei- und Zweignamen) und **Texten**
(Kommentare, Doku, Nutzertexte). Der Fehler ist nie die Wahl — der
Fehler ist, sie **nicht zu erzwingen**: Ein einziges fremdsprachiges
`pruefeBenutzer()` zwischen dreihundert Namen fällt niemandem auf, und
beim zweiten wird es zur Gewohnheit.

Deshalb: Die Wahl steht in `alpha-code.json` (`sprache`), und
`werkzeuge/pruefe-sprache.mjs` hält sie über `docs/WORTLISTE.md`.
**Die Liste ist nie vollständig, und das ist die Bauart** — wer ein
durchgerutschtes Wort findet, trägt es ein; dann kommt genau dieses
nie wieder durch.

Zwei Punkte, die dazugehören:

- **Umlaute und ß werden richtig gesetzt** — in Kommentaren, Doku und
  Nutzertexten, und auch im Commit-Betreff. `ae/oe/ue/ss` ist keine
  Schreibweise, sondern eine Notlösung aus der Zeit der 7-Bit-Terminals.
  *(Wo eine Werkzeugkette daran nachweislich scheitert, wird der
  Nachweis notiert — nicht die Regel aufgeweicht.)*
- **Nutzertexte stehen nicht im Code**, sondern in Sprachdateien. Ein
  Text, der fest in der Oberfläche steht, ist ein Fehler und kein
  Zwischenstand: **nachträglich herausgelöst wird er nie vollständig.**

## 16 · Vorgänge werden angelegt, geteilt und verwiesen

Regel 13 sagt, **wo** der Stand lebt. Diese Regel sagt, **in welcher
Form** — sobald das Projekt einen Vorgangs-Tracker hat (`vorgaenge` in
`alpha-code.json`).

**Drei Dinge werden zu Vorgängen:** der Fahrplan, jeder Fehlerbericht,
jede offene Problematik. Nichts davon bleibt ein Absatz in einem
Dokument.

| Form | Label | Eltern | trägt |
| --- | --- | --- | --- |
| **Phase** | `track` | keins | das Abnahmekriterium aus `docs/ROADMAP.md` |
| **Schritt** | `schritt` | Phase | **ein** Fertig-Kriterium |
| **Fehler** | `fehler` | frei | das Vier-Felder-Muster des Fehlerbuchs |
| **Entscheidung** | `entscheidung` | **keins** | Frage, Optionen, Empfehlung |

**Große Vorgänge werden geteilt.** Eine Phase ist ein Sammelvorgang und
enthält selbst keine Arbeit — die Arbeit sind ihre Schritte, und jeder
hat genau ein Fertig-Kriterium. Lassen sich für einen Schritt zwei
nennen, sind es zwei Schritte: Sonst gibt es keinen Zeitpunkt, an dem
man ihn guten Gewissens schließen kann.

**Jede Verbindung wird zweimal geschrieben**, sonst ist sie von einer
Seite unsichtbar:

| von | nach | wie |
| --- | --- | --- |
| Kind | Eltern | die Zeile `Teil von #12` im Rumpf |
| Eltern | Kind | ein Punkt der Aufgabenliste `- [ ] #13` |
| Vorgang | Begründung | `Begründung: docs/ROADMAP.md` |
| Dokument | Vorgang | die Zeile `Vorgang: #12` unter der Überschrift |
| Commit | Vorgang | `(#13)` am Ende des Betreffs |

**Eine Entscheidung hängt an keiner Phase.** Sie hat eine andere
Lebensdauer als die Arbeit, die auf sie wartet — als Absatz in einem
Phasen-Vorgang verschwände sie mit dessen Abschluss, ohne beantwortet zu
sein.

**Der Fehler geht durch beide Bücher, nacheinander:** erst der Vorgang
(was ist kaputt, seit wann, woran erkannt), nach der Behebung der Fall
im Fehlerbuch (woran ich es früher merke). Wer nur eines führt, verliert
entweder den Stand oder die Lehre.

**Jeder Abschluss trägt seinen Bericht** in den Vorgang: was gemessen
wurde, was bewusst **nicht** geändert wurde, und bei allem, was ein
Produktivsystem berührt, den Rückrollweg.

```bash
node werkzeuge/vorgaenge.mjs roadmap              # was fehlt
node werkzeuge/vorgaenge.mjs roadmap --wirklich   # anlegen
node werkzeuge/vorgaenge.mjs stand                # die Übersicht
```

Ohne `--wirklich` läuft alles trocken: Vorgänge anzulegen erzeugt
Benachrichtigungen und lässt sich nicht spurlos zurücknehmen.

## Was davon die Maschine prüft

| Regel | Wächter |
| --- | --- |
| 1 und 4 | `werkzeuge/pruefe-arbeitsweise.mjs` |
| 5 (Format und Vollständigkeit) | `werkzeuge/pruefe-workclaim.mjs` |
| 6 (Tag vorhanden und zugelassen) | `werkzeuge/pruefe-tags.mjs` |
| 10 (Grenze und Ratchet) | `werkzeuge/pruefe-altlasten.mjs` |
| 11 (Formate und Geheimnismuster) | `werkzeuge/pruefe-geheimnisse.mjs` |
| 14 (kein Zustand in der Doku) | `werkzeuge/pruefe-doku-status.mjs` |
| 15 (Sprachtrennung, Umlaute) | `werkzeuge/pruefe-sprache.mjs` — nur mit `sprache` in `alpha-code.json` |
| 16 (Vorgang je Phase und Schritt, Verweise) | `werkzeuge/pruefe-vorgaenge.mjs` — nur mit `vorgaenge`; `--online` prüft zusätzlich bei GitHub nach |
| Verweise in der Doku | `werkzeuge/pruefe-verweise.mjs` |
| vor jeder Veröffentlichung zusätzlich | `werkzeuge/pruefe-freigabe.mjs` (von Hand, samt Git-Historie) |
| 2, 3, 7, 8, 9, 12, 13 | kann nur ein Mensch beurteilen |

**Warum die Vorgangsprüfung in der Kette ohne Netz läuft:** Eine
Prüfkette, die ein fremdes Haus braucht, wird rot, wenn GitHub langsam
ist — und weil das oft passiert, gewöhnt man sich das Übergehen an.
Dann ist sie gar nichts mehr wert. In der Kette wird geprüft, was in
den Dateien steht; `--online` läuft von Hand, vor einem Merge.
