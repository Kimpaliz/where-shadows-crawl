# Nachtzehrer

Ein Wellen-Überlebensspiel für den Browser, zu **einem bis vier** an
einem Rechner. Dark Fantasy, exakt von oben, Pixelgrafik.

Zwölf Stunden einer Nacht. Ein Bannkreis, den die Fackeln halten. Man
läuft — mehr nicht: Die Waffen schlagen von selbst zu. Zwischen den
Wellen tritt ein Krämer an den Kreis und verkauft, was man sich vom
Grabgold der Erschlagenen leisten kann.

## Spielen

```bash
node werkzeuge/vorschau.mjs
```

Dann <http://127.0.0.1:8144/> öffnen. Unter Windows genügt ein
Doppelklick auf `Vorschau-starten.cmd`.

Es braucht **kein** Netz, keinen Server, kein Konto und keine
Installation — nur Node und einen Browser. Der kleine Server ist nur
nötig, weil Browser Module nicht von der Festplatte laden.

## Steuerung

| | Laufen | Nehmen |
| --- | --- | --- |
| Jäger 1 | `W A S D` | `Leertaste` oder `F` |
| Jäger 2 | Pfeiltasten | `Enter` |
| Jäger 3 | `I J K L` | `U` |
| Jäger 4 | Ziffernblock `8 4 5 6` | Ziffernblock `0` |

Gamepads werden erkannt und übernehmen ihren Platz von selbst. Mehr als
eine Richtung und einen Knopf braucht das Spiel nicht — auch nicht im
Laden und bei der Kartenwahl.

## Was drin steckt

- **Zwölf Waffen** in acht Merkmalsgruppen; vier gleiche Merkmale geben
  einen Aufschlag
- **Acht Gegnerarten**, gestaffelt eingeführt, alle vier Wellen ein
  Hauptmann
- **Vierzehn Fundstücke**, die Hälfte davon mit Nachteil
- **Acht Werte**, jeder auf dem Bildschirm spürbar
- Waffen **verschmelzen** beim Kauf zu höheren Stufen
- **Niedergeschlagen statt tot**: Mitspieler heben einen wieder auf

## Für wen hier weiterbaut

| Frage | Datei |
| --- | --- |
| Was wird gebaut und warum so? | [docs/SPIEL.md](docs/SPIEL.md) |
| Was kommt als Nächstes, und warum in dieser Reihenfolge? | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Die zweite Vorlage *Death Must Die* | [docs/ZWEITE-VORLAGE.md](docs/ZWEITE-VORLAGE.md) |
| Wo fasse ich für Wunsch X an? | [docs/WEGWEISER.md](docs/WEGWEISER.md) |
| Welche Regeln gelten? | [docs/REGELN.md](docs/REGELN.md) |
| Welche Fehler wiederholen sich? | [docs/FEHLERBUCH.md](docs/FEHLERBUCH.md) |
| Was wurde zuletzt geändert? | [CHANGELOG.md](CHANGELOG.md) |
| Wie fange ich an? | [CLAUDE.md](CLAUDE.md) |

```bash
node werkzeuge/pruefe-alles.mjs        # die ganze Prüfkette
node werkzeuge/balance.mjs --tabelle   # wie schwer ist es, zu 1 bis 4
```

## Zwei Entscheidungen, die alles andere erklären

**`spiel/` kennt keinen Browser.** Kein Bildschirm, keine Tastatur,
keine Uhr, kein `Math.random`. Deshalb lassen sich zwölf Wellen in
Sekunden durchrechnen statt in zwanzig Minuten Spielzeit, deshalb
ergibt dieselbe Saat dieselbe Nacht — und deshalb wäre Netz-Koop später
billig.

**Es gibt keine Bilddatei.** Jede Figur steht als Text im Repository,
eine Zeile je Bildpunktzeile. Das ist diffbar, prüfbar und ohne
Bildbearbeitung änderbar.

## Keine Abhängigkeiten

Kein `npm install`, kein Paket, kein fremder Dienst zur Laufzeit. Das
Spiel besteht aus Dateien in diesem Ordner.

## Wo die Arbeit steht

Das Repository ist <https://github.com/Kimpaliz/nachtzehrer> (privat).
Der Stand einer Sache steht **nicht** in einem Dokument, sondern in
ihrem Vorgang — ein Dokument, das „ist erledigt" sagt, veraltet
lautlos.

| Was du willst | wo |
| --- | --- |
| Etwas wünschen | [neuer Vorgang → Wunsch](https://github.com/Kimpaliz/nachtzehrer/issues/new?template=wunsch.yml) |
| Etwas melden, das nicht tut | [neuer Vorgang → Fehler](https://github.com/Kimpaliz/nachtzehrer/issues/new?template=fehler.yml) |
| Eine Frage stellen, die etwas blockiert | [neuer Vorgang → Entscheidung](https://github.com/Kimpaliz/nachtzehrer/issues/new?template=entscheidung.yml) |
| Sehen, was ansteht | [die Phasen](https://github.com/Kimpaliz/nachtzehrer/labels/track) · [die offenen Fragen](https://github.com/Kimpaliz/nachtzehrer/labels/entscheidung) |

Die Begründung steht dagegen im Repository:
[docs/ROADMAP.md](docs/ROADMAP.md) sagt, **warum** die Reihenfolge so
ist. Die Phasen dort tragen ihre Vorgangsnummer als `Vorgang: #N`.
