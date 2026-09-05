# Workclaim — wer arbeitet gerade woran

**Vor jedem Schreiben lesen. Vor jedem eigenen Schreiben eintragen.**
Ein Bereich unter fremdem Besitz wird nicht angefasst — Zugriff nur mit
ausdrücklicher Erlaubnis des Besitzers oder des Auftraggebers. Nach getaner
Arbeit wird die eigene Zeile auf `frei` gesetzt oder entfernt.

Warum es diese Datei gibt: Am 02.09.2026 hat eine zweite Sitzung mitten
im Checkout einer ersten einen Merge gestartet — sieben Dateien voller
Konfliktmarker. Chatverläufe sind nicht geteilt; diese Datei ist die
einzige Stelle, an der sich zwei Sitzungen sehen.

| Bereich | Besitzer | Ziel | Seit |
| --- | --- | --- | --- |
| `spiel/werte.mjs`, `schadensarten.mjs`, `ausweichen.mjs`, `kampf.mjs`, `bewegung.mjs`, `welt.mjs`, `katalog/waffen.mjs`, `werkzeuge/pruefe-werte.mjs`, `pruefe-kern.mjs` | Claude (Agent A) | Werte-Fundament: fünf Schadensarten, Krit, Modifier, Widerstände, Ausweichen | 05.09.2026 |
| `netz/`, `runtime/lobby.js`, `eingabe.js`, `start.js`, `index.html`, `.github/`, `werkzeuge/pruefe-netz.mjs` | Claude (Agent B) | Lobbycode über das Netz, Handy-Bedienung, Webadresse über GitHub Pages | 05.09.2026 |
| `runtime/sprite-daten.js`, `werkzeuge/pruefe-sprites.mjs` | Claude (Agent D) | Trefferzeichen je Schadensart, zwei Hauptleute, Truhen, Animation | 05.09.2026 |
| `spiel/protokoll.mjs`, `werkzeuge/auswertung.mjs`, `pruefe-protokoll.mjs`, `balance.mjs` | Claude (Agent E) | Auswertungsprotokoll als Werkzeug für die Schwierigkeitsauslegung | 05.09.2026 |
| `docs/`, `CHANGELOG.md`, `WORKCLAIM.md` | Claude (Leitstand) | Fahrplan, Vorgänge, Zusammenführung der vier Zweige | 05.09.2026 |

## Format

- **Bereich:** Ordner oder Dateien, so eng wie möglich (`werkzeuge/`,
  `docs/WEGWEISER.md`). Ein Anspruch auf „alles" blockiert alle.
- **Besitzer:** wer schreibt — `Claude (Sitzung X)`, `Codex`, `der Auftraggeber`.
- **Ziel:** ein Satz, was dort entsteht.
- **Seit:** Datum und Uhrzeit. Ein Anspruch, der älter als ein Tag ist,
  darf hinterfragt werden — nachfragen statt überschreiben.
