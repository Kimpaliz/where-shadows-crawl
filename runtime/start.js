/* [Aufgabe: Bedienung] Der Einstieg — hier und nur hier gibt es einen Browser.

   ── Die Uhr des Bildschirms und die Uhr der Welt sind zwei Uhren ───

   Der Bildschirm ruft, wann er will: 60-mal je Sekunde, 144-mal, oder
   nach einem Tabwechsel eine Sekunde am Stück. Die Welt rechnet immer
   genau 1/60 Sekunde je Schritt (`spiel/welt.mjs`). Diese Datei
   sammelt die verstrichene Zeit und ruft entsprechend oft — mit einer
   Obergrenze, damit ein langer Tabwechsel nicht zweitausend Schritte
   auf einmal nachholt und die Seite einfriert.

   ── Ganzzahlig vergrößern ──────────────────────────────────────────

   Gerechnet wird auf 480 x 270. Auf den Bildschirm kommt das mit einem
   **ganzen** Faktor. Lieber ein schwarzer Rand als ein krummer Faktor:
   Bei 2,7-facher Vergrößerung wird aus jedem dritten Bildpunkt ein
   doppelt so breiter, und genau das sieht man einer unechten
   Pixelgrafik an.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/lauf.mjs` (der ganze Ablauf), `runtime/zeichnen.js`,
   `runtime/oberflaeche.js`, `runtime/eingabe.js`, `runtime/sprites.js`. */

import { starteLauf, naechsteWelle, oeffneKraemer, schrittImLauf, SCHRITT } from "../spiel/lauf.mjs";
import { arenaRadius } from "../spiel/welt.mjs";
import { ladeSprites } from "./sprites.js";
import { macheZeichner, zeichne, baueBoden, fackelOrte, BREITE, HOEHE } from "./zeichnen.js";
import { macheEingabe } from "./eingabe.js";
import {
  macheMenue, zeichneAnzeige, zeichneWahl, zeichneLaden, zeichneVorspiel, zeichneEnde,
  bedieneWahl, bedieneLaden, SPERRE_SEKUNDEN
} from "./oberflaeche.js";

/* Höchstens so viele Weltschritte je Bild. Bei 60 Bildern je Sekunde
   werden nie mehr als vier gebraucht; die Grenze fängt nur den Fall
   „Tab war zehn Minuten im Hintergrund" ab. */
const MAX_SCHRITTE = 8;

const leinwand = document.getElementById("bild");
leinwand.width = BREITE;
leinwand.height = HOEHE;

const zeichner = macheZeichner(leinwand);
const sprites = ladeSprites();
const eingabe = macheEingabe();
const menue = macheMenue();

let welt = null;
let boden = null;
let zustand = "vorspiel";
let sammler = 0;
let zeit = 0;
let vorher = performance.now();
let letztePhase = null;

function passeAn() {
  const faktor = Math.max(1, Math.floor(Math.min(
    window.innerWidth / BREITE, window.innerHeight / HOEHE
  )));
  leinwand.style.width = `${BREITE * faktor}px`;
  leinwand.style.height = `${HOEHE * faktor}px`;
}
addEventListener("resize", passeAn);
passeAn();

function neuerLauf(spielerzahl) {
  const saat = (Math.random() * 0xffffffff) >>> 0;
  welt = starteLauf({ spielerzahl, saat });
  /* Die Fackeln gehören zum Bild, nicht zur Regel — deshalb hängen sie
     an der Welt, ohne dass `spiel/` von ihnen weiß. Der Regelkern
     bliebe ohne sie unverändert lauffähig. */
  const r = arenaRadius(spielerzahl);
  /* Die eine Fackel leuchtet knapp ueber den Ring hinaus. Genau bis
     zum Ring waere der Rand pechschwarz und die Gegner kaemen aus dem
     Nichts; deutlich darueber hinaus waere der ganze Kreis gleich hell
     und der Rand keine Drohung mehr. */
  const reichweite = Math.round(r * 1.12);
  welt.fackeln = fackelOrte(r).map((f) => ({ ...f, reichweite, reichweiteQ: reichweite * reichweite }));
  boden = baueBoden(r, saat, sprites);
  naechsteWelle(welt);
  zustand = "spiel";
}

function bild(jetzt) {
  requestAnimationFrame(bild);
  const dt = Math.min(0.25, (jetzt - vorher) / 1000);
  vorher = jetzt;
  zeit += dt;

  const eingaben = eingabe.lies(zustand === "vorspiel" ? 4 : welt.spieler.length);

  /* Wechselt der Bildschirm, wird der Knopf kurz nicht gehoert —
     siehe oberflaeche.js. */
  const phaseJetzt = zustand === "vorspiel" ? "vorspiel" : welt.phase;
  if (phaseJetzt !== letztePhase) { menue.sperre = SPERRE_SEKUNDEN; letztePhase = phaseJetzt; }
  if (menue.sperre > 0) menue.sperre -= dt;

  if (zustand === "vorspiel") {
    const e = eingaben[0];
    if (e.xFlanke) menue.spielerzahl = Math.max(1, Math.min(4, menue.spielerzahl + e.xFlanke));
    if (e.knopfFlanke && menue.sperre <= 0) { neuerLauf(menue.spielerzahl); sammler = 0; }
    zeichneVorspiel(zeichner.c, menue, eingabe.pads());
    return;
  }

  if (welt.phase === "welle") {
    sammler += dt;
    let n = 0;
    while (sammler >= SCHRITT && n < MAX_SCHRITTE) {
      schrittImLauf(welt, eingaben);
      sammler -= SCHRITT;
      n++;
      if (welt.phase !== "welle") break;
    }
    if (sammler > SCHRITT * MAX_SCHRITTE) sammler = 0;
  } else if (welt.phase === "wahl") {
    bedieneWahl(welt, menue, eingaben);
    schrittImLauf(welt, eingaben);
  } else if (welt.phase === "laden") {
    if (!welt.spieler[0].angebote) {
      oeffneKraemer(welt);
      for (const s of welt.spieler) menue.ladenZeiger[s.id] = 0;
    }
    if (bedieneLaden(welt, menue, eingaben)) { naechsteWelle(welt); sammler = 0; }
  } else if (welt.phase === "gewonnen" || welt.phase === "verloren") {
    if (menue.sperre <= 0 && eingaben.some((e) => e.knopfFlanke)) { zustand = "vorspiel"; return; }
  }

  /* Die Welt wird immer gezeichnet — auch hinter Laden und Kartenwahl.
     Das hält den Zusammenhang: Man sieht, wo man steht, während man
     einkauft, und die Pause fühlt sich nicht wie ein anderer
     Bildschirm an. */
  zeichne(zeichner, welt, boden, sprites, zeit);

  if (welt.phase === "welle") zeichneAnzeige(zeichner.c, welt);
  else if (welt.phase === "wahl") { zeichneAnzeige(zeichner.c, welt); zeichneWahl(zeichner.c, welt, menue); }
  else if (welt.phase === "laden") zeichneLaden(zeichner.c, welt, menue);
  else zeichneEnde(zeichner.c, welt);
}

requestAnimationFrame(bild);
