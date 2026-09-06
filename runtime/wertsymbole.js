/* [Aufgabe: Bild] Ein Zeichen je Wert — sieben mal sieben Bildpunkte.

   ── Janniks Ansage ─────────────────────────────────────────────────

   *„alle werte die ich genannt habe sollen genommen werden mit icons in
   der werte übersicht."*

   ── Warum es nicht fünfundfünfzig gezeichnete Zeichen sind ─────────

   Es gibt 55 Werte (`spiel/werte.mjs`), und 32 davon entstehen nicht
   von Hand, sondern werden **erzeugt**: fünf Achsen je Schadensart und
   eine Neigung je Kartengruppe. Für die 32 fünfunddreißig einzelne
   Raster zu zeichnen hieße, dieselbe Aussage zweiunddreißigmal
   aufzuschreiben — und beim nächsten Wert wäre eines vergessen. Genau
   der Fehler, den `erzeugeArtWerte()` im Regelkern schon einmal
   vermieden hat.

   Deshalb dieselbe Bauart wie dort:

   | Werte | Zeichen | Farbe |
   | --- | --- | --- |
   | die 23 getippten | je eines von Hand | fest je Wert |
   | `schaden_<art>_flach` … `widerstand_<art>` | **fünf** Raster, eines je Achse | die Farbe der **Schadensart** |
   | `neigung_<gruppe>` | **ein** Raster | die Farbe der Gruppe |

   Damit sind 25 Art-Werte fünf Raster in fünf Farben — man erkennt an
   der **Form**, worum es geht (Schaden, Krit, Widerstand), und an der
   **Farbe**, welche Art. Dieselbe Doppelkodierung wie bei den
   Trefferzeichen und den schwebenden Zahlen: Wer eines von beidem
   nicht liest, liest das andere.

   ── Warum sieben mal sieben ────────────────────────────────────────

   Eine Zeile der Werteliste ist sieben Bildpunkte hoch
   (`ZEILENHOEHE` in `runtime/werteliste.js`). Ein Zeichen, das höher
   wäre, ragte in die Nachbarzeile; eines, das kleiner wäre, verschenkte
   die Höhe, die ohnehin dasteht. Sieben ist außerdem ungerade und hat
   damit eine echte Mitte — dieselbe Regel wie bei den Sprites
   (`runtime/sprite-daten.js`).

   Bei sieben Bildpunkten trägt eine Form **eine** Aussage. Ein Herz,
   ein Schild, ein Schwert: ja. Ein Schwert mit Griffwicklung: nein —
   das wird ein Fleck. Deshalb ist hier alles Silhouette.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/werteliste.js` (malt sie), `runtime/palette.js` (die
   Farben), `spiel/werte.mjs` (die Werte, zu denen sie gehören),
   `spiel/schadensarten.mjs` und `spiel/katalog/karten.mjs` (die
   Farben der Arten und Gruppen),
   `werkzeuge/pruefe-bilder.mjs` (misst, dass jeder Wert eines hat
   und keine zwei gleich aussehen). */

import { FARBEN } from "./palette.js";
import { ART_NACH_ID, ART_IDS, STANDARD_ART } from "../spiel/schadensarten.mjs";
import { GRUPPEN } from "../spiel/werte.mjs";

export const SYMBOL_KANTE = 7;

/* `#` ist gesetzt, `.` ist durchsichtig, `+` ist die hellere Spielart
   derselben Farbe. Mehr Stufen braucht ein Zeichen dieser Größe nicht:
   Bei sieben Bildpunkten ist der dritte Ton nicht mehr zu trennen,
   sondern nur noch Rauschen. */
export const RASTER = {
  /* ── Wehr ──────────────────────────────────────────────────────── */
  herz: [".##.##.", "#######", "#######", "#+####.", ".#####.", "..###..", "...#..."],
  schild: ["#######", "#+++++#", "#+###+#", "#+###+#", ".#####.", "..###..", "...#..."],
  tropfen: ["...#...", "...#...", "..###..", ".#####.", "#######", "#+#####", ".#####."],
  kreuz: ["...#...", "...#...", ".#####.", "#######", ".#####.", "...#...", "...#..."],

  /* ── Angriff ───────────────────────────────────────────────────── */
  schwert: ["....##.", "...###.", "..###..", ".###...", "####...", "##.....", "#......"],
  zweiSchwert: ["#.....#", "##...##", ".##.##.", "..###..", ".##.##.", "##...##", "#.....#"],
  blitz: ["...##..", "..##...", ".####..", "..###..", "..##...", ".##....", "##....."],
  pfeilWeit: ["..#....", ".##....", "#######", ".##....", "..#....", ".......", ".#...#."],
  strahl: ["#..#..#", ".#.#.#.", "..###..", "###.###", "..###..", ".#.#.#.", "#..#..#"],
  ringWeit: ["..###..", ".#...#.", "#..#..#", "#.###.#", "#..#..#", ".#...#.", "..###.."],
  dreiPunkt: ["#......", ".#.....", "..##...", "...##..", "..##...", ".#.....", "#......"],
  durchstich: ["#......", ".#..#..", "..#.#.#", "###.#.#", "..#.#.#", ".#..#..", "#......"],

  /* ── Krit ──────────────────────────────────────────────────────── */
  stern: ["...#...", "...#...", "#..#..#", ".#####.", "..###..", ".##.##.", "#.....#"],
  sternWucht: ["#..#..#", ".#####.", "..###..", "#######", "..###..", ".##.##.", "#.....#"],

  /* ── Beweglichkeit ─────────────────────────────────────────────── */
  stiefel: ["..##...", "..##...", "..##...", "..##...", ".###...", "#####+.", "#######"],
  sprung: ["..###..", ".#...#.", "#.....#", ".......", "#.....#", "##...##", "###.###"],
  sprungHast: ["..###..", ".#...#.", "#.....#", "...#...", "#.###.#", "##.#.##", "###.###"],

  /* ── Beute ─────────────────────────────────────────────────────── */
  muenze: ["..###..", ".#+++#.", "#+#.#+#", "#+#.#+#", "#+#.#+#", ".#+++#.", "..###.."],
  muenzen: ["..###..", ".#+++#.", "..###..", ".#+++#.", "..###..", ".#+++#.", "..###.."],
  klee: [".#...#.", "###.###", ".#####.", "..###..", "...#...", "..##...", ".##...."],
  buch: ["##...##", "#+#.#+#", "#+#.#+#", "#+#.#+#", "#+#.#+#", "#+###+#", "#######"],

  /* ── Karten ────────────────────────────────────────────────────── */
  karte: [".#####.", ".#+++#.", ".#+#+#.", ".#+++#.", ".#+#+#.", ".#+++#.", ".#####."],
  karteStern: [".#####.", ".#+++#.", ".#.#.#.", ".##+##.", ".#.#.#.", ".#+++#.", ".#####."],
  neigung: ["..####.", ".#+++#.", "#+++#..", "#++#...", "#+#....", "##.....", "#......"],

  /* ── Die fünf Achsen je Schadensart ────────────────────────────── */
  /* Flacher Zusatzschaden: ein voller Rhombus. */
  artFlach: ["...#...", "..###..", ".#####.", "#######", ".#####.", "..###..", "...#..."],
  /* Anteiliger Zusatzschaden: derselbe Rhombus, aber offen — man sieht
     dieselbe Form und dass sie etwas anderes meint. */
  artProzent: ["...#...", "..#.#..", ".#...#.", "#..#..#", ".#...#.", "..#.#..", "...#..."],
  /* Kritchance je Art: der Stern, kleiner. */
  artKritChance: ["...#...", "#..#..#", ".#####.", "..###..", ".#####.", "#..#..#", "...#..."],
  /* Kritschaden je Art: derselbe Stern mit einem Balken. */
  artKritSchaden: ["...#...", "#..#..#", ".#####.", "#######", ".#####.", "#..#..#", "...#..."],
  /* Widerstand je Art: das Schild, kleiner. */
  artWiderstand: [".#####.", "#+++++#", "#+++++#", ".#####.", ".#####.", "..###..", "...#..."]
};

export const RASTER_IDS = Object.keys(RASTER);

/* Die 23 getippten Werte, jeder mit seinem Zeichen und seiner Farbe.

   Die Farben stammen aus der Palette und folgen der Gruppe, nicht dem
   Geschmack: Wehr ist knochenfarben, Angriff eisen, Krit flamme,
   Beweglichkeit frost, Beute gold, Karten bann. Wer die Liste
   überfliegt, sieht die Bereiche als Farbblöcke, bevor er ein Wort
   gelesen hat. */
export const WERT_SYMBOL = {
  leben: ["herz", "blutHell"],
  ruestung: ["schild", "knochen"],
  genesung: ["kreuz", "fleischHell"],
  lebensregeneration: ["tropfen", "blut"],

  schaden: ["schwert", "eisenHell"],
  hast: ["blitz", "flammeHell"],
  reichweite: ["pfeilWeit", "eisenMitte"],
  flaechenschaden: ["strahl", "flammeMitte"],
  flaechenreichweite: ["ringWeit", "eisenMitte"],
  zusatzangriffe: ["zweiSchwert", "eisenGlanz"],
  zusatzgeschosse: ["dreiPunkt", "eisenGlanz"],
  durchdringung: ["durchstich", "eisenHell"],

  krit_chance: ["stern", "flammeHell"],
  krit_schaden: ["sternWucht", "flammeGlanz"],

  tempo: ["stiefel", "frostHell"],
  ausweichweite: ["sprung", "frostMitte"],
  ausweichhast: ["sprungHast", "frostGlanz"],

  glueck: ["klee", "seucheHell"],
  gier: ["muenzen", "gold"],
  goldfund: ["muenze", "goldHell"],
  erfahrung: ["buch", "bannHell"],

  kartenwert: ["karte", "bannMitte"],
  kartenseltenheit: ["karteStern", "bannGlanz"]
};

/* Die fünf Achsen, in der Reihenfolge, in der `erzeugeArtWerte()` sie
   anlegt. Die Endung entscheidet, welches Zeichen ein erzeugter Wert
   bekommt — abgeleitet, nicht gepflegt. */
const ART_ACHSEN = [
  [/^schaden_(\w+)_flach$/, "artFlach"],
  [/^schaden_(\w+)_prozent$/, "artProzent"],
  [/^krit_chance_(\w+)$/, "artKritChance"],
  [/^krit_schaden_(\w+)$/, "artKritSchaden"],
  [/^widerstand_(\w+)$/, "artWiderstand"]
];

/* Die Farbe einer Kartengruppe. Nur für die sieben `neigung_*` — sie
   sind das einzige, was sich nach Gruppen und nicht nach Arten
   ordnet. */
const GRUPPEN_FARBE = {
  wehr: FARBEN.knochen,
  angriff: FARBEN.eisenHell,
  krit: FARBEN.flammeHell,
  arten: FARBEN.seucheHell,
  beweglichkeit: FARBEN.frostHell,
  beute: FARBEN.goldHell,
  karten: FARBEN.bannHell
};

export const GRUPPEN_MIT_FARBE = GRUPPEN.map(([id, name]) => [id, name, GRUPPEN_FARBE[id]]);

/* Zeichen und Farbe zu einer Wertkennung.

   ⚠️ **Gibt nie `null` zurück.** Ein Wert ohne Zeichen wäre eine leere
   Stelle in der Liste, an der alle anderen eine haben — das liest sich
   als Fehler und nicht als Absicht. Der Rückfall ist der Rhombus in
   der Standardfarbe; `werkzeuge/pruefe-bilder.mjs` sorgt dafür,
   dass er nie gebraucht wird. */
export function symbolFuerWert(id) {
  const fest = WERT_SYMBOL[id];
  if (fest) return { raster: RASTER[fest[0]], name: fest[0], farbe: FARBEN[fest[1]] };

  for (const [muster, name] of ART_ACHSEN) {
    const treffer = id.match(muster);
    if (!treffer) continue;
    const art = ART_NACH_ID.get(treffer[1]);
    if (!art) continue;
    return { raster: RASTER[name], name, farbe: art.farbe };
  }

  const neigung = id.match(/^neigung_(\w+)$/);
  if (neigung && GRUPPEN_FARBE[neigung[1]]) {
    return { raster: RASTER.neigung, name: "neigung", farbe: GRUPPEN_FARBE[neigung[1]] };
  }

  return { raster: RASTER.artFlach, name: "artFlach", farbe: FARBEN.schriftMatt };
}

/* Ein Zeichen malen. `farbe` überschreibt die eigene — die Liste
   dämpft damit Zeilen, die gerade nichts zu sagen haben.

   Gemalt wird mit `fillRect` je Bildpunkt und **nicht** über eine
   vorbereitete Leinwand. Bei höchstens dreißig sichtbaren Zeilen und
   rund zwanzig gesetzten Punkten je Zeichen sind das sechshundert
   Rechtecke — weniger als der Teilchenschwarm in einem ruhigen
   Augenblick (`runtime/partikel.js`). Dafür braucht diese Datei kein
   `document`, und die Prüfung kann sie ohne Browser laden. */
export function maleSymbol(c, symbol, x, y, farbe = null) {
  const grund = farbe ?? symbol.farbe;
  const hell = symbol.hell ?? null;
  for (let zy = 0; zy < symbol.raster.length; zy++) {
    const zeile = symbol.raster[zy];
    for (let zx = 0; zx < zeile.length; zx++) {
      const z = zeile[zx];
      if (z === ".") continue;
      c.fillStyle = z === "+" ? (hell ?? grund) : grund;
      c.fillRect(x + zx, y + zy, 1, 1);
    }
  }
}
