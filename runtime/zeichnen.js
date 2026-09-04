/* [Aufgabe: Bild] Die Nacht auf den Bildschirm bringen.

   ── Drei Entscheidungen, die „echte Pixelgrafik" ausmachen ─────────

   1. **Festes inneres Raster.** Gerechnet wird immer auf 480 x 270
      Bildpunkten; erst danach wird das ganze Bild mit einem **ganzen**
      Faktor vergrößert. Ein krummer Faktor macht aus jedem zweiten
      Bildpunkt einen anderthalb breiten, und das sieht man sofort.
   2. **Die Kamera rastet.** Ihre Position wird auf ganze Bildpunkte
      gerundet. Ohne das wandert bei jeder Bewegung jede Farbgrenze um
      einen Bruchteil eines Bildpunkts, und das ganze Bild flirrt.
   3. **Das Licht ist grob.** Es wird auf einem Viertel-Raster
      gerechnet und hart vergrößert. Ein weicher Verlauf über
      Pixelgrafik sieht aus wie ein Filter über einem Bild, nicht wie
      Fackelschein in einer Pixelwelt.

   ── Der Boden wird einmal gemalt ───────────────────────────────────

   Nicht je Bild: Der Bannkreis ändert sich nie. Er wird beim Start
   eines Laufs in **eine** Leinwand gemalt, aus der danach nur noch das
   Sichtfenster kopiert wird. Das ist der Unterschied zwischen
   „hunderttausend Rechtecke je Bild" und „ein Kopiervorgang".

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprites.js` (die Figuren), `runtime/palette.js` (Farben),
   `runtime/start.js` (ruft je Bild), `runtime/oberflaeche.js` (alles,
   was Text ist). Kennt vom Regelkern nur die Weltstruktur — es
   verändert **nichts** daran. */

import { FARBEN, JAEGER_FARBEN } from "./palette.js";
import { richtungsIndex } from "./sprites.js";
import { macheZufall } from "../spiel/zufall.mjs";

export const BREITE = 480;
export const HOEHE = 270;

/* Kantenlänge einer Lichtzelle. 4 ist gemessen der Punkt, an dem das
   Licht noch als Licht und schon als Pixelgrafik liest: Bei 2 sieht es
   glatt aus, bei 8 sieht man Kacheln statt Schein. */
const LICHT_ZELLE = 4;
const LICHT_B = Math.ceil(BREITE / LICHT_ZELLE);
const LICHT_H = Math.ceil(HOEHE / LICHT_ZELLE);

/* **Eine** Fackel, und sie steht in der Mitte (Janniks Ansage vom
   04.09.2026: „in der mitte der arena steht eine einsame fackel die
   den arena ring erleuchtet").

   Das ist nicht nur ein anderer Ort, es ist eine andere Welt. Vorher
   lag ein Kranz Fackeln auf dem Ring und die Mitte war schwarz — man
   lief also am hellen Rand entlang und schaute in ein dunkles Loch.
   Jetzt ist es umgekehrt: Man steht im Licht, und die Gegner kommen
   aus dem Dunkeln herein. Der Kreis ist damit auch spielerisch ein
   Kreis und nicht bloß eine Wand. */
export function fackelOrte(radius) {
  return [{ x: 0, y: 0, phase: 0 }];
}

/* ── Der Boden, einmal gemalt ────────────────────────────────────── */

export function baueBoden(radius, saat, sprites) {
  const rand = 60;
  const groesse = Math.ceil((radius + rand) * 2);
  const l = document.createElement("canvas");
  l.width = groesse; l.height = groesse;
  const c = l.getContext("2d");
  const m = groesse / 2;
  const z = macheZufall(saat ^ 0xb0de);

  c.fillStyle = FARBEN.aussen0;
  c.fillRect(0, 0, groesse, groesse);

  /* Erde außerhalb: grob gesprenkelt, damit der Rand nicht wie eine
     leere Fläche wirkt. */
  for (let i = 0; i < groesse * 6; i++) {
    const x = Math.floor(z.zwischen(0, groesse));
    const y = Math.floor(z.zwischen(0, groesse));
    c.fillStyle = FARBEN.aussen1;
    c.fillRect(x, y, 1 + Math.floor(z.zahl() * 2), 1);
  }

  /* Der Steinboden im Kreis. Drei Töne in Flecken statt eines Verlaufs
     — ein Verlauf hätte tausend Zwischentöne und wäre keine
     Pixelgrafik mehr. */
  c.save();
  c.beginPath();
  c.arc(m, m, radius, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = FARBEN.boden0;
  c.fillRect(0, 0, groesse, groesse);
  for (let i = 0; i < groesse * groesse / 26; i++) {
    const x = Math.floor(z.zwischen(0, groesse));
    const y = Math.floor(z.zwischen(0, groesse));
    const b = 2 + Math.floor(z.zahl() * 5);
    c.fillStyle = z.trifft(0.5) ? FARBEN.boden1 : FARBEN.boden2;
    c.fillRect(x, y, b, 1 + Math.floor(z.zahl() * 2));
  }
  /* Risse: kurze Linienzüge, die dem Auge etwas geben, woran es die
     eigene Bewegung misst. Ohne sie wirkt Laufen auf der Stelle. */
  for (let i = 0; i < radius / 3; i++) {
    let x = z.zwischen(0, groesse), y = z.zwischen(0, groesse);
    let w = z.zwischen(0, Math.PI * 2);
    c.fillStyle = FARBEN.bodenRiss;
    const laenge = z.zwischen(8, 34);
    for (let s = 0; s < laenge; s++) {
      c.fillRect(Math.floor(x), Math.floor(y), 1, 1);
      w += z.zwischen(-0.5, 0.5);
      x += Math.cos(w); y += Math.sin(w);
    }
  }
  c.restore();

  /* Der Bannkreis selbst: Steine auf der Linie. */
  const stein = sprites.dinge.stein;
  const steinZahl = Math.round(radius / 7);
  for (let i = 0; i < steinZahl; i++) {
    const w = (i / steinZahl) * Math.PI * 2 + z.zwischen(-0.02, 0.02);
    const r = radius + z.zwischen(-2, 2);
    c.drawImage(stein.l, Math.round(m + Math.cos(w) * r) - stein.mx,
      Math.round(m + Math.sin(w) * r) - stein.my);
  }

  /* Die Feuerschale in der Mitte. Die Flammen darin kommen je Bild
     dazu, weil sie flackern; die Schale selbst aendert sich nie. */
  const schale = sprites.dinge.feuerschale;
  for (const f of fackelOrte(radius)) {
    c.drawImage(schale.l, Math.round(m + f.x) - schale.mx, Math.round(m + f.y) - schale.my);
  }

  return { l, groesse, m, radius };
}

/* ── Das Licht ───────────────────────────────────────────────────── */

function baueLichtLeinwand() {
  const l = document.createElement("canvas");
  l.width = LICHT_B; l.height = LICHT_H;
  const c = l.getContext("2d");
  return { l, c, bild: c.createImageData(LICHT_B, LICHT_H) };
}

/* Der Nachthimmel ist nicht schwarz, sondern kalt: Wo kein Fackellicht
   hinkommt, bleibt ein blauvioletter Rest. Reines Schwarz sähe aus wie
   ein Loch im Bild und nicht wie Nacht. */
const NACHT = [86, 78, 112];

function zeichneLicht(licht, welt, kamera, zeit) {
  const d = licht.bild.data;
  const fackeln = welt.fackeln;
  for (let cy = 0; cy < LICHT_H; cy++) {
    const wy = kamera.y + cy * LICHT_ZELLE + LICHT_ZELLE / 2;
    for (let cx = 0; cx < LICHT_B; cx++) {
      const wx = kamera.x + cx * LICHT_ZELLE + LICHT_ZELLE / 2;
      let hell = 0;

      for (const f of fackeln) {
        const dx = wx - f.x, dy = wy - f.y;
        const q = dx * dx + dy * dy;
        if (q > f.reichweiteQ) continue;
        /* Flackern: zwei ungleiche Schwingungen, damit es nicht
           regelmäßig pulst. */
        const flacker = 1 + 0.07 * Math.sin(zeit * 6.3 + f.phase)
          + 0.05 * Math.sin(zeit * 11.1 + f.phase * 2.3);
        /* Und das Wabern: Die Grenze des Lichts ist kein Kreis,
           sondern atmet je nach Richtung verschieden. Ohne diesen Teil
           wäre der Rand ein sauberer Ring, der gleichmäßig heller und
           dunkler wird — das sieht nach Regler aus und nicht nach
           Feuer. Zwei Schwingungen über den Winkel, mit unpassenden
           Perioden, damit sich das Muster nicht wiederholt. */
        const winkel = Math.atan2(dy, dx);
        const wabern = 1 + 0.13 * Math.sin(zeit * 1.6 + winkel * 3)
          + 0.09 * Math.sin(zeit * 2.7 - winkel * 5);
        hell += (1 - Math.sqrt(q) / (f.reichweite * wabern)) * flacker;
      }
      for (const s of welt.spieler) {
        if (s.zustand !== "lebt") continue;
        const dx = wx - s.x, dy = wy - s.y;
        const q = dx * dx + dy * dy;
        if (q > 76 * 76) continue;
        hell += (1 - Math.sqrt(q) / 76) * 0.6;
      }

      hell = Math.min(1, hell);
      /* Auf Stufen runden: Das ist der Schritt, der aus einem Verlauf
         Pixelgrafik macht. */
      hell = Math.round(hell * 6) / 6;
      const i = (cy * LICHT_B + cx) * 4;
      d[i] = NACHT[0] + (255 - NACHT[0]) * hell;
      d[i + 1] = NACHT[1] + (243 - NACHT[1]) * hell;
      d[i + 2] = NACHT[2] + (214 - NACHT[2]) * hell;
      d[i + 3] = 255;
    }
  }
  licht.c.putImageData(licht.bild, 0, 0);
}

/* ── Die Kamera ──────────────────────────────────────────────────── */

export function kameraFuer(welt) {
  let sx = 0, sy = 0, n = 0;
  for (const s of welt.spieler) { sx += s.x; sy += s.y; n++; }
  let mx = n ? sx / n : 0, my = n ? sy / n : 0;
  const grenze = welt.arena.radius + 40;
  const halbB = BREITE / 2, halbH = HOEHE / 2;
  if (grenze * 2 > BREITE) mx = Math.max(-grenze + halbB, Math.min(grenze - halbB, mx));
  else mx = 0;
  if (grenze * 2 > HOEHE) my = Math.max(-grenze + halbH, Math.min(grenze - halbH, my));
  else my = 0;
  /* Ganze Bildpunkte — der Punkt, an dem echte von unechter
     Pixelgrafik unterscheidbar wird. */
  return { x: Math.round(mx - halbB), y: Math.round(my - halbH) };
}

/* ── Ein Bild ────────────────────────────────────────────────────── */

export function macheZeichner(leinwand) {
  const c = leinwand.getContext("2d", { alpha: false });
  c.imageSmoothingEnabled = false;
  const licht = baueLichtLeinwand();
  return { c, licht };
}

function male(c, bild, x, y) {
  c.drawImage(bild.l, Math.round(x) - bild.mx, Math.round(y) - bild.my);
}

export function zeichne(zeichner, welt, boden, sprites, zeit) {
  const { c, licht } = zeichner;
  const kamera = kameraFuer(welt);

  c.fillStyle = FARBEN.aussen0;
  c.fillRect(0, 0, BREITE, HOEHE);

  /* Boden: das Sichtfenster aus der einmal gemalten Leinwand. */
  const bx = kamera.x + boden.m, by = kamera.y + boden.m;
  c.drawImage(boden.l, bx, by, BREITE, HOEHE, 0, 0, BREITE, HOEHE);

  c.save();
  c.translate(-kamera.x, -kamera.y);

  /* Beute zuerst — sie liegt unter allem. Das Hüpfen ist eine
     Sinuskurve auf ganze Bildpunkte gerundet. */
  for (const b of welt.beute) {
    const bild = b.gross ? sprites.dinge.goldGross : sprites.dinge.gold;
    male(c, bild, b.x, b.y + Math.round(Math.sin(b.hupf) * 1.5));
  }

  /* Der Schlagbogen liegt unter den Figuren, damit er nicht das
     Gesicht verdeckt. */
  for (const s of welt.spieler) {
    if (s.schlagZeit <= 0 || s.zustand !== "lebt") continue;
    const r = richtungsIndex(s.blickX, s.blickY);
    const bild = sprites.schlagbogen[r];
    male(c, bild, s.x + s.blickX * 6, s.y + s.blickY * 6);
  }

  for (const g of welt.gegner) {
    const r = richtungsIndex(g.vx, g.vy);
    const bild = sprites.gegner[g.art.id]?.[r];
    if (!bild) continue;
    male(c, bild, g.x, g.y);
    if (g.brand > 0) tupfe(c, g, FARBEN.glut, zeit);
    if (g.gift > 0) tupfe(c, g, FARBEN.seuche, zeit + 1.3);
    if (g.frost > 0) tupfe(c, g, FARBEN.frostHell, zeit + 2.6);
    /* Lebensleiste nur, wenn er schon getroffen wurde — sonst hinge
       über jedem Schlurfer ein Balken und das Bild wäre Buchhaltung. */
    if (g.leben < g.lebenMax) {
      const b = Math.max(4, g.radius * 2);
      const anteil = Math.max(0, g.leben / g.lebenMax);
      c.fillStyle = FARBEN.kontur;
      c.fillRect(Math.round(g.x - b / 2) - 1, Math.round(g.y - g.radius - 5) - 1, b + 2, 3);
      c.fillStyle = FARBEN.blutHell;
      c.fillRect(Math.round(g.x - b / 2), Math.round(g.y - g.radius - 5), Math.round(b * anteil), 1);
    }
  }

  for (const p of welt.geschosse) {
    const r = richtungsIndex(p.vx, p.vy);
    const bild = sprites.geschosse[p.waffe]?.[r] ?? sprites.geschosse.wurfmesser[r];
    male(c, bild, p.x, p.y);
  }

  for (const s of welt.spieler) {
    const farbe = JAEGER_FARBEN[s.id % JAEGER_FARBEN.length];
    const r = richtungsIndex(s.blickX, s.blickY);
    const bild = sprites.jaeger[s.id % sprites.jaeger.length][r];

    if (s.zustand === "liegt") {
      /* Ein Kniender wird flach gemalt und blinkt langsam — er muss im
         Gewühl auffindbar sein, sonst ist das Aufheben Glückssache. */
      c.globalAlpha = 0.5 + 0.3 * Math.sin(zeit * 4);
      male(c, bild, s.x, s.y);
      c.globalAlpha = 1;
      const anteil = s.aufheben / 3;
      c.fillStyle = FARBEN.kontur;
      c.fillRect(Math.round(s.x) - 9, Math.round(s.y) - 12, 18, 3);
      c.fillStyle = farbe.hell;
      c.fillRect(Math.round(s.x) - 8, Math.round(s.y) - 11, Math.round(16 * anteil), 1);
      continue;
    }

    /* Beim Treffer blinkt die Figur weiß — der einzige Moment, in dem
       Farbe außerhalb der Palette erlaubt ist. */
    if (s.trefferZeit > 0 && Math.floor(zeit * 24) % 2 === 0) {
      c.globalAlpha = 0.85;
      c.fillStyle = FARBEN.flammeHell;
      c.fillRect(Math.round(s.x) - bild.mx, Math.round(s.y) - bild.my, bild.breite, bild.hoehe);
      c.globalAlpha = 1;
    } else {
      male(c, bild, s.x, s.y);
    }
  }

  /* Flammen auf den Fackeln — sie flackern, deshalb gehören sie nicht
     in den einmal gemalten Boden. */
  /* Die Flamme der einen Fackel. Sie wird von unten nach oben schmaler
     und heller — ein Rechteck wäre ein oranger Klotz, und genau so sah
     der erste Anlauf im Browser aus.

     Sie sitzt **über** dem oberen Rand der Feuerschale, damit die
     Schale selbst sichtbar bleibt: Man soll sehen, worin es brennt. */
  for (const f of welt.fackeln) {
    const fx = Math.round(f.x), fy = Math.round(f.y);
    const zug = Math.abs(Math.sin(zeit * 6.1 + f.phase));
    const zug2 = Math.abs(Math.sin(zeit * 4.3 + 1.7));
    /* Je Zeile: Breite und Farbe. Unten breit und glutfarben, oben
       schmal und fast weiß. Die zwei Schwingungen mit unpassenden
       Perioden lassen die Flamme unregelmäßig zucken. */
    const zeilen = [
      [5, FARBEN.glut], [5, FARBEN.glut], [4, FARBEN.flamme],
      [3, FARBEN.flamme], [3, FARBEN.flammeHell],
      [2, FARBEN.flammeHell], [1, FARBEN.flammeHell]
    ];
    const hoch = 5 + Math.round(zug * 2 + zug2);
    for (let i = 0; i < Math.min(zeilen.length, hoch); i++) {
      const [b, farbe] = zeilen[i];
      /* Die Spitze weht seitlich — sonst steht die Flamme wie gemalt. */
      const wehen = i >= 4 ? Math.round(Math.sin(zeit * 3.1) * 1.4) : 0;
      c.fillStyle = farbe;
      c.fillRect(fx - Math.floor(b / 2) + wehen, fy - 2 - i, b, 1);
    }
    /* Glut auf dem Boden ringsum: ein paar warme Punkte, die zeigen,
       dass hier wirklich etwas brennt. */
    c.fillStyle = FARBEN.glut;
    for (let i = 0; i < 5; i++) {
      const w = zeit * 0.6 + i * 1.257;
      c.fillRect(fx + Math.round(Math.cos(w) * 4), fy + 2 + Math.round(Math.sin(w) * 2), 1, 1);
    }
  }

  for (const f of welt.funken) {
    const g = f.zeit / 0.3;
    c.fillStyle = f.art === "tod" ? FARBEN.blutHell : FARBEN.flammeHell;
    const s = Math.max(1, Math.round(g * 4));
    c.fillRect(Math.round(f.x) - s / 2, Math.round(f.y) - s / 2, s, s);
  }

  c.restore();

  /* Licht als Multiplikation über allem. Danach ist das Bild fertig;
     die Anzeige kommt in `oberflaeche.js` obendrauf und bleibt
     bewusst **außerhalb** des Lichts — eine unlesbare Lebensanzeige
     wäre keine Stimmung, sondern ein Fehler. */
  zeichneLicht(licht, welt, kamera, zeit);
  c.globalCompositeOperation = "multiply";
  c.drawImage(licht.l, 0, 0, BREITE, HOEHE);
  c.globalCompositeOperation = "source-over";

  return kamera;
}

function tupfe(c, g, farbe, zeit) {
  c.fillStyle = farbe;
  for (let i = 0; i < 3; i++) {
    const w = zeit * 3 + i * 2.1;
    c.fillRect(Math.round(g.x + Math.cos(w) * g.radius),
      Math.round(g.y + Math.sin(w * 1.3) * g.radius - 2), 1, 1);
  }
}
