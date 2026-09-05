# Rückmeldung — Zweig `regeln/kartenhand`

Phase 13, Vorgänge #65 bis #69. Schritt für Schritt mitgeschrieben,
damit die Arbeit auch dann auffindbar ist, wenn die Sitzung vorher
endet. Jede Zeile trägt ihr Datum.

## Schritt 13.1 — Eine Karte ist ein Katalogeintrag (#66, 05.09.2026)

- Neu `spiel/katalog/karten.mjs`: `SELTENHEITEN` (vier Stufen),
  `REGELN` (die Regelnamen, die eine Meta-Karte setzen darf) und
  `KARTEN` — der eigentliche Katalog. Dazu `ziehbareKarten()`,
  `kartenGruppe()`, `istMeta()`, `seltenheitVon()`.
- `spiel/stufen.mjs` umgebaut: `KARTEN_MENGE` und `GEWICHT` sind weg,
  `ziehKarten()` zieht aus dem Katalog. Neu `regelnVon()`,
  `hatRegel()`, `mengeVon()`, `KARTEN_JE_WAHL = 3`, `META_SCHUB`.
- **Der Befund, der den Umbau begründet:** Vorher waren nur **8 der 55
  Werte** überhaupt ziehbar — der Topf entstand mit
  `for (let i = 0; i < GEWICHT[w]; i++)`, und `0 < undefined` ist
  `false`. Die 47 Werte ohne Eintrag in `GEWICHT` fielen still aus dem
  Spiel. Keine Meldung, keine rote Prüfung.

## Zwischenfall F3 — eine Zeile fehlte (05.09.2026)

Der Sicherungs-Commit `46d58e8` („letzter Stand vor dem Zwischenfall")
hat einen **halb bearbeiteten** Stand festgehalten: Gegenüber `8f34c3d`
fehlte genau eine Zeile in `spiel/stufen.mjs`,

    if (regeln.aderlass) spieler.leben = spieler.lebenMax;

Damit war die Regel `aderlass` gesetzt, aber nirgends gefragt.
`werkzeuge/pruefe-karten.mjs` war deshalb beim Antritt **rot** (74
Prüfungen, 2 Fehler: „Regel gesetzt, aber nie gefragt" und „aderlass
macht beim Aufstieg wieder ganz · 3 von 50"). Zeile wiederhergestellt,
danach 74 Prüfungen, 0 Fehler.

**Merksatz:** Eine Sicherung mitten in einer Bearbeitung sichert auch
die Hälfte. Nur die Prüfkette sagt, welche Hälfte es war.

## Schritt 13.4 — Die Kartenhand am unteren Rand (#69, 05.09.2026)

- Neu `runtime/karten-hand.js` (426 Zeilen), eingehängt in
  `runtime/start.js`. `zeichneWahl()` aus `runtime/oberflaeche.js` wird
  nicht mehr gerufen — die Funktion selbst bleibt dort stehen, weil die
  Datei einem anderen Bereich gehört (siehe „Offen" am Ende).
- Drei Karten, gefächert und um 16 Bildpunkte überlappend, im Bogen
  (die mittlere steht 8 Bildpunkte höher). **Nicht gedreht:** Eine
  gedrehte Bildpunktschrift ist verwaschene Schrift.
- Angetippt wird eine Karte hervorgehoben: 88 × 88 → **140 × 132**, mit
  Seltenheitsname, allen Wertzeilen und dem Flavour-Text. Titel oben,
  darunter die Werte; die **Zahl grün** (`FARBEN.seucheHell`), der Name
  daneben nicht.
- **Ein Klick ruft nicht `nimmKarte`.** Über die Leitung gehen rohe
  Eingaben; `bedieneWahl()` läuft auf allen Rechnern für alle Spieler.
  Ein Klick, der `menue.wahlZeiger` nur örtlich verschöbe, liesse die
  Welten auseinanderlaufen. Der Zeigefinger wird deshalb in Achsen- und
  Knopfeingaben übersetzt und nimmt denselben Weg wie Tastatur und
  Daumen.
- **Zwei Fallen, beide gemessen statt geraten:**
  - `GROSS_B` stand auf 128, gerechnet nur mit dem **Namen** der
    Wertzeile (24 Zeichen). Die Zahl davor war vergessen — 220 von rund
    9.000 gemessenen Zeilen passten nicht. Jetzt 140.
  - Der zweite Tipp („nehmen") verlangte eine **leere** Kette. Nach
    einer Bewegung liegt aber noch das Loslassen darin, während der
    Zeiger schon am Ziel steht: Der zweite Tipp tat **41 Bilder lang
    nichts**. Jetzt wird der Knopf angehängt, aber nie zweimal.
- Auf dem Telefon liegt `#stickfeld` über der ganzen linken Bildhälfte.
  Die Hand horcht deshalb in der **Einfangphase** am Fenster und hält
  ein Zeigerereignis nur an, wenn es wirklich eine Karte trifft.

## Im Browser geklickt (05.09.2026, `node werkzeuge/vorschau.mjs --hafen=8154`)

Nicht „der Knopf ist da", sondern **mit der Maus geklickt** und die
Leinwand danach **bildpunktweise ausgelesen** (die Rückenfarben `#151021`
und `#221a33` verraten, wo welche Karte liegt):

| geklickt | Rückenfarbe der grossen Karte vorher | nachher |
| --- | --- | --- |
| dritte Karte | x 99–236 (Karte 1) | **x 243–380 (Karte 3)** |
| dieselbe noch einmal | x 243–380 | **weg** — die Karte ist genommen, die Welle läuft weiter |

Weiter gemessen: Unterkante der Hand bei y 263 von 270 (fünf Bildpunkte
Luft), keine ungewählte Karte von der grossen verdeckt, Konsole ohne eine
einzige Meldung des Spiels.

**Der Daumen-Stick wurde übersprungen — live nachgewiesen.** Mit
sichtbarer `#bedienung` (also so, wie es auf dem Telefon aussieht) deckt
`#stickfeld` die Fensterhälfte bis x 530 ab; die grosse Karte lag
vollständig darunter. Ein echter Klick darauf hat sie genommen, und
`#bedienung` bekam dabei **nie** die Klasse `zieht` — der Stick ist gar
nicht erst angesprungen. Die Gegenprobe fiel nebenbei ab: Dieselben
Klicks **ausserhalb** der Kartenwahl liefen dreimal in einen Zeitablauf,
weil `#stickfeld` sie festhielt. Genau das soll es ja.

**Zwei Befunde, die erst der Browser gezeigt hat:**

1. **Die grosse Karte verschluckte ihre Nachbarin.** Von 88 Bildpunkten
   blieben 45 sichtbar, der Titel war mitten durchgeschnitten — und
   „der Title, der schon zeigt worum es geht", ist Janniks Wortlaut.
   Neu ist `VERSATZ`: Die ungewählten Karten rücken um 42 Bildpunkte
   nach aussen (halbe Breitendifferenz plus Überlappung), damit die
   grosse Karte genau an sie stösst statt über sie zu laufen. Ein
   Wächter hält es fest.
2. **`werkzeuge/vorschau.mjs` kannte nur Hafen 8144.** Vier Sitzungen
   gleichzeitig heissen vier Server; der zweite stirbt mit `EADDRINUSE`,
   und wer das übersieht, prüft die **fremde** Fassung. Jetzt
   `--hafen=8154`, Standard unverändert 8144.

**Nicht geprüft:** kein echtes Telefon und kein echter Finger. Die
Bildschirmgrösse 375 × 812 liess sich zwar einstellen, aber in der
Berührungs-Nachbildung lief **jeder** Klick des Prüfwerkzeugs in einen
Zeitablauf — auch der auf die Lobby-Knöpfe, also unabhängig von dieser
Arbeit. Die Hallen-Prüfung oben lief deshalb bei Fenstergrösse 1060 ×
532 mit von Hand eingeblendeter `#bedienung`; die Überdeckung durch
`#stickfeld` ist dabei dieselbe.

## Rot-Beweis — 16 Fälle, und fünf davon blieben zuerst grün

Jeder neue Wächter einmal absichtlich gebrochen, die Datei danach
byteweise zurückgelegt (Prüfsumme verglichen). Der Lauf steht im
Scratchpad; hier die Fälle und was anschlug:

| gebrochen | anschlagende Meldung |
| --- | --- |
| `VERSATZ = 0` | die grosse verdeckt keine andere (7 Meldungen) |
| Hand in die Bildmitte | die Hand liegt am unteren Bildrand · 60 Bildpunkte Luft |
| `BOGEN = 0` | die mittlere Karte steht im Bogen höher · 177 · 177 · 177 |
| `SCHRITT_X = KARTE_B` | die Karten überlappen einander · 0 Bildpunkte |
| grosse Karte zuerst malen | sie wird zuletzt gemalt · zuletzt #2 |
| Klickweg immer vorwärts | der kürzeste Weg im Ring · 7 daneben |
| `GROSS_B = 128` | jede Wertzeile in eine Zeile · 220 mal |
| Titel grün statt weiss | nur die Zahl, nicht der Titel · 132 Bildpunkte |
| Flavour ohne Platzrechnung | masslos langer Text bleibt drin · 440 draussen |
| Titel nicht umgebrochen | keine kleine Karte malt über ihren Rand · 1 |
| zweiter Tipp ohne Knopf | ein zweiter Tipp nimmt sie · nach 41 Bildern |
| `quittiere` ohne Bedingung | zwei Weltschritte nehmen nur eine Eingabe · 2 → 1 |
| Kette nie geräumt | ausserhalb der Kartenwahl ist die Kette leer |
| kein `stopPropagation` | ein Tipp auf eine Karte wird abgefangen |
| Trefferwache aus | rot, **aber als Absturz statt als Meldung** — ehrlich vermerkt |
| `aderlass` wieder entfernt | Regel gesetzt, aber nie gefragt · 3 von 50 |

**Fünf Fälle blieben beim ersten Durchgang grün.** Das war der eigentliche
Ertrag, denn jeder davon ist ein Wächter, der nichts bewacht hätte:

1. **Die Zeichenreihenfolge umzudrehen fiel nicht auf.** Mein Trefferpunkt
   sollte belegen, dass in der Überlappung die grosse Karte gewinnt — nur
   gibt es seit dem `VERSATZ` gar keine Überlappung mehr. Die eigene
   Reparatur hatte die eigene Prüfung entwaffnet. Jetzt wird die
   Reihenfolge selbst zugesichert.
2. **Die Platzrechnung für den Flavour-Text** liess sich durch eine feste
   Zahl ersetzen, ohne dass etwas anschlug: Alle echten Texte sind kurz
   genug. Jetzt gibt es einen Text, der die Karte sprengen **will**.
3. **Den Titel nicht umzubrechen** blieb grün, weil der längste Titel
   (17 Zeichen, 84 Bildpunkte) rechnerisch noch in die 88 Bildpunkte
   passt — er klebt nur am Rahmen. Die Randprüfung sieht jetzt auf die
   **Schriftpunkte** und verlangt drei Bildpunkte Abstand.
4. **`quittiere()` ohne Bedingung** blieb grün, weil meine Prüfung nur
   `mische()` aufrief — und das rückt die Kette ohnehin nie vor. Geprüft
   wird jetzt der Fall, für den die Bedingung überhaupt da ist: zwei
   Weltschritte in **einem** Bild.
5. **Eine doppelte Wache** (`!sicht` im Zeiger-Horcher *und* in
   `getroffen()`) liess sich zur Hälfte entfernen, ohne dass etwas
   anschlug. Die Doppelung ist raus — eine Frage, eine Stelle.

## Balance: die Sperrklinke ist gerissen — gemeldet, nicht angehoben

Beide Läufe in diesem Worktree, dieselben Saaten:

| | Welle Mittel | Stufe | ohne Ende | schlimmste Welle |
| --- | ---: | ---: | ---: | --- |
| **1 Spieler vorher** | 6,1 | 6,9 | **0** von 10 | 5 von 10 in Welle 6 |
| **1 Spieler nachher** | **84,0** | 22,7 | **4** von 10 | 6 von 6 in Welle 6 |
| 2 Spieler vorher | 104,2 | 27,7 | 3 von 6 | 1 von 3 in Welle 6 |
| 2 Spieler nachher | 104,0 | 30,7 | 3 von 6 | 2 von 3 in Welle 6 |
| 4 Spieler vorher | 103,3 | 27,7 | 3 von 6 | 1 von 3 in Welle 4 |
| 4 Spieler nachher | 136,5 | 33,5 | 4 von 6 | 1 von 2 in Welle 4 |

`ABBRUCH_SPERRE[1] = 0` ist damit gerissen (4 von 10 erreichen die
Notbremse bei Welle 200), dazu „keine Wand in einer einzelnen Welle"
(6 von 6 statt höchstens 78 %) und „allein endet jeder Lauf".
**`werkzeuge/pruefe-balance.mjs` bleibt deshalb rot.** Die Sperrklinke
wurde **nicht** angehoben — das ist die Regel, und die Zahl ist ein
Befund, kein Hindernis.

⚠️ **Das war schon beim Antritt so.** Auch auf dem gesicherten Stand
`46d58e8` meldete `pruefe-balance.mjs` dieselben drei Fehler; die
Kartenhand hat daran nichts geändert.

**Warum es kein Saat-Artefakt ist — gemessen über 20.000 Ziehungen:**

| | vorher | nachher |
| --- | ---: | ---: |
| Karten je Hand | 4,00 | 3,00 |
| mittlere Menge einer Karte | 5,04 | **11,17** |
| Summe je Hand | 20,18 | **33,50** |
| verschiedene Werte erreichbar | 8 | **31** |
| Anteil Karten auf vorher unerreichbare Werte | 0 % | **41,4 %** |
| Anteil Meta-Karten | 0 % | 7,2 % |

Eine Hand gibt trotz **einer Karte weniger** rund zwei Drittel mehr, und
41 % aller gezogenen Karten heben einen Wert, den der alte Topf gar nicht
kannte (Zusatzangriffe, Zusatzgeschosse, Durchdringung, Krit, Reichweite,
Flächenschaden). Dazu Seltenheiten mit Faktor bis 4,0. Der Kunstspieler
wird dadurch messbar stärker — das ist eine **Auslegungsfrage**, keine
Reparatur, und sie hängt an derselben Entscheidung wie Vorgang #52
(„Was kostet ein Sturz im endlosen Modus?").

## Die Prüfung riss die Zeilengrenze — geteilt, nicht geduldet

`werkzeuge/pruefe-karten.mjs` stand nach Abschnitt 9 bei **1.078 von
1.000** Zeilen, und `pruefe-altlasten.mjs` hat es gemeldet. Regel 7 ist
eindeutig: teilen. Der Schnitt folgt dem Thema.

| | Zeilen | Prüfungen |
| --- | ---: | ---: |
| `werkzeuge/pruefe-karten.mjs` — Katalog, Seltenheit, Meta-Regeln, Ziehstatistik | 553 | 74 |
| `werkzeuge/pruefe-kartenhand.mjs` — Ort, Bild, Klickweg | 584 | 76 |

Beide nennen einander im Dateikopf. `probeSpieler()` steht **doppelt**,
mit Begründung: Eine Prüfdatei aus einer anderen zu importieren hiesse,
deren Prüfungen mitlaufen zu lassen. Sieben Zeilen sind der kleinere
Preis. In der Wegweiser-Tabelle von `pruefe-alles.mjs` teilen sich beide
**eine** Zeile.
