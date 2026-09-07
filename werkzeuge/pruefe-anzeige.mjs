/* [Aufgabe: Prüfwesen] Sieht man, was gerade passiert?

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   `pruefe-sprites.mjs` prüft jedes Trefferzeichen **für sich**: Raster
   heil, Farben gültig, hell genug gegen den Boden. Das beantwortet die
   Frage nicht, um die es bei fünf Zeichen geht — ob man sie
   **voneinander** unterscheiden kann. Fünf Zeichen, die einzeln
   tadellos sind und alle wie ein heller Fleck aussehen, bestehen jede
   bestehende Prüfung und erfüllen ihren Zweck trotzdem nicht.

   Dazu kommen die Zahlen, die an **zwei** Stellen stehen: Der Zeichner
   muss wissen, wie lange ein Funke und eine Schadenszahl leben, der
   Regelkern schreibt es beim Erzeugen hinein. Läuft das auseinander,
   stürzt nichts ab — die Bildfolge läuft nur nicht mehr zu Ende oder
   die Zahl blendet zur falschen Zeit aus.

   ── Wie „unterscheidbar" hier gemessen wird ────────────────────────

   Der erste Anlauf verglich die Zeichen **Bildpunkt für Bildpunkt**
   über dem Boden. Die Zahlen sahen gut aus, und die Messung war
   wertlos: Dasselbe Zeichen um **einen** Bildpunkt verschoben kam auf
   241,5 und lag damit über sieben der zehn echten Paare. Gemessen
   wurde Versatz, nicht Unterschied.

   Bei 9 x 9 Bildpunkten sieht das Auge zwei Dinge: **welche Farbe** der
   Fleck hat und **welche Form**. Nur der Farbkanal ist versatzfest —
   deshalb ist er hier das Maß. Belegt an zwei Gegenproben, die beide
   „dasselbe Zeichen" sagen müssen und es auch tun:

   | Gegenprobe | Farbe | Form (1−IoU) |
   | --- | ---: | ---: |
   | `frost` gegen sich selbst, 1 px versetzt | **0,0** | 0,70 |
   | `feuer` Bild 1 gegen Bild 2 (dasselbe Zeichen, verglimmend) | **53,1** | 0,49 |

   Der Formkanal meldet für beide einen großen Unterschied und ist
   damit als alleiniges Maß widerlegt. Der Farbkanal trennt sauber:
   Das schwächste **echte** Paar liegt bei 125,9 (schnitt/wucht), die
   stärkste Gegenprobe bei 53,1 — Faktor 2,4 dazwischen.

   Die Schranke ist **90** und keine neue Zahl: Genau diese benutzt
   `werkzeuge/pruefe-werte.mjs` bereits für „zwei Arten, die man auf
   dem Bildschirm nicht trennen kann, sind keine zwei Arten". Sie liegt
   im Abstand zwischen Gegenprobe und schwächstem echten Paar.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprite-daten.js` (`TREFFER`), `runtime/palette.js`,
   `runtime/zeichnen.js` (die reinen Funktionen, hier wirklich
   ausgeführt), `runtime/oberflaeche.js` (Angriffsleiste und Frist),
   `spiel/kampf.mjs` (die Quelle der doppelten Zahlen),
   `spiel/schadensarten.mjs` (die fünf Arten). */

import { macheMelder, liesDatei } from "./helfer.mjs";
import { FARBEN } from "../runtime/palette.js";
import { TREFFER } from "../runtime/sprite-daten.js";
import { bildIndex, mische, artFarbe, zahlStil, ziffernBreite, FUNKE_LEBEN, TOD_LEBEN, KRIT_WEISS }
  from "../runtime/zeichnen.js";
import { bereitAnteil, verstummt, istRegung, fristRest, FRIST_SEKUNDEN, macheMenue }
  from "../runtime/oberflaeche.js";
import { ART_IDS, SCHADENSARTEN, STANDARD_ART } from "../spiel/schadensarten.mjs";
import { zeichneStaub, zeichneSchweif } from "../runtime/zeichnen.js";
import { SCHWUNG_DAUER } from "../spiel/schwung.mjs";
import { SCHRITT } from "../spiel/welt.mjs";

const { melde, ende } = macheMelder({ still: true });

/* Derselbe Farbabstand wie in `pruefe-werte.mjs` (Riemersma). Bewusst
   dieselbe Rechnung: Zwei Maße für dieselbe Frage wären zwei
   Wahrheiten, und die Schranke 90 gälte dann nur für eine davon. */
const zuRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function farbabstand(a, b) {
  const rm = (a[0] + b[0]) / 2;
  return Math.sqrt((2 + rm / 256) * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2
    + (2 + (255 - rm) / 256) * (a[2] - b[2]) ** 2);
}

/* Was ein Fleck als Farbe „ist": Mittel über die gemalten Punkte.
   Unbemalte zählen nicht mit — sonst mäße man, wie viel Boden
   durchscheint, und ein dünnes Zeichen wäre allein deshalb „anders". */
function mittelfarbe(bild, zeichen) {
  let r = 0, g = 0, b = 0, n = 0;
  for (const zeile of bild) {
    for (const z of zeile) {
      if (z === ".") continue;
      const hex = FARBEN[zeichen[z]];
      if (!hex) continue;
      const [cr, cg, cb] = zuRgb(hex);
      r += cr; g += cg; b += cb; n++;
    }
  }
  return n === 0 ? null : [r / n, g / n, b / n];
}

function maske(bild) {
  const raus = [];
  for (const zeile of bild) for (const z of zeile) raus.push(z !== ".");
  return raus;
}

function iou(a, b) {
  let schnitt = 0, vereinigung = 0;
  for (let k = 0; k < a.length; k++) {
    if (a[k] && b[k]) schnitt++;
    if (a[k] || b[k]) vereinigung++;
  }
  return vereinigung === 0 ? 1 : schnitt / vereinigung;
}

/* ── Die fünf Zeichen gibt es, und sie heißen wie die Arten ──────── */

const marken = Object.keys(TREFFER);
const ohneMarke = ART_IDS.filter((id) => !TREFFER[id]);
const ohneArt = marken.filter((id) => !ART_IDS.includes(id));
melde(ohneMarke.length === 0, `alle ${ART_IDS.length} Schadensarten haben ein Trefferzeichen`,
  `ohne Zeichen: ${ohneMarke.join(" ")}`);
melde(ohneArt.length === 0, "kein Trefferzeichen ohne zugehörige Schadensart",
  `ohne Art: ${ohneArt.join(" ")}`);

/* Ohne diese Prüfung wäre `TREFFER[art]` bei einem Tippfehler still
   `undefined`, und `zeichneTrefferZeichen` überspränge den Treffer
   wortlos — man sähe schlicht nichts. */
let farben = {}, masken = {}, ohneFarbe = [];
for (const id of marken) {
  const f = mittelfarbe(TREFFER[id].bild, TREFFER[id].zeichen);
  if (!f) { ohneFarbe.push(id); continue; }
  farben[id] = f;
  masken[id] = maske(TREFFER[id].bild);
}
melde(ohneFarbe.length === 0, "jedes Trefferzeichen malt überhaupt etwas", ohneFarbe.join(" "));

/* ── Unterscheidbar bei echter Größe ─────────────────────────────── */

const SCHRANKE = 90;
let schwaechstes = Infinity, schwaechstesPaar = "";
for (let i = 0; i < marken.length; i++) {
  for (let j = i + 1; j < marken.length; j++) {
    const d = farbabstand(farben[marken[i]], farben[marken[j]]);
    if (d < schwaechstes) { schwaechstes = d; schwaechstesPaar = `${marken[i]}/${marken[j]}`; }
  }
}
melde(schwaechstes >= SCHRANKE,
  `die ${marken.length} Trefferzeichen liegen paarweise mindestens ${SCHRANKE} auseinander `
  + `(schwächstes Paar ${schwaechstesPaar} bei ${schwaechstes.toFixed(1)})`,
  `nur ${schwaechstes.toFixed(1)} bei ${schwaechstesPaar}`);

/* Die Gegenproben. Sie sind der Grund, warum die Zahl oben etwas
   bedeutet: Ein Maß, das „gleich" nicht von „verschieden" trennt,
   liefert für beides große Zahlen und meldet nie etwas. */
const frostVersetzt = [];
for (let y = 0; y < 9; y++) {
  for (let x = 0; x < 9; x++) frostVersetzt.push(masken.frost[y * 9 + Math.max(0, x - 1)]);
}
const formVersetzt = 1 - iou(masken.frost, frostVersetzt);
melde(formVersetzt > 0.5,
  `Gegenprobe: der Formkanal hält dasselbe Zeichen um 1 px versetzt für verschieden `
  + `(${formVersetzt.toFixed(2)}) — deshalb ist er als alleiniges Maß untauglich`,
  `Formkanal meldet nur ${formVersetzt.toFixed(2)}`);

const feuerBilder = TREFFER.feuer.bilder ?? [TREFFER.feuer.bild];
melde(feuerBilder.length > 1, "feuer hat eine Bildfolge für die Gegenprobe",
  `nur ${feuerBilder.length} Bild`);
if (feuerBilder.length > 1) {
  const a = mittelfarbe(feuerBilder[0], TREFFER.feuer.zeichen);
  const b = mittelfarbe(feuerBilder[1], TREFFER.feuer.zeichen);
  const d = farbabstand(a, b);
  melde(d < SCHRANKE,
    `Gegenprobe: die zwei Bilder von feuer gelten als dasselbe Zeichen (${d.toFixed(1)} < ${SCHRANKE})`,
    `${d.toFixed(1)} — die Gegenprobe trennt nicht mehr, die Schranke ist wertlos`);
  melde(schwaechstes > d * 1.5,
    `zwischen Gegenprobe (${d.toFixed(1)}) und schwächstem echten Paar (${schwaechstes.toFixed(1)}) `
    + `liegt Faktor ${(schwaechstes / d).toFixed(1)}`,
    "Gegenprobe und echtes Paar liegen zu dicht beieinander");
}

/* ── Zahlen, die an zwei Stellen stehen ──────────────────────────── */

/* `runtime/zeichnen.js` muss die Lebensdauer kennen, um die Bildfolge
   und das Ausblenden zu takten; `spiel/kampf.mjs` schreibt sie beim
   Erzeugen hinein. Der Regelkern ist die Quelle — diese Prüfung liest
   ihn nach und wird rot, sobald beide auseinanderlaufen. */
const kampf = liesDatei("spiel/kampf.mjs");

const funkenStellen = [...kampf.matchAll(/welt\.funken\.push\(\{([^}]*)\}/g)]
  .map((m) => m[1])
  .map((inhalt) => ({
    zeit: Number((inhalt.match(/zeit:\s*([\d.]+)/) ?? [])[1]),
    tod: /art:\s*"tod"/.test(inhalt)
  }));
melde(funkenStellen.length >= 2, `${funkenStellen.length} Stellen erzeugen Funken in kampf.mjs`,
  "weniger als zwei gefunden — die Muster passen nicht mehr");

const trefferFunke = funkenStellen.find((f) => !f.tod);
const todFunke = funkenStellen.find((f) => f.tod);
melde(trefferFunke != null && trefferFunke.zeit === FUNKE_LEBEN,
  `FUNKE_LEBEN (${FUNKE_LEBEN}) stimmt mit kampf.mjs überein`,
  `kampf.mjs schreibt ${trefferFunke?.zeit}, zeichnen.js rechnet mit ${FUNKE_LEBEN}`);
melde(todFunke != null && todFunke.zeit === TOD_LEBEN,
  `TOD_LEBEN (${TOD_LEBEN}) stimmt mit kampf.mjs überein`,
  `kampf.mjs schreibt ${todFunke?.zeit}, zeichnen.js rechnet mit ${TOD_LEBEN}`);

/* Dasselbe für die schwebenden Zahlen: `zeichneZahlen` blendet über
   die Restzeit aus und teilt dafür durch die Lebensdauer. Ein
   Auseinanderlaufen ließe die Zahl zu früh oder gar nicht verblassen. */
const zahlStellen = [...kampf.matchAll(/welt\.zahlen\.push\(\{([^}]*)\}/g)]
  .map((m) => m[1])
  .map((inhalt) => ({
    zeit: Number((inhalt.match(/zeit:\s*([\d.]+)/) ?? [])[1]),
    eigen: /wert:\s*-/.test(inhalt)
  }));
melde(zahlStellen.length >= 2, `${zahlStellen.length} Stellen erzeugen Schadenszahlen in kampf.mjs`,
  "weniger als zwei gefunden");

const zeichner = liesDatei("runtime/zeichnen.js");
const ausblenden = zeichner.match(/z\.zeit\s*\/\s*\(z\.wert\s*<\s*0\s*\?\s*([\d.]+)\s*:\s*([\d.]+)\)/);
melde(ausblenden != null, "das Ausblenden der Zahlen benutzt beide Lebensdauern",
  "Muster in zeichnen.js nicht gefunden");
if (ausblenden) {
  const eigen = zahlStellen.find((z) => z.eigen), fremd = zahlStellen.find((z) => !z.eigen);
  melde(eigen != null && Number(ausblenden[1]) === eigen.zeit,
    `die eigene Schadenszahl lebt in beiden Dateien ${eigen?.zeit} s`,
    `kampf.mjs ${eigen?.zeit}, zeichnen.js ${ausblenden[1]}`);
  melde(fremd != null && Number(ausblenden[2]) === fremd.zeit,
    `die Trefferzahl lebt in beiden Dateien ${fremd?.zeit} s`,
    `kampf.mjs ${fremd?.zeit}, zeichnen.js ${ausblenden[2]}`);
}

/* ── Die Bildfolge läuft vorwärts und bleibt im Rahmen ───────────── */

let ausserhalb = 0, rueckwaerts = 0;
let vorher = -1;
for (let s = 100; s >= 0; s--) {
  const rest = (s / 100) * FUNKE_LEBEN;
  const i = bildIndex(rest, FUNKE_LEBEN, 2);
  if (!Number.isInteger(i) || i < 0 || i > 1) ausserhalb++;
  if (i < vorher) rueckwaerts++;
  vorher = i;
}
melde(ausserhalb === 0, "bildIndex bleibt über die ganze Lebensdauer im Rahmen", `${ausserhalb} daneben`);
melde(rueckwaerts === 0, "bildIndex läuft vorwärts, nicht rückwärts", `${rueckwaerts} Rückschritte`);
melde(bildIndex(0.09, 0.18, 1) === 0, "ein einbildriges Zeichen bleibt immer bei Bild 0");
melde(bildIndex(FUNKE_LEBEN, FUNKE_LEBEN, 2) === 0, "frisch erzeugt zeigt das erste Bild");
melde(bildIndex(0, FUNKE_LEBEN, 2) === 1, "am Ende zeigt das letzte Bild");
/* Eine Restzeit über der Lebensdauer darf nicht in einen negativen
   Index laufen — sie kommt vor, wenn jemand die Dauer verkürzt. */
melde(bildIndex(999, FUNKE_LEBEN, 2) === 0, "eine zu große Restzeit bleibt bei Bild 0");

/* ── Der Krit ────────────────────────────────────────────────────── */

/* Beide Schranken, die `KRIT_WEISS` begründen, hier nachgerechnet.
   Ohne sie wäre die Begründung im Kommentar eine Behauptung. */
let engstesNormal = Infinity, engstesKrit = Infinity;
for (let i = 0; i < SCHADENSARTEN.length; i++) {
  for (let j = i + 1; j < SCHADENSARTEN.length; j++) {
    const a = SCHADENSARTEN[i].farbe, b = SCHADENSARTEN[j].farbe;
    engstesNormal = Math.min(engstesNormal, farbabstand(zuRgb(a), zuRgb(b)));
    engstesKrit = Math.min(engstesKrit,
      farbabstand(zuRgb(mische(a, "#ffffff", KRIT_WEISS)), zuRgb(mische(b, "#ffffff", KRIT_WEISS))));
  }
}
melde(engstesKrit >= engstesNormal * 0.7,
  `die Kritfarben behalten ${(engstesKrit / engstesNormal * 100).toFixed(0)} % des normalen Artabstands `
  + `(${engstesKrit.toFixed(1)} von ${engstesNormal.toFixed(1)})`,
  `nur ${(engstesKrit / engstesNormal * 100).toFixed(0)} % — die Art ist am Krit nicht mehr ablesbar`);

const leuchtdichte = (hex) => {
  const [r, g, b] = zuRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
let zuNah = [], nichtHeller = [];
for (const a of SCHADENSARTEN) {
  const krit = mische(a.farbe, "#ffffff", KRIT_WEISS);
  if (farbabstand(zuRgb(a.farbe), zuRgb(krit)) < 40) zuNah.push(a.id);
  if (leuchtdichte(krit) <= leuchtdichte(a.farbe)) nichtHeller.push(a.id);
}
melde(zuNah.length === 0, "jede Kritfarbe hebt sich von ihrer normalen Farbe ab", zuNah.join(" "));
melde(nichtHeller.length === 0, "jede Kritfarbe ist heller als ihre normale", nichtHeller.join(" "));

/* Der Krit unterscheidet sich auf mehreren Kanälen — genau das steht
   als Begründung in `zeichnen.js`, also wird es hier nachgeprüft. */
const normal = zahlStil({ wert: 12, krit: false, art: "feuer" });
const krit = zahlStil({ wert: 12, krit: true, art: "feuer" });
melde(krit.skala > normal.skala, `ein Krit ist größer (${krit.skala} gegen ${normal.skala})`);
melde(krit.tempo > normal.tempo, `ein Krit steigt schneller (${krit.tempo} gegen ${normal.tempo})`);
melde(krit.text.endsWith("!") && !normal.text.endsWith("!"), "nur der Krit trägt ein Ausrufezeichen");
melde(krit.farbe !== normal.farbe, "ein Krit hat einen eigenen Ton");
melde(ziffernBreite(krit.text, krit.skala) > ziffernBreite(normal.text, normal.skala),
  "die Kritzahl ist auch in der Breite größer");

/* Eigener Schaden wird nie als Krit gemalt — er ist die einzige Zahl,
   die den Spieler selbst betrifft, und muss als solche lesbar sein. */
const eigen = zahlStil({ wert: -7, krit: true, art: "feuer" });
melde(eigen.krit === false && eigen.skala === 1, "eigener Schaden wird nie als Krit dargestellt");
melde(eigen.text === "-7", "eigener Schaden trägt sein Minus", eigen.text);

melde(artFarbe("gibtesnicht") === artFarbe(STANDARD_ART),
  "eine unbekannte Art fällt auf die Farbe der Standardart zurück");
melde(mische("#000000", "#ffffff", 0) === "#000000" && mische("#000000", "#ffffff", 1) === "#ffffff",
  "mische trifft an beiden Enden genau");

/* ── Die Angriffsleiste (#80) ────────────────────────────────────── */

/* Der Wert, den die Leiste anzeigt, ist eine reine Rechnung — deshalb
   hier wirklich ausgeführt statt im Browser angeschaut. */
const werte = { hast: 0 };
const waffe = (bereitIn, grund = 1) => ({ bereitIn, vorlage: { abklingzeit: grund } });

melde(bereitAnteil(waffe(0), werte) === 1, "eine schlagbereite Waffe zeigt eine volle Leiste");
melde(bereitAnteil(waffe(1), werte) === 0, "frisch zugeschlagen steht die Leiste auf null");
melde(Math.abs(bereitAnteil(waffe(0.5), werte) - 0.5) < 1e-9, "auf halber Strecke steht sie halb");
/* `bereitIn` läuft im Kern kurz ins Negative, bevor es auf 0 gesetzt
   wird — eine Leiste über 100 % wäre ein sichtbarer Ausreißer. */
melde(bereitAnteil(waffe(-0.4), werte) === 1, "eine negative Restzeit füllt die Leiste nicht über voll");
/* Hast verkürzt die Abklingzeit. Die Leiste muss denselben Nenner
   benutzen wie der Kern, sonst stünde sie bei hoher Hast dauerhaft
   falsch — genau die Sorte Fehler, die niemand meldet. */
const hastig = { hast: 100 };
melde(Math.abs(bereitAnteil(waffe(0.5, 1), hastig) - 0) < 1e-9,
  "mit 100 Hast ist die halbe Sekunde die ganze Abklingzeit — Leiste auf null",
  `${bereitAnteil(waffe(0.5, 1), hastig)}`);
melde(bereitAnteil({ bereitIn: 0.5, vorlage: { abklingzeit: 0 } }, werte) === 1,
  "eine Waffe ohne Abklingzeit gilt als bereit statt durch null zu teilen");

/* ── Die Frist im Krämer (#93) ───────────────────────────────────── */

melde(FRIST_SEKUNDEN > 0 && Number.isFinite(FRIST_SEKUNDEN),
  `die Frist im Krämer ist eine echte Zahl (${FRIST_SEKUNDEN} s)`);

/* Was als Regung zählt. Ein weggebrochener Platz sendet
   `ruhendeEingabe()` — x 0, y 0, kein Knopf. Genau das darf nicht als
   Regung gelten, sonst liefe die Frist nie ab. */
melde(istRegung({ x: 0, y: 0, knopf: false, xFlanke: 0, yFlanke: 0, knopfFlanke: false }) === false,
  "die ruhende Eingabe eines weggebrochenen Platzes gilt nicht als Regung");
melde(istRegung(undefined) === false, "ein fehlender Platz gilt nicht als Regung");
melde(istRegung({ x: 0, y: 0, knopf: true }) === true, "ein gehaltener Knopf ist eine Regung");
melde(istRegung({ x: 1, y: 0, knopf: false }) === true, "eine gehaltene Achse ist eine Regung");
melde(istRegung({ x: 0, y: 0, knopf: false, knopfFlanke: true }) === true, "ein Knopfdruck ist eine Regung");
melde(istRegung({ x: 0, y: 0, knopf: false, xFlanke: -1 }) === true, "ein Achsenausschlag ist eine Regung");
/* Zittern eines Analogsticks darf die Frist am Leben halten — das ist
   die sichere Richtung. Ein weggebrochener Platz sendet exakte
   Nullen, ihn hält das nicht am Leben. */
melde(istRegung({ x: 0.01, y: 0, knopf: false }) === false,
  "ein winziger Ausschlag unter der Totzone ist noch keine Regung");

const FRIST_TICKS = Math.round(FRIST_SEKUNDEN / SCHRITT);
melde(verstummt(FRIST_TICKS, 2) === true, `nach ${FRIST_SEKUNDEN} s Stille wird ein Platz übergangen`);
melde(verstummt(FRIST_TICKS - 1, 2) === false, "eine Zehntelsekunde vorher noch nicht");
melde(verstummt(0, 2) === false, "wer sich gerade gerührt hat, wird nicht übergangen");
/* Allein zu spielen heißt, dass niemand wartet. Eine Frist wäre dort
   eine Pause mit Ablaufdatum — man soll den Krämer in Ruhe lesen
   können. */
melde(verstummt(FRIST_TICKS * 10, 1) === false, "allein läuft keine Frist");

/* Das Menü bringt die Zähler mit, sonst stünde beim ersten Krämer
   `undefined` in der Rechnung. */
const menue = macheMenue();
melde(Array.isArray(menue.stille) && menue.stille.length >= 4,
  "das Menü bringt für jeden Platz einen Stillezähler mit");
melde(menue.stille.every((v) => v === 0), "die Stillezähler stehen am Anfang auf null");

/* Der sichtbare Zähler. Er erscheint früher als die Frist greift —
   sonst könnte niemand mehr eingreifen. */
const zweiSpieler = { spieler: [{ id: 0 }, { id: 1 }] };
const einSpieler = { spieler: [{ id: 0 }] };
const mitStille = (ticks) => ({ stille: [ticks, 0] });

melde(fristRest(zweiSpieler, mitStille(0), { id: 0 }) === null,
  "am Anfang zeigt der Krämer keinen Zähler");
melde(fristRest(einSpieler, mitStille(FRIST_TICKS), { id: 0 }) === null,
  "allein zeigt der Krämer nie einen Zähler");
const kurzVorSchluss = fristRest(zweiSpieler, mitStille(FRIST_TICKS - Math.round(5 / SCHRITT)), { id: 0 });
melde(kurzVorSchluss !== null && Math.abs(kurzVorSchluss - 5) < 0.05,
  "fünf Sekunden vor Ablauf zeigt der Zähler 5", `${kurzVorSchluss}`);
melde(fristRest(zweiSpieler, mitStille(FRIST_TICKS), { id: 0 }) === 0,
  "bei abgelaufener Frist steht der Zähler auf 0");
melde(fristRest(zweiSpieler, mitStille(FRIST_TICKS + 500), { id: 0 }) === 0,
  "danach wird er nicht negativ");

/* Anzeigen muss früher greifen als Übergehen — läge es umgekehrt oder
   gleichauf, wäre die Warnung nutzlos. */
const ersteAnzeige = Array.from({ length: FRIST_TICKS + 1 }, (_, t) => t)
  .find((t) => fristRest(zweiSpieler, mitStille(t), { id: 0 }) !== null);
melde(ersteAnzeige != null && ersteAnzeige < FRIST_TICKS,
  `der Zähler erscheint ${((FRIST_TICKS - ersteAnzeige) * SCHRITT).toFixed(0)} s bevor die Frist greift`,
  "der Zähler erscheint nicht vor dem Ablauf");

/* ── Der Staub: fünf Arten, fünf Bewegungen ────────────────────────

   ⚠️ **Bis zum 06.09.2026 flogen alle fünf gleich.** Derselbe Kranz,
   derselbe Radius, dieselbe Kurve — unterschieden nur durch Farbe und
   Menge, fünf bis zehn Körner in einem 9 x 9 großen Zeichen. Das ist
   dieselbe Falle, die diese Datei für die Trefferzeichen schon einmal
   gestellt hat: Jedes für sich tadellos, alle zusammen ununterscheidbar.

   Geprüft wird deshalb die **Bewegung**, nicht das Aussehen. Gezeichnet
   wird dafür auf ein Blatt Papier: ein Zeichenzusammenhang, der seine
   `fillRect`-Aufrufe nur aufschreibt. Was das Bild wirklich malt, sieht
   man damit als Punktwolke — und zwei Wolken lassen sich vergleichen,
   ein Eindruck nicht. */

function papier() {
  const punkte = [];
  return {
    punkte,
    set fillStyle(f) { this._f = f; },
    get fillStyle() { return this._f; },
    fillRect(x, y, b, h) { punkte.push({ x, y, b, h, farbe: this._f }); }
  };
}

function staubWolke(art, alter, { x = 100, y = 100, rx = 1, ry = 0 } = {}) {
  const leben = art === "tod" ? TOD_LEBEN : FUNKE_LEBEN;
  const c = papier();
  zeichneStaub(c, { funken: [{ x, y, zeit: leben * (1 - alter), art, rx, ry }] });
  return c.punkte.map((p) => ({ ...p, dx: p.x - x, dy: p.y - y }));
}

{
  /* 1 · Jede Art wirft überhaupt Staub, und zwar mehr als vorher.
     Die Menge ist das schwächste der Merkmale, aber ein Einschlag ohne
     Staub wäre gar keiner. */
  for (const art of [...ART_IDS, "tod"]) {
    const wolke = staubWolke(art, 0.5);
    melde(wolke.length >= 9, `${art}: der Einschlag wirft mindestens neun Körner`,
      `${wolke.length}`);
  }
}

{
  /* 2 · Schnitt ist ein **Strahl** in Schlagrichtung, kein Kranz.
     Ohne diese Prüfung wäre der alte Rundumkranz eine Zeile weit
     entfernt — und niemand sähe mehr, wohin die Klinge ging. */
  const wolke = staubWolke("schnitt", 0.8, { rx: 1, ry: 0 });
  const winkel = wolke.map((p) => Math.abs(Math.atan2(p.dy, p.dx)));
  melde(winkel.every((w) => w < 0.9), "Schnitt: der Staub bleibt im Strahl nach vorn",
    `weitester ${Math.round((Math.max(...winkel) * 180) / Math.PI)}° daneben`);

  /* Und der Strahl folgt der Richtung wirklich — dieselbe Wolke nach
     links gedreht muss nach links zeigen. */
  const links = staubWolke("schnitt", 0.8, { rx: -1, ry: 0 });
  melde(links.every((p) => p.dx <= 0), "Schnitt: nach links geschlagen spritzt es nach links",
    `${links.filter((p) => p.dx > 0).length} Körner nach rechts`);
}

{
  /* 3 · Wucht ist ein **Ring**: gleicher Abstand, gleichmäßig verteilt.
     Ein Ring mit zufälligen Winkeln wäre wieder ein Kranz. */
  const wolke = staubWolke("wucht", 0.7);
  const weiten = wolke.map((p) => Math.hypot(p.dx, p.dy / 0.8));
  const spanne = Math.max(...weiten) - Math.min(...weiten);
  melde(spanne <= 2, "Wucht: alle Körner liegen auf demselben Ring",
    `${spanne.toFixed(1)} Bildpunkte Unterschied`);

  const winkel = wolke.map((p) => Math.atan2(p.dy / 0.8, p.dx)).sort((a, b) => a - b);
  const luecken = winkel.slice(1).map((w, i) => w - winkel[i]);
  const soll = (Math.PI * 2) / wolke.length;
  melde(Math.max(...luecken) < soll * 2, "Wucht: der Ring hat keine Lücke",
    `größte Lücke ${((Math.max(...luecken) * 180) / Math.PI).toFixed(0)}°`);
}

{
  /* 4 · Feuer steigt, Frost fällt. Das ist der Kanal, den man auch im
     Dunkeln liest, wo Orange und Hellblau beide grau aussehen. */
  const glut = staubWolke("feuer", 0.9);
  const mitteGlut = glut.reduce((a, p) => a + p.dy, 0) / glut.length;
  melde(mitteGlut < -2, "Feuer: die Funken steigen", `Mitte bei ${mitteGlut.toFixed(1)}`);

  const eis = staubWolke("frost", 0.9);
  const mitteEis = eis.reduce((a, p) => a + p.dy, 0) / eis.length;
  melde(mitteEis > 2, "Frost: die Splitter fallen", `Mitte bei ${mitteEis.toFixed(1)}`);
  melde(eis.every((p) => p.h === 2), "Frost: ein Splitter ist zwei Bildpunkte hoch",
    `${eis.filter((p) => p.h !== 2).length} einzelne`);
}

{
  /* 5 · Fluch dreht sich beim Fliegen. Gemessen am Winkel desselben
     Korns zu zwei Zeitpunkten — dreht er sich nicht, ist es wieder ein
     gewöhnlicher Kranz. */
  const frueh = staubWolke("fluch", 0.35);
  const spaet = staubWolke("fluch", 0.95);
  const dreh = frueh.map((p, i) => {
    const a = Math.atan2(p.dy / 0.8, p.dx);
    const b = Math.atan2(spaet[i].dy / 0.8, spaet[i].dx);
    return Math.abs(((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  });
  const mittel = dreh.reduce((a, b) => a + b, 0) / dreh.length;
  melde(mittel > 0.5, "Fluch: die Punkte drehen sich, während sie fliegen",
    `im Mittel ${((Math.PI - mittel) * 180 / Math.PI).toFixed(0)}° Drehung`);
}

{
  /* 6 · Und keine zwei Arten sehen gleich aus. Das ist die Prüfung, um
     die es geht; die fünf darüber sagen nur, **warum** sie verschieden
     sind. */
  const wolken = new Map();
  for (const art of ART_IDS) {
    wolken.set(art, staubWolke(art, 0.7).map((p) => `${p.dx},${p.dy},${p.h}`).join("|"));
  }
  for (let i = 0; i < ART_IDS.length; i++) {
    for (let j = i + 1; j < ART_IDS.length; j++) {
      const a = ART_IDS[i], b = ART_IDS[j];
      melde(wolken.get(a) !== wolken.get(b),
        `${a} und ${b} stauben verschieden`);
    }
  }
}

{
  /* 7 · Zweimal dasselbe Bild.

     ⚠️ Der Zeichner darf nicht würfeln. Ein `Math.random` im Staub
     wäre nirgends rot, würde nichts kaputt machen — und nähme der
     Wiederholbarkeit den halben Wert: Zwei Rechner im Netz-Koop sähen
     verschiedene Nächte, und eine Aufnahme ließe sich nicht
     nachstellen. */
  const a = staubWolke("feuer", 0.6).map((p) => `${p.x},${p.y}`).join("|");
  const b = staubWolke("feuer", 0.6).map((p) => `${p.x},${p.y}`).join("|");
  melde(a === b, "derselbe Einschlag wirft zweimal denselben Staub");

  const anderswo = staubWolke("feuer", 0.6, { x: 137, y: 91 })
    .map((p) => `${p.x - 137},${p.y - 91}`).join("|");
  melde(anderswo !== a, "an einer anderen Stelle sieht er anders aus",
    "der Staub hängt nicht am Ort — dann wäre jeder Einschlag derselbe");
}

/* ── Der Schweif hinter den Klingen ────────────────────────────────── */

function schweifWolke(sw) {
  const c = papier();
  zeichneSchweif(c, {
    spieler: [{ x: 0, y: 0, zustand: "lebt", schwuenge: sw ? [sw] : [] }]
  });
  return c.punkte;
}

{
  const sw = {
    waffe: "sense", art: "schnitt", rx: 1, ry: 0,
    bogen: (200 * Math.PI) / 180, reichweite: 46,
    zeit: SCHWUNG_DAUER * 0.8, offen: 3
  };

  melde(schweifWolke(null).length === 0, "ohne Schwung gibt es keinen Schweif");
  melde(schweifWolke({ ...sw, zeit: -0.02 }).length === 0,
    "ein Nachschlag, der noch nicht dran ist, hat auch keinen Schweif");

  const punkte = schweifWolke(sw);
  melde(punkte.length > 0, "ein laufender Schwung zieht einen Schweif", `${punkte.length}`);

  /* Der Schweif liegt **hinter** der Klinge, also innerhalb der
     Reichweite. Ein Schweif, der weiter fliegt als die Waffe trifft,
     wäre wieder Bild ohne Wirkung — genau das, was der Umbau beseitigt
     hat. */
  const zuWeit = punkte.filter((p) => Math.hypot(p.x, p.y) > sw.reichweite + 4);
  melde(zuWeit.length === 0, "kein Schweifkorn liegt weiter draußen als die Waffe reicht",
    `${zuWeit.length} von ${punkte.length}`);

  /* Am Anfang des Schwungs gibt es noch nichts zu schleppen. */
  melde(schweifWolke({ ...sw, zeit: SCHWUNG_DAUER * 0.05 }).length
    < schweifWolke({ ...sw, zeit: SCHWUNG_DAUER * 0.9 }).length,
    "der Schweif wächst mit dem Schwung");

  /* Und er trägt die Farbe seiner Schadensart. */
  const feuer = schweifWolke({ ...sw, art: "feuer" }).map((p) => p.farbe);
  const frost = schweifWolke({ ...sw, art: "frost" }).map((p) => p.farbe);
  melde(feuer.join() !== frost.join(), "der Schweif trägt die Farbe der Schadensart");
}

ende();
