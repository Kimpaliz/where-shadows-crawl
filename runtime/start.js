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
   `runtime/oberflaeche.js`, `runtime/eingabe.js`, `runtime/sprites.js`,
   `runtime/lobby.js` (der Einstieg — sie sagt, mit wie vielen und mit
   welcher Saat es losgeht). */

import { starteLauf, naechsteWelle, oeffneKraemer, schrittImLauf, SCHRITT } from "../spiel/lauf.mjs";
import { arenaRadius } from "../spiel/welt.mjs";
import { ladeSprites } from "./sprites.js";
import { macheZeichner, zeichne, baueBoden, fackelOrte, BREITE, HOEHE } from "./zeichnen.js";
import { macheEingabe, macheFlanken } from "./eingabe.js";
import {
  macheMenue, zeichneAnzeige, zeichneWahl, zeichneLaden, zeichneEnde,
  bedieneWahl, bedieneLaden, SPERRE_SEKUNDEN
} from "./oberflaeche.js";
import { macheLobby } from "./lobby.js";
import { ruhendeEingabe } from "../netz/nachrichten.mjs";

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

const flanken = macheFlanken();

let welt = null;
let boden = null;
/* „lobby" statt „vorspiel": Wie viele mitspielen, entscheidet nicht
   mehr eine Taste an dieser Tastatur, sondern wer beitritt. */
let zustand = "lobby";
let sammler = 0;
let zeit = 0;
let vorher = performance.now();
let letztePhase = null;
/* Der Platz dieses Rechners in der Runde. Allein ist das 0; in einer
   Lobby vergibt ihn der Wirt (netz/sitzung.mjs). */
let eigenerPlatz = 0;
let sitzung = null;

/* Ganzzahlig vergrößern, solange etwas zu vergrößern da ist — und
   verkleinern, wenn der Bildschirm kleiner ist als das Bild.

   Der zweite Fall ist neu und war ein Fehler: `Math.max(1, …)` hielt
   den Faktor auch dann bei 1, wenn gar kein Platz für 480 Bildpunkte
   war. Am 05.09.2026 auf einem Telefon hochkant gemessen — 375 x 812
   Bildpunkte Fenster: Die Leinwand stand mit 480 Bildpunkten Breite da,
   also auf **128 %** des Fensters, und `overflow: hidden` schnitt links
   und rechts je **53** Bildpunkte ab. Man sah den Bannkreis nicht mehr
   ganz, ohne dass irgendwo ein Fehler erschien.

   Hochkant gibt es **keinen** ganzzahligen Faktor: 480 passt schlicht
   nicht in 375. Die Wahl steht also nicht zwischen „ganz" und „krumm",
   sondern zwischen „krumm" und „abgeschnitten" — und ein vollständiges
   Bild mit ungleichen Bildpunkten ist besser als ein sauberes Raster,
   von dem ein Fünftel fehlt.

   Quer bleibt alles beim Alten: 812 x 375 ergibt gemessen Faktor 1
   (59,1 % der Breite, 72,0 % der Höhe). Auf einem Telefon mit
   dreifacher Bildpunktdichte sind das genau 3 Gerätepunkte je
   Spielpunkt — sauberer geht es nicht. Deshalb der Hinweis „quer
   halten" statt eines krummen Faktors, wo ein ganzer möglich ist. */
function passeAn() {
  const passt = Math.min(window.innerWidth / BREITE, window.innerHeight / HOEHE);
  const faktor = passt >= 1 ? Math.floor(passt) : passt;
  leinwand.style.width = `${BREITE * faktor}px`;
  leinwand.style.height = `${HOEHE * faktor}px`;
}
addEventListener("resize", passeAn);
/* Beim Drehen des Telefons meldet `orientationchange` die neue Lage,
   bevor `innerWidth` und `innerHeight` sie kennen — man rechnet dann
   mit den Maßen von vorher und bekommt ein Bild in der falschen Größe,
   das erst bei der nächsten Berührung springt. Deshalb ein zweiter
   Anlauf nach dem Umbruch, und zusätzlich das sichtbare Sichtfenster:
   Es ist die einzige Größe, die auf einem Telefon auch dann stimmt,
   wenn die Adressleiste ein- oder ausfährt. */
addEventListener("orientationchange", () => { passeAn(); setTimeout(passeAn, 250); });
window.visualViewport?.addEventListener("resize", passeAn);
passeAn();

/* Die Saat kommt jetzt von außen: allein aus der Lobby, in einer Runde
   vom Wirt. Sie hier zu würfeln hieße, dass jeder Rechner eine andere
   Nacht bekäme (netz/sitzung.mjs). */
function neuerLauf(spielerzahl, saat) {
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

  /* Solange die Lobby oben liegt, malt der Browser sie — die Leinwand
     hat nichts zu tun. */
  if (zustand === "lobby") return;

  /* Dieser Rechner steuert genau eine Figur. Die übrigen Plätze
     bekommen eine stehende Figur, bis der Gleichlauf sie füllt. */
  const rohe = [];
  for (let i = 0; i < welt.spieler.length; i++) rohe.push(ruhendeEingabe());
  if (eigenerPlatz < rohe.length) rohe[eigenerPlatz] = eingabe.liesEigene();
  const eingaben = flanken(rohe);

  /* Wechselt der Bildschirm, wird der Knopf kurz nicht gehoert —
     siehe oberflaeche.js. */
  const phaseJetzt = welt.phase;
  if (phaseJetzt !== letztePhase) { menue.sperre = SPERRE_SEKUNDEN; letztePhase = phaseJetzt; }
  if (menue.sperre > 0) menue.sperre -= dt;

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
    if (menue.sperre <= 0 && eingaben.some((e) => e.knopfFlanke)) {
      /* Zurück in die Lobby, nicht in ein Vorspiel: Wer mitspielt,
         steht dort und nicht an dieser Tastatur. */
      sitzung?.verlasse();
      sitzung = null;
      zustand = "lobby";
      lobby.zeigeWahl();
      return;
    }
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

/* Die Lobby ist der Einstieg. Sie entscheidet, mit wie vielen und mit
   welcher Saat der Lauf beginnt — allein, als Wirt oder als Gast. */
const lobby = macheLobby({
  beiStart({ saat, spielerzahl, eigenerPlatz: platz, sitzung: s }) {
    eigenerPlatz = platz ?? 0;
    sitzung = s ?? null;
    neuerLauf(spielerzahl, saat);
    sammler = 0;
    letztePhase = null;
  }
});
lobby.zeigeWahl();

requestAnimationFrame(bild);
