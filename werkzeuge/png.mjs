/* [Aufgabe: Prüfwesen] Ein PNG schreiben, ohne eine einzige Abhängigkeit.

   ── Warum das nötig ist ────────────────────────────────────────────

   Eine installierbare App braucht Symbole als echte Bilddateien — das
   ist die eine Stelle, an der dieses Projekt nicht ohne Bilder
   auskommt. Alles andere ist Zeichencode (`runtime/sprite-daten.js`),
   aber ein Startbildschirm-Symbol muss eine `.png` sein, sonst nimmt
   kein Telefon es an.

   Node bringt `zlib` mit, und PNG ist ein einfaches Format: Kopf,
   Bilddaten als zlib-Strom mit einem Filterbyte je Zeile, Prüfsumme.
   Das sind achtzig Zeilen — eine Bibliothek dafür wäre die erste
   Abhängigkeit des Projekts und würde die Regel brechen, die dieses
   Spiel überhaupt prüfbar macht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/symbole.mjs` (zeichnet die App-Symbole und ruft dies),
   sonst nichts. */

import { deflateSync } from "node:zlib";

/* Der Prüfsummen-Tisch von PNG. Einmal gerechnet statt 256-mal je
   Block — bei acht Symbolen mit je vier Blöcken macht das den
   Unterschied zwischen spürbar und unmerklich. */
const TISCH = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function pruefsumme(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = TISCH[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* Ein PNG-Block: Länge, Name, Inhalt, Prüfsumme über Name und Inhalt.
   Die Länge zählt **nur** den Inhalt — der Name gehört nicht dazu, und
   genau das ist der Fehler, den man beim ersten Mal macht. */
function block(name, inhalt) {
  const kopf = Buffer.alloc(8);
  kopf.writeUInt32BE(inhalt.length, 0);
  kopf.write(name, 4, "ascii");
  const summe = Buffer.alloc(4);
  summe.writeUInt32BE(pruefsumme(Buffer.concat([Buffer.from(name, "ascii"), inhalt])), 0);
  return Buffer.concat([kopf, inhalt, summe]);
}

/* `punkte` ist ein flaches RGBA-Feld, vier Bytes je Bildpunkt, Zeile
   für Zeile von oben. */
export function schreibePng(breite, hoehe, punkte) {
  if (punkte.length !== breite * hoehe * 4) {
    throw new Error(`erwartet ${breite * hoehe * 4} Bytes, bekommen ${punkte.length}`);
  }

  /* Vor jeder Bildzeile steht ein Filterbyte. `0` heißt „kein Filter" —
     die Symbole sind klein und flächig, da bringt ein Filter nichts
     außer einer Fehlerquelle. */
  const roh = Buffer.alloc(hoehe * (breite * 4 + 1));
  for (let y = 0; y < hoehe; y++) {
    const ziel = y * (breite * 4 + 1);
    roh[ziel] = 0;
    Buffer.from(punkte.buffer ?? punkte, y * breite * 4, breite * 4).copy(roh, ziel + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8;   /* 8 Bit je Kanal */
  ihdr[9] = 6;   /* Wahrfarben mit Alpha */
  ihdr[10] = 0;  /* Deflate */
  ihdr[11] = 0;  /* Standardfilter */
  ihdr[12] = 0;  /* nicht verschränkt */

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    block("IHDR", ihdr),
    block("IDAT", deflateSync(roh, { level: 9 })),
    block("IEND", Buffer.alloc(0))
  ]);
}
