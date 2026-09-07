/* [Aufgabe: Bild] Aus Textrastern werden gedrehte Bildpunktgrafiken.

   ── Warum gedreht wird und nicht der Bildschirm gedreht wird ───────

   `ctx.rotate()` wäre eine Zeile — und zerstört genau das, worum es
   geht: Der Browser interpoliert dabei, aus harten Bildpunkten werden
   weiche Kanten, und aus Pixelgrafik wird ein verwaschenes Bild, das
   sich bei jeder Drehung anders anfühlt.

   Stattdessen wird das **Raster** gedreht, einmal beim Laden, in
   sechzehn feste Richtungen. Jede Richtung ist danach ein fertiges
   Bild aus ganzen Bildpunkten, das nur noch an eine ganzzahlige
   Stelle kopiert wird.

   ── Rückwärts, nicht vorwärts ──────────────────────────────────────

   Gedreht wird, indem für **jeden Zielbildpunkt** gefragt wird, woher
   er kommt — nicht, indem jeder Quellbildpunkt irgendwohin geworfen
   wird. Vorwärts entstehen Löcher: Bei 45 Grad landen zwei
   Quellpunkte auf demselben Ziel und ein drittes Ziel bleibt leer.
   Rückwärts bekommt jeder Zielpunkt genau eine Antwort.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprite-daten.js` (die Raster), `runtime/palette.js` (die
   Farben), `runtime/zeichnen.js` (malt die fertigen Bilder).
   `werkzeuge/pruefe-sprites.mjs` prüft `dreheRaster` und die Raster
   **ohne Browser** — deshalb fasst alles außer `baueBild` kein
   `document` an. */

import { FARBEN, JAEGER_FARBEN } from "./palette.js";
import { JAEGER, SCHLAGBOEGEN, GEGNER_BILDER, DINGE, GESCHOSSE, TREFFER } from "./sprite-daten.js";

export const RICHTUNGEN = 16;

/* Aus einem Bewegungsvektor die Richtungsnummer. `atan2(x, -y)`, weil
   Richtung 0 nach **oben** zeigt (so sind die Raster gezeichnet) und
   im Uhrzeigersinn weitergezählt wird. */
export function richtungsIndex(vx, vy) {
  const winkel = Math.atan2(vx, -vy);
  const i = Math.round((winkel / (Math.PI * 2)) * RICHTUNGEN);
  return ((i % RICHTUNGEN) + RICHTUNGEN) % RICHTUNGEN;
}

/* Die Kantenlänge, in die ein gedrehtes Raster in jeder Lage passt.
   Die Diagonale, aufgerundet auf eine ungerade Zahl — ungerade, damit
   es eine echte Mitte gibt und die Figur beim Drehen nicht um einen
   halben Bildpunkt wandert. */
export function drehGroesse(breite, hoehe) {
  const d = Math.ceil(Math.sqrt(breite * breite + hoehe * hoehe));
  return d % 2 === 0 ? d + 1 : d;
}

/* Dreht ein Zeichenraster um `richtung`/16 einer vollen Umdrehung.
   Reine Rechnung, keine Bildschirmsachen — genau deshalb prüfbar. */
export function dreheRaster(bild, richtung) {
  const hoehe = bild.length;
  const breite = bild[0].length;
  if (richtung === 0 && hoehe === breite) return bild.slice();

  const d = drehGroesse(breite, hoehe);
  const mitte = (d - 1) / 2;
  const winkel = (richtung / RICHTUNGEN) * Math.PI * 2;
  const cos = Math.cos(-winkel), sin = Math.sin(-winkel);
  const qx = (breite - 1) / 2, qy = (hoehe - 1) / 2;

  const raus = [];
  for (let y = 0; y < d; y++) {
    let zeile = "";
    for (let x = 0; x < d; x++) {
      const dx = x - mitte, dy = y - mitte;
      const sx = Math.round(dx * cos - dy * sin + qx);
      const sy = Math.round(dx * sin + dy * cos + qy);
      zeile += (sy >= 0 && sy < hoehe && sx >= 0 && sx < breite) ? bild[sy][sx] : ".";
    }
    raus.push(zeile);
  }
  return raus;
}

/* Die Farbe eines Zeichens. `@hell`, `@mittel`, `@dunkel` sind
   Platzhalter, die je Jäger ausgetauscht werden — so ist derselbe
   Umriss vier Figuren. */
export function farbeFuer(zeichen, tabelle, ersatz) {
  const name = tabelle[zeichen];
  if (!name) return null;
  if (name.startsWith("@")) return ersatz?.[name.slice(1)] ?? "#ff00ff";
  return FARBEN[name] ?? "#ff00ff";
}

/* Prüft ein Raster und gibt die Mängel zurück — leer heißt in Ordnung.
   Wird von `werkzeuge/pruefe-sprites.mjs` benutzt und läuft in Node. */
export function pruefeRaster(name, sprite) {
  const maengel = [];
  const bild = sprite.bild;
  if (!Array.isArray(bild) || bild.length === 0) return [`${name}: leer`];
  const breite = bild[0].length;
  bild.forEach((zeile, i) => {
    if (zeile.length !== breite) {
      maengel.push(`${name}: Zeile ${i} ist ${zeile.length} breit, erwartet ${breite}`);
    }
    for (const z of zeile) {
      if (z === ".") continue;
      const farbe = sprite.zeichen[z];
      if (!farbe) maengel.push(`${name}: Zeile ${i} hat unbekanntes Zeichen "${z}"`);
      else if (!farbe.startsWith("@") && !(farbe in FARBEN)) {
        maengel.push(`${name}: Zeichen "${z}" zeigt auf unbekannte Farbe "${farbe}"`);
      }
    }
  });
  return maengel;
}

/* ── Ab hier braucht es einen Browser ─────────────────────────────── */

function baueBild(sprite, ersatz, richtung) {
  const bild = dreheRaster(sprite.bild, richtung);
  const breite = bild[0].length, hoehe = bild.length;
  const l = document.createElement("canvas");
  l.width = breite; l.height = hoehe;
  const c = l.getContext("2d");
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const farbe = farbeFuer(bild[y][x], sprite.zeichen, ersatz);
      if (!farbe) continue;
      c.fillStyle = farbe;
      c.fillRect(x, y, 1, 1);
    }
  }
  /* `mx`/`my` ist die Mitte: Gezeichnet wird an `x - mx`, damit die
     Figur um ihren Mittelpunkt steht und beim Drehen nicht wandert. */
  return { l, breite, hoehe, mx: Math.floor(breite / 2), my: Math.floor(hoehe / 2) };
}

function alleRichtungen(sprite, ersatz) {
  const raus = [];
  for (let r = 0; r < RICHTUNGEN; r++) raus.push(baueBild(sprite, ersatz, r));
  return raus;
}

/* Eine Bildfolge. Rein additiv neben `baueBild` — und das ist der
   Punkt: Würde `alleRichtungen()` selbst auf Folgen umgestellt, hieße
   `sprites.gegner[id][richtung]` plötzlich „Liste von Bildern" statt
   „Bild", und **jeder** Aufruf in `zeichnen.js` malte ab dann ein
   Objekt statt einer Leinwand — ohne Fehlermeldung, nur mit einem
   leeren Bild.

   `bilder` ist optional; fehlt es, ist die Folge einbildrig und
   verhält sich wie vorher. Das Format garantiert `bild === bilder[0]`
   (geprüft in `werkzeuge/pruefe-sprites.mjs`), deshalb darf hier
   bedenkenlos das eine gegen das andere getauscht werden. */
export function baueBildfolge(sprite, ersatz, richtung) {
  const rahmen = sprite.bilder ?? [sprite.bild];
  return rahmen.map((bild) => baueBild({ bild, zeichen: sprite.zeichen }, ersatz, richtung));
}

/* Einmal beim Start. Danach wird nur noch kopiert — kein Sprite wird
   je zur Laufzeit neu gezeichnet. */
export function ladeSprites() {
  const jaeger = JAEGER_FARBEN.map((f) => alleRichtungen(JAEGER, f));
  const gegner = {};
  for (const [id, s] of Object.entries(GEGNER_BILDER)) gegner[id] = alleRichtungen(s);
  const geschosse = {};
  for (const [id, s] of Object.entries(GESCHOSSE)) geschosse[id] = alleRichtungen(s);
  const dinge = {};
  for (const [id, s] of Object.entries(DINGE)) dinge[id] = baueBild(s, null, 0);
  /* Ein Bogen je Schadensart, jeder in allen Richtungen: der Zeichner
     greift mit `schlagbogen[art][richtung]` zu und braucht keine
     Fallunterscheidung. Fünf mal sechzehn Bilder à 11 x 11 sind
     zusammen weniger als ein einziger Jäger in vier Farben. */
  const schlagbogen = {};
  for (const [art, s] of Object.entries(SCHLAGBOEGEN)) schlagbogen[art] = alleRichtungen(s);
  /* Trefferzeichen: nicht gedreht (ein Einschlag hat einen Ort, keine
     Blickrichtung), aber als **Folge** geladen — `feuer` verglimmt über
     zwei Bilder, die übrigen vier haben genau eines. Der Zeichner
     bekommt dadurch überall dieselbe Form `treffer[art][rahmen]` und
     braucht keine Fallunterscheidung „hat das eine Folge oder nicht". */
  const treffer = {};
  for (const [id, s] of Object.entries(TREFFER)) treffer[id] = baueBildfolge(s, null, 0);
  return { jaeger, gegner, geschosse, dinge, schlagbogen, treffer };
}
