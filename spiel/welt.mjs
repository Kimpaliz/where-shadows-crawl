/* [Aufgabe: Regelkern] Die Welt und ihr fester Schritt.

   ── Fester Schritt, kein Bildtakt ──────────────────────────────────

   `schritt()` rechnet immer genau 1/60 Sekunde. Nie `dt` vom
   Bildschirm, nie `Date.now()`. Der Grund steht in docs/SPIEL.md 8:
   Nur so sind Balanceläufe wiederholbar, nur so ergibt dieselbe Saat
   dieselbe Nacht, und nur so wäre Netz-Koop später billig.

   Der Bildschirm sammelt die verstrichene Zeit und ruft `schritt()`
   entsprechend oft — das steht in `runtime/start.js` und **nicht**
   hier. Diese Datei kennt keinen Browser.

   ── Was hier zusammenkommt ─────────────────────────────────────────

   Reihenfolge im Schritt ist keine Geschmackssache: `bewegeGegner`
   baut das Raster, und alles danach fragt es ab. Wer die Zeilen
   tauscht, sucht Ziele im Raster von gestern.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   Allen anderen `spiel/`-Modulen. `spiel/lauf.mjs` steuert darüber die
   Abfolge Welle → Laden → Welle. */

import { macheZufall } from "./zufall.mjs";
import { macheGitter } from "./gitter.mjs";
import { macheWerte, lebenMax, genesungJeWelle } from "./werte.mjs";
import { macheWaffe } from "./katalog/waffen.mjs";
import { GEGNER_NACH_ID, lebenInWelle, schadenInWelle, tempoInWelle } from "./katalog/gegner.mjs";
import { baueWelle, dauerDerWelle, WELLEN_JE_LAUF } from "./katalog/wellen.mjs";
import { modus as holeModus, STANDARD_MODUS } from "./katalog/modi.mjs";
import { bewegeSpieler, bewegeGegner } from "./bewegung.mjs";
import { feuereWaffen, feuereGegner, bewegeGeschosse, wirkeZeitschaden, beruehrung, heile } from "./kampf.mjs";
import { bewegeBeute, raeumeBeute } from "./beute.mjs";
import { pruefeAufstieg, alleGewaehlt } from "./stufen.mjs";

export const SCHRITT = 1 / 60;

/* Der Bannkreis wächst mit der Zahl der Spieler — vier Leute auf der
   Fläche für einen wären ein Gedränge, in dem niemand ausweicht
   (docs/SPIEL.md 4.3). */
export function arenaRadius(spielerzahl) {
  return Math.round(190 * Math.sqrt(spielerzahl));
}

export const SPIELER_RADIUS = 5;
export const AUFHEBEN_DAUER = 3;
export const AUFHEBEN_REICHWEITE = 22;
export const AUFSTEH_ANTEIL = 1 / 3;

export function macheSpieler(id, spielerzahl) {
  const werte = macheWerte();
  const winkel = (id / spielerzahl) * Math.PI * 2;
  const s = {
    id, werte,
    x: Math.cos(winkel) * 18, y: Math.sin(winkel) * 18,
    vx: 0, vy: 0, blickX: 0, blickY: 1,
    radius: SPIELER_RADIUS,
    lebenMax: lebenMax(werte), leben: lebenMax(werte),
    waffen: [macheWaffe("sichel", 1)],
    gegenstaende: [],
    gold: 0, wissen: 0, stufe: 1, offeneWahlen: 0, karten: null,
    zustand: "lebt", aufheben: 0, unverwundbar: 0,
    trefferZeit: 0, schlagZeit: 0, schlagWaffe: null,
    getoetet: 0, angebote: null, malGewuerfelt: 0, bereit: false
  };
  return s;
}

export function macheWelt({ spielerzahl = 1, saat = 1, modusId = STANDARD_MODUS } = {}) {
  const welt = {
    saat, spielerzahl,
    modus: holeModus(modusId),
    zufall: macheZufall(saat),
    gitter: macheGitter(24),
    welle: 0, phase: "laden", zeit: 0, dauer: 0,
    plan: [], planIndex: 0,
    arena: { radius: arenaRadius(spielerzahl) },
    spieler: Array.from({ length: spielerzahl }, (_, i) => macheSpieler(i, spielerzahl)),
    gegner: [], geschosse: [], beute: [], funken: [], zahlen: [],
    ticks: 0, verloreneBeute: 0
  };
  return welt;
}

export function starteWelle(welt, welle) {
  welt.welle = welle;
  welt.zeit = 0;
  welt.dauer = dauerDerWelle(welle, welt.modus);
  welt.plan = baueWelle(welle, welt.spielerzahl, welt.zufall, welt.modus).plan;
  welt.planIndex = 0;
  /* Wie diese Runde endet, entscheidet der Modus — nicht der
     Regelkern (spiel/katalog/modi.mjs). */
  welt.endet = welt.modus.endet(welle);
  welt.eliteGesetzt = false;
  welt.gegner = [];
  welt.geschosse = [];
  welt.beute = [];
  welt.funken = [];
  welt.zahlen = [];
  welt.phase = "welle";
  for (const s of welt.spieler) {
    s.bereit = false;
    s.angebote = null;
    for (const w of s.waffen) w.bereitIn = 0;
  }
}

function setzeGegner(welt, artId) {
  const art = GEGNER_NACH_ID.get(artId);
  const z = welt.zufall;
  const winkel = z.zwischen(0, Math.PI * 2);
  /* Von außerhalb des Kreises hereinlaufend: Wer im Kreis erscheint,
     erscheint irgendwann auf dem Spieler, und das liest sich als
     Ungerechtigkeit statt als Gegner. */
  const r = welt.arena.radius + z.zwischen(14, 34);
  welt.gegner.push({
    art, x: Math.cos(winkel) * r, y: Math.sin(winkel) * r,
    vx: 0, vy: 0, stossX: 0, stossY: 0,
    leben: lebenInWelle(art, welt.welle),
    lebenMax: lebenInWelle(art, welt.welle),
    schaden: schadenInWelle(art, welt.welle),
    tempo: tempoInWelle(art, welt.welle),
    radius: art.radius, phase: z.zwischen(0, Math.PI * 2),
    brand: 0, brandRate: 0, gift: 0, giftRate: 0,
    frost: 0, frostStaerke: 0, bereitIn: z.zwischen(0.3, 1.6), tot: false
  });
}

/* Niedergeschlagene aufheben (docs/SPIEL.md 4.2). Drei Sekunden neben
   einem Knienden zu stehen ist teuer — genau das soll es sein. Der
   Fortschritt läuft zurück, wenn niemand mehr dabeisteht, sonst könnte
   man ihn in Häppchen abarbeiten und die Kosten wären keine. */
function hebeAuf(welt, dt) {
  for (const s of welt.spieler) {
    if (s.zustand !== "liegt") continue;
    let helfer = false;
    for (const h of welt.spieler) {
      if (h === s || h.zustand !== "lebt") continue;
      if ((h.x - s.x) ** 2 + (h.y - s.y) ** 2 <= AUFHEBEN_REICHWEITE ** 2) { helfer = true; break; }
    }
    s.aufheben = helfer
      ? s.aufheben + dt
      : Math.max(0, s.aufheben - dt * 0.7);
    if (s.aufheben >= AUFHEBEN_DAUER) {
      s.zustand = "lebt";
      s.leben = Math.max(1, Math.round(s.lebenMax * AUFSTEH_ANTEIL));
      s.aufheben = 0;
      s.unverwundbar = 1.2;
    }
  }
}

function altereListen(welt, dt) {
  for (const f of welt.funken) f.zeit -= dt;
  welt.funken = welt.funken.filter((f) => f.zeit > 0);
  for (const z of welt.zahlen) { z.zeit -= dt; z.hoch += dt * 16; }
  welt.zahlen = welt.zahlen.filter((z) => z.zeit > 0);
  for (const s of welt.spieler) {
    if (s.trefferZeit > 0) s.trefferZeit -= dt;
    if (s.schlagZeit > 0) s.schlagZeit -= dt;
  }
}

/* Ein Schritt. `eingaben` ist ein Feld je Spieler: `{ x, y }` von -1
   bis 1. Mehr braucht das Spiel nicht — es gibt keine Angriffstaste
   (docs/SPIEL.md 6). Genau deshalb wäre Netz-Koop billig. */
export function schritt(welt, eingaben = []) {
  if (welt.phase !== "welle") return welt.phase;
  const dt = SCHRITT;
  welt.ticks++;
  welt.zeit += dt;

  while (welt.planIndex < welt.plan.length && welt.plan[welt.planIndex].zeit <= welt.zeit) {
    const art = welt.plan[welt.planIndex].art;
    setzeGegner(welt, art);
    if (GEGNER_NACH_ID.get(art).elite) welt.eliteGesetzt = true;
    welt.planIndex++;
  }

  for (let i = 0; i < welt.spieler.length; i++) {
    bewegeSpieler(welt.spieler[i], eingaben[i], dt, welt.arena.radius);
  }

  bewegeGegner(welt, dt);
  feuereWaffen(welt, dt);
  feuereGegner(welt, dt);
  bewegeGeschosse(welt, dt);
  wirkeZeitschaden(welt, dt);
  beruehrung(welt, dt);
  bewegeBeute(welt, dt);
  hebeAuf(welt, dt);
  altereListen(welt, dt);

  if (welt.gegner.some((g) => g.tot)) welt.gegner = welt.gegner.filter((g) => !g.tot);

  if (welt.modus.verloren(welt)) {
    welt.phase = "verloren";
    return welt.phase;
  }

  if (pruefeAufstieg(welt)) { welt.phase = "wahl"; return welt.phase; }

  if (rundeVorbei(welt)) {
    beendeWelle(welt);
    return welt.phase;
  }
  return welt.phase;
}

/* Die drei Endebedingungen (spiel/katalog/modi.mjs).

   `elite` ist der Grund, warum es diese Funktion gibt: Eine Bosswelle,
   die nach dreißig Sekunden endet, obwohl der Hauptmann noch steht,
   wäre keine Bosswelle. Sie endet, wenn er liegt — und läuft notfalls
   drei Minuten. */
export function rundeVorbei(welt) {
  if (welt.endet === "elite") {
    if (!welt.eliteGesetzt) return false;
    return !welt.gegner.some((g) => g.art.elite && !g.tot);
  }
  if (welt.endet === "ort") {
    /* Karawane: die Kutsche ist noch nicht gebaut (Phase 6 und 7
       stehen davor). Bis dahin fällt der Modus auf die Uhr zurück,
       statt eine Runde zu bauen, die nie endet. */
    return welt.kutsche ? welt.kutsche.amCheckpoint === true : welt.zeit >= welt.dauer;
  }
  return welt.zeit >= welt.dauer;
}

/* Nach der Wahl geht die Welle weiter — es sei denn, die Uhr ist
   inzwischen abgelaufen. */
export function pruefeWeiter(welt) {
  if (welt.phase !== "wahl") return welt.phase;
  if (!alleGewaehlt(welt)) return welt.phase;
  welt.phase = "welle";
  if (rundeVorbei(welt)) beendeWelle(welt);
  return welt.phase;
}

export function beendeWelle(welt) {
  welt.verloreneBeute += raeumeBeute(welt);
  welt.gegner = [];
  welt.geschosse = [];

  for (const s of welt.spieler) {
    /* Ob ein Niedergeschlagener am Wellenende von selbst aufsteht,
       entscheidet der Modus (spiel/katalog/modi.mjs) — in einem
       endlosen Lauf kostet ein Sturz sonst nichts, solange nicht alle
       gleichzeitig liegen. */
    if (s.zustand === "liegt" && welt.modus.stehtAmWellenendeAuf !== false) {
      s.zustand = "lebt";
      s.leben = Math.max(1, Math.round(s.lebenMax * AUFSTEH_ANTEIL));
      s.aufheben = 0;
    } else {
      heile(s, genesungJeWelle(s.werte));
    }
  }

  /* Ein endloser Modus kennt kein Gewinnen — nur ein „wie weit".
     Deshalb fragt auch das der Modus und nicht der Regelkern. */
  welt.phase = (!welt.modus.endlos
    && welt.welle >= (welt.modus.wellenJeLauf ?? WELLEN_JE_LAUF))
    ? "gewonnen" : "laden";
}
