/* [Aufgabe: Prüfwesen] Der Regelkern: wiederholbar, browserfrei, dicht.

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   | Prüfung | was sonst passiert |
   | --- | --- |
   | kein `Math.random` in `spiel/` | Balanceläufe messen Rauschen, dieselbe Saat ergibt eine andere Nacht, und Netz-Koop wäre später unmöglich — **ohne dass irgendetwas rot wird** |
   | kein Browser in `spiel/` | der Prüfstand lässt sich nicht mehr ohne Bildschirm laufen, und das merkt man erst, wenn man ihn braucht |
   | zwei Läufe mit derselben Saat sind gleich | dasselbe, aber gemessen statt gelesen |
   | fester Schritt | eine Welle dauert auf einem schnellen Rechner kürzer |

   Der erste Punkt ist der wichtigste und der unauffälligste: Ein
   `Math.random` im Kern bricht nichts sichtbar. Es macht nur alle
   Messungen wertlos.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/*` (alles davon), `werkzeuge/balance.mjs` (baut darauf auf). */

import { macheMelder, quellDateien, liesDatei } from "./helfer.mjs";
import { macheZufall, abgeleitet } from "../spiel/zufall.mjs";
import { macheWelt, starteWelle, schritt, arenaRadius, SCHRITT } from "../spiel/welt.mjs";
import { starteLauf, naechsteWelle, schrittImLauf } from "../spiel/lauf.mjs";
import { macheWerte, lebenMax, abklingzeit, schadensminderung, aufsammelReichweite, gruppenAufschlag, merkmalZaehlung, GRUPPE_AB } from "../spiel/werte.mjs";
import { macheWaffe, WAFFEN } from "../spiel/katalog/waffen.mjs";
import { macheGitter } from "../spiel/gitter.mjs";
import { nimmWaffe, WAFFEN_PLAETZE } from "../spiel/laden.mjs";
import { schwelle } from "../spiel/stufen.mjs";

const { melde, ende } = macheMelder({ still: true });

/* ── Kein Zufall, kein Browser im Kern ───────────────────────────── */

const kernDateien = quellDateien().filter((d) => d.startsWith("spiel/"));
melde(kernDateien.length >= 10, `${kernDateien.length} Kerndateien gefunden`);

for (const datei of kernDateien) {
  const text = liesDatei(datei).replace(/\/\*[\s\S]*?\*\//g, "");
  melde(!/Math\.random/.test(text), `${datei} ohne Math.random`);
  const browser = text.match(/\b(document|window|navigator|localStorage|requestAnimationFrame|performance)\b/);
  melde(!browser, `${datei} ohne Browser`, browser ? browser[0] : "");
  melde(!/Date\.now|new Date\(/.test(text), `${datei} ohne Wanduhr`);
}

/* ── Der gesäte Strom ────────────────────────────────────────────── */

{
  const a = macheZufall(1234), b = macheZufall(1234);
  let gleich = true;
  for (let i = 0; i < 5000; i++) if (a.zahl() !== b.zahl()) { gleich = false; break; }
  melde(gleich, "gleiche Saat gibt gleiche Zahlen");

  const c = macheZufall(1235);
  melde(macheZufall(1234).zahl() !== c.zahl(), "andere Saat gibt andere Zahlen");

  const z = macheZufall(7);
  let min = 1, max = 0, summe = 0;
  const N = 200000;
  for (let i = 0; i < N; i++) { const v = z.zahl(); min = Math.min(min, v); max = Math.max(max, v); summe += v; }
  melde(min >= 0 && max < 1, "Zahlen liegen in [0,1)");
  melde(Math.abs(summe / N - 0.5) < 0.005, "Mittelwert nahe 0,5", (summe / N).toFixed(4));

  /* `ganz` muss beide Enden erreichen — sonst würfelt ein sechsseitiger
     Würfel nie die Sechs, und niemand merkt es. */
  const gesehen = new Set();
  const g = macheZufall(11);
  for (let i = 0; i < 4000; i++) gesehen.add(g.ganz(1, 6));
  melde(gesehen.size === 6 && gesehen.has(1) && gesehen.has(6), "ganz(1,6) erreicht 1 und 6", [...gesehen].sort().join(""));

  /* `mische` darf die Vorlage nicht anfassen — Kataloge sind gemeinsam
     benutzte Daten. */
  const liste = [1, 2, 3, 4, 5];
  macheZufall(3).mische(liste);
  melde(liste.join() === "1,2,3,4,5", "mische lässt die Vorlage in Ruhe");

  melde(abgeleitet(5, "laden").zahl() !== abgeleitet(5, "wellen").zahl(),
    "abgeleitete Ströme sind verschieden");
  melde(abgeleitet(5, "laden").zahl() === abgeleitet(5, "laden").zahl(),
    "abgeleitete Ströme sind wiederholbar");
}

/* ── Die Werte ───────────────────────────────────────────────────── */

{
  const w = macheWerte();
  melde(lebenMax(w) > 0, "Grundleben ist positiv");
  melde(abklingzeit(macheWerte({ hast: 100 }), 1) === 0.5, "100 Hast halbiert die Abklingzeit");
  melde(abklingzeit(macheWerte({ hast: 100000 }), 1) > 0, "Abklingzeit wird nie null");
  melde(schadensminderung(macheWerte({ ruestung: 30 })) === 0.5, "30 Rüstung nimmt die Hälfte");
  melde(schadensminderung(macheWerte({ ruestung: 100000 })) < 1, "Rüstung macht nie unverwundbar");
  melde(schadensminderung(macheWerte({ ruestung: -50 })) === 0, "negative Rüstung heilt nicht");
  melde(aufsammelReichweite(macheWerte()) > 0, "Aufsammelreichweite ist positiv");

  /* Gruppenbonus: erst ab vier gleichen Merkmalen, und nicht doppelt. */
  const drei = [macheWaffe("sichel"), macheWaffe("sichel"), macheWaffe("sichel")];
  const vier = [...drei, macheWaffe("sichel")];
  melde(gruppenAufschlag(drei[0], merkmalZaehlung(drei)) === 0, "drei gleiche Merkmale geben nichts");
  melde(gruppenAufschlag(vier[0], merkmalZaehlung(vier)) > 0, `${GRUPPE_AB} gleiche Merkmale geben den Bonus`);
}

/* ── Waffen und Laden ────────────────────────────────────────────── */

{
  const s = { waffen: [] };
  nimmWaffe(s, "sichel", 1);
  nimmWaffe(s, "sichel", 1);
  melde(s.waffen.length === 1 && s.waffen[0].stufe === 2, "zwei gleiche Waffen verschmelzen");
  nimmWaffe(s, "sichel", 1);
  nimmWaffe(s, "sichel", 1);
  melde(s.waffen.some((w) => w.stufe === 3), "und verschmelzen mehrstufig",
    s.waffen.map((w) => w.stufe).join(","));

  const voll = { waffen: WAFFEN.slice(0, WAFFEN_PLAETZE).map((w) => macheWaffe(w.id)) };
  melde(nimmWaffe(voll, WAFFEN[WAFFEN_PLAETZE].id) === false, "voller Gürtel nimmt nichts mehr auf");
  melde(voll.waffen.length === WAFFEN_PLAETZE, "und wächst dabei nicht");
}

/* ── Die Aufstiegsschwelle ───────────────────────────────────────── */

{
  let steigt = true;
  for (let i = 1; i < 40; i++) if (schwelle(i + 1) <= schwelle(i)) steigt = false;
  melde(steigt, "jede Stufe kostet mehr als die vorige");
  melde(schwelle(1) >= 4, "die erste Stufe kostet etwas");
}

/* ── Das Raster ──────────────────────────────────────────────────── */

{
  const g = macheGitter(10);
  g.setze(5, 5, "a"); g.setze(15, 5, "b"); g.setze(100, 100, "c");
  const nah = [];
  g.umkreis(5, 5, 12, (w) => nah.push(w));
  melde(nah.includes("a") && nah.includes("b"), "Raster findet Nachbarn");
  melde(!nah.includes("c"), "Raster liefert nicht die ganze Welt");
  g.leeren();
  const leer = [];
  g.umkreis(5, 5, 12, (w) => leer.push(w));
  melde(leer.length === 0, "geleertes Raster ist leer");
}

/* ── Wiederholbarkeit der ganzen Welt ────────────────────────────── */

function laufeKurz(saat, spielerzahl, schritte) {
  const welt = macheWelt({ saat, spielerzahl });
  starteWelle(welt, 3);
  const eingaben = welt.spieler.map((_, i) => ({ x: Math.sin(i + 1), y: Math.cos(i + 1) }));
  for (let i = 0; i < schritte; i++) schritt(welt, eingaben);
  return welt;
}

{
  const a = laufeKurz(99, 2, 900), b = laufeKurz(99, 2, 900);
  const ortA = a.spieler.map((s) => `${s.x.toFixed(6)},${s.y.toFixed(6)}`).join("|");
  const ortB = b.spieler.map((s) => `${s.x.toFixed(6)},${s.y.toFixed(6)}`).join("|");
  melde(ortA === ortB, "gleiche Saat: Spieler stehen gleich");
  melde(a.gegner.length === b.gegner.length, "gleiche Saat: gleich viele Gegner",
    `${a.gegner.length} gegen ${b.gegner.length}`);
  const lebenA = a.gegner.reduce((x, g) => x + g.leben, 0).toFixed(4);
  const lebenB = b.gegner.reduce((x, g) => x + g.leben, 0).toFixed(4);
  melde(lebenA === lebenB, "gleiche Saat: gleicher Gegnerzustand");

  /* Gegenprobe — ohne sie bestünde die Prüfung auch, wenn gar nichts
     passiert wäre. */
  const c = laufeKurz(100, 2, 900);
  const ortC = c.spieler.map((s) => `${s.x.toFixed(6)},${s.y.toFixed(6)}`).join("|");
  melde(ortA !== ortC || a.gegner.length !== c.gegner.length,
    "andere Saat gibt eine andere Nacht");
  melde(a.gegner.length > 0, "in Welle 3 erscheinen überhaupt Gegner", `${a.gegner.length}`);
  melde(a.spieler.some((s) => Math.abs(s.x) > 1 || Math.abs(s.y) > 1),
    "die Spieler haben sich bewegt");
}

/* ── Der feste Schritt ───────────────────────────────────────────── */

{
  const welt = macheWelt({ saat: 5, spielerzahl: 1 });
  starteWelle(welt, 1);
  const vorher = welt.zeit;
  schritt(welt, [{ x: 0, y: 0 }]);
  melde(Math.abs(welt.zeit - vorher - SCHRITT) < 1e-12, "ein Schritt ist genau 1/60 s");
  melde(SCHRITT > 0 && SCHRITT < 0.1, "der Schritt ist plausibel klein");
}

/* ── Die Arena ───────────────────────────────────────────────────── */

{
  let waechst = true;
  for (let n = 1; n < 4; n++) if (arenaRadius(n + 1) <= arenaRadius(n)) waechst = false;
  melde(waechst, "die Arena wächst mit der Spielerzahl");
  /* Sie muss mit der **Fläche** wachsen, nicht mit dem Radius: Das
     Wellenbudget wächst linear mit der Spielerzahl, also muss die
     Fläche das auch. Sonst ist es zu viert dichter als allein — genau
     das war am 04.09. gemessen der Fall. */
  const dichte = (n) => n / (Math.PI * arenaRadius(n) ** 2);
  const abweich = Math.abs(dichte(4) / dichte(1) - 1);
  melde(abweich < 0.05, "die Gegnerdichte bleibt bei jeder Spielerzahl gleich",
    `${(abweich * 100).toFixed(1)} % Abweichung`);
}

/* ── Spieler bleiben im Bannkreis ────────────────────────────────── */

{
  const welt = macheWelt({ saat: 8, spielerzahl: 2 });
  starteWelle(welt, 1);
  for (let i = 0; i < 1200; i++) schritt(welt, [{ x: 1, y: 1 }, { x: -1, y: -1 }]);
  const draussen = welt.spieler.filter((s) => Math.hypot(s.x, s.y) > welt.arena.radius + 0.01);
  melde(draussen.length === 0, "niemand läuft aus dem Bannkreis",
    draussen.map((s) => Math.hypot(s.x, s.y).toFixed(1)).join(","));
}

/* ── Auch mit Sprung bleibt die Welt wiederholbar ─────────────────────

   Der Sprung ist der **erste** Eingang in den Kern, der kein
   Zahlenpaar ist (`{ x, y, ausweichen }`). Damit ist er auch der erste,
   der die Wiederholbarkeit brechen könnte — und genau die trägt später
   das Netz-Koop. Ein `Math.random` im Sprung fiele der Prüfung oben
   auf; eine Abhängigkeit von der Aufrufreihenfolge nicht. */

{
  const mitSprung = (saat) => {
    const welt = macheWelt({ saat, spielerzahl: 2 });
    starteWelle(welt, 3);
    for (let i = 0; i < 900; i++) {
      schritt(welt, welt.spieler.map((_, k) => ({
        x: Math.sin(i / 37 + k), y: Math.cos(i / 29 + k),
        ausweichen: (i + k * 13) % 40 === 0
      })));
    }
    return welt;
  };
  const a = mitSprung(55), b = mitSprung(55);
  const ort = (w) => w.spieler.map((s) => `${s.x.toFixed(6)},${s.y.toFixed(6)}`).join("|");
  melde(ort(a) === ort(b), "gleiche Saat mit Sprung: Spieler stehen gleich");
  melde(a.gegner.length === b.gegner.length, "gleiche Saat mit Sprung: gleich viele Gegner");

  /* Gegenprobe: Ohne sie bestünde die Prüfung auch dann, wenn der
     Sprung gar nicht ausgelöst würde. */
  const ohneSprung = macheWelt({ saat: 55, spielerzahl: 2 });
  starteWelle(ohneSprung, 3);
  for (let i = 0; i < 900; i++) {
    schritt(ohneSprung, ohneSprung.spieler.map((_, k) => ({
      x: Math.sin(i / 37 + k), y: Math.cos(i / 29 + k)
    })));
  }
  melde(ort(ohneSprung) !== ort(a), "und der Sprung ändert wirklich etwas");
}

/* ── Ein ganzer Lauf endet ───────────────────────────────────────── */

{
  const welt = starteLauf({ spielerzahl: 1, saat: 3 });
  naechsteWelle(welt);
  let n = 0;
  while (welt.phase === "welle" && n < 60 * 120) { schrittImLauf(welt, [{ x: 0, y: 0 }]); n++; }
  melde(welt.phase !== "welle", "eine Welle endet von allein", `nach ${(n / 60).toFixed(1)} s: ${welt.phase}`);
}

ende();
