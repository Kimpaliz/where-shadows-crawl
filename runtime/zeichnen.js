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
import { bekannteZeichen, ZEICHEN_BREITE, ZEICHEN_HOEHE, VORSCHUB } from "./schrift.js";
import { ART_NACH_ID, STANDARD_ART } from "../spiel/schadensarten.mjs";

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

/* ── Treffer: Zeichen, Staub, Zahlen ─────────────────────────────────

   Vor dieser Änderung war ein Einschlag **ein weißes Quadrat**, und die
   schwebenden Zahlen aus `welt.zahlen` wurden von niemandem gemalt —
   der Regelkern füllte die Liste seit dem Wertefundament, gezeichnet
   hat sie nie jemand (nachgezählt am 05.09.2026: 0 Fundstellen für
   `zahlen` in `runtime/`). Man sah also weder *was* traf noch *wie
   hart*. Genau das ist Janniks Befund „man kann nicht sehen, was
   gerade passiert".

   ── Was über dem Licht liegt und was darunter ──────────────────────

   Diese Trennung ist die eine Entscheidung dieses Abschnitts:

   * **Trefferzeichen und Zahlen liegen über dem Licht.** Sie sind
     Auskunft, kein Gegenstand. Ein Einschlag am dunklen Rand des
     Bannkreises wäre sonst um denselben Faktor gedämpft wie der Boden
     dort — gemessen bleiben am Rand rund ein Sechstel der Helligkeit
     übrig, und ein Zeichen, das man nur im Fackelschein lesen kann,
     beantwortet die Frage nicht, die es beantworten soll.
   * **Der Staub liegt darunter.** Er ist Stimmung und gehört in die
     Szene; im Dunkeln verglimmt er, und das ist richtig so. Läge er
     ebenfalls oben, sähe jeder Treffer aus wie aufgeklebt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprite-daten.js` (`TREFFER`, die fünf Zeichen),
   `runtime/sprites.js` (`baueBildfolge` lädt sie),
   `spiel/schadensarten.mjs` (Farbe je Art),
   `spiel/kampf.mjs` (füllt `welt.funken` und `welt.zahlen`),
   `werkzeuge/pruefe-anzeige.mjs` (misst die reinen Funktionen hier). */

/* Wie lange ein Trefferfunke lebt. **Quelle ist `spiel/kampf.mjs`** —
   die Zahl steht hier nur, weil der Funke seine eigene Lebensdauer
   nicht mitbringt, sondern nur die Restzeit. Doppelt aufgeschriebene
   Zahlen sind ein Fehler in Wartestellung, deshalb liest
   `werkzeuge/pruefe-anzeige.mjs` beide Stellen nach und wird rot,
   sobald sie auseinanderlaufen. */
export const FUNKE_LEBEN = 0.18;
export const TOD_LEBEN = 0.3;

/* Wie viele Staubkörner ein Einschlag wirft. Je Art verschieden, weil
   ein Flammenstoß anders staubt als ein Schnitt — und weil die Menge
   das zweite Erkennungsmerkmal neben der Form ist. */
const STAUB = { schnitt: 5, wucht: 8, feuer: 10, frost: 7, fluch: 6, tod: 12 };

/* Der Rahmen einer Bildfolge zur Restzeit. Bewusst über das **Alter**
   und nicht über die Restzeit gerechnet: So läuft die Folge vorwärts,
   auch wenn jemand später die Lebensdauer ändert. */
export function bildIndex(rest, leben, anzahl) {
  if (!(anzahl > 1)) return 0;
  const alter = 1 - Math.max(0, Math.min(1, rest / leben));
  return Math.min(anzahl - 1, Math.floor(alter * anzahl));
}

/* Zwei Farben mischen. Nur für die helle Spielart eines Palettentons —
   deshalb keine neue Farbe in der Palette: `#ff8c2e` und sein helles
   Geschwister wären zwei Einträge, die immer zusammen geändert werden
   müssten. */
export function mische(hex, ziel, anteil) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(ziel.slice(1), 16);
  const teil = (v) => Math.round(((a >> v) & 255) * (1 - anteil) + ((b >> v) & 255) * anteil);
  return "#" + [teil(16), teil(8), teil(0)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function artFarbe(art) {
  return ART_NACH_ID.get(art)?.farbe ?? ART_NACH_ID.get(STANDARD_ART).farbe;
}

/* Wie eine schwebende Zahl aussieht.

   ── Warum ein Krit auf **drei** Kanälen gleichzeitig anders ist ─────

   Ein einzelner Kanal reicht nicht: Die Farbe allein trägt schon die
   Schadensart (fünf Töne), ein sechster Ton dafür wäre ein Ton zu
   viel; die Größe allein liest sich bei einer dreistelligen Zahl wie
   „viel Schaden" statt „Krit"; die Bewegung allein sieht man erst nach
   ein paar Bildern. Zusammen sind es vier voneinander unabhängige
   Merkmale — Fläche mal vier, hellerer Ton, schnellerer Aufstieg und
   das Ausrufezeichen. Wer eines davon nicht sieht, sieht die anderen.

   Der Ton bleibt dabei **die Farbe der Schadensart**, nur ein Stück
   nach Weiß gezogen: Ein Krit soll nicht verraten, *dass* er ein Krit
   ist, und dabei verstecken, *was* getroffen hat.

   ── Warum genau 0,30 nach Weiß ─────────────────────────────────────

   Gemessen, nicht gewählt. Im gewichteten Farbabstand (Riemersma)
   liegen die fünf Arten normal zwischen 107,1 (frost/fluch, das engste
   Paar) und 348,8 auseinander. Jede Beimischung von Weiß zieht sie
   zusammen. Zwei Schranken:

   * **Die Art muss lesbar bleiben:** der engste Abstand unter den
     Kritfarben soll mindestens 70 % des engsten normalen behalten,
     also ≥ 75,0.
   * **Der Krit muss heißer sein:** Abstand zur eigenen normalen Farbe
     ≥ 40 und die Leuchtdichte echt höher.

   0,30 ist der größte Anteil, der beides hält (75,1 und 49,9). Bei
   0,35 fällt der Artabstand auf 68,8 und reißt die erste Schranke —
   der erste Entwurf stand auf 0,45 (58,3), und im Bild sahen die fünf
   Kritzahlen alle gleich weiß aus. Genau dafür ist die Messung da.

   Nachgemessen am 05.09.2026 mit `werkzeuge/pruefe-anzeige.mjs`; drei
   dieser Zahlen standen vorher um bis zu 1,0 daneben (50,2 · 69,8 ·
   59,1). Die Schlussfolgerung war davon unberührt — 0,30 bleibt der
   größte haltbare Anteil —, aber eine Zahl im Kommentar ist eine
   Behauptung wie jede andere. Beide Schranken laufen jetzt als
   Prüfung mit. */
export const KRIT_WEISS = 0.30;

export function zahlStil(z) {
  const eigen = z.wert < 0;
  const grund = eigen ? FARBEN.blutHell : artFarbe(z.art);
  if (eigen) return { farbe: grund, skala: 1, tempo: 1, text: `${z.wert}`, krit: false };
  if (z.krit) {
    return {
      farbe: mische(grund, "#ffffff", KRIT_WEISS), skala: 2, tempo: 1.7,
      text: `${z.wert}!`, krit: true
    };
  }
  return { farbe: grund, skala: 1, tempo: 1, text: `${z.wert}`, krit: false };
}

/* ── Ziffern in ganzen Vielfachen ────────────────────────────────────

   `zeichneText` aus `runtime/schrift.js` malt fest in einfacher Größe.
   Ein Krit braucht doppelte — und zwar in **ganzen** Bildpunkten, sonst
   wäre die Zahl das einzige weiche Ding im ganzen Bild. Deshalb wird
   hier dasselbe Glyphenraster benutzt, nur mit `skala` als Kantenlänge
   je Zelle. `schrift.js` bleibt unangetastet: Sie ist die Schrift der
   Anzeige, und die soll nicht skalierbar werden müssen, weil eine
   Schadenszahl es ist. */
const SCHRIFT = bekannteZeichen();

/* Die Randzellen eines Glyphen — einmal je Zeichen gerechnet, dann
   gemerkt. Der einfache Weg wäre, den Text viermal versetzt in
   Konturfarbe zu malen; das sind vier volle Durchgänge je Zeichen.
   Die Randzellen sind gemessen rund ein Drittel davon (12 statt 40
   Rechtecke je Glyph) und ergeben denselben Rand. */
const RAENDER = new Map();
function randZellen(zeichen, glyph) {
  let fertig = RAENDER.get(zeichen);
  if (fertig) return fertig;
  const voll = new Set();
  for (let gy = 0; gy < ZEICHEN_HOEHE; gy++) {
    for (let gx = 0; gx < ZEICHEN_BREITE; gx++) {
      if (glyph[gy][gx] === "#") voll.add(gx + "," + gy);
    }
  }
  fertig = [];
  for (let gy = -1; gy <= ZEICHEN_HOEHE; gy++) {
    for (let gx = -1; gx <= ZEICHEN_BREITE; gx++) {
      if (voll.has(gx + "," + gy)) continue;
      if (voll.has((gx - 1) + "," + gy) || voll.has((gx + 1) + "," + gy)
        || voll.has(gx + "," + (gy - 1)) || voll.has(gx + "," + (gy + 1))) {
        fertig.push([gx, gy]);
      }
    }
  }
  RAENDER.set(zeichen, fertig);
  return fertig;
}

/* Breite eines Textes in dieser Größe — für das Mittigsetzen über dem
   Getroffenen. */
export function ziffernBreite(text, skala) {
  return (text.length * VORSCHUB - 1) * skala;
}

function malZiffern(c, text, x, y, farbe, skala) {
  const px0 = Math.round(x), py = Math.round(y);
  /* Erst der ganze Rand, dann die ganze Zahl: zwei Farbwechsel statt
     zwei je Zeichen. */
  c.fillStyle = FARBEN.kontur;
  let px = px0;
  for (const zeichen of text) {
    const glyph = SCHRIFT.glyphen[zeichen] ?? SCHRIFT.glyphen["?"];
    for (const [gx, gy] of randZellen(zeichen, glyph)) {
      c.fillRect(px + gx * skala, py + gy * skala, skala, skala);
    }
    px += VORSCHUB * skala;
  }
  c.fillStyle = farbe;
  px = px0;
  for (const zeichen of text) {
    const glyph = SCHRIFT.glyphen[zeichen] ?? SCHRIFT.glyphen["?"];
    for (let gy = 0; gy < ZEICHEN_HOEHE; gy++) {
      const zeile = glyph[gy];
      for (let gx = 0; gx < ZEICHEN_BREITE; gx++) {
        if (zeile[gx] === "#") c.fillRect(px + gx * skala, py + gy * skala, skala, skala);
      }
    }
    px += VORSCHUB * skala;
  }
}

/* ── Staub ───────────────────────────────────────────────────────────

   Kein `Math.random`: Zwei Rechner in derselben Runde sollen dasselbe
   sehen, und eine Aufnahme soll sich wiederholen lassen. Die Streuung
   kommt deshalb aus dem **Ort** des Einschlags — derselbe Treffer
   wirft immer denselben Staub, ohne dass irgendwo ein Zustand liegt.
   (Bauregel des Projekts: `spiel/` ist gesät; ein Zeichner, der würfelt,
   nimmt der Wiederholbarkeit den halben Wert.) */
function streu(a, b, k) {
  let h = (Math.round(a) * 374761393 + Math.round(b) * 668265263 + k * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function zeichneStaub(c, welt) {
  for (const f of welt.funken) {
    const tod = f.art === "tod";
    const leben = tod ? TOD_LEBEN : FUNKE_LEBEN;
    const alter = Math.max(0, Math.min(1, 1 - f.zeit / leben));
    const anzahl = STAUB[f.art] ?? STAUB.schnitt;
    const grund = tod ? FARBEN.blut : artFarbe(f.art);
    const hell = tod ? FARBEN.blutHell : mische(grund, "#ffffff", 0.35);
    for (let k = 0; k < anzahl; k++) {
      const w = streu(f.x, f.y, k) * Math.PI * 2;
      /* Die Reichweite steht in **Bildpunkten**, nicht in Tempo mal
         Lebensdauer. Der erste Entwurf rechnete `tempo * leben` und kam
         damit auf 3 bis 9 Bildpunkte — der Staub blieb innerhalb des
         9 x 9 großen Zeichens und war schlicht nicht zu sehen. Jetzt
         7 bis 18, also ein Kranz **um** das Zeichen herum. */
      const reichweite = 7 + streu(f.x, f.y, k + 64) * 11;
      /* Die Wurzel bremst: Ein Korn schießt weg und wird langsamer,
         statt gleichmäßig zu fliegen wie ein Bauteil. */
      const weg = Math.sqrt(alter) * reichweite;
      c.fillStyle = alter < 0.5 ? hell : grund;
      c.fillRect(Math.round(f.x + Math.cos(w) * weg),
        Math.round(f.y + Math.sin(w) * weg * 0.8), 1, 1);
    }
  }
}

/* Die Zeichen selbst — über dem Licht, siehe oben. Der Tod hat kein
   eigenes Zeichen: Dass ein Gegner fällt, sieht man daran, dass er
   verschwindet; ein sechstes Symbol dafür wäre eine Auskunft über
   etwas, das ohnehin nicht zu übersehen ist. */
function zeichneTrefferZeichen(c, welt, sprites, kamera) {
  for (const f of welt.funken) {
    if (f.art === "tod") continue;
    const folge = sprites.treffer?.[f.art];
    if (!folge) continue;
    const bild = folge[bildIndex(f.zeit, FUNKE_LEBEN, folge.length)];
    c.drawImage(bild.l, Math.round(f.x - kamera.x) - bild.mx,
      Math.round(f.y - kamera.y) - bild.my);
  }
}

function zeichneZahlen(c, welt, kamera) {
  for (const z of welt.zahlen) {
    const stil = zahlStil(z);
    const x = z.x - kamera.x - ziffernBreite(stil.text, stil.skala) / 2;
    const y = z.y - kamera.y - z.hoch * stil.tempo;
    /* Ausblenden im letzten Drittel — ein Verschwinden von einem Bild
       aufs nächste liest sich als Aussetzer, nicht als Ende. */
    const rest = z.zeit / (z.wert < 0 ? 0.8 : 0.7);
    c.globalAlpha = rest < 0.34 ? Math.max(0, rest / 0.34) : 1;
    malZiffern(c, stil.text, x, y, stil.farbe, stil.skala);
    c.globalAlpha = 1;
  }
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

  /* Truhen liegen im selben Pass wie die Beute — sie sind Beute, nur
     eine, die man erst am Wellenende öffnet.

     Sie hüpfen **doppelt so hoch** wie eine Münze (3 statt 1,5) und
     tragen einen Lichtsaum. Beides ist kein Schmuck: Die Fackel steht
     in der Mitte der Arena, eine Truhe fällt dort, wo gekämpft wurde —
     also meist im Dunkeln. Ohne eigenes Licht wäre „selten, aber
     auffindbar" (#75) an der Beleuchtung gescheitert, nicht am
     Zufall. */
  for (const t of welt.truhen ?? []) {
    const y = t.y + Math.round(Math.sin(t.hupf) * 3);
    c.fillStyle = FARBEN.gold;
    c.globalAlpha = 0.22 + 0.10 * Math.sin(t.hupf * 1.7);
    c.fillRect(Math.round(t.x) - 7, Math.round(y) - 6, 14, 12);
    c.globalAlpha = 1;
    male(c, sprites.dinge.truheZu, t.x, y);
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

  /* Staub in der Szene — er wird vom Licht gedämpft, das Trefferzeichen
     weiter unten nicht. Warum, steht im Abschnitt „Treffer". */
  zeichneStaub(c, welt);

  c.restore();

  /* Licht als Multiplikation über allem. Danach ist das Bild fertig;
     die Anzeige kommt in `oberflaeche.js` obendrauf und bleibt
     bewusst **außerhalb** des Lichts — eine unlesbare Lebensanzeige
     wäre keine Stimmung, sondern ein Fehler. */
  zeichneLicht(licht, welt, kamera, zeit);
  c.globalCompositeOperation = "multiply";
  c.drawImage(licht.l, 0, 0, BREITE, HOEHE);
  c.globalCompositeOperation = "source-over";

  /* Was gerade getroffen hat und wie hart — beides ist Auskunft und
     liegt deshalb über dem Licht, genau wie die Anzeige in
     `oberflaeche.js`. Ein Einschlag am dunklen Rand wäre sonst nicht
     zu lesen, und das ist die Frage, um die es hier geht. */
  zeichneTrefferZeichen(c, welt, sprites, kamera);
  zeichneZahlen(c, welt, kamera);

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
