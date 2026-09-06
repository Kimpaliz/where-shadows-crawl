/* [Aufgabe: Bild] Die Pixelgrafik — als Text, nicht als Bilddatei.

   Eine Zeile je Bildpunktzeile, ein Zeichen je Bildpunkt, `.` ist
   durchsichtig. Welches Zeichen welche Farbe bedeutet, steht je Sprite
   in `zeichen`; die Werte sind Namen aus `runtime/palette.js`.

   ── Warum kein PNG ─────────────────────────────────────────────────

   Drei Gründe, und alle drei sind praktisch:

   1. **Diffbar.** Wer ein Auge verschiebt, sieht im Vergleich genau
      eine geänderte Zeile — bei einer Bilddatei sieht man „Datei
      geändert".
   2. **Prüfbar.** `werkzeuge/pruefe-sprites.mjs` liest dieselben
      Zeilen und meldet ungleiche Breiten oder unbekannte Zeichen.
   3. **Umfärbbar.** Vier Jäger sind derselbe Umriss in vier Farben —
      ohne vier Dateien.

   ── Alle Figuren schauen nach oben ─────────────────────────────────

   Gezeichnet wird jede Figur so, als liefe sie zum oberen Bildrand.
   `runtime/sprites.js` dreht sie beim Laden in sechzehn Richtungen.
   Deshalb müssen sie **asymmetrisch** sein: Eine Figur, die von oben
   wie ein Kreis aussieht, sieht gedreht genauso aus, und die Drehung
   wäre unsichtbar. Genau darauf sieht die Prüfung nach.

   ⚠️ **Keine Rechnung in den Zeilen.** Ein früherer Stand baute
   einzelne Zeilen mit `.replace()` zusammen, weil ich mich beim Zählen
   nicht festlegen wollte — zwei davon hatten am Ende die falsche
   Breite, und es fiel niemandem auf. Ein Bildpunktraster steht da oder
   es steht nicht da.

   ── Bildfolgen: `bilder` neben `bild` ──────────────────────────────

   Ein Sprite **kann** zusätzlich `bilder: [muster1, muster2, ...]`
   tragen — mehrere gleich große Raster für eine Animation. `bild`
   bleibt Pflicht und ist immer `bilder[0]`, damit jeder bestehende
   Aufruf, der nur `sprite.bild` liest (`runtime/sprites.js`,
   `werkzeuge/pruefe-sprites.mjs`), unverändert weiterläuft — er sieht
   dann einfach das erste Bild und weiß nichts von den übrigen. Bisher
   nutzt das nur `DINGE.truheAuf` (zwei Bilder, ein Lichtpuls). Wie ein
   künftiger Bild-Agent daraus wirklich eine Animation macht, steht in
   `docs/rueckmeldung/sprites-und-bosse.md`.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprites.js` (dreht und rendert), `runtime/palette.js`
   (die Farbnamen), `runtime/zeichnen.js` (malt sie hin). */

/* Die Jäger. `H`/`M`/`D` werden je Spieler umgefärbt — sie stehen
   nicht in der Palette, sondern kommen aus `JAEGER_FARBEN`.
   Der dunkle Fleck in Zeile 3 ist die Kapuzenöffnung: Er zeigt nach
   vorn und ist das Einzige, woran man die Blickrichtung sieht. */
export const JAEGER = {
  zeichen: { k: "kontur", H: "@hell", M: "@mittel", D: "@dunkel", h: "haut" },
  bild: [
    "....kkk....",
    "...kHHHk...",
    "..kHHHHHk..",
    "..kHDDDHk..",
    "..kHDDDHk..",
    ".kkHHHHHkk.",
    ".kMHHHHHMk.",
    ".kMMHHHMMk.",
    ".kMMMMMMMk.",
    ".kMMMMMMMk.",
    "..kMMMMMk..",
    "..kMMMMMk..",
    "...kkkkk..."
  ]
};

/* Der Schlag einer Nahkampfwaffe: ein Bogen vor der Figur. Er wird
   mitgedreht und liegt deshalb immer in Laufrichtung. */
export const SCHLAGBOGEN = {
  zeichen: { w: "flammeHell", g: "flamme" },
  bild: [
    "..wwwwwww..",
    ".wgggggggw.",
    "wgg.....ggw",
    "wg.......gw",
    "g.........g",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "..........."
  ]
};

export const GEGNER_BILDER = {
  /* Schlurfer — hängende Schultern, ein Arm länger als der andere.
     Die Schräge ist das, woran man ihn im Gewühl erkennt. */
  schlurfer: {
    zeichen: { k: "kontur", f: "fleisch", F: "fleischHell", l: "lumpen", L: "lumpenHell" },
    bild: [
      "...kkk...",
      "..kfFfk..",
      "..kFFFk..",
      ".kffFffk.",
      ".kfffffk.",
      "kLLfffLLk",
      "kLLLfLLLk",
      "kLLLLLLLk",
      ".kLLlLLk.",
      "..kLlLk..",
      "...kkk..."
    ]
  },

  /* Balg — winzig, kommt nie allein. */
  balg: {
    zeichen: { k: "kontur", f: "fleisch", F: "fleischHell", l: "lumpen" },
    bild: [
      "..kkk..",
      ".kFFFk.",
      "kfFFFfk",
      "kfffffk",
      "kfffffk",
      ".klffk.",
      "..kkk.."
    ]
  },

  /* Hetzer — schmal, nach vorn gebeugt, die Beine hinter sich. */
  hetzer: {
    zeichen: { k: "kontur", f: "fleisch", F: "fleischHell", l: "lumpen" },
    bild: [
      "..kkk..",
      ".kfFfk.",
      ".kFFFk.",
      "kkfffkk",
      "klffflk",
      "klffflk",
      ".klflk.",
      ".kl.lk.",
      "..k.k..",
      "..k.k..",
      "..k.k.."
    ]
  },

  /* Aaskrähe — von oben zwei ausgebreitete Schwingen. Sie ist breiter
     als lang; das unterscheidet sie im Gewühl von allem anderen. */
  aaskraehe: {
    zeichen: { k: "kontur", s: "tuch", S: "tuchHell", b: "gold" },
    bild: [
      "......b......",
      ".....kbk.....",
      "....kkSkk....",
      "..kkSSSSSkk..",
      "kkSssSSSssSkk",
      "kSsskSSSksssk",
      ".kkk.kSk.kkk.",
      ".....kSk.....",
      "......k......"
    ]
  },

  /* Speier — aufgedunsen, mit offenem Schlund nach vorn. */
  speier: {
    zeichen: { k: "kontur", f: "fleisch", F: "fleischHell", g: "seuche", G: "seucheHell", l: "lumpen" },
    bild: [
      "...kkkk....",
      "..kfGGfk...",
      ".kfGGGGfk..",
      "kffgGGgffk.",
      "kfFffffFfk.",
      "kfFFffFFfk.",
      "klfFFFFflk.",
      "klfffffflk.",
      ".klllllllk.",
      "..kllllk...",
      "...kkkk...."
    ]
  },

  /* Wächter — Schulterpanzer, breit, kaum zu verschieben. */
  waechter: {
    zeichen: { k: "kontur", e: "eisen", E: "eisenHell", d: "eisenDunkel", f: "fleisch", r: "blut" },
    bild: [
      "....kkkkk....",
      "...kEEEEEk...",
      "..kEEfffEEk..",
      "..kEffrffEk..",
      ".kkEEfffEEkk.",
      "kkEEEEEEEEEkk",
      "kEEEdddddEEEk",
      "kEEdddddddEEk",
      "kdddddddddddk",
      ".kdddddddddk.",
      "..kdddddddk..",
      "...kdddddk...",
      "....kkkkk...."
    ]
  },

  /* Knochenritter — Helm mit Sehschlitz, Knochen statt Fleisch. */
  knochenritter: {
    zeichen: { k: "kontur", b: "knochen", B: "knochenDunkel", E: "eisenHell", d: "eisenDunkel" },
    bild: [
      "....kkkkk....",
      "...kbbbbbk...",
      "..kbbdddbbk..",
      "..kbbdddbbk..",
      "..kbbbbbbbk..",
      ".kkEbbbbbEkk.",
      "kEEEbBbBbEEEk",
      "kEEBBBbBBBEEk",
      ".kBBBBBBBBBk.",
      ".kBBBkkkBBBk.",
      "..kBBk.kBBk..",
      "..kBk...kBk..",
      "...k.....k..."
    ]
  },

  /* Hauptmann der Nacht — gehörnter Helm, Mantel. Er ist das Einzige,
     was größer ist als ein Bannkreis-Stein; das allein macht ihn
     lesbar, bevor man seine Lebensleiste sieht. */
  hauptmann: {
    zeichen: { k: "kontur", E: "eisenHell", r: "blut", R: "blutHell", t: "tuch", T: "tuchHell" },
    bild: [
      "..k.............k..",
      ".kEk...........kEk.",
      ".kEk..kkkkk....kEk.",
      ".kEEkkEEEEEkk.kEEk.",
      "..kEEEEEEEEEEEEEk..",
      "...kEEErrrEEEEk....",
      "...kEErrRrrEEk.....",
      "..kkEErrRrrEEkk....",
      ".kEEEEErrrEEEEEk...",
      "kEEEEEEEEEEEEEEEk..",
      "kTTEEEEEEEEEEETTk..",
      "kTTTEEEEEEEEETTTk..",
      "ktTTTEEEEEEETTTtk..",
      "kttTTTTTTTTTTTttk..",
      ".kttTTTTTTTTTttk...",
      ".kttttTTTTTttttk...",
      "..kttttttttttk.....",
      "...kttttttttk......",
      "....kkkkkkkk......."
    ]
  },

  /* Gebeinfürst — Steigerung des Knochenritters, nicht dessen Ersatz:
     dieselbe Familie (Knochen unter Eisenresten), aber mit gehörnter
     Krone, einem gläsern-violett glimmenden Rune-Riss in der Brust und
     einem Umhang, der breiter ist als die Schultern und am Saum in
     fünf ungleichen Zacken ausreißt. 23 × 21 (beide ungerade) — spürbar
     größer als der Hauptmann (20 × 19), bislang die größte Figur.
     ⚠️ Noch **ohne** Eintrag in `spiel/katalog/gegner.mjs` — das ist
     Sache des Spiellogik-Agenten. `werkzeuge/pruefe-sprites.mjs` nimmt
     ihn deshalb befristet von der Gegenrichtungsprüfung aus (siehe
     dort). Sobald der Katalogeintrag da ist, läuft er ohne weitere
     Grafikänderung — die Silhouette ist bereits vollständig geprüft. */
  gebeinfuerst: {
    zeichen: {
      k: "kontur", b: "knochen", D: "knochenDunkel", E: "eisenHell",
      e: "eisenDunkel", l: "lumpen", L: "lumpenHell", g: "bann", G: "bannHell"
    },
    bild: [
      "...........b...........",
      "........D..b..D........",
      ".....k..D.bbb.D..k.....",
      ".....k.DDbbbbbDD.k.....",
      ".....kbbbbbbbbbbbk.....",
      "....kbbbbbbbbbbbbbk....",
      "....kDDDDDDDDDDDDDk....",
      "....kbbbbbbbbbbbbbk....",
      ".kEEbbbbbbbbbbbbbbbEEk.",
      ".kEEEDDDDDDDDDDDDDEEEk.",
      "..kbbbbbbbbbbbbbbbbbk..",
      "..kbbbbbbbbbbbbbbbbbk..",
      "...kbbbbbbbGbbbbbbbk...",
      "...kbbbbbDDgDDbbbbbk...",
      "...kbbbbbDDDDDbbbbbk...",
      ".klllllllllllllllllllk.",
      "kLLLLLLLLLLLLLLLLLLLLLk",
      "klllllllllllllllllllllk",
      ".LLL.LLL..LLL..LLL.LLL.",
      "..ll..ll..lll..ll..ll..",
      "....D..l.D.l.D.l..D...."
    ]
  },

  /* Vielfraß — Steigerung des Speiers: derselbe aufgedunsene Leib mit
     offenem Schlund, nur so weit angeschwollen, dass er nicht mehr
     zurückweicht, sondern die Enge sucht. Bewusst BREITER als hoch
     (21 × 19, gedrungen) statt hoch aufragend wie der Gebeinfürst —
     die beiden Bosse sollen sich auch als reine Silhouette nicht
     verwechseln lassen. Geschwürflecken (seuche/seucheHell) markieren,
     wo als Nächstes Säure hochkommt — das ist Sache des
     Spiellogik-Agenten, hier nur die Stelle dafür vorgesehen.
     ⚠️ Ebenfalls noch ohne Katalogeintrag, siehe `gebeinfuerst`. */
  vielfrass: {
    zeichen: { k: "kontur", f: "fleisch", F: "fleischHell", g: "seuche", G: "seucheHell", l: "lumpen", b: "knochen" },
    bild: [
      "........bb.bb........",
      "......kbbbkbbbk......",
      ".....kGGGkkkGGGk.....",
      "...kffffkkkkkffffk...",
      "..kffffffgggffffffk..",
      ".kfffffffffffffffffk.",
      "kfffffffFFFFFfffffffk",
      "kfffffffffffffffffffk",
      "kfffffffgggggfffffffk",
      "kfffffffffffffffffffk",
      "kffffffgggGgggffffffk",
      "kfffffffffffffffffffk",
      ".kfffffffffffffffffk.",
      "..k.lll..lll..lll.k..",
      "...k.ll..lll..ll.k...",
      ".....F...F.F...F.....",
      ".....f...f.f...f.....",
      ".....k...k.k...k.....",
      ".........k.k........."
    ]
  }
};

/* Kleinkram, der **nicht** gedreht wird — ein Goldstück hat keine
   Vorderseite, und ein Bannstein liegt, wie er liegt. */
export const DINGE = {
  gold: {
    zeichen: { k: "kontur", g: "gold", G: "goldHell" },
    bild: [
      ".kk.",
      "kGGk",
      "kggk",
      ".kk."
    ]
  },
  goldGross: {
    zeichen: { k: "kontur", g: "gold", G: "goldHell" },
    bild: [
      ".kkk.",
      "kGGGk",
      "kGggk",
      "kgggk",
      ".kkk."
    ]
  },
  stein: {
    zeichen: { k: "kontur", s: "stein", S: "steinHell", d: "steinDunkel" },
    bild: [
      ".kkkk.",
      "kSSSdk",
      "kSssdk",
      "kdsddk",
      ".kkkk."
    ]
  },
  /* Die eine Fackel in der Mitte des Bannkreises (Janniks Ansage vom
     04.09.2026). Sie ist von oben eine Feuerschale: ein eiserner Ring
     mit Glut darin. Größer als alles andere auf dem Boden — sie ist
     das einzige Licht der Welt und muss auch so aussehen. */
  feuerschale: {
    zeichen: { k: "kontur", e: "eisenDunkel", s: "eisen", f: "glut", F: "flamme", G: "flammeHell" },
    bild: [
      "...kkkkk...",
      ".kkeeeeekk.",
      "kkesssssekk",
      "kesfffffsek",
      "kesfFFFfsek",
      "kesfFGFfsek",
      "kesfFFFfsek",
      "kesfffffsek",
      "kkesssssekk",
      ".kkeeeeekk.",
      "...kkkkk..."
    ]
  },

  /* Loot-Truhe, geschlossen — liegt in der Welle und wird am Wellenende
     geöffnet (Janniks Wunsch). Gewölbter Deckel mit Eisenband, dunkle
     Nahtlinie zur Kiste, Goldschloss. Nicht gedreht, wie jedes `DINGE`. */
  truheZu: {
    zeichen: { k: "kontur", l: "leder", L: "lederHell", e: "eisen", E: "eisenHell", g: "gold" },
    bild: [
      "..kLLLk..",
      ".kLLLLLk.",
      "keeeeeeek",
      "kkkkkkkkk",
      "lllllllll",
      "llllgllll",
      "eeeeeeeee"
    ]
  },

  /* Dieselbe Truhe, offen — der Deckel kippt nach hinten (schmaler
     Balken oben statt der Wölbung), darunter glüht der Fund. Trägt
     zusätzlich `bilder`: ein Lichtpuls aus zwei Bildern, damit das
     Leuchten in der Dunkelheit auffindbar bleibt, statt ein stehendes
     Bild zu sein — die erste Nutzung der Bildfolgen-Möglichkeit aus
     dem neuen Format (siehe Dateikopf). `bild` ist wie immer
     `bilder[0]`. */
  truheAuf: {
    zeichen: { k: "kontur", l: "leder", L: "lederHell", e: "eisen", E: "eisenHell", g: "gold", G: "goldHell" },
    bild: [
      "klllllllk",
      "eeeeeeeee",
      "kkkkkkkkk",
      "kgggGgggk",
      "kGGGgGGGk",
      "kgggggggk",
      "lllllllll",
      "llllgllll",
      "eeeeeeeee"
    ],
    bilder: [
      [
        "klllllllk",
        "eeeeeeeee",
        "kkkkkkkkk",
        "kgggGgggk",
        "kGGGgGGGk",
        "kgggggggk",
        "lllllllll",
        "llllgllll",
        "eeeeeeeee"
      ],
      [
        "klllllllk",
        "eeeeeeeee",
        "kkkkkkkkk",
        "kgggggggk",
        "kgggggggk",
        "kgggggggk",
        "lllllllll",
        "llllgllll",
        "eeeeeeeee"
      ]
    ]
  }
};

/* Geschosse. Sie werden über 16 Richtungen gedreht, damit ein
   Wurfmesser in Flugrichtung zeigt — bei einem Bolzen sieht man dann
   sofort, ob er kommt oder geht.

   ── Was vorher war, gemessen am 05.09.2026 ─────────────────────────

   **Drei der sechs Geschosse hatten exakt dieselbe Form** — Frostrune,
   Bannstein und der Gegnerspeichel waren alle `.#.|###|.#.`, ein
   Kreuz von drei mal drei Punkten; nur die Farbe trennte sie.

   Und sie waren **winzig**: fünf gesetzte Bildpunkte. In den vier
   diagonalen Richtungen (2, 6, 10, 14) wird aus dem Kreuz ein **X**,
   dessen fünf Punkte einander nur noch über Eck berühren — dieselbe
   Anzahl, eine andere Gestalt, und beides bei einer Fläche, bei der
   ein einziger Punkt ein Fünftel des Geschosses ist.

   Gemessen über alle sechs: **5 bis 12** Bildpunkte, vier davon genau
   fünf. Die neuen tragen **11 bis 21**. Die untere Zahl ist die
   wichtige — `seuchenglas` liegt mit 11 nur einen Punkt über der
   Schranke von zehn, die `pruefe-angriffe.mjs` zieht.

   ⚠️ **Korrektur einer früheren Fassung dieses Kommentars:** Hier
   stand „zerfiel in fünf Einzelpunkte". Das stimmt nur unter der
   strengen Vierer-Nachbarschaft; zählt man Diagonalen mit — und so
   sieht das Auge —, hängt das X zusammen. Der Befund ist nicht der
   Zerfall, sondern die **Winzigkeit samt Formwechsel**. Die Zahl kam
   aus der falschen der beiden Messungen.

   Zwei Sprites verletzten außerdem die Regel, dass gedrehte Bilder
   **ungerade** Kantenlängen brauchen (`armbrust` 1×6, `seuchenglas`
   4×4): Bei gerader Kante liegt die Quellmitte auf einem halben
   Bildpunkt, und die Figur wandert bei jeder Drehung.

   ── Wie die neuen entworfen sind ───────────────────────────────────

   **Die Ziffer ist die Stufe der Rampe** (`1` tief … `5` glanz, siehe
   `runtime/palette.js`). Damit steht der Farbverlauf im Bild selbst
   statt in einer Tabelle daneben — Janniks Ansage: *„feine farbliche
   übergänge."*

   Jedes Geschoss hat ein **eigenes Merkmal**, das jede Drehung
   übersteht, weil bei fünf mal sieben Bildpunkten kein Detail
   überlebt — nur die grobe Gestalt:

   | | Merkmal | wogegen es abgrenzt |
   | --- | --- | --- |
   | `wurfmesser` | schlanke Klinge, **reines Eisen** | die Armbrust, die Braun trägt |
   | `armbrust` | **braune Befiederung** hinten | das Messer, das kein Braun hat |
   | `frostrune` | kompakte Raute, hell im Kern | den Ring des Bannsteins |
   | `seuchenglas` | **ausgefranster Stern** | den vollen Klecks des Speichels |
   | `bannstein` | **ein Loch in der Mitte** — das einzige | alles andere |
   | `speichel` | voller runder Klecks | das Seuchenglas, das ebenfalls grün ist |

   Die Zeile `seuchenglas` gegen `speichel` ist keine Zierde: Das eine
   wirft der Spieler, das andere spuckt ein Gegner. Wer beide für
   dasselbe hält, weicht dem Falschen aus. */
export const GESCHOSSE = {
  wurfmesser: {
    zeichen: {
      k: "kontur",
      1: "eisenTief", 2: "eisen", 3: "eisenMitte", 4: "eisenHell", 5: "eisenGlanz"
    },
    bild: ["..5..", ".45..", ".343.", ".343.", ".232.", ".1k1.", "..k.."]
  },
  armbrust: {
    zeichen: {
      k: "kontur", l: "lederHell",
      1: "eisenTief", 2: "eisen", 3: "eisenMitte", 4: "eisenHell", 5: "eisenGlanz"
    },
    bild: ["..5..", "..4..", ".232.", ".232.", "l232l", "ll2ll", ".lkl."]
  },
  frostrune: {
    zeichen: {
      1: "frostTief", 2: "frost", 3: "frostMitte", 4: "frostHell", 5: "frostGlanz"
    },
    bild: ["..3..", ".454.", "35453", ".454.", "..3.."]
  },
  seuchenglas: {
    zeichen: {
      1: "seucheTief", 2: "seuche", 3: "seucheMitte", 4: "seucheHell", 5: "seucheGlanz"
    },
    bild: ["..4..", "2.5.2", ".454.", "2.3.2", "..2.."]
  },
  bannstein: {
    zeichen: {
      1: "bannTief", 2: "bann", 3: "bannMitte", 4: "bannHell", 5: "bannGlanz"
    },
    /* Das Loch ist das Merkmal — kein anderes Geschoss hat eines.
       Der erste Entwurf war ein größerer Ring; er zerfiel in den vier
       diagonalen Richtungen in vier Stücke (vom Wächter gefangen, im
       Bild hatte ich es übersehen). Von sechs geprüften Fassungen ist
       dies die mit den wenigsten Bildpunkten, die ihr Loch in **allen
       sechzehn** Drehungen behält. */
    bild: ["..3..", ".454.", "35.53", ".454.", "..3.."]
  },
  speichel: {
    zeichen: {
      1: "seucheTief", 2: "seuche", 3: "seucheMitte", 4: "seucheHell", 5: "seucheGlanz"
    },
    bild: [".343.", "34543", "34543", ".343.", "..2.."]
  },

  /* ── Die zwei neuen Fernwaffen (06.09.2026) ───────────────────────

     Beide muessen sich von den sechs oben unterscheiden, und zwar in
     der **Silhouette** und nicht nur in der Farbe — genau der Fall,
     der `werkzeuge/pruefe-angriffe.mjs` ueberhaupt erst ausgeloest hat
     (drei Geschosse waren dasselbe Kreuz aus fuenf Punkten). */

  /* Ein Irrlicht: Kopf mit Schweif nach hinten. Der Schweif ist der
     Unterschied zur Frostrune, die dasselbe Kreuz **ohne** ihn ist —
     und er zeigt beim Drehen die Flugrichtung an, was bei einem
     Schwarm aus vier Stueck der Unterschied zwischen „Wolke" und
     „Klumpen" ist. */
  irrlichter: {
    zeichen: {
      1: "bannTief", 2: "bann", 3: "bannMitte", 4: "bannHell", 5: "bannGlanz"
    },
    bild: ["..5..", ".454.", "34543", "..2..", "..1.."]
  },

  /* Die Bleikugel: voll, schwer, ohne Spitze. Sie ist das dichteste
     Geschoss im Katalog (21 von 25 Punkten gesetzt) — das passt zu
     einer Waffe, die nah zerschlaegt und weit weg nur noch faellt. */
  bleischleuder: {
    zeichen: {
      1: "eisenDunkel", 2: "eisenTief", 3: "eisen", 4: "eisenMitte", 5: "eisenHell"
    },
    bild: [".343.", "34543", "35553", "34443", ".232."]
  }
};

/* Trefferzeichen — ein eigenes Bild je Schadensart, damit man sieht,
   *was* gerade trifft, statt nur *dass* etwas trifft (Janniks
   Kernbeschwerde: „optisch klar erkennbare Angriffe"). Fünf Arten sind
   verbindlich: schnitt, wucht, feuer, frost, fluch — die Schlüssel hier
   sind bewusst genau diese fünf Wörter, damit ein künftiger Aufruf
   `TREFFER[schadensart]` ohne Übersetzungstabelle auskommt.

   Nicht gedreht (wie `DINGE`): ein Treffer hat keine Blickrichtung, nur
   einen Ort. Deshalb dürfen sie auch punktsymmetrisch sein — anders als
   bei `GEGNER_BILDER` ist das hier kein Fehler.

   `werkzeuge/pruefe-sprites.mjs` prüft zusätzlich den Kontrast gegen
   den Bannkreis-Boden: Der erste Entwurf von `wucht` malte in
   Steintönen (`steinHell`/`stein`/`steinDunkel`) — Farben, die für den
   Boden selbst gedacht sind und darauf fast unsichtbar waren (heller
   Bodenton 52,8 von 255, hellste Wucht-Farbe nur 74,2 — Abstand 21,4).
   Jetzt Eisentöne (Abstand 83,2). Gemessen mit
   `werkzeuge/pruefe-sprites.mjs`, Abschnitt „Trefferzeichen lesbar". */
export const TREFFER = {
  /* Schnitt: eine dicke helle Diagonale mit dunklem Rand, Blutstropfen
     an beiden Enden — liest sich als Klingenspur, nicht als Fleck. */
  schnitt: {
    zeichen: { k: "kontur", e: "eisenHell", r: "blutHell" },
    bild: [
      "..r......",
      "rek......",
      ".kek.....",
      "..kek....",
      "...kek...",
      "....kek..",
      ".....kek.",
      "......ker",
      "......r.."
    ]
  },

  /* Wucht: ein kompakter Kreuzschlag mit hellem Kern und Schutt in den
     Ecken — bewusst ein dichter Block statt eines offenen Sterns, damit
     er sich von `frost` klar unterscheidet. */
  wucht: {
    zeichen: { c: "eisenHell", m: "eisen", o: "eisenDunkel" },
    bild: [
      "....o....",
      ".o.mmm.o.",
      "...mmm...",
      ".mmcccmm.",
      "ommcccmmo",
      ".mmcccmm.",
      "...mmm...",
      ".o.mmm.o.",
      "....o...."
    ]
  },

  /* Feuer: eine Flammenzunge, unten breit, oben spitz — wie die
     Feuerschale, nur klein und kurzlebig. Zwei Funken lösen sich ab.
     Zweites Bild (`bilder[1]`) ist dieselbe Flamme, schon kleiner und
     ohne den weißglühenden Kern — das Verglimmen. */
  feuer: {
    zeichen: { g: "glut", f: "flamme", G: "flammeHell" },
    bild: [
      ".g..G....",
      "...fGf.g.",
      "...fGf...",
      "..gfGfg..",
      "..gfGfg..",
      ".ggfGfgg.",
      ".ggfGfgg.",
      ".ggfGfgg.",
      "..gfGfg.."
    ],
    bilder: [
      [
        ".g..G....",
        "...fGf.g.",
        "...fGf...",
        "..gfGfg..",
        "..gfGfg..",
        ".ggfGfgg.",
        ".ggfGfgg.",
        ".ggfGfgg.",
        "..gfGfg.."
      ],
      [
        ".........",
        ".........",
        "....f....",
        "...gfg...",
        "...gfg...",
        "..ggfgg..",
        "..ggfgg..",
        "...gfg...",
        "...gfg..."
      ]
    ]
  },

  /* Frost: ein dünner Achtstrahl-Stern mit kleinen Ästen an den
     Kardinalspitzen — ein Kristall, keine Explosion. Dünn und weit
     ausgreifend statt dick und kompakt (Gegenteil von `wucht`). */
  frost: {
    zeichen: { e: "frost", h: "frostHell" },
    bild: [
      "h...h...h",
      ".e.heh.e.",
      "..e.e.e..",
      ".h.eee.h.",
      "heeeheeeh",
      ".h.eee.h.",
      "..e.e.e..",
      ".e.heh.e.",
      "h...h...h"
    ]
  },

  /* Fluch: ein Ring mit vier abstehenden Widerhaken und einem
     Augenschlitz in der Mitte — die einzige Trefferform mit einem
     Loch in der Mitte, das ist ihr Erkennungszeichen. */
  fluch: {
    zeichen: { b: "bann", B: "bannHell", k: "kontur" },
    bild: [
      ".b.....b.",
      "..bbbbb..",
      ".b.....b.",
      ".b..B..b.",
      ".b..k..b.",
      ".b..B..b.",
      ".b.....b.",
      "..bbbbb..",
      ".b.....b."
    ]
  }
};
