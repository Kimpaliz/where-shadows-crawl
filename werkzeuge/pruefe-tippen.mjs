/* [Aufgabe: Prüfwesen] Lässt sich der Krämer mit dem Finger bedienen?

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   Zwei Sorten Fehler, und beide melden sich nicht von selbst:

   **1 · Malen und Treffen laufen auseinander.** `zeichneLaden()` und
   `ladenFelder()` waren bis zum 05.09.2026 zwei getrennte Rechnungen
   für dieselben Kästen. Wer eine davon ändert, verschiebt entweder das
   Bild oder die Trefferfläche — und ein Finger, der 6 Bildpunkte neben
   dem Kasten landet, sieht aus wie ein Aussetzer des Telefons, nicht
   wie ein Fehler im Code. Genau dieser Fall steht schon einmal im
   Fehlerbuch: In Scotophobia stellten Setzer und Bewegung der Wesen
   verschiedene Fragen, und ein Wesen kam nie von der Wand los.

   **2 · Trefferflächen, die sich überlappen.** „NEU" und „LOS" liegen
   14 Bildpunkte auseinander und sind 12 hoch. Wächst die Trefferfläche
   für den Finger über diese Lücke hinaus, dann würfelt ein Tipp auf
   „LOS" neu — und kostet Gold. Ein Fehlgriff, der teurer ist als jeder
   andere auf diesem Bildschirm.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/oberflaeche.js` (`ladenFelder`, `TIPP_MINDESTHOEHE`),
   `runtime/laden-tippen.js` (der Tippweg), `runtime/karten-hand.js`
   (`schritteZu`, geteilt), `spiel/laden.mjs` (`ANGEBOTE`). */

import { macheMelder, liesDatei } from "./helfer.mjs";
import {
  ladenFelder, LADEN_FELDER, TIPP_MINDESTHOEHE, LADEN_OBEN, KACHEL_H, KACHEL_LUFT
} from "../runtime/oberflaeche.js";
import { schritteZu } from "../runtime/karten-hand.js";
import { ANGEBOTE } from "../spiel/laden.mjs";

const { melde, ende } = macheMelder({ still: true });

/* Eine Welt, die nur so viel kann, wie `ladenFelder` fragt. Mehr wäre
   eine zweite Wahrheit über den Aufbau eines Spielers. */
function welt(spielerzahl = 1) {
  return {
    phase: "laden",
    spieler: Array.from({ length: spielerzahl }, (_, i) => ({
      id: i, bereit: false,
      angebote: Array.from({ length: ANGEBOTE }, (_, k) => ({ name: "W" + k, preis: 5 }))
    }))
  };
}

/* ── 1 · Die Geometrie ist die, die auch gemalt wird ────────────────

   Die Zahlen stammen aus `ladenFelder()` und sind hier **abgeschrieben,
   damit ein Verrutschen auffällt** — das ist der ganze Zweck.

   ⚠️ **Am 06.09.2026 nachgezogen.** Bis dahin standen hier vier Kästen
   von 30 Bildpunkten untereinander. Seit Janniks Ansage „im shop haben
   alle items item bilder/icons und werden in kacheln angezeigt" sind
   es zwei mal zwei Kacheln von 46. Die Prüfung hat den Umbau gefangen
   und zehn Zeilen rot gemeldet, bevor irgendjemand danebengetippt
   hat — genau dafür ist sie da. */

{
  const felder = ladenFelder(welt(1)).get(0).felder;
  melde(felder.length === LADEN_FELDER,
    "der Krämer hat so viele Felder, wie sein Zeiger kennt", `${felder.length} von ${LADEN_FELDER}`);

  const reihen = Math.ceil(ANGEBOTE / 2);
  const erwartet = [];
  for (let k = 0; k < ANGEBOTE; k++) {
    erwartet.push({
      i: k,
      y: LADEN_OBEN + Math.floor(k / 2) * (KACHEL_H + KACHEL_LUFT),
      h: KACHEL_H,
      spalte: k % 2
    });
  }
  const nachKacheln = LADEN_OBEN + reihen * (KACHEL_H + KACHEL_LUFT);
  erwartet.push({ i: ANGEBOTE, y: nachKacheln + 18, h: 14, spalte: 0 });
  erwartet.push({ i: ANGEBOTE + 1, y: nachKacheln + 46, h: 14, spalte: 0 });

  for (const e of erwartet) {
    const f = felder.find((x) => x.i === e.i);
    melde(f && f.y === e.y && f.h === e.h,
      `Feld ${e.i} liegt, wo es gemalt wird`, f ? `y ${f.y} h ${f.h} statt y ${e.y} h ${e.h}` : "fehlt");
  }

  /* Die Kacheln stehen wirklich **nebeneinander**: gerade Nummern
     links, ungerade rechts, und zwei in einer Reihe auf derselben
     Höhe. Ohne diese Zeile wäre „in Kacheln" auch dann grün, wenn
     alles wieder untereinander stünde. */
  const links = felder.filter((f) => f.i < ANGEBOTE && f.i % 2 === 0);
  const rechts = felder.filter((f) => f.i < ANGEBOTE && f.i % 2 === 1);
  melde(rechts.every((f) => f.x > links[0].x),
    "die ungeraden Kacheln stehen rechts neben den geraden");
  melde(links.length === rechts.length
    && links.every((f, i) => f.y === rechts[i].y),
    "und je zwei stehen auf derselben Höhe");
  melde(felder[0].b < ladenFelder(welt(1)).get(0).breite,
    "eine Kachel ist schmaler als die Spalte — sonst wäre sie keine",
    `${felder[0].b} von ${ladenFelder(welt(1)).get(0).breite}`);

  /* Und alles bleibt im Bild. */
  const raus = felder.filter((f) => f.y + f.tippH > 270 || f.x < 0);
  melde(raus.length === 0, "keine Trefferfläche ragt aus dem Bild",
    raus.map((f) => `#${f.i}`).join(" "));
}

/* ── 2 · Keine Trefferfläche überlappt eine andere ──────────────────

   Der teuerste Fehlgriff dieses Bildschirms, siehe Kopfnotiz.

   ⚠️ **Rechteck gegen Rechteck, nicht mehr Zeile gegen Zeile.** Vorher
   lagen die Felder in einer Spalte, und es genügte zu fragen, ob eines
   nach unten in das nächste wächst. Mit Kacheln nebeneinander sagt
   diese Frage nichts mehr: Feld 0 und Feld 1 haben dieselbe Höhe und
   verschiedene x, und die alte Rechnung meldete −46 Bildpunkte
   „Abstand" für einen Fall, der völlig in Ordnung ist.

   Jetzt wird **jedes Paar** verglichen, und zwar in beiden Achsen. Das
   ist strenger als vorher, nicht schwächer: Es fängt auch den Fall, den
   die alte Fassung gar nicht sehen konnte — zwei Felder, die sich
   seitlich überlappen. */

for (const n of [1, 2, 3, 4]) {
  const spalten = ladenFelder(welt(n));
  const alle = [];
  for (const [id, { felder }] of spalten) for (const f of felder) alle.push({ id, f });

  const ueberlappt = [];
  for (let a = 0; a < alle.length; a++) {
    for (let b = a + 1; b < alle.length; b++) {
      const p = alle[a].f, q = alle[b].f;
      const x = p.x < q.x + q.tippB && p.x + p.tippB > q.x;
      const y = p.y < q.y + q.tippH && p.y + p.tippH > q.y;
      if (x && y) ueberlappt.push(`J${alle[a].id}#${p.i} × J${alle[b].id}#${q.i}`);
    }
  }
  melde(ueberlappt.length === 0,
    `${n} Spieler: keine zwei Trefferflächen überlappen sich`,
    ueberlappt.slice(0, 3).join(" · "));
}

/* Und die Gegenrichtung: Die Flächen müssen auch wirklich größer
   geworden sein. Ohne diese Prüfung bestünde die obige auch dann, wenn
   `tippH` still auf `h` zurückfiele — und der Finger hätte wieder nur
   12 Bildpunkte zu treffen. */
{
  const felder = ladenFelder(welt(1)).get(0).felder;
  const kleine = felder.filter((f) => f.h < TIPP_MINDESTHOEHE);
  melde(kleine.length > 0, "es gibt überhaupt Felder, die zu klein gemalt sind", `${kleine.length}`);
  const gewachsen = kleine.filter((f) => f.tippH > f.h);
  melde(gewachsen.length === kleine.length,
    "jedes zu klein gemalte Feld hat eine größere Trefferfläche",
    `${gewachsen.length} von ${kleine.length}`);
  /* Das letzte Feld hat keinen Nachbarn und darf deshalb voll wachsen. */
  const letztes = felder[felder.length - 1];
  melde(letztes.tippH >= TIPP_MINDESTHOEHE,
    "das unterste Feld erreicht die Mindesthöhe", `${letztes.tippH} von ${TIPP_MINDESTHOEHE}`);
}

/* ── 3 · Ein Tipp wird zu Achse und Knopf ───────────────────────────

   Der Kern der Sache: Nichts darf den Zeiger örtlich verschieben, sonst
   laufen die Welten im Netzspiel auseinander. Geprüft wird an der
   echten Bedienung — der Handler wird abgefangen und mit erfundenen
   Tipps gefüttert. */

async function macheHand() {
  /* `laden-tippen.js` hängt sich beim Anlegen ans Fenster. In Node gibt
     es das nicht; die Attrappe fängt den Handler ab und ist zugleich
     der Weg, mit dem hier getippt wird. */
  let handler = null;
  globalThis.addEventListener = (art, fn) => { if (art === "pointerdown") handler = fn; };
  const { macheLadenhand } = await import("../runtime/laden-tippen.js");
  const hand = macheLadenhand({
    /* 480 x 270 auf 960 x 540: Faktor 2, damit ein Rechenfehler beim
       Umrechnen sichtbar wird statt sich wegzukürzen. */
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 })
  });
  return { hand, tippe: (x, y) => handler({
    pointerType: "touch", clientX: x * 2, clientY: y * 2,
    stopPropagation() {}, preventDefault() {}
  }) };
}

{
  const { hand, tippe } = await macheHand();
  const w = welt(1);
  const menue = { ladenZeiger: { 0: 0 } };
  const felder = ladenFelder(w).get(0).felder;
  hand.merke(w, menue, 0);

  /* Ein Tipp auf Feld 2 bei stehendem Zeiger 0: zwei Achsenschritte. */
  const ziel = felder.find((f) => f.i === 2);
  tippe(ziel.x + 5, ziel.y + 5);
  const raus = [];
  for (let i = 0; i < 8; i++) {
    const e = hand.mische({ x: 0, y: 0, knopf: false }, w);
    raus.push(e);
    hand.quittiere();
  }
  const schritte = raus.filter((e) => e.x === 1).length;
  const { anzahl } = schritteZu(2, 0, LADEN_FELDER);
  melde(schritte === anzahl,
    "ein Tipp erzeugt genau so viele Achsenschritte, wie Felder dazwischen liegen",
    `${schritte} statt ${anzahl}`);
  melde(raus.every((e) => e.knopf !== true),
    "der erste Tipp drückt noch keinen Knopf");
}

{
  /* Zweiter Tipp auf dasselbe Feld löst aus — und **nur einmal**. Zwei
     Knöpfe hintereinander würfelten auf „NEU" zweimal und kosteten
     zweimal Gold. */
  const { hand, tippe } = await macheHand();
  const w = welt(1);
  const menue = { ladenZeiger: { 0: 3 } };
  const felder = ladenFelder(w).get(0).felder;
  hand.merke(w, menue, 0);

  const ziel = felder.find((f) => f.i === 3);
  tippe(ziel.x + 5, ziel.y + 5);
  tippe(ziel.x + 5, ziel.y + 5);
  tippe(ziel.x + 5, ziel.y + 5);

  const raus = [];
  for (let i = 0; i < 10; i++) {
    raus.push(hand.mische({ x: 0, y: 0, knopf: false }, w));
    hand.quittiere();
  }
  const knoepfe = raus.filter((e) => e.knopf === true).length;
  melde(knoepfe === 1, "drei Tipps auf dasselbe Feld drücken genau einen Knopf", `${knoepfe}`);
}

{
  /* Außerhalb des Krämers trifft nichts. Ohne das führe ein Tipp auf
     die Welle eine Bewegung mit sich, die eine Welle später ankäme —
     ein Ruck ohne Ursache. */
  const { hand, tippe } = await macheHand();
  const w = welt(1);
  hand.merke(w, { ladenZeiger: { 0: 0 } }, 0);
  const ziel = ladenFelder(w).get(0).felder[0];
  tippe(ziel.x + 5, ziel.y + 5);

  const welle = { ...w, phase: "welle" };
  const e = hand.mische({ x: 0, y: 0, knopf: false }, welle);
  melde(e.x === 0 && e.knopf === false, "in der Welle wirkt kein wartender Tipp");

  hand.merke(welle, { ladenZeiger: { 0: 0 } }, 0);
  tippe(ziel.x + 5, ziel.y + 5);
  const e2 = hand.mische({ x: 0, y: 0, knopf: false }, welle);
  melde(e2.x === 0, "in der Welle nimmt der Krämerweg gar keinen Tipp an");
}

{
  /* Wer bereit ist, tippt nicht mehr — sonst kaufte ein Nachzügler
     weiter, während die Runde schon auf ihn wartet. */
  const { hand, tippe } = await macheHand();
  const w = welt(1);
  w.spieler[0].bereit = true;
  hand.merke(w, { ladenZeiger: { 0: 0 } }, 0);
  const ziel = ladenFelder(w).get(0).felder[0];
  tippe(ziel.x + 5, ziel.y + 5);
  const e = hand.mische({ x: 0, y: 0, knopf: false }, w);
  melde(e.x === 0 && e.knopf === false, "wer bereit ist, dessen Tipp wirkt nicht mehr");
}

{
  /* Ein Zuschauer ohne eigenen Platz darf nichts bedienen. */
  const { hand, tippe } = await macheHand();
  const w = welt(2);
  hand.merke(w, { ladenZeiger: { 0: 0, 1: 0 } }, undefined);
  const ziel = ladenFelder(w).get(0).felder[0];
  tippe(ziel.x + 5, ziel.y + 5);
  const e = hand.mische({ x: 0, y: 0, knopf: false }, w);
  melde(e.x === 0, "ohne eigenen Platz wird nichts tippbar");
}

{
  /* Und die wichtigste Grenze im Koop: Nur die **eigene** Spalte nimmt
     Tipps an. Ein Tipp in die Spalte des Nachbarn dürfte ihm nichts
     kaufen. */
  const { hand, tippe } = await macheHand();
  const w = welt(2);
  hand.merke(w, { ladenZeiger: { 0: 0, 1: 0 } }, 0);
  const fremd = ladenFelder(w).get(1).felder[2];
  tippe(fremd.x + 5, fremd.y + 5);
  const e = hand.mische({ x: 0, y: 0, knopf: false }, w);
  melde(e.x === 0, "ein Tipp in die Spalte des Nachbarn wirkt nicht");
}

/* ── 4 · Der Knopf überlebt den Weg bis zur Flanke ──────────────────

   **Die Lücke, die diesen ganzen Bau fast unbrauchbar gemacht hätte.**

   `runtime/karten-hand.js` und `runtime/laden-tippen.js` mischen einen
   `{ knopf: true }` in die Eingabe. Bedient wird aber nicht damit,
   sondern mit der **Flanke**, die `macheFlanken()` daraus bildet — und
   dazwischen lag ein `??`, das `false` für einen gültigen Wert hielt:

       const knopf = !!(e?.ausweichen ?? e?.knopf);

   `liesEigene()` liefert **immer** ein `ausweichen`-Feld. Steht es auf
   `false`, gewinnt es gegen jedes gemischte `knopf: true`. Gemessen am
   05.09.2026 im Browser: Der Tipp bewegte den Zeiger, der zweite Tipp
   kaufte nichts.

   Jede der beiden Prüfungen war für sich grün — `pruefe-kartenhand`
   prüft die Kette, `pruefe-anzeige` die Bedienung. **Niemand ging den
   Weg als Ganzes.** Genau dafür steht dieser Abschnitt. */

{
  const { macheFlanken } = await import("../runtime/eingabe.js");

  /* Wie `liesEigene()` es liefert: `ausweichen` ist gesetzt, nicht
     abwesend. Das ist der Punkt — mit `undefined` wäre nie etwas
     aufgefallen. */
  const roh = { x: 0, y: 0, ausweichen: false };

  for (const [name, gemischt] of [
    ["knopf", { ...roh, knopf: true }],
    ["ausweichen", { ...roh, ausweichen: true }],
    ["beide", { ...roh, ausweichen: true, knopf: true }]
  ]) {
    const e = macheFlanken()([gemischt])[0];
    melde(e.knopfFlanke === true,
      `ein gemischtes "${name}" kommt als knopfFlanke an`, `${e.knopfFlanke}`);
  }

  /* Und die Gegenrichtung, ohne die die drei oben auch von einem
     `knopfFlanke: true` erfüllt wären, das immer anschlägt. */
  const still = macheFlanken()([roh])[0];
  melde(still.knopfFlanke === false, "ohne Knopf entsteht keine Flanke", `${still.knopfFlanke}`);

  /* Eine Flanke ist ein **Wechsel**: Wer den Knopf hält, drückt ihn
     nicht zweimal. Sonst kaufte ein liegengebliebener Finger die ganze
     Auslage leer. */
  const halten = macheFlanken();
  const erste = halten([{ ...roh, knopf: true }])[0];
  const zweite = halten([{ ...roh, knopf: true }])[0];
  melde(erste.knopfFlanke === true && zweite.knopfFlanke === false,
    "gehaltener Knopf gibt genau eine Flanke", `${erste.knopfFlanke} dann ${zweite.knopfFlanke}`);
}

/* ── 5 · Und derselbe Weg für die Kartenhand ────────────────────────

   Sie mischt dieselbe Form und hing an derselben Zeile. Geprüft wird
   hier, nicht in `pruefe-kartenhand.mjs`: Der Fehler saß **zwischen**
   den Modulen, und eine Prüfung, die nur eine Seite kennt, hat ihn
   schon einmal übersehen. */

{
  const { macheFlanken } = await import("../runtime/eingabe.js");
  const quelle = liesDatei("runtime/karten-hand.js");
  const form = /kette\.push\(\{\s*(knopf|ausweichen)\s*:\s*true/.exec(quelle);
  melde(form !== null, "die Kartenhand mischt einen Knopf in ihre Kette");
  if (form) {
    const e = macheFlanken()([{ x: 0, y: 0, ausweichen: false, [form[1]]: true }])[0];
    melde(e.knopfFlanke === true,
      `die Form der Kartenhand ("${form[1]}") kommt als Flanke an`, `${e.knopfFlanke}`);
  }
}

ende();
