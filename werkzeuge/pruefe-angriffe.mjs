/* [Aufgabe: Prüfwesen] Angriffe: Salvenmuster und die Optik der
   Geschosse.

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   Am 05.09.2026 gemessen, bevor es diese Datei gab:

   **1 · Alle fünf Fernwaffen schossen gleich.** Ein Geschoss geradeaus,
   unterschieden nur durch `geschosstempo` und `reichweite` — Zahlen,
   die man beim Spielen nicht auseinanderhält. Nichts war kaputt, es war
   nur alles dasselbe.

   **2 · Drei von sechs Geschossen hatten exakt dieselbe Form**
   (`.#.|###|.#.`), und nur die Farbe trennte sie. In den vier
   diagonalen Flugrichtungen **zerfiel dieses Kreuz in fünf
   Einzelpunkte** — ein schräg fliegendes Geschoss war kein Ding mehr,
   sondern ein Sprenkel.

   **3 · Zwei Sprites hatten gerade Kantenlängen** (1×6 und 4×4). Bei
   gerader Kante liegt die Quellmitte auf einem halben Bildpunkt, und
   das Bild wandert bei jeder der sechzehn Drehungen.

   **4 · Der Spieler konnte sein eigenes Seuchenglas nicht vom
   Gegnerspeichel unterscheiden.** Beide grün, beide rund. Wer beide für
   dasselbe hält, weicht dem Falschen aus.

   Keiner der vier Punkte hätte je eine Prüfung rot gemacht.

   ── Was hier bewusst **nicht** geprüft wird ────────────────────────

   Ob ein Muster **gut** ist. Ob drei Frostsplitter besser sind als
   einer, misst `pruefe-balance.mjs` über ganze Läufe — eine
   Formelprüfung kann darüber nichts sagen und täte nur so.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/salven.mjs`, `spiel/katalog/waffen.mjs`,
   `runtime/sprite-daten.js`, `runtime/palette.js`,
   `werkzeuge/rampen.mjs`. */

import { macheMelder } from "./helfer.mjs";
import { WAFFEN } from "../spiel/katalog/waffen.mjs";
import {
  FORMEN, richtungenDerSalve, geschosseDerSalve, anteilJeGeschoss, SALVEN_AUFSCHLAG
} from "../spiel/salven.mjs";
import { GESCHOSSE } from "../runtime/sprite-daten.js";
import { dreheRaster, RICHTUNGEN } from "../runtime/sprites.js";
import { FARBEN } from "../runtime/palette.js";
import { ANKER, besteRampe, engsteTrennung, MINDESTTRENNUNG, rampenName } from "./rampen.mjs";

const { melde, ende } = macheMelder({ still: true });

/* Ein gesäter Strom von Hand — dieselbe Schnittstelle wie `welt.zufall`,
   aber vorhersagbar, damit die Prüfung nicht selbst würfelt. */
function macheStrom(werte) {
  let i = 0;
  return { zahl: () => werte[i++ % werte.length] };
}

/* ── 1 · Jede Fernwaffe hat ihr eigenes Muster ──────────────────────

   Der Sinn der ganzen Sache: Zwei Waffen, die gleich schießen, sind
   beim Spielen eine Waffe mit zwei Preisen. */

const fern = WAFFEN.filter((w) => w.art === "fern");
melde(fern.length >= 5, "es gibt mindestens fünf Fernwaffen", `${fern.length}`);

for (const w of fern) {
  melde(!!w.salve, `${w.id}: hat ein Salvenmuster`);
  if (!w.salve) continue;
  melde(FORMEN.includes(w.salve.form), `${w.id}: kennt seine Form`, w.salve.form);
  melde(w.salve.geschosse >= 1 && w.salve.geschosse <= 8,
    `${w.id}: Geschosszahl im Rahmen`, `${w.salve.geschosse}`);
}

{
  /* Nicht „jede Form kommt vor" — sondern **keine zweimal**. Der
     Unterschied zählt, nicht die Vollständigkeit: Ein Katalog darf eine
     Form ungenutzt lassen, aber zwei Waffen mit demselben Muster sind
     genau der Zustand, aus dem diese Datei entstanden ist. */
  const formen = fern.map((w) => w.salve?.form);
  const doppelt = formen.filter((f, i) => formen.indexOf(f) !== i);
  melde(doppelt.length === 0,
    "keine zwei Fernwaffen teilen sich eine Form", doppelt.join(", "));
}

/* Nahkampfwaffen haben keine Salve — sie treffen alle Ziele in
   Reichweite, dafür gibt es `ziele`. Ein Muster dort wäre toter Code,
   den niemand bemerkt. */
for (const w of WAFFEN.filter((x) => x.art === "nahkampf")) {
  melde(!w.salve, `${w.id}: Nahkampf ohne Salvenmuster`);
}

/* ── 2 · Die Muster tun, was sie versprechen ────────────────────────

   Gegen den echten Aufruf, nicht gegen den Quelltext: Ein Regex sieht
   nicht, ob ein Fächer wirklich fächert. */

{
  const strom = macheStrom([0.5]);
  const nx = 0, ny = -1;   /* nach oben */

  const einzeln = richtungenDerSalve(nx, ny, 1, { form: "faecher" }, strom);
  melde(einzeln.length === 1 && einzeln[0].rx === nx && einzeln[0].ry === ny,
    "ein einzelnes Geschoss fliegt unverändert geradeaus",
    JSON.stringify(einzeln[0]));

  const faecher = richtungenDerSalve(nx, ny, 3, { form: "faecher", winkel: 0.2 }, strom);
  melde(faecher.length === 3, "der Fächer hat drei Geschosse");
  melde(faecher.every((r) => r.laengs === 0 && r.quer === 0),
    "der Fächer startet alle am selben Punkt");
  {
    const winkel = faecher.map((r) => Math.atan2(r.rx, -r.ry));
    const abstand = winkel.slice(1).map((w, i) => w - winkel[i]);
    melde(abstand.every((a) => Math.abs(a - 0.2) < 1e-9),
      "und fächert genau um den genannten Winkel",
      abstand.map((a) => a.toFixed(3)).join(" "));
    melde(Math.abs(winkel[1]) < 1e-9,
      "das mittlere Geschoss fliegt genau aufs Ziel", winkel[1].toFixed(6));
  }

  const folge = richtungenDerSalve(nx, ny, 2, { form: "folge", abstand: 7 }, strom);
  melde(folge.every((r) => r.rx === nx && r.ry === ny),
    "eine Folge fliegt geradeaus, alle in dieselbe Richtung");
  melde(folge[0].laengs === 0 && folge[1].laengs === -7,
    "und das zweite startet hinter dem ersten",
    folge.map((r) => r.laengs).join(", "));

  const parallel = richtungenDerSalve(nx, ny, 2, { form: "parallel", abstand: 5 }, strom);
  melde(parallel.every((r) => r.rx === nx && r.ry === ny),
    "parallel fliegt ebenfalls geradeaus");
  melde(parallel[0].quer === -2.5 && parallel[1].quer === 2.5,
    "aber die beiden starten nebeneinander, symmetrisch zur Mitte",
    parallel.map((r) => r.quer).join(", "));

  const ring = richtungenDerSalve(nx, ny, 4, { form: "ring" }, strom);
  {
    const winkel = ring.map((r) => Math.round(Math.atan2(r.rx, -r.ry) * 1000));
    melde(new Set(winkel).size === 4,
      "der Ring hat vier verschiedene Richtungen", `${new Set(winkel).size}`);
  }
}

{
  /* `streu` ist die einzige Form, die zieht — und sie zieht **genau
     einmal je Geschoss**. Jede Ziehung verschiebt den gesäten Strom für
     alles danach: Wellenpläne, Beute, Truhen. Ein Muster, das eine
     Ziehung zu viel macht, ändert still jede bisherige Messung. */
  let zuege = 0;
  const zaehler = { zahl: () => { zuege++; return 0.5; } };

  for (const form of FORMEN.filter((f) => f !== "streu")) {
    zuege = 0;
    richtungenDerSalve(0, -1, 3, { form }, zaehler);
    melde(zuege === 0, `${form}: zieht nicht aus dem Zufallsstrom`, `${zuege} Züge`);
  }

  zuege = 0;
  const streu = richtungenDerSalve(0, -1, 4, { form: "streu", streuung: 0.3 }, zaehler);
  melde(zuege === 4, "streu zieht genau einmal je Geschoss",
    `${zuege} Züge bei 4 Geschossen`);

  /* Bei einem Wurf von genau 0,5 liegt der Ausschlag in der Mitte —
     also nirgends. */
  melde(streu.every((r) => Math.abs(Math.atan2(r.rx, -r.ry)) < 1e-9),
    "und bei einem Wurf von genau 0,5 streut es nicht");

  const rand = richtungenDerSalve(0, -1, 2, { form: "streu", streuung: 0.3 },
    macheStrom([0, 1]));
  const w = rand.map((r) => Math.atan2(r.rx, -r.ry));
  melde(w.every((x) => Math.abs(x) <= 0.3 + 1e-9),
    "die Streuung bleibt im genannten Kegel", w.map((x) => x.toFixed(3)).join(" "));
}

/* ── 3 · Ein Salvenmuster ist kein Schadensmultiplikator ────────────

   Die eine Regel, ohne die das Ganze zerfällt: Wäre der Anteil 1, wären
   drei Geschosse dreifacher Schaden, und die Waffe mit den meisten
   Geschossen wäre die einzige sinnvolle. */

{
  melde(anteilJeGeschoss(1) === 1, "ein einzelnes Geschoss trägt vollen Schaden");

  for (const n of [2, 3, 4, 6]) {
    const a = anteilJeGeschoss(n);
    melde(a < 1, `${n} Geschosse: jedes trägt weniger als voll`, a.toFixed(3));
    melde(a * n >= 1, `${n} Geschosse: zusammen nicht weniger als ein Einzelschuss`,
      (a * n).toFixed(3));
  }

  /* Der Aufschlag ist der Preis dafür, dass eine Salve auch danebengeht.
     Negativ wäre jede Salve immer schlechter als ein Einzelschuss; zu
     groß, und Geschosszahl allein gewinnt. */
  melde(SALVEN_AUFSCHLAG >= 0 && SALVEN_AUFSCHLAG <= 0.5,
    "der Salvenaufschlag liegt zwischen 0 und 0,5", `${SALVEN_AUFSCHLAG}`);

  const reihe = [1, 2, 3, 4, 5, 6].map(anteilJeGeschoss);
  melde(reihe.every((a, i) => i === 0 || a <= reihe[i - 1] + 1e-12),
    "der Anteil je Geschoss fällt mit der Geschosszahl",
    reihe.map((a) => a.toFixed(2)).join(" "));
}

{
  /* `zusatzgeschosse` addiert sich zur Waffe, es multipliziert nicht. */
  melde(geschosseDerSalve({ geschosse: 3 }, 2) === 5,
    "gekaufte Zusatzgeschosse addieren sich zum Muster");
  melde(geschosseDerSalve(undefined, 0) === 1,
    "ohne Muster und ohne Zusatz fliegt genau eines");
  melde(geschosseDerSalve({ geschosse: 2 }, -5) === 1, "und nie weniger als eines");
}

/* ── 4 · Die Geschosse sind auseinanderzuhalten ─────────────────────

   Bei fünf mal sieben Bildpunkten überlebt kein Detail — was zählt, ist
   die grobe Gestalt über **alle** sechzehn Drehungen. */

const silhouette = (bild) =>
  bild.map((z) => [...z].map((c) => (c === "." ? "." : "#")).join("")).join("|");

/* Zusammenhängende Teile über die 8er-Nachbarschaft: Zwei diagonal
   berührende Bildpunkte liest das Auge als ein Ding, und beim Drehen
   eines schrägen Sprites entstehen solche Berührungen zwangsläufig. Mit
   der strengeren 4er-Nachbarschaft wäre **jedes** gedrehte Geschoss
   zerfallen, auch die, die man einwandfrei sieht — die Prüfung hätte
   dann nicht das Sprite gemessen, sondern die Drehung. */
function teile(bild) {
  const g = bild.map((z) => [...z].map((c) => c !== "."));
  const gesehen = g.map((z) => z.map(() => false));
  let n = 0;
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[y].length; x++) {
      if (!g[y][x] || gesehen[y][x]) continue;
      n++;
      const stapel = [[x, y]];
      while (stapel.length) {
        const [cx, cy] = stapel.pop();
        if (cy < 0 || cy >= g.length || cx < 0 || cx >= g[cy].length) continue;
        if (!g[cy][cx] || gesehen[cy][cx]) continue;
        gesehen[cy][cx] = true;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
          stapel.push([cx + dx, cy + dy]);
        }
      }
    }
  }
  return n;
}

const rasterVon = (g) => (Array.isArray(g.bild[0]) ? g.bild[0] : g.bild);

{
  const formen = {};
  for (const [id, g] of Object.entries(GESCHOSSE)) {
    const bild = rasterVon(g);
    const b = Math.max(...bild.map((z) => z.length)), h = bild.length;

    melde(b % 2 === 1 && h % 2 === 1,
      `${id}: ungerade Kantenlängen — sonst wandert es beim Drehen`, `${b} x ${h}`);
    melde(bild.every((z) => z.length === b), `${id}: alle Zeilen gleich lang`);

    /* Jedes Zeichen muss auf eine Farbe zeigen, die es gibt. Ein
       Tippfehler wäre sonst still ein Loch im Sprite. */
    const benutzt = new Set([...bild.join("")].filter((c) => c !== "."));
    const fehlend = [...benutzt].filter((c) => !g.zeichen[c] || !FARBEN[g.zeichen[c]]);
    melde(fehlend.length === 0, `${id}: jedes Zeichen zeigt auf eine echte Farbe`,
      fehlend.join(" "));

    /* Über alle Drehungen ein Stück. Genau hier wären die alten Sprites
       durchgefallen: Ihr Kreuz zerfiel diagonal in fünf Teile. */
    let schlimmste = 0;
    const wo = [];
    for (let r = 0; r < RICHTUNGEN; r++) {
      const t = teile(dreheRaster(bild, r));
      if (t > schlimmste) schlimmste = t;
      if (t > 1) wo.push(r);
    }
    melde(schlimmste === 1, `${id}: bleibt in allen 16 Drehungen ein Stück`,
      wo.length ? `zerfällt bei Richtung ${wo.join(", ")}` : "");

    formen[id] = silhouette(bild);
  }

  const werte = Object.values(formen);
  const doppelte = [...new Set(werte)]
    .filter((f) => werte.filter((x) => x === f).length > 1)
    .map((f) => Object.entries(formen).filter(([, v]) => v === f).map(([k]) => k).join("="));
  melde(doppelte.length === 0,
    "keine zwei Geschosse haben dieselbe Silhouette", doppelte.join(" · "));
}

{
  /* Der Fall, der einen Spieler wirklich etwas kostet: Sein eigenes
     Seuchenglas und der Speichel eines Gegners sind beide grün. Wer
     beide für dasselbe hält, weicht dem Falschen aus. */
  const a = rasterVon(GESCHOSSE.seuchenglas), b = rasterVon(GESCHOSSE.speichel);
  melde(silhouette(a) !== silhouette(b),
    "Seuchenglas und Gegnerspeichel haben verschiedene Formen");

  const flaeche = (r) => r.join("").split("").filter((c) => c !== ".").length;
  const unterschied = Math.abs(flaeche(a) - flaeche(b)) / Math.max(flaeche(a), flaeche(b));
  melde(unterschied >= 0.2,
    "und sie unterscheiden sich um mindestens ein Fünftel der Fläche",
    `${flaeche(a)} gegen ${flaeche(b)} Punkte, ${Math.round(unterschied * 100)} %`);
}

/* ── 5 · Die Rampen tragen feine Übergänge ──────────────────────────

   Janniks Ansage zu den Angriffen: „aber feine farbliche übergänge."
   Mit zwei Tönen gibt es keinen Übergang, nur einen Sprung. */

{
  for (const art of Object.keys(ANKER)) {
    const stufen = ["Tief", "", "Mitte", "Hell", "Glanz"].map((s) => FARBEN[art + s]);
    melde(stufen.every(Boolean), `${art}: alle fünf Stufen stehen in der Palette`,
      stufen.map((f, i) => (f ? "" : rampenName(art, i))).filter(Boolean).join(" "));
    if (!stufen.every(Boolean)) continue;

    const eng = engsteTrennung(stufen);
    melde(eng >= MINDESTTRENNUNG, `${art}: benachbarte Stufen sind unterscheidbar`,
      `engste Trennung ${eng.toFixed(1)} von 255, nötig ${MINDESTTRENNUNG}`);

    /* Die alten Namen tragen die alten Werte — sonst hätte der Einbau
       der Rampen still das Aussehen des ganzen Spiels verschoben. */
    melde(FARBEN[art] === ANKER[art].dunkel && FARBEN[art + "Hell"] === ANKER[art].hell,
      `${art}: die beiden alten Töne sind unverändert`,
      `${FARBEN[art]} / ${FARBEN[art + "Hell"]}`);

    /* Und die Palette stimmt mit dem überein, was das Werkzeug rechnet —
       sonst wäre eine der beiden Seiten von Hand verstellt worden. */
    const { rampe } = besteRampe(ANKER[art].dunkel, ANKER[art].hell);
    melde(rampe.every((f, i) => f === stufen[i]),
      `${art}: Palette und rampen.mjs sind sich einig`,
      rampe.map((f, i) => (f === stufen[i] ? "" : `${f}≠${stufen[i]}`)).filter(Boolean).join(" "));
  }
}

{
  /* Jedes Geschoss benutzt wirklich mehr als zwei Stufen — sonst wäre
     die Rampe gebaut und niemand nähme sie. */
  for (const [id, g] of Object.entries(GESCHOSSE)) {
    const stufen = new Set([...rasterVon(g).join("")].filter((c) => /[1-5]/.test(c)));
    melde(stufen.size >= 3, `${id}: nutzt mindestens drei Rampenstufen`, `${stufen.size}`);
  }
}

ende();
