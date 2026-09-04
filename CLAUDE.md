# Where Shadows Crawl — zuerst lesen

Ein Wellen-Überlebensspiel für den Browser, zu zweit bis viert. Janniks
Auftrag wörtlich: *„Meine freunde und ich brauchen ein webbrowser game koop
wie "Brotatoe" selbes game design, aber ander stil. Dark fantasy. Exaktes
top down. Pixel grafik."* — also **Brotatos Spielaufbau**, in **Dark
Fantasy**, **exakt von oben** und in **Pixelgrafik**. Was das mechanisch
heißt und was Brotato für den Koop-Fall gar nicht beantwortet, steht in
[docs/SPIEL.md](docs/SPIEL.md).

Auftraggeber ist **Jannik**. Er entscheidet fachlich und programmiert selbst nicht: Alles Technische wird
gebaut und ihm anschließend in normaler Sprache erklärt — keine Fachwörter
ohne Übersetzung, keine Aufgabe an ihn, die Code voraussetzt.
Sein Wortlaut ist die Quelle: Wünsche werden
**zitiert**, nicht umformuliert.

## In dreißig Sekunden

- Zweig anlegen, `WORKCLAIM.md` lesen und eintragen — **dann** erst bauen.
- Jede Änderung: Changelog-Eintrag oben, dann `node werkzeuge/pruefe-alles.mjs`.
- Ein roter Ausgangsstand wird zuerst **gemeldet**, nicht überbaut.
- Merge, Push, Deploy, Veröffentlichung: nur auf das ausdrückliche Ja des Auftraggebers.
- Was unter „Ausdrücklich nicht gefordert" steht, wird nicht gebaut und
  nicht als Lücke gemeldet.

## Ausdrücklich nicht gefordert

- **Konten, Anmeldung, Datenbank.** Es gibt keinen Server und keinen
  fremden Dienst zur Laufzeit. Der Spielstand liegt im Browser.
- **Bezahlung, Werbung, Ladenseite.**
- **Bestenlisten über das Netz**, Freundeslisten, Chat.
- **Übersetzungen.** Das Spiel ist deutsch.
- **Bilddateien.** Alle Sprites stehen als Text im Repository und werden
  gezeichnet — das hält sie diffbar und prüfbar.
- **Ton** — bis Jannik ihn ausdrücklich möchte.
- **Online-Koop über das Internet**, solange Janniks Entscheidung aus
  `docs/SPIEL.md` 11 aussteht. Koop auf **einem** Rechner ist gefordert.

---

## Die Regeln

Ausführlich in [docs/REGELN.md](docs/REGELN.md); die prüfbaren laufen in
der Kette mit.

1. **Nie direkt auf `main`.** Jede Änderung entsteht auf einem Zweig.
2. **Ein Zweig je System.** Die Tabelle steht in `docs/REGELN.md`.
3. **Nach jeder Änderung wird gefragt**, ob sie nach `main` soll —
   Merge, Push und Deploy nur auf das ausdrückliche Ja des Auftraggebers.
4. **Alles steht im Changelog.** Jede einzelne Änderung, genau, oben.
5. **Workclaim:** [WORKCLAIM.md](WORKCLAIM.md) erst lesen, dann
   eintragen, dann schreiben. Fremde Bereiche sind gesperrt.
6. **Doku trägt die Begründung, nicht den Stand.** Kein „ist live",
   kein „erledigt", kein Häkchen an einem Plan-Schritt — das veraltet
   lautlos. Zustandsaussagen gehören in den Vorgangs-Tracker; im
   Dokument stehen sie nur **datiert** („gemessen am …").

```bash
node werkzeuge/pruefe-alles.mjs      # die ganze Prüfkette
```

---

## Wegweiser — welche Datei beantwortet welche Frage

**Vor dem Bauen immer zuerst:** dieses Dokument, dann
[docs/FEHLERBUCH.md](docs/FEHLERBUCH.md) — dort stehen die Fehler, die
sich wiederholen, und woran man sie erkennt, **bevor** man hineinläuft.

| Frage | Datei |
| --- | --- |
| Welches System redet mit welchem, und warum? Wo fasse ich für Wunsch X an? | [docs/WEGWEISER.md](docs/WEGWEISER.md) |
| Wer arbeitet gerade woran? | [WORKCLAIM.md](WORKCLAIM.md) |
| Was wurde zuletzt gebaut, und warum — mit den Messungen | `CHANGELOG.md`, oberster Eintrag |
| Was kommt als Nächstes? | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Welche Regeln gelten, welche Tags und Zweignamen gibt es? | [docs/REGELN.md](docs/REGELN.md) |
| Welche Fehler wiederholen sich? | [docs/FEHLERBUCH.md](docs/FEHLERBUCH.md) |
| Wie verteile ich Arbeit auf Agenten? | `.claude/PROJEKTPROFIL.md` |
| **Wie ist der Stand von X?** | **nicht hier** — im Vorgangs-Tracker (Regel 13) |

---

## Die Haltung dieses Projekts

**Jede Zahl ist gemessen.** Nicht geschätzt, nicht aus einem Kommentar
übernommen. Wenn irgendwo eine Zahl steht, gibt es den Befehl, der sie
nachrechnet.

**Umbau und Inhalt werden getrennt.** Ein Umbau ohne sichtbare Änderung
lässt sich beweisen (gleiche Eingaben → gleiches Ergebnis, byteweise);
ein Umbau mit Änderung nicht. Deshalb erst das eine, dann das andere.

**Jede neue Prüfung wird zuerst rot gemacht.** Den Fehler absichtlich
einbauen, anschlagen sehen, zurücknehmen. Eine Prüfung, die nie rot
war, prüft womöglich nichts.

**Geprüft wird der Fall, der ohne die Arbeit falsch wäre.** Nicht der,
der ohnehin gewinnt.
