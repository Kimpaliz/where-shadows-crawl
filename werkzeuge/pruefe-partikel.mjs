/* [Aufgabe: Prüfwesen] Teilchen und Effekte: Bahn, Grenze, Verglimmen.

       node werkzeuge/pruefe-partikel.mjs

   ── Warum es diese Datei gibt ──────────────────────────────────────

   Weil `runtime/partikel.js` und `runtime/effekte.js` in **keiner**
   Prüfung liefen, als sie entstanden — und weil dieses Projekt genau
   dafür einen Fall im Fehlerbuch hat (E1: „Was in keiner Prüfung
   läuft, geht still kaputt"). Beide Dateien fassen keinen Browser an,
   also gibt es keine Ausrede.

   ── Was ohne sie still durchkäme ───────────────────────────────────

   | was still kaputtgeht | wie es sich anfühlt |
   | --- | --- |
   | der Schwarm läuft über und wächst weiter | das Spiel wird nach zwei Minuten zäh — und niemand verbindet das mit einem Treffer |
   | ein Teilchen stirbt nie | derselbe Effekt, nur langsamer |
   | derselbe Treffer spritzt in **jedem** Bild neu | aus fünf Funken werden dreihundert, und die Grenze ist sofort erreicht |
   | der Auswurf hängt an der Bildrate | auf einem 144-Hz-Bildschirm qualmt derselbe Kegel dreimal so dicht |
   | ein `Math.random` schleicht sich ein | dasselbe Bild lässt sich nie wieder herstellen, und der halbe Wert jeder Messung ist weg |
   | ein Teilchen landet auf einem halben Bildpunkt | der Browser zieht es weich — genau daran erkennt man unechte Pixelgrafik |
   | ein Feld leuchtet, obwohl es noch gar nicht eingeschlagen ist | die Vorwarnung eines Meteors verrät sich als Lichtquelle, bevor sie etwas tut |

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/partikel.js` und `runtime/effekte.js` (das Geprüfte),
   `runtime/palette.js`, `spiel/angriffsformen.mjs` (was ein Feld ist),
   `werkzeuge/pruefe-angriffsformen.mjs` (die Regelseite derselben
   Sache). */

import { macheMelder, liesDatei } from "./helfer.mjs";
import {
  SORTEN, SORTEN_IDS, HOECHSTZAHL, macheSchwarm, rampeFuer,
  stufeFuerAlter, hash, mische
} from "../runtime/partikel.js";
import {
  macheEffekte, artFarbe, lichtQuellen, LICHT_FELDER_HOECHSTENS
} from "../runtime/effekte.js";
import { FARBEN } from "../runtime/palette.js";
import { ART_IDS } from "../spiel/schadensarten.mjs";

const { melde, ende } = macheMelder({ still: true });

/* Eine Welt, so klein wie möglich: `fuettere()` liest genau vier
   Listen und sonst nichts. */
function probeWelt(zusatz = {}) {
  return { funken: [], blitze: [], felder: [], geschosse: [], ...zusatz };
}

/* ── 1 · Die Sorten sind vollständig ─────────────────────────────── */
{
  const FELDER = ["leben", "streuung", "tempo", "reibung", "auftrieb", "schwere", "groesse"];
  melde(SORTEN_IDS.length >= 5, "es gibt genug Teilchensorten", `${SORTEN_IDS.length}`);
  for (const id of SORTEN_IDS) {
    const s = SORTEN[id];
    const fehlt = FELDER.filter((f) => typeof s[f] !== "number");
    melde(fehlt.length === 0, `${id}: alle Zahlen gesetzt`, fehlt.join(" "));
    melde(s.leben > 0, `${id}: lebt überhaupt`, `${s.leben}`);
    melde(s.groesse === 1 || s.groesse === 2,
      `${id}: ist ein oder zwei Bildpunkte groß`, `${s.groesse}`);
  }

  /* Ein Teilchen muss länger leben als der Staubkranz, den es ergänzt
     (0,18 s in `runtime/zeichnen.js`) — sonst wäre die ganze Datei ein
     zweiter Staubkranz mit mehr Verwaltung. */
  const laengste = Math.max(...SORTEN_IDS.map((id) => SORTEN[id].leben));
  melde(laengste > 0.18 * 3,
    "die längste Sorte lebt deutlich länger als der alte Staubkranz",
    `${laengste} s gegen 0,18 s`);

  /* Genau **eine** Sorte steigt auf. Stiegen alle, wäre „oben" keine
     Aussage mehr, sondern eine allgemeine Drift des Bildes. */
  const steigend = SORTEN_IDS.filter((id) => SORTEN[id].auftrieb > 0);
  melde(steigend.length >= 1 && steigend.length <= 2,
    "nur wenige Sorten steigen auf", steigend.join(" "));
}

/* ── 2 · Die Streuung ist eine Rechnung, kein Würfel ─────────────── */
{
  melde(hash(1) === hash(1), "derselbe Zähler gibt dieselbe Zahl");
  melde(hash(1) !== hash(2), "ein anderer eine andere");
  const werte = Array.from({ length: 5000 }, (_, i) => hash(i));
  melde(werte.every((v) => v >= 0 && v < 1), "alle Zahlen liegen in [0,1)");
  const mittel = werte.reduce((a, b) => a + b, 0) / werte.length;
  melde(Math.abs(mittel - 0.5) < 0.02, "und streuen gleichmäßig", mittel.toFixed(4));

  /* ⚠️ Kein Würfel im Zeichner. Die Kommentare erklären das und nennen
     `Math.random` dabei — also wird das Zitierte vorher herausgenommen
     (`docs/FEHLERBUCH.md` B4), mit Gegenprobe, dass die Ersetzung nicht
     einfach alles wegputzt. */
  for (const datei of ["runtime/partikel.js", "runtime/effekte.js"]) {
    const roh = liesDatei(datei);
    const ohne = roh
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
    melde(!/Math\.random|Date\.now|new Date\(/.test(ohne),
      `${datei}: würfelt nicht und fragt keine Uhr`);
    melde(ohne.length > 400, `${datei}: nach dem Entfernen der Kommentare bleibt Programm übrig`,
      `${ohne.length} Zeichen`);
  }
}

/* ── 3 · Farben und Verglimmen ───────────────────────────────────── */
{
  for (const art of ART_IDS) {
    const rampe = rampeFuer(artFarbe(art));
    melde(rampe.length === 4, `${art}: vier Stufen`);
    melde(rampe.every((f) => /^#[0-9a-f]{6}$/.test(f)),
      `${art}: alle Stufen sind gültige Farbcodes`, rampe.join(" "));
    melde(new Set(rampe).size === 4, `${art}: und alle vier verschieden`, rampe.join(" "));

    /* Die erste Stufe ist die hellste, die letzte die dunkelste —
       sonst leuchtet ein Teilchen am Ende heller als am Anfang. */
    const hell = (f) => parseInt(f.slice(1, 3), 16) + parseInt(f.slice(3, 5), 16)
      + parseInt(f.slice(5, 7), 16);
    melde(hell(rampe[0]) > hell(rampe[3]),
      `${art}: die Rampe wird dunkler, nicht heller`,
      `${hell(rampe[0])} auf ${hell(rampe[3])}`);
  }

  melde(mische("#000000", "#ffffff", 0) === "#000000", "Mischung bei 0 gibt die Ausgangsfarbe");
  melde(mische("#000000", "#ffffff", 1) === "#ffffff", "bei 1 die Zielfarbe");
  melde(mische("#000000", "#ffffff", 0.5) === "#808080", "und dazwischen die Mitte");

  const stufen = [0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1].map(stufeFuerAlter);
  melde(stufen.every((v, i) => i === 0 || v >= stufen[i - 1]),
    "die Stufe steigt mit dem Alter", stufen.join(""));
  melde(stufeFuerAlter(0) === 0 && stufeFuerAlter(1) === 3,
    "und deckt alle vier ab", `${stufeFuerAlter(0)} bis ${stufeFuerAlter(1)}`);
}

/* ── 4 · Der Schwarm läuft nicht über ───────────────────────────────

   Die teuerste Zusicherung der Datei: Ein Schwarm, der wächst, macht
   das Spiel nach zwei Minuten zäh — und niemand verbindet das mit
   einem Treffer. */
{
  const schwarm = macheSchwarm(64);
  melde(schwarm.lebende() === 0, "ein frischer Schwarm ist leer");

  for (let i = 0; i < 500; i++) schwarm.stosse("funke", 5, i, i, "#ff0000");
  melde(schwarm.alle().length === 64, "die Zahl der Plätze wächst nie",
    `${schwarm.alle().length}`);
  melde(schwarm.lebende() <= 64, "und es leben nie mehr als Plätze da sind",
    `${schwarm.lebende()}`);

  /* Und sie sterben wieder. Ohne diese Zeile könnte `rest` stehen
     bleiben und der Schwarm wäre nach dem ersten Kampf für immer voll. */
  for (let i = 0; i < 200; i++) schwarm.schritt(1 / 60);
  melde(schwarm.lebende() === 0, "nach ihrer Zeit sind alle wieder frei",
    `${schwarm.lebende()}`);

  /* Ein Platz wird wiederverwendet — es entstehen keine neuen Objekte. */
  const vorher = schwarm.alle()[0];
  schwarm.stosse("funke", 64, 0, 0, "#ff0000");
  melde(schwarm.alle()[0] === vorher, "die Plätze werden wiederverwendet");

  melde(HOECHSTZAHL >= 200 && HOECHSTZAHL <= 2000,
    "die Obergrenze liegt in einem Bereich, den ein Telefon trägt", `${HOECHSTZAHL}`);
  schwarm.leeren();
  melde(schwarm.lebende() === 0, "und `leeren()` räumt wirklich auf");
}

/* ── 5 · Ein Teilchen fliegt wirklich ───────────────────────────── */
{
  const schwarm = macheSchwarm(8);
  schwarm.stosse("glut", 1, 100, 100, "#ff8c2e");
  const p = schwarm.alle().find((x) => x.rest > 0);
  melde(!!p, "der Stoß hat ein Teilchen gesetzt");

  const tempo0 = Math.hypot(p.vx, p.vy);
  melde(tempo0 > 0, "und es hat ein Anfangstempo", tempo0.toFixed(1));

  const x0 = p.x, y0 = p.y;
  const tempi = [];
  for (let i = 0; i < 20; i++) { schwarm.schritt(1 / 60); tempi.push(Math.hypot(p.vx, p.vy)); }
  melde(p.x !== x0 || p.y !== y0, "es bewegt sich");
  melde(p.rest < p.leben, "und altert dabei");

  /* Glut hat Schwere und Reibung: quer wird sie langsamer, nach unten
     schneller. Gemessen wird der Quer-Anteil, weil die Schwere den
     Gesamtbetrag wieder anheben kann. */
  melde(Math.abs(p.vx) < Math.abs(tempo0),
    "die Reibung bremst", `${Math.abs(p.vx).toFixed(1)} von ${tempo0.toFixed(1)}`);

  const ohneSchwere = macheSchwarm(4);
  ohneSchwere.stosse("schweif", 1, 0, 0, "#ffffff");
  const q = ohneSchwere.alle().find((x) => x.rest > 0);
  const t0 = Math.hypot(q.vx, q.vy);
  for (let i = 0; i < 10; i++) ohneSchwere.schritt(1 / 60);
  melde(Math.hypot(q.vx, q.vy) < t0, "auch ohne Schwere wird gebremst",
    `${Math.hypot(q.vx, q.vy).toFixed(2)} von ${t0.toFixed(2)}`);

  /* Ein Stoß streut wirklich: Zwei Teilchen desselben Stoßes fliegen
     nicht dieselbe Bahn. Ohne Streuung wäre ein Stoß ein Punkt. */
  const viele = macheSchwarm(32);
  viele.stosse("funke", 12, 0, 0, "#ffffff");
  const richtungen = new Set(viele.alle().filter((x) => x.rest > 0)
    .map((x) => `${x.vx.toFixed(2)},${x.vy.toFixed(2)}`));
  melde(richtungen.size >= 10, "ein Stoß streut in verschiedene Richtungen",
    `${richtungen.size} von 12`);

  /* Und die Lebensdauern sind nicht alle gleich — sonst erlöschen sie
     im selben Bild, und das liest sich als Aussetzer. */
  const leben = new Set(viele.alle().filter((x) => x.rest > 0).map((x) => x.leben.toFixed(3)));
  melde(leben.size >= 8, "und sie erlöschen nicht alle im selben Bild",
    `${leben.size} verschiedene Lebensdauern`);
}

/* ── 6 · Gemalt wird auf ganze Bildpunkte ───────────────────────── */
{
  const schwarm = macheSchwarm(16);
  schwarm.stosse("flamme", 8, 40.4, 90.7, "#ff8c2e");
  schwarm.schritt(1 / 60);

  const c = {
    fillStyle: "", rechtecke: [],
    fillRect(x, y, b, h) { this.rechtecke.push({ x, y, b, h }); }
  };
  schwarm.zeichne(c);
  melde(c.rechtecke.length > 0, "der Schwarm malt", `${c.rechtecke.length}`);
  melde(c.rechtecke.every((r) => Number.isInteger(r.x) && Number.isInteger(r.y)),
    "und immer auf ganze Bildpunkte — sonst zieht der Browser die Kante weich");
  melde(c.rechtecke.every((r) => r.b >= 1 && r.b <= 2 && r.h === r.b),
    "jedes Teilchen ist ein Quadrat von einem oder zwei Bildpunkten");

  /* Ein toter Schwarm malt nichts. */
  schwarm.leeren();
  const leer = { fillStyle: "", rechtecke: [], fillRect(...a) { this.rechtecke.push(a); } };
  schwarm.zeichne(leer);
  melde(leer.rechtecke.length === 0, "ein leerer Schwarm malt nichts");
}

/* ── 7 · Derselbe Treffer spritzt genau einmal ──────────────────────

   Das `WeakSet` in `macheEffekte()` ist die eine Stelle, an der ein
   Fehler teuer wäre: Ohne es spritzte jeder Funke in **jedem** Bild
   neu — aus fünf Teilchen würden bei 60 Bildern je Sekunde
   dreihundert, und die Grenze wäre nach einem Treffer erreicht. */
{
  const schwarm = macheSchwarm(400);
  const effekte = macheEffekte(schwarm);
  const funke = { x: 10, y: 10, zeit: 0.18, art: "feuer" };
  const welt = probeWelt({ funken: [funke] });

  effekte.fuettere(welt, 1 / 60);
  const nachEinem = schwarm.lebende();
  melde(nachEinem > 0, "ein Treffer wirft Teilchen", `${nachEinem}`);

  for (let i = 0; i < 30; i++) effekte.fuettere(welt, 1 / 60);
  melde(schwarm.lebende() <= nachEinem,
    "und derselbe Treffer wirft in den nächsten dreißig Bildern keine neuen",
    `${schwarm.lebende()} gegen ${nachEinem}`);

  /* Gegenprobe: Ein **neuer** Funke wirft sehr wohl. Ohne sie könnte
     die Zeile oben grün sein, weil gar nichts mehr spritzt. */
  welt.funken.push({ x: 50, y: 50, zeit: 0.18, art: "frost" });
  const vorher = schwarm.lebende();
  effekte.fuettere(welt, 1 / 60);
  melde(schwarm.lebende() > vorher, "ein neuer Treffer schon",
    `${vorher} auf ${schwarm.lebende()}`);

  /* Ein Tod wirft mehr als ein gewöhnlicher Treffer — sonst wäre der
     Unterschied zwischen „getroffen" und „gefallen" nur die Farbe. */
  const a = macheSchwarm(200), ea = macheEffekte(a);
  ea.fuettere(probeWelt({ funken: [{ x: 0, y: 0, zeit: 0.18, art: "schnitt" }] }), 1 / 60);
  const b = macheSchwarm(200), eb = macheEffekte(b);
  eb.fuettere(probeWelt({ funken: [{ x: 0, y: 0, zeit: 0.3, art: "tod" }] }), 1 / 60);
  melde(b.lebende() > a.lebende(), "ein Tod wirft mehr als ein Treffer",
    `${b.lebende()} gegen ${a.lebende()}`);
}

/* ── 8 · Der Auswurf hängt an der Zeit, nicht an der Bildrate ───────

   Ohne das Konto in `macheEffekte()` qualmte derselbe Kegel auf einem
   144-Hz-Bildschirm zweieinhalbmal so dicht wie auf einem mit 60. */
{
  function auswurfBei(bilder) {
    const schwarm = macheSchwarm(2000);
    const effekte = macheEffekte(schwarm);
    const feld = {
      form: "kegel", x: 0, y: 0, nx: 1, ny: 0, halbWinkel: 0.6, radius: 60,
      rest: 1.8, dauer: 1.8, warnRest: 0, restStaerke: 0.3, art: "feuer"
    };
    const welt = probeWelt({ felder: [feld] });
    /* Eine ganze Sekunde, in verschieden vielen Bildern. */
    const dt = 1 / bilder;
    let gesetzt = 0;
    const echt = schwarm.stosse;
    for (let i = 0; i < bilder; i++) {
      const vorher = schwarm.lebende();
      effekte.fuettere(welt, dt);
      gesetzt += Math.max(0, schwarm.lebende() - vorher);
    }
    return gesetzt;
  }

  const bei60 = auswurfBei(60);
  const bei144 = auswurfBei(144);
  melde(bei60 > 10, "ein Kegel wirft überhaupt Teilchen aus", `${bei60} in einer Sekunde`);
  /* Die lebenden Teilchen sind nicht die gesetzten (manche sterben
     schon wieder), deshalb ein großzügiges Fenster — es geht um den
     Faktor 2,4, nicht um die letzte Stelle. */
  melde(Math.abs(bei144 - bei60) <= bei60 * 0.35,
    "und bei 144 Bildern je Sekunde ungefähr gleich viele",
    `${bei60} gegen ${bei144}`);
}

/* ── 9 · Nur was wirklich brennt, leuchtet ──────────────────────── */
{
  const warnend = { form: "meteore", x: 0, y: 0, radius: 22, rest: 1, dauer: 0.35,
    warnRest: 0.4, leuchtet: 1.2, restStaerke: 1, art: "feuer" };
  const einschlag = { ...warnend, warnRest: 0 };
  const stumm = { form: "bogen", x: 0, y: 0, radius: 52, rest: 0.2, dauer: 0.2,
    warnRest: 0, leuchtet: 0, restStaerke: 1, art: "schnitt" };

  melde(lichtQuellen(probeWelt({ felder: [warnend] })).length === 0,
    "eine Vorwarnung leuchtet noch nicht — sonst verriete sie sich, bevor sie etwas tut");
  melde(lichtQuellen(probeWelt({ felder: [einschlag] })).length === 1,
    "der Einschlag danach schon");
  melde(lichtQuellen(probeWelt({ felder: [stumm] })).length === 0,
    "ein Sichelbogen leuchtet gar nicht");

  const viele = Array.from({ length: 20 }, () => ({ ...einschlag }));
  melde(lichtQuellen(probeWelt({ felder: viele })).length === LICHT_FELDER_HOECHSTENS,
    "und mehr als die Obergrenze kommen nie in die Lichtrechnung",
    `${lichtQuellen(probeWelt({ felder: viele })).length}`);

  /* Ein ausglühender Kegel leuchtet am Ende schwächer als am Anfang. */
  const frisch = { form: "kegel", x: 0, y: 0, radius: 62, rest: 1.8, dauer: 1.8,
    warnRest: 0, leuchtet: 1, restStaerke: 0.3, art: "feuer" };
  const alt = { ...frisch, rest: 0.05 };
  melde(lichtQuellen(probeWelt({ felder: [frisch] }))[0].staerke
    > lichtQuellen(probeWelt({ felder: [alt] }))[0].staerke,
    "ein ausglühender Kegel leuchtet zum Schluss schwächer");

  melde(lichtQuellen({}).length === 0, "eine Welt ohne Felder gibt keine Lichtquellen");
}

/* ── 10 · Blitze und Schweife ────────────────────────────────────── */
{
  const schwarm = macheSchwarm(300);
  const effekte = macheEffekte(schwarm);
  const blitz = {
    punkte: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 60, y: 10 }],
    rest: 0.16, dauer: 0.16, art: "fluch"
  };
  effekte.fuettere(probeWelt({ blitze: [blitz] }), 1 / 60);
  melde(schwarm.lebende() > 0, "ein Blitz schlägt Funken", `${schwarm.lebende()}`);

  /* Ein gewöhnliches Geschoss bekommt **keinen** Schweif — sonst wäre
     bei acht Irrlichtern und drei Bannsteinen gleichzeitig ein
     Nebelfeld im Bild. */
  const s2 = macheSchwarm(300), e2 = macheEffekte(s2);
  const schlicht = { x: 0, y: 0, suchend: false, bremse: 0, schlag: { art: "schnitt" } };
  for (let i = 0; i < 20; i++) e2.fuettere(probeWelt({ geschosse: [schlicht] }), 1 / 60);
  melde(s2.lebende() === 0, "ein gewöhnliches Geschoss zieht keinen Schweif");

  const s3 = macheSchwarm(300), e3 = macheEffekte(s3);
  const sucher = { x: 0, y: 0, suchend: true, bremse: 0, schlag: { art: "fluch" } };
  for (let i = 0; i < 20; i++) e3.fuettere(probeWelt({ geschosse: [sucher] }), 1 / 60);
  melde(s3.lebende() > 0, "ein suchendes schon", `${s3.lebende()}`);
  /* Aber gedrosselt: höchstens alle 0,03 s eines, also rund zehn in
     zwanzig Bildern und nicht zwanzig. */
  melde(s3.lebende() <= 12, "und zwar gedrosselt, nicht in jedem Bild",
    `${s3.lebende()} in 20 Bildern`);
}

/* ── 11 · Die Farbe kommt aus der Schadensart ─────────────────────── */
{
  for (const art of ART_IDS) {
    melde(/^#[0-9a-f]{6}$/.test(artFarbe(art)), `${art}: hat eine gültige Farbe`, artFarbe(art));
  }
  melde(artFarbe("gibtesnicht") === artFarbe("schnitt"),
    "eine unbekannte Art fällt auf die Standardart zurück");
  melde(new Set(ART_IDS.map(artFarbe)).size === ART_IDS.length,
    "und die fünf Arten haben fünf verschiedene Farben");

  /* Die Farben stammen wirklich aus der Palette und sind nicht frei
     gemischt — sonst sähe ein Teilchen aus wie ein Fremdkörper. */
  const paletten = new Set(Object.values(FARBEN));
  const fremd = ART_IDS.map(artFarbe).filter((f) => !paletten.has(f));
  melde(fremd.length === 0, "jede Artfarbe steht so in der Palette", fremd.join(" "));
}

ende();
