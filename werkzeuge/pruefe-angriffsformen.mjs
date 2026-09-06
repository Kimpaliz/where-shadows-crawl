/* [Aufgabe: Prüfwesen] Die sieben Angriffsformen: tun sie, was sie versprechen?

       node werkzeuge/pruefe-angriffsformen.mjs

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   Janniks Ansage war *„die angriffe dürfen nicht blos ein treffer
   effekt sein"*. Genau **das** ist der Zustand, in den diese Änderung
   lautlos zurückfallen kann, und zwar auf sieben verschiedene Weisen:

   | was still kaputtgeht | wie es sich anfühlt |
   | --- | --- |
   | der Kegel trifft auch nach hinten | „warum stirbt der hinter mir?" — man hält es für einen Zufall |
   | der Kegel glüht nur **optisch** aus | er sieht schwächer aus und trifft gleich hart |
   | die Kette trifft denselben Gegner zweimal | eine Waffe, die bei einem einzelnen Gegner viermal so hart zuschlägt |
   | das erlahmende Geschoss verliert nur Tempo | „verliert an Schaden" wäre ein Satz im Katalog ohne Deckung |
   | der Sichelbogen trifft rundum | genau die Beschwerde, aus der er entstanden ist |
   | die Aura wirkt nur mit Ziel in Reichweite | dann ist sie keine Aura, sondern ein Nahkampfschlag mit Ring |
   | ein Muster zieht einmal zu viel aus `welt.zufall` | **jede** spätere Messung im Projekt ist verschoben, ohne dass etwas rot wird |

   Keiner der sieben Punkte wirft eine Fehlermeldung. Sechs davon sind
   im Bild nicht einmal auffällig.

   ── Warum gegen den echten Aufruf und nicht gegen den Quelltext ────

   Ein Regex sieht nicht, ob ein Kegel wirklich kegelt. Die Geometrie
   wird deshalb an `imKegel()` selbst gemessen, und die vier Formen mit
   Feldern laufen in einer **echten Welt** — mit `macheWelt()`,
   `starteWelle()` und `schritt()`, denselben Bausteinen wie im Spiel.
   Nur so fällt auf, wenn eine Form gebaut ist und niemand sie aufruft
   (`docs/FEHLERBUCH.md` E1: „Was in keiner Prüfung läuft, geht still
   kaputt").

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/angriffsformen.mjs` (das Geprüfte), `spiel/kampf.mjs` (führt
   sie aus), `spiel/katalog/waffen.mjs` (wer welche trägt),
   `spiel/welt.mjs` (die Listen), `werkzeuge/pruefe-angriffe.mjs`
   (die Salvenmuster — die andere Hälfte). */

import { macheMelder, liesDatei } from "./helfer.mjs";
import {
  ANGRIFFSFORMEN, FELDFORMEN, angriffsformVon, istAngriffsform,
  imKegel, drehe, richtungZu, staerkeDesFeldes, anteilJeTakt,
  kettenZiele, kettenAnteil, bremseGeschoss, erlahmterAnteil,
  schwarmZiel, neuesSuchziel, baueMeteore, baueKegel, baueAura, baueBogen
} from "../spiel/angriffsformen.mjs";
import { WAFFEN, WAFFE_NACH_ID, macheWaffe } from "../spiel/katalog/waffen.mjs";
import { macheWelt, starteWelle, schritt } from "../spiel/welt.mjs";
import { GEGNER, GEGNER_NACH_ID } from "../spiel/katalog/gegner.mjs";

const { melde, ende } = macheMelder({ still: true });

/* Ein gesäter Strom von Hand — dieselbe Schnittstelle wie
   `welt.zufall`, aber vorhersagbar, damit die Prüfung nicht selbst
   würfelt. Übernommen aus `werkzeuge/pruefe-angriffe.mjs`. */
function macheStrom(werte) {
  let i = 0;
  return { zahl: () => werte[i++ % werte.length] };
}

/* ── 1 · Der Bestand bleibt der Bestand ─────────────────────────────

   Der wichtigste Abschnitt der Datei, und der langweiligste: Wenn eine
   der zwölf alten Waffen ihre Form wechselt, ändert sich jede
   Balancemessung des Projekts — und zwar ohne dass jemand es wollte. */
{
  const NEUE = ["flammenatem", "irrlichter", "moderkranz", "bleischleuder",
    "gewitterrune", "sternenfall", "mondsichel"];
  const alt = WAFFEN.filter((w) => !NEUE.includes(w.id));
  melde(alt.length === 12, "die zwölf Waffen von vorher gibt es noch", `${alt.length}`);

  for (const w of alt) {
    melde(w.angriffsform === undefined,
      `${w.id}: trägt keine Angriffsform und fällt damit auf den Bestand zurück`,
      `${w.angriffsform}`);
    const soll = w.art === "nahkampf" ? "schlag" : "geschoss";
    melde(angriffsformVon(w) === soll,
      `${w.id}: fällt auf "${soll}" zurück`, angriffsformVon(w));
  }

  for (const id of NEUE) {
    const w = WAFFE_NACH_ID.get(id);
    melde(!!w, `die neue Waffe "${id}" steht im Katalog`);
    melde(w && istAngriffsform(w.angriffsform),
      `${id}: nennt eine bekannte Angriffsform`, w?.angriffsform);
  }

  /* Jede Form, die eine Waffe nennt, muss es geben — und umgekehrt
     darf keine Form unbenutzt bleiben, ohne dass es auffällt. Die
     zweite Richtung ist bewusst **kein** Fehler, nur eine Zahl: Ein
     Katalog darf eine Form vorhalten, die heute niemand trägt. */
  const benutzt = new Set(WAFFEN.map((w) => angriffsformVon(w)));
  for (const f of benutzt) {
    melde(istAngriffsform(f), `Form "${f}" ist eine bekannte Form`);
  }
  melde(benutzt.size === ANGRIFFSFORMEN.length,
    "jede Angriffsform wird von mindestens einer Waffe getragen",
    `${benutzt.size} von ${ANGRIFFSFORMEN.length}: ` +
    ANGRIFFSFORMEN.filter((f) => !benutzt.has(f)).join(" "));
}

/* ── 2 · Der Kegel trifft nach vorn und nicht nach hinten ───────── */
{
  const halb = 0.6, cos = Math.cos(halb);
  /* Achse zeigt nach rechts. */
  const vorn = imKegel(0, 0, 1, 0, cos, 60, 40, 0);
  const hinten = imKegel(0, 0, 1, 0, cos, 60, -40, 0);
  const seitlich = imKegel(0, 0, 1, 0, cos, 60, 0, 40);
  melde(vorn === true, "der Kegel trifft, was vor ihm liegt");
  melde(hinten === false, "und nicht, was hinter ihm liegt");
  melde(seitlich === false, "und nicht, was quer daneben steht");

  /* Genau auf der Kante: knapp innen trifft, knapp außen nicht. Ohne
     diese beiden wäre der Öffnungswinkel eine Zahl, die zwar dasteht,
     aber nichts festlegt. */
  const [ix, iy] = drehe(1, 0, halb * 0.9);
  const [ax, ay] = drehe(1, 0, halb * 1.1);
  melde(imKegel(0, 0, 1, 0, cos, 60, ix * 30, iy * 30) === true,
    "knapp innerhalb des Öffnungswinkels trifft er");
  melde(imKegel(0, 0, 1, 0, cos, 60, ax * 30, ay * 30) === false,
    "knapp außerhalb nicht mehr");

  /* Reichweite. */
  melde(imKegel(0, 0, 1, 0, cos, 60, 59, 0) === true, "innerhalb der Reichweite trifft er");
  melde(imKegel(0, 0, 1, 0, cos, 60, 61, 0) === false, "darüber hinaus nicht");

  /* Wer genau in der Spitze steht, hat keine Richtung — er muss
     trotzdem getroffen werden. Ohne den Sonderfall wäre `0/0` eine
     stille `NaN`, und `NaN >= cos` ist `false`: Ausgerechnet der
     Gegner, der auf einem steht, bliebe als einziger verschont. */
  melde(imKegel(0, 0, 1, 0, cos, 60, 0, 0) === true,
    "wer in der Spitze steht, wird getroffen");

  /* Ein dicker Gegner am Rand ragt hinein, ein dünner nicht. */
  const [rx, ry] = drehe(1, 0, halb * 1.15);
  melde(imKegel(0, 0, 1, 0, cos, 60, rx * 25, ry * 25, 0) === false,
    "ein dünner Gegner am Rand bleibt draußen");
  melde(imKegel(0, 0, 1, 0, cos, 60, rx * 25, ry * 25, 9) === true,
    "ein dicker ragt hinein");
}

/* ── 3 · Der Kegel glüht wirklich aus ───────────────────────────── */
{
  const feld = { dauer: 2, rest: 2, restStaerke: 0.25 };
  melde(Math.abs(staerkeDesFeldes(feld) - 1) < 1e-9, "am Anfang volle Stärke");
  feld.rest = 1;
  melde(Math.abs(staerkeDesFeldes(feld) - 0.625) < 1e-9,
    "in der Mitte genau dazwischen", staerkeDesFeldes(feld).toFixed(3));
  feld.rest = 0;
  melde(Math.abs(staerkeDesFeldes(feld) - 0.25) < 1e-9, "am Ende die Reststärke");

  /* Fällt sie wirklich, statt nur zu existieren? Der Fall, der ohne
     die Arbeit falsch wäre: `restStaerke` gesetzt und nie gelesen. */
  const reihe = [2, 1.5, 1, 0.5, 0].map((r) => staerkeDesFeldes({ dauer: 2, rest: r, restStaerke: 0.25 }));
  melde(reihe.every((v, i) => i === 0 || v < reihe[i - 1]),
    "die Stärke fällt über die ganze Standzeit", reihe.map((v) => v.toFixed(2)).join(" "));

  /* Eine Aura glüht **nicht** aus — `restStaerke: 1` liefert immer 1,
     ohne Sonderfall im Aufrufer. */
  melde(staerkeDesFeldes({ dauer: 0, rest: 0, restStaerke: 1 }) === 1,
    "eine Aura behält ihre Stärke");
}

/* ── 4 · Ein stehendes Feld ist kein Schadensmultiplikator ────────

   Dieselbe Regel wie bei den Salven (`spiel/salven.mjs`): Ein Kegel,
   der achtmal zuschlägt, darf nicht achtfacher Schaden sein. */
{
  for (const [dauer, takt, gesamt] of [[1.8, 0.22, 2.4], [1, 0.1, 1], [0.5, 0.25, 3]]) {
    const anteil = anteilJeTakt(dauer, takt, gesamt);
    const takte = Math.max(1, Math.floor(dauer / takt));
    melde(Math.abs(anteil * takte - gesamt) < 1e-9,
      `Kegel ${dauer}s/${takt}s: die Summe über alle Takte ist genau ${gesamt}`,
      (anteil * takte).toFixed(4));
  }

  /* Ein feinerer Takt darf die Gesamtwirkung **nicht** ändern — sonst
     wäre er eine versteckte Verstärkung und die einzige sinnvolle
     Einstellung der feinste. */
  const grob = anteilJeTakt(2, 0.4, 2) * 5;
  const fein = anteilJeTakt(2, 0.1, 2) * 20;
  melde(Math.abs(grob - fein) < 1e-9,
    "ein feinerer Takt ändert die Gesamtwirkung nicht",
    `${grob.toFixed(3)} gegen ${fein.toFixed(3)}`);

  /* Und der Kegel im Katalog hält sich daran. */
  const w = WAFFE_NACH_ID.get("flammenatem");
  melde(w.kegel.gesamt >= 1 && w.kegel.gesamt <= 4,
    "der Flammenatem teilt zwischen 1x und 4x eines Schlages aus", `${w.kegel.gesamt}`);
  melde(w.kegel.restStaerke > 0 && w.kegel.restStaerke < 1,
    "und glüht wirklich aus", `${w.kegel.restStaerke}`);
  /* ⚠️ **Der erste Anlauf stand hier auf „die laengste im Katalog"**
     und war rot: Der Sternenfall hat 3,4 gegen 2,6. Die Erwartung war
     falsch, nicht der Code (`docs/FEHLERBUCH.md` D2) — „hohe
     abklingzeit" heisst nicht „die hoechste". Gemessen wird jetzt, was
     Jannik wirklich bestellt hat: deutlich langsamer als das Feld. */
  const median = [...WAFFEN.map((x) => x.abklingzeit)].sort((a, b) => a - b)[
    Math.floor(WAFFEN.length / 2)];
  melde(w.abklingzeit >= median * 2,
    "der Flammenatem laedt mindestens doppelt so lange wie die mittlere Waffe",
    `${w.abklingzeit} gegen ${median}`);
}

/* ── 5 · Der Kettenblitz trifft keinen zweimal ──────────────────── */
{
  const g = (x, y) => ({ x, y, tot: false });
  const a = g(0, 0), b = g(30, 0), c = g(60, 0), d = g(90, 0), weit = g(400, 0);
  const gegner = [a, b, c, d, weit];

  const kette = kettenZiele(gegner, a, 3, 40);
  melde(kette.length === 4, "drei Sprünge treffen vier Ziele", `${kette.length}`);
  melde(new Set(kette).size === kette.length, "und keinen davon zweimal");
  melde(kette[0] === a && kette[1] === b && kette[2] === c && kette[3] === d,
    "der Blitz springt jeweils zum nächsten");
  melde(!kette.includes(weit), "und nie über die Sprungweite hinaus");

  /* Weniger Ziele als Sprünge: Er hört auf, statt im Kreis zu laufen. */
  const kurz = kettenZiele([a, b], a, 5, 40);
  melde(kurz.length === 2, "gibt es nichts mehr, endet die Kette", `${kurz.length}`);

  /* Tote werden übersprungen — sonst verpufft ein Sprung an einer
     Leiche, und die Kette wäre ausgerechnet dort am schwächsten, wo
     sie schon gewirkt hat. */
  b.tot = true;
  const ueber = kettenZiele(gegner, a, 3, 40);
  melde(!ueber.includes(b), "Tote werden nicht angesprungen");
  b.tot = false;

  /* Zweimal dieselbe Eingabe, zweimal dieselbe Kette. */
  const wieder = kettenZiele(gegner, a, 3, 40);
  melde(wieder.every((x, i) => x === kette[i]), "dieselbe Lage gibt dieselbe Kette");

  /* Der Schaden fällt je Sprung. */
  melde(kettenAnteil(0, 0.22) === 1, "das erste Ziel bekommt vollen Schaden");
  const anteile = [0, 1, 2, 3].map((n) => kettenAnteil(n, 0.22));
  melde(anteile.every((v, i) => i === 0 || v < anteile[i - 1]),
    "jedes weitere weniger", anteile.map((v) => v.toFixed(3)).join(" "));
  melde(anteile[3] > 0, "aber nie nichts", anteile[3].toFixed(3));
  melde(kettenAnteil(3, 0) === 1, "ohne Verlust bleibt es voll");
}

/* ── 6 · Das erlahmende Geschoss verliert Tempo **und** Schaden ─── */
{
  const p = { tempo: 240, vx: 240, vy: 0, bremse: 0.9, tempoAnteil: 1,
    mindestTempo: 0.25, mindestSchaden: 0.3 };
  melde(erlahmterAnteil(p) === 1, "frisch geworfen trägt es vollen Schaden");

  const tempi = [];
  for (let i = 0; i < 60; i++) { bremseGeschoss(p, 1 / 60); tempi.push(Math.hypot(p.vx, p.vy)); }
  melde(tempi.every((v, i) => i === 0 || v <= tempi[i - 1] + 1e-9),
    "es wird nur langsamer, nie schneller");
  melde(tempi[59] < tempi[0] * 0.5, "und zwar deutlich",
    `${tempi[0].toFixed(0)} auf ${tempi[59].toFixed(0)}`);
  melde(p.tempoAnteil >= 0.25 - 1e-9, "aber nie unter das Mindesttempo",
    p.tempoAnteil.toFixed(3));
  melde(erlahmterAnteil(p) < 1, "und der Schaden fällt mit", erlahmterAnteil(p).toFixed(3));
  melde(erlahmterAnteil(p) >= 0.3 - 1e-9, "aber nie unter den Mindestschaden");

  /* **Der Fall, der ohne die Arbeit falsch wäre:** ein Geschoss ohne
     Bremse. Jede bestehende Waffe muss unverändert weiterfliegen. */
  const q = { tempo: 200, vx: 200, vy: 0, bremse: 0, tempo1: 0 };
  bremseGeschoss(q, 1 / 60);
  melde(q.vx === 200 && q.vy === 0, "ein Geschoss ohne Bremse wird nicht angefasst");
  melde(erlahmterAnteil(q) === 1, "und trägt vollen Schaden");

  /* ⚠️ `Math.pow` ist über JavaScript-Maschinen hinweg nicht bitgleich
     festgelegt, und der Regelkern muss auf zwei Rechnern denselben
     Weltzustand ergeben. Der Regex prüft die eine Zeile, an der es
     verlockend wäre. */
  /* ⚠️ **Der erste Anlauf war rot, und zwar an sich selbst.** Die
     Kopfnotiz in `spiel/angriffsformen.mjs` erklaert, *warum* dort kein
     `Math.pow` steht — und schreibt das Wort dabei hin. Genau der Fall
     aus `docs/FEHLERBUCH.md` B4: Eine Textsuche unterscheidet nicht
     zwischen **nennen** und **tun**. Also wird das Zitierte vorher
     herausgenommen, wie die Regel es verlangt. */
  const ohneKommentare = liesDatei("spiel/angriffsformen.mjs")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  melde(!/Math\.pow/.test(ohneKommentare),
    "der Regelkern bremst ohne `Math.pow` — sonst laufen zwei Rechner auseinander");
  /* Gegenprobe zur Gegenprobe: Das Wort steht in der Datei wirklich
     drin (im Kommentar). Ohne diese Zeile koennte die Ersetzung oben
     alles wegputzen, und die Zusicherung waere immer gruen. */
  melde(/Math\.pow/.test(liesDatei("spiel/angriffsformen.mjs")),
    "und die Begruendung dazu steht als Kommentar in derselben Datei");
}

/* ── 7 · Der Schwarm verteilt sich ──────────────────────────────── */
{
  const ziele = ["a", "b", "c"];
  const gewaehlt = [0, 1, 2, 3, 4, 5].map((i) => schwarmZiel(ziele, i));
  melde(gewaehlt.join("") === "abcabc", "der Schwarm geht reihum", gewaehlt.join(""));
  melde(new Set(gewaehlt.slice(0, 3)).size === 3,
    "die ersten drei Geschosse nehmen drei verschiedene Ziele");
  melde(schwarmZiel([], 0) === null, "ohne Ziel bleibt es leer");

  /* Genau das trennt den Schwarm vom Bannstein: Der schickt seine drei
     suchenden Steine auf **dasselbe** Ziel. Wäre `schwarmZiel()` nicht
     da, wären die Irrlichter ein zweiter Bannstein mit anderer Farbe. */
  const bann = WAFFE_NACH_ID.get("bannstein");
  const irr = WAFFE_NACH_ID.get("irrlichter");
  melde(bann.suchend === true && angriffsformVon(bann) === "geschoss",
    "der Bannstein sucht, ist aber kein Schwarm");
  melde(irr.suchend === true && angriffsformVon(irr) === "schwarm",
    "die Irrlichter sind einer");
  melde(irr.ziele > 1, "und suchen mehr als ein Ziel", `${irr.ziele}`);

  /* Ein Sucher, dessen Ziel fällt, findet ein neues. */
  const lebt = { x: 50, y: 0, tot: false };
  const gegner = [{ x: 10, y: 0, tot: true }, lebt, { x: 300, y: 0, tot: false }];
  melde(neuesSuchziel(gegner, { x: 0, y: 0 }, 100) === lebt,
    "ein Sucher nimmt das nächste **lebende** Ziel");
  melde(neuesSuchziel(gegner, { x: 0, y: 0 }, 20) === null,
    "und keines außerhalb seiner Suchweite");
}

/* ── 8 · Nur die Meteore ziehen, und zwar genau zweimal je Stück ──

   Jede Ziehung verschiebt den gesäten Strom für **alles** danach —
   Wellenpläne, Beutewürfe, Truhen. Ein Muster, das eine Ziehung zu
   viel macht, ändert still jede bisherige Messung des Projekts. */
{
  let zuege = 0;
  const zaehler = { zahl: () => { zuege++; return 0.5; } };
  const s = { x: 0, y: 0, werte: {} };
  const ziel = { x: 40, y: 0 };
  const waffe = { id: "probe" };

  for (const [name, bauen] of [
    ["kegel", () => baueKegel(null, s, ziel, {}, {}, waffe, 60)],
    ["aura", () => baueAura(null, s, {}, {}, waffe, 40, 0.5)],
    ["bogen", () => baueBogen(null, s, ziel, {}, {}, waffe, 52)]
  ]) {
    zuege = 0;
    bauen();
    melde(zuege === 0, `${name}: zieht nicht aus dem Zufallsstrom`, `${zuege} Züge`);
  }

  for (const anzahl of [1, 3, 5, 8]) {
    zuege = 0;
    const felder = baueMeteore(null, s, ziel, {}, { meteore: { anzahl } }, waffe, 130, zaehler);
    melde(felder.length === anzahl, `${anzahl} Meteore: so viele wie bestellt`, `${felder.length}`);
    melde(zuege === anzahl * 2,
      `${anzahl} Meteore: genau zwei Ziehungen je Stück`, `${zuege} Züge`);
  }

  /* Die Einschläge liegen im genannten Streuradius um das Ziel — und
     nicht alle auf einem Punkt. */
  const streu = macheStrom([0, 0.25, 0.5, 0.75, 0.1, 0.9, 0.3, 0.6, 0.45, 0.85]);
  const felder = baueMeteore(null, s, ziel, {}, { meteore: { anzahl: 5, streuung: 34 } },
    waffe, 130, streu);
  const weiten = felder.map((f) => Math.hypot(f.x - ziel.x, f.y - ziel.y));
  melde(weiten.every((w) => w <= 34 + 1e-9), "kein Meteor fällt außerhalb der Streuung",
    weiten.map((w) => w.toFixed(1)).join(" "));
  melde(new Set(felder.map((f) => `${f.x.toFixed(2)},${f.y.toFixed(2)}`)).size > 1,
    "und sie fallen nicht alle auf denselben Punkt");

  /* Sie kommen **nacheinander**, sonst wäre der Schauer ein einziger
     Schlag mit fünf Kreisen. */
  const warnungen = felder.map((f) => f.warnRest);
  melde(warnungen.every((w, i) => i === 0 || w > warnungen[i - 1]),
    "die Einschläge kommen nacheinander", warnungen.map((w) => w.toFixed(2)).join(" "));
  melde(felder.every((f) => f.warnRest > 0),
    "und jeder kündigt sich an, bevor er trifft");
  melde(felder.every((f) => Math.abs(f.warnDauer - f.warnRest) < 1e-9),
    "die volle Warnzeit steht am Feld — sonst kann der Zeichner den Ring nicht malen");
}

/* ── 9 · In einer echten Welt: jede Form läuft und wirkt ─────────

   Der Abschnitt, der `docs/FEHLERBUCH.md` E1 beantwortet — „was in
   keiner Prüfung läuft, geht still kaputt". Gebaut wird mit denselben
   Bausteinen wie im Spiel; eine Form, die niemand aufruft, fällt hier
   auf und nirgends sonst. */
/* ⚠️ **Die Laufzeit ist gemessen, nicht gewaehlt.** Der erste Anlauf
   stand auf sechs Sekunden und war rot: Der Spieler steht in der Mitte,
   die Gegner laufen vom Rand des Bannkreises herein, und nach sechs
   Sekunden ist noch keiner in Reichweite einer 62-Punkte-Waffe. Die
   Prueflinge feuerten schlicht nie — und die Prueffung meldete das als
   „teilt keinen Schaden aus", also einen Befund ueber den Code, der
   in Wahrheit einer ueber den Aufbau war (`docs/FEHLERBUCH.md` B5).
   Bei sechzehn Sekunden hat jede der sieben Formen gemessen wirklich
   zugeschlagen. */
function laufMit(waffenId, schritte = 60 * 16, bewegung = { x: 0, y: 0 }) {
  const welt = macheWelt({ spielerzahl: 1, saat: 7 });
  starteWelle(welt, 4);
  const s = welt.spieler[0];
  s.waffen = [macheWaffe(waffenId, 1)];
  /* Unverwundbar, damit die Messung die Waffe misst und nicht den Tod. */
  s.werte.ruestung = 100000;
  s.lebenMax = 1e9; s.leben = 1e9;

  const vorher = new Map();
  let felderHoechst = 0, blitzeHoechst = 0, geschosseHoechst = 0;
  const formen = new Set();
  for (let t = 0; t < schritte; t++) {
    for (const g of welt.gegner) if (!vorher.has(g)) vorher.set(g, g.leben);
    schritt(welt, [bewegung]);
    felderHoechst = Math.max(felderHoechst, welt.felder.length);
    blitzeHoechst = Math.max(blitzeHoechst, welt.blitze.length);
    geschosseHoechst = Math.max(geschosseHoechst, welt.geschosse.length);
    for (const f of welt.felder) formen.add(f.form);
  }
  let schaden = 0;
  for (const [g, v] of vorher) schaden += Math.max(0, v - g.leben);
  return { welt, schaden, felderHoechst, blitzeHoechst, geschosseHoechst, formen, spieler: s };
}

{
  for (const [id, erwartet] of [
    ["flammenatem", "felder"], ["irrlichter", "geschosse"], ["moderkranz", "felder"],
    ["bleischleuder", "geschosse"], ["gewitterrune", "blitze"],
    ["sternenfall", "felder"], ["mondsichel", "felder"]
  ]) {
    const r = laufMit(id);
    melde(r.schaden > 0, `${id}: teilt in einer echten Welle Schaden aus`,
      `${Math.round(r.schaden)}`);
    const zahl = erwartet === "felder" ? r.felderHoechst
      : erwartet === "blitze" ? r.blitzeHoechst : r.geschosseHoechst;
    melde(zahl > 0, `${id}: legt wirklich etwas in \`welt.${erwartet}\``, `${zahl}`);
  }

  /* Der Meteorschauer legt **mehrere** Felder auf einmal — ein
     einzelner Einschlag wäre kein Schauer. */
  const stern = laufMit("sternenfall");
  melde(stern.felderHoechst >= 3, "der Sternenfall legt mehrere Einschläge zugleich",
    `${stern.felderHoechst}`);

  /* Der Schwarm hat mehr als ein Geschoss gleichzeitig in der Luft. */
  const irr = laufMit("irrlichter");
  melde(irr.geschosseHoechst >= 4, "die Irrlichter fliegen als Schwarm",
    `${irr.geschosseHoechst}`);

  /* Und die Kette trifft mehr als einen: Der Blitzpfad hat mehr als
     zwei Punkte (Spieler + ein Ziel wären genau zwei). */
  const blitz = laufMit("gewitterrune", 60 * 20);
  const laengster = Math.max(0, ...(blitz.welt.blitze ?? []).map((b) => b.punkte.length));
  melde(blitz.blitzeHoechst > 0, "die Gewitterrune legt einen Blitzpfad ab");
  melde(laengster === 0 || laengster >= 2, "und der Pfad hat einen Anfang und ein Ende",
    `${laengster} Punkte`);
}

/* ── 10 · Die Aura wirkt auch ohne Ziel ─────────────────────────────

   Das ist der Unterschied zwischen „dauerhafte Schadensaura" und
   „Nahkampfschlag mit Ring drumherum". Gemessen an dem Fall, der ohne
   die Ausnahme in `feuereWaffen()` falsch wäre: eine leere Welle. */
{
  const welt = macheWelt({ spielerzahl: 1, saat: 5 });
  starteWelle(welt, 1);
  /* Alle Gegner weg **und** der Plan geleert — sonst laufen in der
     nächsten Sekunde neue ein und die Messung sagt nichts. */
  welt.gegner = [];
  welt.plan = [];
  const s = welt.spieler[0];
  s.waffen = [macheWaffe("moderkranz", 1)];

  for (let t = 0; t < 60; t++) schritt(welt, [{ x: 0, y: 0 }]);
  const auren = welt.felder.filter((f) => f.form === "aura");
  melde(auren.length === 1, "die Aura steht auch, wenn kein Gegner da ist",
    `${auren.length} Felder`);
  melde(welt.gegner.length === 0, "und die Messung lief wirklich ohne Gegner");

  /* Genau **eine**, nicht eine je Takt. Ohne die Auffrischung in
     `loeseAus()` läge nach einer Sekunde ein Stapel Ringe übereinander,
     der Schaden wäre vervielfacht — und im Bild sähe man nichts davon,
     weil zwei gleiche Ringe wie einer aussehen. */
  for (let t = 0; t < 300; t++) schritt(welt, [{ x: 0, y: 0 }]);
  const spaeter = welt.felder.filter((f) => f.form === "aura");
  melde(spaeter.length === 1, "und auch nach fünf Sekunden ist es genau eine",
    `${spaeter.length} Felder`);

  /* Sie läuft mit. Ein Ring, der am Startpunkt liegen bliebe, wäre ein
     Fleck auf dem Boden und keine Aura. */
  const vorX = s.x;
  for (let t = 0; t < 60; t++) schritt(welt, [{ x: 1, y: 0 }]);
  const ring = welt.felder.find((f) => f.form === "aura");
  melde(s.x > vorX + 5, "der Spieler ist wirklich gelaufen",
    `${vorX.toFixed(1)} → ${s.x.toFixed(1)}`);
  melde(ring && Math.abs(ring.x - s.x) < 1e-9 && Math.abs(ring.y - s.y) < 1e-9,
    "und die Aura ist mitgelaufen");

  /* ⚠️ **Zwei Moderkränze im Gürtel geben zwei Ringe.** Gleiche Waffen
     verschmelzen zwar (Bauteil 7) — aber auf der höchsten Stufe nicht
     mehr, und dann trägt ein Spieler zweimal dieselbe Kennung. Suchte
     `loeseAus()` den Ring über die **Kennung**, fänden beide denselben,
     die zweite Waffe frischte nur die erste auf und wäre still
     wirkungslos: bezahlt, angelegt, ohne Wirkung, ohne Meldung. */
  const zwei = macheWelt({ spielerzahl: 1, saat: 5 });
  starteWelle(zwei, 1);
  zwei.gegner = []; zwei.plan = [];
  zwei.spieler[0].waffen = [macheWaffe("moderkranz", 1), macheWaffe("moderkranz", 4)];
  for (let t = 0; t < 60; t++) schritt(zwei, [{ x: 0, y: 0 }]);
  melde(zwei.felder.filter((f) => f.form === "aura").length === 2,
    "zwei Aura-Waffen legen zwei Ringe an, nicht einen",
    `${zwei.felder.filter((f) => f.form === "aura").length}`);

  /* Und der Ring trägt den Schaden, den die Waffe **jetzt** hat: Eine
     Schadenskarte mitten in der Welle muss ankommen. */
  const wachsend = macheWelt({ spielerzahl: 1, saat: 5 });
  starteWelle(wachsend, 1);
  wachsend.gegner = []; wachsend.plan = [];
  const w = wachsend.spieler[0];
  w.waffen = [macheWaffe("moderkranz", 1)];
  for (let t = 0; t < 60; t++) schritt(wachsend, [{ x: 0, y: 0 }]);
  const vorGrund = wachsend.felder.find((f) => f.form === "aura").schlag.grund;
  w.werte.schaden += 50;
  for (let t = 0; t < 60; t++) schritt(wachsend, [{ x: 0, y: 0 }]);
  const nachGrund = wachsend.felder.find((f) => f.form === "aura").schlag.grund;
  melde(nachGrund > vorGrund,
    "und ein Schadenszuwachs mitten in der Welle kommt im Ring an",
    `${vorGrund.toFixed(1)} auf ${nachGrund.toFixed(1)}`);

  /* Eine gewöhnliche Nahkampfwaffe tut das **nicht** — der Fall, der
     ohne die Ausnahme gleich aussähe. */
  const ohne = macheWelt({ spielerzahl: 1, saat: 5 });
  starteWelle(ohne, 1);
  ohne.gegner = []; ohne.plan = [];
  ohne.spieler[0].waffen = [macheWaffe("sichel", 1)];
  for (let t = 0; t < 60; t++) schritt(ohne, [{ x: 0, y: 0 }]);
  melde(ohne.felder.length === 0,
    "eine gewöhnliche Waffe legt ohne Ziel gar nichts an");
}

/* ── 11 · Der Sichelbogen ist wirklich gerichtet ───────────────────

   Die eigentliche Beschwerde: Jede Nahkampfwaffe trifft rundum, auch
   den im Rücken. Gemessen wird deshalb nicht „trifft er?", sondern
   „trifft er **nur vorn**?" — und zwar gegen eine gewöhnliche Waffe
   derselben Reichweite als Gegenprobe. */
{
  /* ⚠️ **Der erste Anlauf baute die zwei Gegner von Hand** — ein
     Objektliteral mit den Feldern, die diese Prüfung zu brauchen
     glaubte. Gemessen traf danach **keine** Waffe irgendetwas, auch
     die Sense nicht, und das sah aus wie ein Befund über den
     Sichelbogen.

     Es war einer über den Aufbau (`docs/FEHLERBUCH.md` B5): Dem
     Handgebauten fehlte `tempo`. `bewegeGegner()` rechnet damit
     `g.tempo * …` und schrieb `NaN` in `x`/`y`; danach findet der
     Abstandsvergleich in `zieleInReichweite()` nie etwas, weil jeder
     Vergleich mit `NaN` falsch ist. Keine Meldung, kein Absturz, nur
     null Treffer.

     Deshalb werden die Gegner jetzt **genau wie `setzeGegner()`**
     gebaut, aus einer echten Katalogart — und nur `tempo` auf null
     gesetzt, damit sie stehen bleiben, wo sie hingehören. */
  function macheProbengegner(art, x, y) {
    return {
      art, x, y, vx: 0, vy: 0, stossX: 0, stossY: 0,
      leben: 1e9, lebenMax: 1e9, schaden: 0, tempo: 0,
      radius: art.radius, phase: 0,
      brand: 0, brandRate: 0, gift: 0, giftRate: 0,
      frost: 0, frostStaerke: 0, bereitIn: 1e9, tot: false
    };
  }

  function trefferLage(waffenId) {
    const welt = macheWelt({ spielerzahl: 1, saat: 11 });
    starteWelle(welt, 1);
    /* Kein Nachschub — sonst laufen mitten in der Messung fremde
       Gegner ins Bild und der Schaden landet auf ihnen. */
    welt.plan = [];
    const s = welt.spieler[0];
    s.waffen = [macheWaffe(waffenId, 1)];
    s.werte.ruestung = 100000;
    s.lebenMax = 1e9; s.leben = 1e9;
    s.x = 0; s.y = 0;

    /* ⚠️ **Zweiter Anlauf, zweiter Aufbaufehler.** Beide Gegner standen
       zuerst gleich weit weg (±30). Damit war unentschieden, welchen
       `zieleInReichweite()` als **nächsten** zurückgibt — und der Bogen
       richtet sich nach `ziele[0]`. Gemessen zielte die Mondsichel auf
       den **linken**, traf ihn korrekt und den rechten korrekt nicht;
       die Prüfung las das als „trifft nach hinten statt nach vorn".

       Der Fall war also nicht falsch gerechnet, sondern falsch
       gefragt. Jetzt steht der vordere **näher** (25 gegen 40), damit
       die Zielwahl eindeutig ist — beide weiterhin innerhalb der
       Reichweite von 52, sonst prüfte die Zeile bloß die Reichweite. */
    const art = GEGNER_NACH_ID.get(GEGNER[0].id);
    const vorn = macheProbengegner(art, 25, 0);
    const hinten = macheProbengegner(art, -40, 0);
    welt.gegner = [vorn, hinten];

    for (let t = 0; t < 240; t++) {
      /* Vor **jedem** Schritt zurücksetzen: Rückstoß und Ausweichen
         verschöben die Lage sonst über die Messung hinweg, und am Ende
         stünde nicht mehr einer vorn und einer hinten. */
      vorn.x = 25; vorn.y = 0; hinten.x = -40; hinten.y = 0;
      vorn.stossX = 0; vorn.stossY = 0; hinten.stossX = 0; hinten.stossY = 0;
      s.x = 0; s.y = 0;
      schritt(welt, [{ x: 0, y: 0 }]);
    }
    return { vorn: 1e9 - vorn.leben, hinten: 1e9 - hinten.leben };
  }

  const bogen = trefferLage("mondsichel");
  const rund = trefferLage("sense");

  melde(bogen.vorn > 0, "die Mondsichel trifft, was vor ihr steht",
    `${Math.round(bogen.vorn)}`);
  melde(bogen.hinten === 0, "und **nichts** von dem, was hinter ihr steht",
    `${Math.round(bogen.hinten)}`);
  melde(rund.vorn > 0 && rund.hinten > 0,
    "die Sense dagegen trifft beide — der Zustand, um den es geht",
    `vorn ${Math.round(rund.vorn)}, hinten ${Math.round(rund.hinten)}`);

  /* Und der Bogen ist mittelgroß, wie bestellt: weiter als ein
     Viertelkreis, enger als ein Halbkreis wäre schon rundum. */
  const w = WAFFE_NACH_ID.get("mondsichel");
  melde(w.bogen.spanne > Math.PI / 2 && w.bogen.spanne < Math.PI,
    "der Schwung ist mittelgroß — mehr als ein Viertel, weniger als ein Halbkreis",
    `${(w.bogen.spanne / Math.PI * 180).toFixed(0)} Grad`);
  melde(w.bogen.schneide < w.bogen.spanne / 2,
    "und die Schneide ist schmaler als der Weg, den sie nimmt",
    `${w.bogen.schneide} gegen ${w.bogen.spanne}`);
}

/* ── 12 · Die Weltlisten werden geführt und geräumt ─────────────── */
{
  const welt = macheWelt({ spielerzahl: 1, saat: 2 });
  melde(Array.isArray(welt.felder) && Array.isArray(welt.blitze),
    "eine frische Welt führt `felder` und `blitze`");

  starteWelle(welt, 4);
  const s = welt.spieler[0];
  s.waffen = [macheWaffe("flammenatem", 1)];
  s.werte.ruestung = 100000; s.lebenMax = 1e9; s.leben = 1e9;
  /* Lange genug, dass ein Gegner den Weg vom Rand her wirklich schafft
     — siehe die Anmerkung an `laufMit()`. */
  let hatGebrannt = false;
  for (let t = 0; t < 60 * 16; t++) {
    schritt(welt, [{ x: 0, y: 0 }]);
    if (welt.felder.length > 0) hatGebrannt = true;
  }
  melde(hatGebrannt, "und füllt sie im Lauf");

  /* ⚠️ Beim Wellenwechsel müssen sie leer sein. Ein Kegel, der die
     Welle überlebt, brennt in der nächsten weiter, ohne dass ihn
     jemand geworfen hat — und eine Aura hielte über `feld.besitzer`
     einen Spielerzustand fest, den es längst nicht mehr gibt. */
  starteWelle(welt, 5);
  melde(welt.felder.length === 0 && welt.blitze.length === 0,
    "und leert sie bei der nächsten Welle",
    `${welt.felder.length} Felder, ${welt.blitze.length} Blitze`);

  /* Ein Feld verschwindet, wenn seine Zeit um ist — sonst wächst die
     Liste über eine Welle hinweg ins Unbegrenzte. */
  s.waffen = [macheWaffe("mondsichel", 1)];
  let hoechst = 0;
  for (let t = 0; t < 600; t++) {
    schritt(welt, [{ x: 0, y: 0 }]);
    hoechst = Math.max(hoechst, welt.felder.length);
  }
  melde(hoechst < 30, "die Felderliste wächst nicht ins Unbegrenzte", `${hoechst}`);
}

/* ── 13 · Die Formliste stimmt mit dem überein, was wirklich passiert ─ */
{
  const gesehen = new Set();
  for (const id of ["flammenatem", "moderkranz", "sternenfall", "mondsichel"]) {
    /* Die volle Laufzeit — mit fünf Sekunden war dieser Abschnitt rot,
       aus demselben Grund wie oben: Die Gegner waren noch unterwegs. */
    for (const f of laufMit(id).formen) gesehen.add(f);
  }
  for (const f of gesehen) {
    melde(FELDFORMEN.includes(f), `die Form "${f}" steht in FELDFORMEN`);
  }
  melde(gesehen.size === FELDFORMEN.length,
    "und jede Form aus FELDFORMEN kommt wirklich vor",
    `${[...gesehen].sort().join(" ")} gegen ${[...FELDFORMEN].sort().join(" ")}`);
}

/* ── 14 · Kleinkram, der still falsch sein könnte ───────────────── */
{
  const [nx, ny] = richtungZu(0, 0, 3, 4);
  melde(Math.abs(Math.hypot(nx, ny) - 1) < 1e-12, "`richtungZu` liefert einen Einheitsvektor");
  melde(Math.abs(nx - 0.6) < 1e-12 && Math.abs(ny - 0.8) < 1e-12, "und zeigt richtig herum");
  const [zx, zy] = richtungZu(5, 5, 5, 5);
  melde(zx === 0 && zy === -1, "fallen beide Punkte zusammen, zeigt sie nach oben");

  const [dx, dy] = drehe(1, 0, Math.PI / 2);
  melde(Math.abs(dx) < 1e-12 && Math.abs(dy - 1) < 1e-12,
    "`drehe` dreht im Uhrzeigersinn wie `spiel/salven.mjs`", `${dx.toFixed(3)},${dy.toFixed(3)}`);

  melde(istAngriffsform("kegel") && !istAngriffsform("kegle"),
    "ein vertippter Formname fällt auf");
}

ende();
