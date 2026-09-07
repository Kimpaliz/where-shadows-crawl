/* [Aufgabe: Prüfwesen] Angriffe: Salvenmuster und die Optik der
   Geschosse.

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   Am 05.09.2026 gemessen, bevor es diese Datei gab:

   **1 · Alle fünf Fernwaffen schossen gleich.** Ein Geschoss geradeaus,
   unterschieden nur durch `geschosstempo` und `reichweite` — Zahlen,
   die man beim Spielen nicht auseinanderhält. Nichts war kaputt, es war
   nur alles dasselbe.

   **2 · Drei von sechs Geschossen hatten exakt dieselbe Form**
   (`.#.|###|.#.`), und nur die Farbe trennte sie — bei **fünf**
   gesetzten Bildpunkten, gegen 11 bis 21 heute. Diagonal wird aus dem
   Kreuz ein X, das nur noch über Eck zusammenhängt: dieselbe Anzahl,
   eine andere Gestalt.

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
import { GEGNER } from "../spiel/katalog/gegner.mjs";
import {
  SCHWUNG_DAUER, SCHWUNG_NAH, SCHWUNG_BAND, GROESSTER_GEGNER,
  BOGEN_VORGABE, bogenDerWaffe, schwungRadius, imAusschnitt, imBand,
  keulen, keulenZahl
} from "../spiel/schwung.mjs";
import { liesDatei } from "./helfer.mjs";
import { macheWelt } from "../spiel/welt.mjs";
import { feuereWaffen, schwungSchritt } from "../spiel/kampf.mjs";
import { macheWaffe } from "../spiel/katalog/waffen.mjs";
import { GEGNER_NACH_ID } from "../spiel/katalog/gegner.mjs";
import {
  FORMEN, richtungenDerSalve, geschosseDerSalve, anteilJeGeschoss,
  SALVEN_AUFSCHLAG, AUFSCHLAG_JE_FORM
} from "../spiel/salven.mjs";
import { GESCHOSSE, SCHLAGBOEGEN } from "../runtime/sprite-daten.js";
import { SCHADENSARTEN } from "../spiel/schadensarten.mjs";
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

  {
    /* ⚠️ Hier stand nur „vier verschiedene Richtungen". Das besteht auch
       ein Viertelkreis — vier Richtungen, alle in dieselbe Ecke. Was
       einen Ring ausmacht, ist die **gleichmäßige Verteilung rundum**,
       und die hat zwei nachprüfbare Kennzeichen: gleiche Winkelabstände,
       und eine Vektorsumme von null (was rundum zeigt, hebt sich auf).
       Ohne beides wäre die einzige Ring-Waffe des Spiels von keiner
       Zusicherung berührt. */
    for (const n of [3, 4, 6]) {
      const ring = richtungenDerSalve(nx, ny, n, { form: "ring" }, strom);
      melde(ring.length === n, `Ring mit ${n}: so viele Geschosse wie bestellt`);

      const winkel = ring.map((r) => Math.atan2(r.rx, -r.ry));
      const einzig = new Set(winkel.map((w) => Math.round(w * 1e6)));
      melde(einzig.size === n, `Ring mit ${n}: alle Richtungen verschieden`, `${einzig.size}`);

      /* Vektorsumme: rundum verteilt hebt sich auf. Ein Viertelkreis
         käme hier auf rund 3,4 statt auf 0. */
      const sx = ring.reduce((s, r) => s + r.rx, 0);
      const sy = ring.reduce((s, r) => s + r.ry, 0);
      const summe = Math.hypot(sx, sy);
      melde(summe < 1e-9, `Ring mit ${n}: zeigt wirklich rundum`,
        `Vektorsumme ${summe.toFixed(6)}, erlaubt 0`);

      /* Gleiche Abstände: jeder Nachbarwinkel ist 2π/n. */
      const sortiert = [...winkel].sort((a, b) => a - b);
      const luecken = sortiert.map((w, i) =>
        i === 0 ? w - sortiert[n - 1] + Math.PI * 2 : w - sortiert[i - 1]);
      const soll = (Math.PI * 2) / n;
      melde(luecken.every((l) => Math.abs(l - soll) < 1e-9),
        `Ring mit ${n}: gleiche Abstände zwischen den Geschossen`,
        luecken.map((l) => l.toFixed(3)).join(" "));

      /* Alle Richtungen sind Einheitsvektoren — sonst wäre das Tempo
         je Geschoss verschieden, und der Ring liefe auseinander. */
      melde(ring.every((r) => Math.abs(Math.hypot(r.rx, r.ry) - 1) < 1e-9),
        `Ring mit ${n}: alle Richtungen sind auf Länge eins`);
    }
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

  /* ⚠️ **Jede Form einzeln**, nicht nur die voreingestellte. Hier stand
     `[1,2,3,4,5,6].map(anteilJeGeschoss)` — `map` reicht den **Index**
     als zweites Argument durch, also lief die Prüfung mit den
     „Formnamen" 0, 1, 2 … Keiner davon steht in `AUFSCHLAG_JE_FORM`,
     der Rückfall griff jedes Mal, und gemessen kam exakt `1/n` heraus.
     Die Zeile prüfte damit eine mathematische Selbstverständlichkeit
     und war durch **keinen** Wert der Aufschlagtabelle rot zu bekommen —
     fünf von sechs Formen waren von gar keiner Zusicherung berührt. */
  for (const form of FORMEN) {
    const auf = AUFSCHLAG_JE_FORM[form];
    melde(typeof auf === "number" && auf >= 0 && auf <= 0.5,
      `${form}: Aufschlag zwischen 0 und 0,5`, `${auf}`);

    for (const n of [2, 3, 4, 6]) {
      const a = anteilJeGeschoss(n, form);
      melde(a < 1, `${form}, ${n} Geschosse: jedes trägt weniger als voll`, a.toFixed(3));
      melde(a * n >= 1 - 1e-12,
        `${form}, ${n} Geschosse: zusammen nicht weniger als ein Einzelschuss`,
        (a * n).toFixed(3));
    }

    /* Je mehr Geschosse, desto weniger trägt jedes einzelne. */
    const reihe = [1, 2, 3, 4, 5, 6].map((n) => anteilJeGeschoss(n, form));
    melde(reihe.every((a, i) => i === 0 || a <= reihe[i - 1] + 1e-12),
      `${form}: der Anteil je Geschoss fällt mit der Geschosszahl`,
      reihe.map((a) => a.toFixed(2)).join(" "));

    /* Und die Tabelle wirkt wirklich: Ein Aufschlag von x muss den
       Gesamtschaden einer n-Salve auf 1 + x·(n−1) heben. Ohne diese
       Zeile könnte jeder Eintrag der Tabelle beliebig sein, solange er
       nur zwischen 0 und 0,5 liegt. */
    const gesamt = anteilJeGeschoss(3, form) * 3;
    melde(Math.abs(gesamt - (1 + auf * 2)) < 1e-12,
      `${form}: der Aufschlag wirkt genau wie angeschrieben`,
      `${gesamt.toFixed(3)} statt ${(1 + auf * 2).toFixed(3)}`);
  }

  melde(SALVEN_AUFSCHLAG >= 0 && SALVEN_AUFSCHLAG <= 0.5,
    "der Rückfall für unbekannte Formen liegt zwischen 0 und 0,5", `${SALVEN_AUFSCHLAG}`);

  /* Eine suchende Waffe verfehlt nicht und bekommt deshalb nie einen
     Aufschlag — sonst schenkt ein rein optischer Umweg echten Schaden.
     Gemessen an genau dem Fall, der es ausgelöst hat: der Bannstein,
     drei Steine im Ring, `suchend: true`. */
  for (const form of FORMEN) {
    melde(Math.abs(anteilJeGeschoss(3, form, true) - 1 / 3) < 1e-12,
      `${form}: suchend bekommt keinen Aufschlag`,
      anteilJeGeschoss(3, form, true).toFixed(3));
  }
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

    /* Über alle Drehungen ein Stück — nach der 8er-Nachbarschaft
       unten. Gemessen bestehen das die **alten** Sprites ebenfalls
       (6 von 6); unter der strengen 4er-Regel wären es 1 von 6. Die
       Prüfung fängt hier also nicht den alten Zustand, sondern hält
       den neuen: Ein künftiges Sprite, das wirklich auseinanderfällt,
       kommt nicht durch. */
    let schlimmste = 0;
    const wo = [];
    for (let r = 0; r < RICHTUNGEN; r++) {
      const t = teile(dreheRaster(bild, r));
      if (t > schlimmste) schlimmste = t;
      if (t > 1) wo.push(r);
    }
    melde(schlimmste === 1, `${id}: bleibt in allen 16 Drehungen ein Stück`,
      wo.length ? `zerfällt bei Richtung ${wo.join(", ")}` : "");

    /* Die Fläche ist das, was den alten Zustand wirklich trennt — und
       die Prüfung darüber ist der Grund, warum diese Datei existiert.

       Gemessen: die alten Geschosse trugen **5 bis 12** gesetzte
       Bildpunkte, **vier** davon genau fünf. Bei fünf Punkten ist jeder
       einzelne ein Fünftel des Geschosses, und die Drehung baut daraus
       reihum ein Kreuz, ein X und wieder ein Kreuz — man sieht einen
       Sprenkel, keine Klinge und keinen Stein. Unter zehn Punkten
       trägt keine Gestalt, die sechzehn Drehungen überstehen soll.

       ⚠️ Genau hier lag ein eigener Fehler: Zuerst stand an dieser
       Stelle „zerfällt in fünf Teile", gemessen mit der strengen
       Vierer-Nachbarschaft. Nach der Achter-Regel — der, die das Auge
       benutzt — bestehen die **alten** Sprites den Zerfallstest
       ebenfalls (6 von 6). Die Zerfallsprüfung oben hält den neuen
       Zustand, fängt aber den alten nicht. Diese hier fängt ihn. */
    const flaeche = bild.join("").split("").filter((c) => c !== ".").length;
    melde(flaeche >= 10, `${id}: trägt genug Fläche, um eine Gestalt zu haben`,
      `${flaeche} Bildpunkte, nötig 10`);

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
     die Rampe gebaut und niemand nähme sie.

     ⚠️ Gezählt werden die **Farben**, nicht die Ziffern im Raster. Hier
     stand `filter((c) => /[1-5]/.test(c))`: Das zählt, wie viele
     verschiedene Ziffern dastehen, und nicht, ob sie auf verschiedene
     Farben zeigen. Ein Geschoss, dessen Zeichentabelle `1`, `2` und `3`
     alle auf `frost` legt, hätte drei „Stufen" gemeldet und wäre
     einfarbig gewesen — genau der Fall, den diese Prüfung fangen soll. */
  for (const [id, g] of Object.entries(GESCHOSSE)) {
    const zeichen = new Set([...rasterVon(g).join("")].filter((c) => c !== "."));
    const farben = new Set([...zeichen].map((c) => FARBEN[g.zeichen[c]]).filter(Boolean));
    melde(farben.size >= 3, `${id}: malt mit mindestens drei verschiedenen Farben`,
      `${farben.size} Farben aus ${zeichen.size} Zeichen`);
  }
}

/* ── Der Nahkampf: die Animation ist die Trefferform ───────────────

   ⚠️ **Was ohne diese Prüfungen still durchkam** (gemessen am
   06.09.2026, vor dem Umbau):

   **1 · Der Schlag zeigte nicht auf den Gegner.** Gemalt wurde in
   Laufrichtung, getroffen wurde im vollen Kreis. Beides war in sich
   stimmig, keins von beidem stimmte mit dem anderen überein.

   **2 · Der Bogen reichte 11,8 Bildpunkte, die Waffen 30 bis 52.**
   Vier Fünftel der Trefferfläche waren nie zu sehen.

   **3 · Alle sieben Nahkampfwaffen sahen gleich aus** — ein Raster,
   eine Farbe, eine Größe.

   Was hier **nicht** geprüft wird: ob eine Öffnung von 200 Grad für die
   Sense richtig *ist*. Das misst `pruefe-balance.mjs` über ganze Läufe.
   Hier steht nur, dass die gemalte Form und die treffende dieselbe
   ist. */

const NAHKAMPF = WAFFEN.filter((w) => w.art === "nahkampf");

melde(NAHKAMPF.length >= 5, "es gibt genug Nahkampfwaffen, um sie zu vergleichen",
  `${NAHKAMPF.length}`);

{
  /* 1 · Jede Nahkampfwaffe sagt selbst, wie weit sie aufmacht.
     Ohne diese Prüfung erbt eine neue Waffe still die Vorgabe von
     90 Grad und ist von jeder anderen ununterscheidbar — genau der
     Befund „fünf Waffen, die alle gleich schießen", eine Waffengattung
     weiter. */
  const ohne = NAHKAMPF.filter((w) => w.bogen === undefined);
  melde(ohne.length === 0, "jede Nahkampfwaffe nennt ihren Bogen",
    ohne.map((w) => w.id).join(", ") + ` — sonst still ${BOGEN_VORGABE}°`);

  const daneben = NAHKAMPF.filter((w) => !(w.bogen >= 20 && w.bogen <= 360));
  melde(daneben.length === 0, "jeder Bogen liegt zwischen 20 und 360 Grad",
    daneben.map((w) => `${w.id}: ${w.bogen}`).join(", "));
}

{
  /* 2 · Die Öffnungen sind wirklich verschieden. Drei Waffen mit
     demselben Bogen wären drei Waffen mit demselben Bild. */
  const boegen = new Set(NAHKAMPF.map((w) => w.bogen));
  melde(boegen.size >= Math.ceil(NAHKAMPF.length * 0.7),
    "die Nahkampfwaffen sind an ihrer Öffnung auseinanderzuhalten",
    `${boegen.size} verschiedene Bögen auf ${NAHKAMPF.length} Waffen: `
    + [...boegen].sort((a, b) => a - b).join("°, ") + "°");
}

{
  /* 3 · Kein Loch zwischen zwei Bildern.

     Das Band springt je Schritt um `(reichweite − SCHWUNG_NAH) /
     Schritte` nach außen. Ist dieser Sprung größer als die volle
     Banddicke, fällt ein Gegner zwischen zwei Bildern hindurch und der
     Schlag geht ins Leere — ohne Fehlermeldung und ohne dass man es an
     einem einzelnen Schlag sehen könnte. */
  const SCHRITTE = SCHWUNG_DAUER * 60;
  for (const w of NAHKAMPF) {
    const sprung = (w.reichweite - SCHWUNG_NAH) / SCHRITTE;
    melde(sprung <= SCHWUNG_BAND * 2,
      `${w.id}: das Band lässt kein Loch zwischen zwei Bildern`,
      `${sprung.toFixed(1)} Bildpunkte Sprung gegen ${SCHWUNG_BAND * 2} Banddicke`);
  }
}

{
  /* 4 · Der Schwung trägt nicht weiter als die Waffe. Ohne diese
     Prüfung wäre `SCHWUNG_BAND` ein heimlicher Reichweitenbonus von
     zehn Bildpunkten für jede Nahkampfwaffe — und `reichweite` im
     Katalog eine Zahl, die nicht mehr stimmt. */
  for (const w of NAHKAMPF) {
    const sw = { rx: 1, ry: 0, bogen: bogenDerWaffe(w), reichweite: w.reichweite };
    const ganzAussen = schwungRadius(sw, 1);
    melde(!imBand(sw, w.reichweite + 1, 0, ganzAussen),
      `${w.id}: trifft nicht weiter als ${w.reichweite}`,
      `ein Körper ohne Ausdehnung bei ${w.reichweite + 1} wird noch getroffen`);
    melde(imBand(sw, w.reichweite, 0, ganzAussen),
      `${w.id}: trifft am Rand seiner Reichweite noch`,
      `bei genau ${w.reichweite} fällt der Treffer aus`);
  }
}

{
  /* 5 · Der Ausschnitt schneidet wirklich ab. Ein `imAusschnitt`, das
     immer `true` sagt, bestünde jede andere Prüfung hier mühelos —
     und der Schlag träfe wieder rundum, während vorn ein Bogen malt. */
  const sw = { rx: 1, ry: 0, bogen: (90 * Math.PI) / 180 };
  melde(imAusschnitt(sw, 10, 0), "90°: geradeaus liegt drin");
  melde(imAusschnitt(sw, 10, 9), "90°: 42 Grad daneben liegt drin");
  melde(!imAusschnitt(sw, 10, 11), "90°: 48 Grad daneben liegt draußen");
  melde(!imAusschnitt(sw, -10, 0), "90°: hinter einem liegt draußen");

  const rundum = { rx: 1, ry: 0, bogen: Math.PI * 2 };
  melde(imAusschnitt(rundum, -10, 0), "360°: auch hinter einem liegt drin");
  melde(imAusschnitt(rundum, 0, 0), "360°: auch genau auf einem liegt drin");
}

{
  /* 6 · Die Klingen liegen im Ausschnitt und nirgends sonst. Sie sind
     das, was man sieht; läge eine daneben, sähe man einen Schlag, der
     dort nicht trifft. */
  for (const w of NAHKAMPF) {
    const sw = { rx: 0, ry: 1, bogen: bogenDerWaffe(w) };
    const k = keulen(sw);
    const draussen = k.filter((v) => !imAusschnitt(sw, v.x * 30, v.y * 30));
    melde(draussen.length === 0, `${w.id}: keine Klinge liegt außerhalb des Ausschnitts`,
      `${draussen.length} von ${k.length}`);
    const laengen = k.map((v) => Math.hypot(v.x, v.y));
    melde(laengen.every((l) => Math.abs(l - 1) < 1e-9),
      `${w.id}: die Klingenrichtungen sind Einheitsvektoren`);
  }

  /* Und beim Rundumschlag liegt keine Klinge auf einer anderen —
     sonst wären es zehn Bilder und neun sichtbare Stellen. */
  const rundum = keulen({ rx: 1, ry: 0, bogen: Math.PI * 2 });
  const paare = [];
  for (let i = 0; i < rundum.length; i++)
    for (let j = i + 1; j < rundum.length; j++)
      if (Math.hypot(rundum[i].x - rundum[j].x, rundum[i].y - rundum[j].y) < 1e-6)
        paare.push(`${i}/${j}`);
  melde(paare.length === 0, "beim Rundumschlag liegt keine Klinge auf einer anderen",
    paare.join(", "));
  melde(keulenZahl(Math.PI * 2) >= 6, "ein Rundumschlag bekommt genug Klingen, um rund zu wirken",
    `${keulenZahl(Math.PI * 2)}`);
}

{
  /* 7 · `GROESSTER_GEGNER` stimmt mit dem Katalog überein.

     Diese Zahl weitet die Rasterabfrage im Schwung. Ist sie zu klein,
     bekommt der Schlag die dicken Gegner am äußeren Rand gar nicht zu
     sehen und hält sein Ergebnis trotzdem für vollständig — gemessen
     am 06.09.2026 traf die Pechfackel deshalb zwei statt drei. */
  const dickster = Math.max(...GEGNER.map((g) => g.radius));
  melde(GROESSTER_GEGNER >= dickster,
    "GROESSTER_GEGNER ist mindestens so groß wie der dickste Gegner",
    `${GROESSTER_GEGNER} gegen ${dickster} (${GEGNER.find((g) => g.radius === dickster).id})`);
}

{
  /* 8 · Der Zeichner rechnet den Bogen nicht selbst aus.

     ⚠️ Das ist der eigentliche Punkt der ganzen Übung. Solange
     `runtime/zeichnen.js` `schwungRadius` und `keulen` aus
     `spiel/schwung.mjs` holt, **kann** die gemalte Form nicht von der
     treffenden abweichen. Rechnete er selbst, wäre der alte Zustand
     eine Zeile weit entfernt und keine Prüfung würde ihn bemerken:
     Beide Seiten wären für sich stimmig. */
  const zeichner = liesDatei("runtime/zeichnen.js");
  melde(/from "\.\.\/spiel\/schwung\.mjs"/.test(zeichner),
    "der Zeichner holt die Schwunggeometrie aus spiel/schwung.mjs");
  for (const name of ["schwungRadius", "keulen"]) {
    melde(zeichner.includes(name + "("),
      `der Zeichner benutzt ${name}() statt einer eigenen Rechnung`);
  }
  melde(!/s\.schlagZeit/.test(zeichner),
    "der Zeichner malt nicht mehr aus schlagZeit",
    "der alte, richtungslose Bogen ist noch da");
}

/* ── Janniks zwei Sätze, als Prüfung ───────────────────────────────

   „angriffe finde immer in richtigung der gegner statt und tgreffen nur
   wenn die Animation trifft."

   Beides sind Aussagen über einen **Ablauf**, nicht über eine Zahl.
   Deshalb wird hier wirklich gespielt: eine Welt, ein Gegner, ein
   Schlag. */

const SCHRITT = 1 / 60;

/* Eine Welt mit einer Figur und Gegnern an gewünschten Stellen.
   Die Gegner sind unsterblich (`leben` sehr hoch) — gemessen werden
   soll, **wer** getroffen wird, nicht wer stirbt. */
function schlagwelt(waffenId, stellen) {
  const welt = macheWelt({ spielerzahl: 1, saat: 7 });
  welt.phase = "welle";
  const s = welt.spieler[0];
  s.x = 0; s.y = 0; s.blickX = 1; s.blickY = 0;
  s.waffen = [macheWaffe(waffenId, 1)];
  const art = GEGNER_NACH_ID.get("schlurfer");
  for (const [x, y] of stellen) {
    welt.gegner.push({
      art, x, y, vx: 0, vy: 0, stossX: 0, stossY: 0,
      leben: 1e6, lebenMax: 1e6, schaden: 0, tempo: 0,
      radius: art.radius, phase: 0,
      brand: 0, brandRate: 0, gift: 0, giftRate: 0,
      frost: 0, frostStaerke: 0, bereitIn: 1e6, tot: false
    });
  }
  return welt;
}

function rasterFuellen(welt) {
  welt.gitter.leeren();
  for (const g of welt.gegner) welt.gitter.setze(g.x, g.y, g);
}

{
  /* 1 · Der Schlag zeigt auf den Gegner — auch wenn die Figur
     woandershin blickt.

     Der Gegner steht **hinter** der Figur (Blick nach +x, Gegner bei
     −20). Vorher wäre der Bogen nach +x gemalt worden; getroffen hätte
     es trotzdem, weil der Schaden im vollen Kreis fiel. Genau die
     Trennung, die Jannik gesehen hat. */
  const welt = schlagwelt("sichel", [[-20, 0]]);
  const s = welt.spieler[0];
  rasterFuellen(welt);
  feuereWaffen(welt, SCHRITT);
  const sw = s.schwuenge[0];
  melde(sw !== undefined, "eine Waffe in Reichweite holt aus");
  melde(sw !== undefined && Math.abs(sw.rx - (-1)) < 1e-9 && Math.abs(sw.ry) < 1e-9,
    "der Schwung zeigt zum Gegner, nicht in Blickrichtung",
    sw ? `zeigt nach (${sw.rx.toFixed(3)}, ${sw.ry.toFixed(3)}), Blick war (1, 0)` : "kein Schwung");
}

{
  /* 2 · Ohne Gegner in Reichweite gibt es keinen Schlag. Ein Bogen, der
     ins Leere wischt, wäre die andere Hälfte desselben Fehlers. */
  const welt = schlagwelt("sichel", [[200, 0]]);
  rasterFuellen(welt);
  feuereWaffen(welt, SCHRITT);
  melde(welt.spieler[0].schwuenge.length === 0,
    "ohne Gegner in Reichweite wird nicht ausgeholt");
}

{
  /* 3 · Getroffen wird erst, wenn die Animation dort ist.

     Der Gegner steht am **äußeren** Rand der Reichweite. Im ersten Bild
     ist der Bogen noch innen — er darf nicht treffen. Ein paar Bilder
     später ist er dort, und dann muss er treffen. Genau dazwischen
     liegt Janniks Satz.

     ⚠️ Diese Prüfung ist die einzige hier, die rot würde, wenn jemand
     den Schaden aus Bequemlichkeit wieder sofort austeilt. Sie ist der
     Grund für den ganzen Umbau. */
  const welt = schlagwelt("weihkessel", [[50, 0]]);
  const s = welt.spieler[0];
  const g = welt.gegner[0];
  rasterFuellen(welt);
  feuereWaffen(welt, SCHRITT);
  schwungSchritt(welt, SCHRITT);
  melde(g.leben === g.lebenMax,
    "im ersten Bild trifft der Schwung den fernen Gegner noch nicht",
    `er hat schon ${(g.lebenMax - g.leben).toFixed(0)} Schaden`);

  let bilder = 1;
  while (s.schwuenge.length > 0 && bilder < 60) {
    rasterFuellen(welt);
    schwungSchritt(welt, SCHRITT);
    bilder++;
  }
  melde(g.leben < g.lebenMax,
    "bis zum Ende des Schwungs ist er getroffen",
    `nach ${bilder} Bildern unversehrt`);
}

{
  /* 4 · Was hinter dem Ausschnitt steht, bleibt heil — und was darin
     steht, nicht. Zwei Gegner, gleicher Abstand, einer vorn, einer
     hinten; die Sichel macht 70 Grad auf. Ohne diese Prüfung wäre der
     alte Rundumschaden zurück, ohne dass irgendetwas rot würde. */
  const welt = schlagwelt("sichel", [[25, 0], [-25, 0]]);
  const s = welt.spieler[0];
  const [vorn, hinten] = welt.gegner;
  rasterFuellen(welt);
  feuereWaffen(welt, SCHRITT);
  let bilder = 0;
  while (s.schwuenge.length > 0 && bilder < 60) {
    rasterFuellen(welt);
    schwungSchritt(welt, SCHRITT);
    bilder++;
  }
  const getroffen = welt.gegner.filter((x) => x.leben < x.lebenMax).length;
  melde(getroffen === 1, "ein 70-Grad-Schwung trifft einen von zwei gegenüberliegenden",
    `${getroffen} von 2`);
  melde(vorn.leben < vorn.lebenMax || hinten.leben < hinten.lebenMax,
    "und zwar den, auf den er zeigt");
}

{
  /* 5 · Der Rundumschlag trifft wirklich rundum — sonst wäre „Auch das
     hinter dir" im Waffentext eine Lüge. */
  const stellen = [];
  for (let i = 0; i < 8; i++) {
    const w = (i / 8) * Math.PI * 2;
    stellen.push([Math.cos(w) * 30, Math.sin(w) * 30]);
  }
  const welt = schlagwelt("weihkessel", stellen);
  const s = welt.spieler[0];
  rasterFuellen(welt);
  feuereWaffen(welt, SCHRITT);
  let bilder = 0;
  while (s.schwuenge.length > 0 && bilder < 60) {
    rasterFuellen(welt);
    schwungSchritt(welt, SCHRITT);
    bilder++;
  }
  const getroffen = welt.gegner.filter((x) => x.leben < x.lebenMax).length;
  melde(getroffen === 8, "der Weihwasserkessel trifft alle acht ringsum",
    `${getroffen} von 8`);
}

{
  /* 6 · Kein Gegner nimmt den Schaden eines Schwungs zweimal.

     ⚠️ **Gemessen am 06.09.2026, und es war wirklich so.** Das Raster
     schlüsselt seine Zellen mit `cx * 73856093 ^ cy * 19349663` und
     prüft die Zelle danach nicht nach; zwei Zellen können sich eine
     Liste teilen, und `umkreis()` reicht denselben Gegner dann zweimal
     durch. Die Pechfackel verbrauchte alle drei Ziele, aber nur zwei
     Gegner nahmen Schaden — einer bekam ihn doppelt. */
  const stellen = [];
  for (let i = 0; i < 24; i++) {
    const w = (i / 24) * Math.PI * 2;
    stellen.push([Math.cos(w) * 35, Math.sin(w) * 35]);
  }
  const welt = schlagwelt("pechfackel", stellen);
  const s = welt.spieler[0];
  rasterFuellen(welt);
  feuereWaffen(welt, SCHRITT);
  let bilder = 0;
  while (s.schwuenge.length > 0 && bilder < 60) {
    rasterFuellen(welt);
    schwungSchritt(welt, SCHRITT);
    bilder++;
  }
  const verletzt = welt.gegner.filter((x) => x.leben < x.lebenMax);
  melde(verletzt.length === 3, "die Pechfackel trifft drei verschiedene Gegner",
    `${verletzt.length} statt 3 — ein Ziel ging doppelt an denselben`);
  const einfach = verletzt.every((x) => x.lebenMax - x.leben < 10);
  melde(einfach, "und keinen davon zweimal",
    verletzt.map((x) => (x.lebenMax - x.leben).toFixed(0)).join(", "));
}

{
  /* 7 · Zusatzangriffe liegen nicht aufeinander.

     `angriffeJeSchlag` gibt bei genug `zusatzangriffe` zwei oder drei
     Schwünge auf **einmal**. Ohne Verzug lägen sie exakt übereinander:
     Der Schaden wäre da, zu sehen wäre ein einziger Bogen — und der
     Wert, den Jannik gekauft hat, wäre unsichtbar. Genau die Sorte
     Fehler, gegen die diese Datei geschrieben ist: nichts ist kaputt,
     es ist nur alles dasselbe. */
  const welt = schlagwelt("sichel", [[20, 0]]);
  const s = welt.spieler[0];
  s.werte.zusatzangriffe = 2;
  rasterFuellen(welt);
  feuereWaffen(welt, SCHRITT);
  melde(s.schwuenge.length === 3, "zwei Zusatzangriffe geben drei Schwünge",
    `${s.schwuenge.length}`);
  const zeiten = new Set(s.schwuenge.map((sw) => sw.zeit));
  melde(zeiten.size === s.schwuenge.length,
    "die Schwünge eines Schlages fangen nacheinander an",
    `${zeiten.size} verschiedene Startzeiten auf ${s.schwuenge.length} Schwünge`);
}

/* ── Die fünf Schwungbögen ─────────────────────────────────────────

   ⚠️ **Bis zum 06.09.2026 gab es genau einen**, in Flammenfarben, für
   alle sieben Nahkampfwaffen. Sichel, Sense, Morgenstern und
   Weihwasserkessel sahen identisch aus, und keiner sah nach dem aus,
   was er austeilt. Derselbe Befund wie bei den Geschossen, nur eine
   Waffengattung weiter: nichts kaputt, alles dasselbe.

   Unterschieden wird auf **zwei** Kanälen. Die Farbe allein reicht
   nicht — im Dunkeln hält niemand Silber und Knochen auseinander —,
   also muss auch die Form verschieden sein. Beides wird hier
   nachgerechnet. */

{
  /* Die Rampe, aus der ein Bogen malen darf. Eine Feuerwaffe mit einem
     Frostbogen wäre ein stiller Fehler: Der Bau des Spielers ginge ins
     Leere und niemand fände heraus, warum — dieselbe Begründung, mit
     der `pruefe-werte.mjs` Merkmal und Schadensart aneinanderbindet. */
  const RAMPE = {
    schnitt: /^eisen/, wucht: /^(knochen|schrift)/, feuer: /^flamme/,
    frost: /^frost/, fluch: /^bann/
  };

  for (const art of SCHADENSARTEN) {
    melde(SCHLAGBOEGEN[art.id] !== undefined,
      `Schadensart "${art.id}" hat einen eigenen Schwungbogen`);
  }
  melde(Object.keys(SCHLAGBOEGEN).length === SCHADENSARTEN.length,
    "es gibt genau so viele Bögen wie Schadensarten",
    `${Object.keys(SCHLAGBOEGEN).length} Bögen, ${SCHADENSARTEN.length} Arten`);

  const muster = new Map(), toene = new Map();
  for (const [art, s] of Object.entries(SCHLAGBOEGEN)) {
    const raster = s.bild;
    melde(raster.length === 11 && raster.every((z) => z.length === 11),
      `${art}: der Bogen ist 11 x 11`,
      `${raster.length} Zeilen, Breiten ${[...new Set(raster.map((z) => z.length))].join("/")}`);
    /* Ungerade Kante — sonst liegt die Quellmitte auf einem halben
       Bildpunkt und das Bild wandert bei jeder der sechzehn Drehungen
       (Befund 3 oben, an den Geschossen gemessen). */
    melde(raster.length % 2 === 1, `${art}: ungerade Kantenlänge`);

    const zeichen = new Set([...raster.join("")].filter((c) => c !== "."));
    const farbnamen = [...zeichen].map((c) => s.zeichen[c]);
    melde(farbnamen.every((f) => f && f in FARBEN),
      `${art}: jedes Zeichen zeigt auf eine Farbe der Palette`,
      farbnamen.filter((f) => !(f in FARBEN)).join(", "));
    melde(new Set(farbnamen).size >= 3, `${art}: malt mit mindestens drei Tönen`,
      `${new Set(farbnamen).size}`);
    melde(farbnamen.every((f) => RAMPE[art].test(f)),
      `${art}: malt aus der Rampe seiner Schadensart`,
      farbnamen.filter((f) => !RAMPE[art].test(f)).join(", "));

    muster.set(art, raster.join("").replace(/[^.]/g, "#"));
    toene.set(art, [...new Set(farbnamen)].sort().join("+"));
  }

  /* Und keine zwei sind gleich — weder in der Form noch in der Farbe.
     Das ist die eigentliche Prüfung; alles darüber ist Buchhaltung. */
  const arten = Object.keys(SCHLAGBOEGEN);
  for (let i = 0; i < arten.length; i++) {
    for (let j = i + 1; j < arten.length; j++) {
      const a = arten[i], b = arten[j];
      melde(muster.get(a) !== muster.get(b),
        `${a} und ${b} haben verschiedene Formen`);
      melde(toene.get(a) !== toene.get(b),
        `${a} und ${b} haben verschiedene Farben`);
    }
  }
}

ende();
