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
| `spiel/kampf.mjs`, `spiel/angriffsformen.mjs`, `spiel/katalog/waffen.mjs` | Claude (Sitzung Angriffe) | sieben Angriffsformen statt eines Treffereffekts | 06.09.2026 |
| `runtime/zeichnen.js`, `runtime/partikel.js`, `runtime/sprite-daten.js` | Claude (Sitzung Angriffe) | Partikel mit eigener Bahn, Kegel-, Blitz- und Meteorbilder | 06.09.2026 |
| `runtime/oberflaeche.js`, `runtime/werteliste.js`, `runtime/eingabe.js`, `runtime/start.js` | Claude (Sitzung Angriffe) | Werte-Uebersicht mit Vorschau, Pause, Zeigerposition | 06.09.2026 |
| `werkzeuge/pruefe-angriffsformen.mjs`, `werkzeuge/pruefe-partikel.mjs`, `werkzeuge/pruefe-werteliste.mjs` | Claude (Sitzung Angriffe) | drei neue Waechter | 06.09.2026 |

## Format

- **Bereich:** Ordner oder Dateien, so eng wie möglich (`werkzeuge/`,
  `docs/WEGWEISER.md`). Ein Anspruch auf „alles" blockiert alle.
- **Besitzer:** wer schreibt — `Claude (Sitzung X)`, `Codex`, `der Auftraggeber`.
- **Ziel:** ein Satz, was dort entsteht.
- **Seit:** Datum und Uhrzeit. Ein Anspruch, der älter als ein Tag ist,
  darf hinterfragt werden — nachfragen statt überschreiben.
