<!-- Entwurf für CHANGELOG.md, geschrieben auf Zweig
     `bild/sprites-und-bosse`. Nicht in CHANGELOG.md selbst, damit
     parallele Agenten dieselbe Datei nicht gleichzeitig ändern
     (docs/REGELN.md 2). Wird beim Merge dort eingefügt. -->

## Sprites: Trefferzeichen, zwei Bosse, Truhen, Bildfolgen im Format (05.09.2026)

Reine Grafikarbeit auf `runtime/sprite-daten.js`, keine Spiellogik
geändert.

Janniks Ansagen: *„bessere Sprites, vlt sogar mit animation"* ·
*„coole monster mit mehr mechaniken statt nur folgen und schiessen"* ·
*„boss monster!"* · *„optisch klar erkennbare angriffe"*.

**Fünf Trefferzeichen** (`TREFFER` in `runtime/sprite-daten.js`) —
`schnitt`, `wucht`, `feuer`, `frost`, `fluch` — je eine eigene,
sofort unterscheidbare Form statt der bisherigen einfarbigen Funken.
Gemessen gegen den Bannkreis-Boden: Der erste Entwurf von `wucht` war
in Steintönen fast unsichtbar (Abstand 21,4 von 255), jetzt in
Eisentönen (Abstand 83,2) — gefunden am gerenderten Bild, nicht an der
Zahl allein.

**Zwei Bossgegner** als Steigerung des Bestiariums: `gebeinfuerst`
(Steigerung des Knochenritters, 23×21) und `vielfrass` (Steigerung
des Speiers, 21×19, bewusst breiter als hoch). Liegen bereits in
`GEGNER_BILDER` — sobald `spiel/katalog/gegner.mjs` die beiden IDs
bekommt, laufen sie ohne weitere Grafikänderung.

**Zwei Truhen** (`DINGE.truheZu`, `DINGE.truheAuf`) für das
Wellenende-Loot. Die offene Truhe trägt eine zweistufige
Leuchtanimation (siehe unten).

**Das Format kann jetzt Bildfolgen:** `bilder: [bild0, bild1, ...]`
neben `bild` (Pflichtfeld, immer `bilder[0]`). Bestehende
Ein-Bild-Sprites sind unberührt. Genutzt bei `TREFFER.feuer`
(verglimmende Flamme) und `DINGE.truheAuf` (Lichtpuls). Was ein
künftiger Bild-Agent in `runtime/sprites.js` dafür braucht, steht in
`docs/rueckmeldung/sprites-und-bosse.md`.

Neue Prüfungen in `werkzeuge/pruefe-sprites.mjs`: Silhouette
erkennbar (Bildpunkte hängen zu mindestens 90 % zusammen), Kontrast
der Trefferzeichen gegen den Boden, Unversehrtheit von `bilder`-Folgen.
Alle einzeln rot bewiesen.
