/* [Aufgabe: Bild] Ein Bild je Ware — elf mal elf Bildpunkte.

   ── Janniks Ansage ─────────────────────────────────────────────────

   *„im shop haben alle items item bilder/icons und werden in kacheln
   angezeigt. schön verziert."*

   ── Warum eigene Bilder und nicht die Geschosse ────────────────────

   Sechs Fernwaffen haben schon ein Sprite (`GESCHOSSE` in
   `runtime/sprite-daten.js`) — aber das ist das **Geschoss**, nicht die
   Waffe: ein Bolzen, kein Armbrustschaft. Im Laden kauft man das Ding,
   nicht das, was es wirft. Und dreizehn Waffen und alle vierzehn
   Fundstücke hatten überhaupt kein Bild; im Laden stand ihr Name und
   sonst nichts.

   ── Elf mal elf ────────────────────────────────────────────────────

   Ungerade, wie alles hier (`runtime/sprite-daten.js`): eine echte
   Mitte. Und groß genug, dass eine Sense sich von einer Sichel
   unterscheidet — bei sieben Bildpunkten wären beide eine Kurve.
   Größer als elf passt nicht in eine Kachel, die zu viert nur 56
   Bildpunkte breit ist.

   ── Nicht gedreht, deshalb dürfen sie symmetrisch sein ─────────────

   Anders als Figuren und Gegner (`GEGNER_BILDER`) steht ein Warenbild
   immer gleich herum. Die Regel „muss beim Drehen eine Vorderseite
   zeigen" gilt hier also nicht — ein Ring darf ein Ring sein.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/oberflaeche.js` (malt den Laden), `runtime/palette.js`
   (die Farben), `spiel/katalog/waffen.mjs` und
   `spiel/katalog/gegenstaende.mjs` (wozu die Bilder gehören),
   `werkzeuge/pruefe-bilder.mjs` (misst, dass keine Ware ohne Bild
   dasteht und keine zwei gleich aussehen). */

import { FARBEN } from "./palette.js";

export const WARE_KANTE = 11;

/* Die Farbschlüssel gelten für alle Bilder hier gemeinsam — anders als
   bei den Sprites, wo jedes seine eigene Tabelle mitbringt. Bei
   dreiunddreißig Bildern wäre dreiunddreißigmal dieselbe Tabelle
   dreiunddreißig Stellen, an denen ein Ton abweichen kann. */
export const ZEICHEN = {
  k: "kontur",
  e: "eisenTief", E: "eisen", w: "eisenMitte", W: "eisenHell", g: "eisenGlanz",
  l: "leder", L: "lederHell",
  b: "blut", B: "blutHell",
  n: "knochenDunkel", N: "knochen",
  o: "gold", O: "goldHell",
  f: "flammeTief", F: "flamme", H: "flammeHell",
  r: "frost", R: "frostHell",
  s: "seuche", S: "seucheHell",
  v: "bann", V: "bannHell",
  t: "tuch", T: "tuchHell",
  u: "lumpen", U: "lumpenHell"
};

/* ── Die Waffen ──────────────────────────────────────────────────── */

export const WAFFEN_BILDER = {
  /* Sichel: kurze Krümmung, Griff unten links. */
  sichel: [
    "...........", "....gWW....", "..gW...W...", ".gW.....W..",
    ".W.......w.", ".w.......e.", "..w.....e..", "...L.ee....",
    "...L.......", "..LL.......", "..L........"
  ],
  /* Sense: lange Klinge oben, langer Schaft quer. */
  sense: [
    "..gWWWw....", ".gW....We..", "gW......e..", "W..........",
    "...........", "....LL.....", "...LL......", "..LL.......",
    ".LL........", "LL.........", "L.........."
  ],
  /* Richtschwert: breite Klinge, Parierstange, Knauf. */
  richtschwert: [
    "....g......", "....W......", "...WWW.....", "...WWW.....",
    "...WWW.....", "...WeW.....", "..LLLLL....", "....l......",
    "....l......", "...LLL.....", "....o......"
  ],
  /* Morgenstern: Stachelkugel an kurzer Kette. */
  morgenstern: [
    "..e..e.....", "..eWWWe....", ".eWWWWWe...", "eWWgWWWWe..",
    ".eWWWWWe...", "..eWWWe....", "...e.e.....", "....E......",
    ".....E.....", "......L....", ".......L..."
  ],
  /* Wurfmesser: schmale Klinge, kleiner Griff. */
  wurfmesser: [
    "....g......", "....W......", "...WW......", "...WW......",
    "...We......", "..WWe......", "..LLL......", "...l.......",
    "...l.......", "..LLL......", "..........."
  ],
  /* Armbrust: Bogen quer, Schaft längs. */
  armbrust: [
    "e.........e", "eW.......We", ".eW.....We.", "..eWWWWWe..",
    "....LLL....", "....LLL....", "....lll....", "....lll....",
    "....LLL....", "....l......", "...LL......"
  ],
  /* Pechfackel: Flamme über einem Stiel. */
  pechfackel: [
    "....H......", "...HFH.....", "..HFFFH....", "..fFHFf....",
    "...fFf.....", "....f......", "....L......", "....L......",
    "....l......", "....l......", "....L......"
  ],
  /* Frostrune: Steinplatte mit Frostzeichen. */
  frostrune: [
    "..nNNNn....", ".nNRrRNn...", ".NR.r.RN...", ".NrrRrrN...",
    ".NR.r.RN...", ".nNRrRNn...", "..nNNNn....", "...........",
    "...........", "...........", "..........."
  ],
  /* Seuchenglas: Kolben mit Hals. */
  seuchenglas: [
    "....nn.....", "....ss.....", "....ss.....", "...nssn....",
    "..nSssSn...", ".nSsssSn...", ".nSsssSn...", ".nSsssSn...",
    "..nSSSn....", "...nnn.....", "..........."
  ],
  /* Blutdorn: gebogener Dorn mit Blutspitze. */
  blutdorn: [
    ".........B.", "........Bb.", ".......bn..", "......nn...",
    ".....nn....", "....nn.....", "...nn......", "..nn.......",
    "..n........", ".ll........", ".ll........"
  ],
  /* Weihwasserkessel: Topf mit Bügel. */
  weihkessel: [
    "...e...e...", "..e.....e..", "..e.....e..", ".EWWWWWWWE.",
    ".EvVVVVVvE.", ".EvVVVVVvE.", ".EEvVVVvEE.", "..EEvvvEE..",
    "...EEEEE...", "....EEE....", "..........."
  ],
  /* Bannstein: Stein mit Loch, schwebend. */
  bannstein: [
    "...vVVv....", "..vVVVVv...", ".vVV..VVv..", ".vV....Vv..",
    ".vV....Vv..", ".vVV..VVv..", "..vVVVVv...", "...vVVv....",
    "...........", "..VV.VV....", "..........."
  ],
  /* Flammenatem: ein Kegel aus Feuer. */
  flammenatem: [
    ".........H.", "........HF.", ".......HFH.", "......HFFf.",
    ".....HFFF..", "....HFFf...", "...HFFf....", "..HFf......",
    "..Hf.......", ".f.........", "..........."
  ],
  /* Irrlichter: drei kleine Lichter. */
  irrlichter: [
    "..v........", ".vVv.......", "..v........", "......v....",
    ".....vVv...", "......v....", "...........", "...v.......",
    "..vVv......", "...v.......", "..........."
  ],
  /* Moderkranz: ein Ring aus Fäulnis. */
  moderkranz: [
    "...sSSs....", "..sS...Ss..", ".sS.....Ss.", ".S.......S.",
    ".S.......S.", ".S.......S.", ".sS.....Ss.", "..sS...Ss..",
    "...sSSs....", "...........", "..........."
  ],
  /* Bleischleuder: Riemen mit Kugel. */
  bleischleuder: [
    "l.........l", ".l.......l.", "..l.....l..", "...l...l...",
    "....l.l....", "....eEe....", "...eEWEe...", "...EWWWE...",
    "...eEWEe...", "....eEe....", "..........."
  ],
  /* Gewitterrune: Steinplatte mit Blitz. */
  gewitterrune: [
    "..nNNNn....", ".nN.VV.Nn..", ".N.VV..N...", ".N.VVVV.N..",
    ".N..VV..N..", ".nN.VV.Nn..", "..nNNNn....", "...........",
    "...........", "...........", "..........."
  ],
  /* Sternenfall: ein Stern mit Schweif. */
  sternenfall: [
    "........H..", ".......HFH.", "......HFFFH", ".......HFH.",
    "........H..", "......f....", ".....f.....", "....f......",
    "...f.......", "..f........", ".f........."
  ],
  /* Mondsichel: eine weite, dünne Mondklinge. */
  mondsichel: [
    "....gWWw...", "..gW....We.", ".gW.......e", ".W.........",
    ".w.........", ".e.........", "..e........", "...L.......",
    "...L.......", "..LL.......", "..L........"
  ]
};

/* ── Die Fundstücke ──────────────────────────────────────────────── */

export const GEGENSTAND_BILDER = {
  /* Grabamulett: Anhänger an einer Kette. */
  amulett: [
    "..n.....n..", "...n...n...", "....n.n....", ".....n.....",
    "...oOOOo...", "..oO...Oo..", "..O..v..O..", "..O.vVv.O..",
    "..oO.v.Oo..", "...oOOOo...", "..........."
  ],
  /* Eisenhemd: Kettenhemd mit Ärmeln. */
  eisenhemd: [
    "..EE...EE..", ".EWWEEEWWE.", "EWWWWWWWWWE", "EWeWeWeWeWE",
    ".EWeWeWeWE.", ".EWWWWWWWE.", ".EWeWeWeWE.", ".EWWWWWWWE.",
    "..EWWWWWE..", "..EEEEEEE..", "..........."
  ],
  /* Wolfsblut: Fläschchen mit Kork. */
  wolfsblut: [
    "....LL.....", "....ll.....", "...nnn.....", "..nbbbn....",
    "..nbBbn....", "..nbbbn....", "..nbbbn....", "..nbBbn....",
    "..nbbbn....", "...nnn.....", "..........."
  ],
  /* Zehrstein: ein grober Stein. */
  zehrstein: [
    "...........", "....nnn....", "..nnNNNnn..", ".nNNnNnNNn.",
    ".nNnNNNnNn.", ".nNNNnNNNn.", ".nNnNNNnNn.", "..nNNNNNn..",
    "...nnnnn...", "...........", "..........."
  ],
  /* Bannring: ein Ring mit Stein. */
  bannring: [
    "....V......", "...oOo.....", "..oOOOo....", ".oO...Oo...",
    ".O.....O...", ".O.....O...", ".O.....O...", ".oO...Oo...",
    "..oOOOo....", "...ooo.....", "..........."
  ],
  /* Diebesfinger: eine Hand, die greift. */
  diebesfinger: [
    "..n.n.n....", "..N.N.N....", "..N.N.N.n..", "..NNNNN.N..",
    ".nNNNNNNN..", ".NNNNNNNN..", ".NNNNNNN...", "..NNNNN....",
    "...NNN.....", "....u......", "....u......"
  ],
  /* Wurzelbrot: ein Laib. */
  wurzelbrot: [
    "...........", "...uUUUu...", "..uUULUUu..", ".uULLLLLUu.",
    ".uUL.L.LUu.", ".uULLLLLUu.", ".uUUUUUUUu.", "..uUUUUUu..",
    "...uuuuu...", "...........", "..........."
  ],
  /* Grabkerze: Kerze mit Flamme. */
  grabkerze: [
    "....H......", "....F......", "....f......", "...NNN.....",
    "...NNN.....", "...NNN.....", "...NNN.....", "...NNN.....",
    "..nNNNn....", "..nnnnn....", "..........."
  ],
  /* Läuferschuh: ein Stiefel. */
  laeuferschuh: [
    "..LL.......", "..Ll.......", "..Ll.......", "..Ll.......",
    "..Ll.......", "..LLl......", "..LLll.....", "..LLLll....",
    ".LLLLLll...", ".lllllllL..", "..........."
  ],
  /* Bleigewicht: ein Klotz mit Griff. */
  bleigewicht: [
    "....e......", "...e.e.....", "...e.e.....", "..eEEEe....",
    ".eEEEEEe...", ".EEwwwEE...", ".EwWWWwE...", ".EwWWWwE...",
    ".EEwwwEE...", ".eEEEEEe...", "..eeeee...."
  ],
  /* Blutkelch: ein Kelch. */
  blutkelch: [
    ".oOOOOOOOo.", ".oObbbbbOo.", "..oOBbBOo..", "...oOOOo...",
    "....oOo....", ".....O.....", ".....O.....", ".....O.....",
    "...oOOOo...", "..oOOOOOo..", "..........."
  ],
  /* Totenlicht: eine Laterne mit kaltem Licht. */
  totenlicht: [
    "....n......", "...nNn.....", "..nNNNn....", "..NrRrN....",
    "..NRRRN....", "..NrRrN....", "..NRRRN....", "..NrRrN....",
    "..nNNNn....", "..nnnnn....", "..........."
  ],
  /* Knochenpanzer: Rippen über einem Brustschild. */
  knochenpanzer: [
    "..nNNNNNn..", ".nNNNNNNNn.", ".NnNnNnNnN.", ".NNnNnNnNN.",
    ".NnNnNnNnN.", ".NNnNnNnNN.", ".NnNnNnNnN.", ".nNNNNNNNn.",
    "..nNNNNNn..", "...nNNNn...", "....nnn...."
  ],
  /* Reliquie: ein Schrein mit Kreuz. */
  reliquie: [
    "....o......", "...ooo.....", "....o......", ".oOOOOOOOo.",
    ".OovvvvvoO.", ".OovVVVvoO.", ".OovVvVvoO.", ".OovVVVvoO.",
    ".OovvvvvoO.", ".oOOOOOOOo.", "..ooooooo.."
  ]
};

/* Das Bild einer Ware. Gibt `null` zurück, wenn es keines gibt — der
   Laden malt dann eine leere Kachel statt eines falschen Bildes, und
   `werkzeuge/pruefe-bilder.mjs` sorgt dafür, dass der Fall im
   Katalog nicht vorkommt. */
export function bildFuerWare(sorte, id) {
  const raster = sorte === "waffe" ? WAFFEN_BILDER[id] : GEGENSTAND_BILDER[id];
  return raster ?? null;
}

/* Ein Warenbild malen. Wie bei den Wertzeichen mit `fillRect` je
   Bildpunkt und ohne vorbereitete Leinwand: Es sind höchstens sechzehn
   Kacheln gleichzeitig zu sehen (vier Angebote mal vier Spieler), also
   ein paar hundert Rechtecke — und dafür braucht diese Datei kein
   `document` und läuft in der Prüfung mit. */
export function maleWare(c, raster, x, y, gedaempft = false) {
  for (let zy = 0; zy < raster.length; zy++) {
    const zeile = raster[zy];
    for (let zx = 0; zx < zeile.length; zx++) {
      const z = zeile[zx];
      if (z === ".") continue;
      const name = ZEICHEN[z];
      if (!name) continue;
      c.fillStyle = gedaempft ? FARBEN.steinHell : FARBEN[name];
      c.fillRect(x + zx, y + zy, 1, 1);
    }
  }
}
