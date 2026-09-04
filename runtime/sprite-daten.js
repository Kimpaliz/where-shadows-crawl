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
    "..kkHHHkk..",
    ".kHHHDHHHk.",
    ".kHHDhDHHk.",
    ".kHHHDHHHk.",
    "kkHHHHHHHkk",
    "kMMHHHHHMMk",
    "kMMMHHHMMMk",
    ".kMMMMMMMk.",
    ".kMMMMMMMk.",
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
      ".kfFFFfk.",
      ".kffFffk.",
      "kLffffflk",
      "kLLfffllk",
      "kLLLfllk.",
      ".kLLlllk.",
      "..kLllk..",
      "...kkk..."
    ]
  },

  /* Balg — winzig, kommt nie allein. */
  balg: {
    zeichen: { k: "kontur", f: "fleisch", F: "fleischHell", l: "lumpen" },
    bild: [
      "..kk..",
      ".kFFk.",
      "kfFFfk",
      "kffffk",
      ".klfk.",
      "..kk.."
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
      "...kEErRRRrEEk.....",
      "..kkEErRRRrEEkk....",
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
  fackel: {
    zeichen: { k: "kontur", f: "flamme", F: "flammeHell", g: "glut", l: "leder", L: "lederHell" },
    bild: [
      "..F..",
      ".FfF.",
      "FfgfF",
      ".fgf.",
      "..g..",
      ".kLk.",
      ".klk.",
      ".klk."
    ]
  }
};

/* Geschosse. Sie werden gedreht, damit ein Wurfmesser in Flugrichtung
   zeigt — bei einem Bolzen sieht man dann sofort, ob er kommt oder
   geht. */
export const GESCHOSSE = {
  wurfmesser: {
    zeichen: { k: "kontur", e: "eisenHell", l: "leder" },
    bild: ["k", "e", "e", "k", "l"]
  },
  armbrust: {
    zeichen: { k: "kontur", e: "eisenHell", l: "lederHell" },
    bild: ["e", "e", "k", "k", "l", "l"]
  },
  frostrune: {
    zeichen: { f: "frost", F: "frostHell" },
    bild: [".F.", "FfF", ".F."]
  },
  seuchenglas: {
    zeichen: { g: "seuche", G: "seucheHell" },
    bild: [".gg.", "gGGg", "gGGg", ".gg."]
  },
  bannstein: {
    zeichen: { b: "bann", B: "bannHell" },
    bild: [".B.", "BbB", ".B."]
  },
  speichel: {
    zeichen: { g: "seuche", G: "seucheHell" },
    bild: [".g.", "gGg", ".g."]
  }
};
