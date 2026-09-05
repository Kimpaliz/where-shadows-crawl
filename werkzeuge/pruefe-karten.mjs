/* [Aufgabe: Prüfwesen] Die Kartenhand: Katalog, Seltenheit, Meta-Regeln.

       node werkzeuge/pruefe-karten.mjs
       node werkzeuge/pruefe-karten.mjs --statistik   (die Tabellen dazu)

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   | Prüfung | was sonst passiert |
   | --- | --- |
   | jeder `wirkung.wert` steht in `WERTE_TABELLE` | ein Tippfehler im Wertnamen: die Karte gibt Punkte auf ein Feld, das niemand liest — **ohne Fehler, ohne Absturz** |
   | jeder `wirkung.regel` steht in `REGELN` | dasselbe für Meta-Karten: `regeln.weitsciht = true`, und niemand fragt je danach |
   | jede Karte mit `gebaut: false` nennt `wartetAuf` | eine Karte, die nichts tut, ohne dass irgendwo steht, warum |
   | keine wartende Karte wird angeboten | ein verschenkter Aufstieg — der Spieler merkt nie, wofür |
   | `kartenseltenheit` verschiebt die Ziehung messbar | der Wert steht im Werteobjekt und tut nichts; das war vor dieser Phase bei **neun** Werten so |
   | `kartenwert` skaliert die Zahlen | dasselbe |
   | `neigung_<gruppe>` verschiebt die Gruppen | dasselbe |
   | jede Meta-Regel wirkt | eine Regel, die gesetzt, aber nirgends gefragt wird |
   | jeder Titel lässt sich malen | ein Zeichen ohne Glyph wird still zu `?` |

   ⚠️ **Der Grund für die drei Ziehstatistiken:** Ein Wert, der „im
   Code vorkommt", wirkt damit noch lange nicht. `kartenseltenheit`
   könnte an einer Stelle addiert werden, die sich in der
   Verhältnisrechnung wieder herauskürzt — die Verteilung bliebe
   zeichengleich, und keine Zusicherung über den Quelltext würde das
   bemerken. Deshalb wird über 10.000 Ziehungen **gezählt**, nicht
   gelesen.

   Die Statistik ist zugleich das Werkzeug aus Vorgang #67: Mit
   `--statistik` druckt sie die vollen Tabellen, ohne sie nur die
   Zusicherungen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/katalog/karten.mjs` (der Katalog), `spiel/stufen.mjs` (zieht
   und wendet an), `spiel/werte.mjs` (die drei Kartenregler),
   `runtime/schrift.js` (kann sie gemalt werden). */

import { macheMelder, liesDatei } from "./helfer.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { macheWerte, WERT_NACH_ID, GRUPPEN_IDS, lebenMax } from "../spiel/werte.mjs";
import {
  KARTEN, SELTENHEITEN, SELTENHEIT_NACH_ID, REGELN, REGEL_IDS,
  ziehbareKarten, kartenGruppe, istMeta, seltenheitVon
} from "../spiel/katalog/karten.mjs";
import {
  ziehKarten, nimmKarte, mengeVon, hatRegel, regelnVon,
  KARTEN_JE_WAHL, META_SCHUB
} from "../spiel/stufen.mjs";
import { bekannteZeichen, VORSCHUB, ZEILE } from "../runtime/schrift.js";
import { BREITE, HOEHE } from "../runtime/zeichnen.js";
import { macheFlanken } from "../runtime/eingabe.js";
import { FARBEN, JAEGER_FARBEN } from "../runtime/palette.js";
import {
  felderFuer, schritteZu, brich, maleKlein, maleGross,
  KARTE_B, KARTE_H, GROSS_B, GROSS_H, SCHRITT_X, GRUND_Y, ZAHL_FARBE
} from "../runtime/karten-hand.js";

const { melde, ende } = macheMelder({ still: true });
const LAUT = process.argv.includes("--statistik");
const laut = (...t) => { if (LAUT) console.log(...t); };

/* Ein Spieler, wie ihn `ziehKarten` erwartet — ohne die halbe Welt.
   `macheSpieler()` aus `spiel/welt.mjs` bräuchte Waffen, Gitter und
   Arena; für eine Ziehstatistik ist das Ballast. */
function probeSpieler(zusatz = {}, regeln = {}) {
  const werte = macheWerte(zusatz);
  const s = { werte, leben: lebenMax(werte), lebenMax: lebenMax(werte),
    karten: null, offeneWahlen: 0, stufe: 1, wissen: 0 };
  Object.assign(regelnVon(s), regeln);
  return s;
}

/* ── 1 · Der Katalog in sich ─────────────────────────────────────── */

laut(`\n── Katalog ${"─".repeat(50)}\n`);

melde(KARTEN.length >= 20, `der Katalog hat ${KARTEN.length} Karten`);

{
  const ids = KARTEN.map((k) => k.id);
  melde(new Set(ids).size === ids.length, "keine Kartenkennung doppelt",
    `${ids.length - new Set(ids).size} doppelt`);

  const titel = KARTEN.map((k) => k.titel);
  melde(new Set(titel).size === titel.length, "kein Kartentitel doppelt",
    `${titel.length - new Set(titel).size} doppelt`);
}

{
  let ohneSeltenheit = 0, ohneText = 0, falscherWert = 0, falscheRegel = 0;
  let beides = 0, falscheGruppe = 0, ohneMenge = 0;
  for (const k of KARTEN) {
    if (!SELTENHEIT_NACH_ID.has(k.seltenheit)) { ohneSeltenheit++; console.log(`    Seltenheit unbekannt: ${k.id}`); }
    if (!k.text || !k.titel) ohneText++;
    if (k.wirkung.art === "wert") {
      if (!WERT_NACH_ID.has(k.wirkung.wert)) { falscherWert++; console.log(`    Wert unbekannt: ${k.id} → ${k.wirkung.wert}`); }
      if (!(k.wirkung.menge > 0)) ohneMenge++;
    } else if (k.wirkung.art === "regel") {
      if (!REGEL_IDS.has(k.wirkung.regel)) { falscheRegel++; console.log(`    Regel unbekannt: ${k.id} → ${k.wirkung.regel}`); }
    } else beides++;
    if (!GRUPPEN_IDS.includes(kartenGruppe(k))) { falscheGruppe++; console.log(`    Gruppe unbekannt: ${k.id} → ${kartenGruppe(k)}`); }
  }
  melde(ohneSeltenheit === 0, "jede Karte trägt eine bekannte Seltenheit", `${ohneSeltenheit}`);
  melde(ohneText === 0, "jede Karte hat Titel und Text", `${ohneText} ohne`);
  melde(falscherWert === 0, "jeder genannte Wert steht in WERTE_TABELLE", `${falscherWert} unbekannt`);
  melde(ohneMenge === 0, "jede Wertkarte gibt eine Grundmenge über null", `${ohneMenge} ohne`);
  melde(falscheRegel === 0, "jede genannte Regel steht in REGELN", `${falscheRegel} unbekannt`);
  melde(beides === 0, "jede Wirkung ist entweder Wert oder Regel", `${beides} andere`);
  melde(falscheGruppe === 0, "jede Karte fällt in eine bekannte Gruppe", `${falscheGruppe} unbekannt`);
}

/* Jede Seltenheit muss vorkommen — eine Stufe ohne Karte wäre eine
   Farbe im Katalog, die niemand je sieht. */
for (const s of SELTENHEITEN) {
  const n = ziehbareKarten().filter((k) => k.seltenheit === s.id).length;
  melde(n > 0, `Seltenheit „${s.name}" hat ziehbare Karten`, `${n}`);
}

/* Die Reihenfolge der Seltenheiten muss monoton sein — sonst wäre eine
   „seltenere" Karte häufiger oder schwächer als eine gewöhnliche, und
   die ganze Stufung eine Behauptung. */
for (let i = 1; i < SELTENHEITEN.length; i++) {
  const a = SELTENHEITEN[i - 1], b = SELTENHEITEN[i];
  melde(b.gewicht < a.gewicht, `„${b.name}" ist seltener als „${a.name}"`, `${b.gewicht} < ${a.gewicht}`);
  melde(b.wertFaktor > a.wertFaktor, `„${b.name}" gibt mehr als „${a.name}"`, `${b.wertFaktor} > ${a.wertFaktor}`);
  melde(b.seltenheitsSchub > a.seltenheitsSchub, `„${b.name}" hat den grösseren Schub`,
    `${b.seltenheitsSchub} > ${a.seltenheitsSchub}`);
}

/* ── 2 · Was wartet, wird nicht angeboten ────────────────────────── */

{
  const wartend = KARTEN.filter((k) => k.gebaut === false);
  melde(wartend.every((k) => typeof k.wartetAuf === "string" && k.wartetAuf.length > 20),
    "jede wartende Karte nennt Datei und Stelle, auf die sie wartet",
    `${wartend.length} wartend`);
  laut(`  ${wartend.length} Karten warten auf eine fremde Zeile:`);
  for (const k of wartend) laut(`    ${k.id.padEnd(16)} ${k.wartetAuf.split(",")[0]}`);

  const ziehbar = new Set(ziehbareKarten().map((k) => k.id));
  melde(wartend.every((k) => !ziehbar.has(k.id)),
    "keine wartende Karte steht im Vorrat");

  /* Der eigentliche Beweis: über viele echte Ziehungen darf keine
     wartende Karte auftauchen. Der Filter könnte an **einer** Stelle
     vergessen worden sein, und `ziehbareKarten()` sagt nichts darüber,
     wer es aufruft. */
  const zufall = macheZufall(4242);
  let gesehen = 0;
  for (let i = 0; i < 3000; i++) {
    for (const k of ziehKarten(zufall, probeSpieler())) if (!ziehbar.has(k.id)) gesehen++;
  }
  melde(gesehen === 0, "in 3.000 Ziehungen taucht keine wartende Karte auf", `${gesehen} mal`);
}

/* ── 3 · Jede Regel ist entweder gebaut oder wartet ──────────────── */

{
  const stufenText = liesDatei("spiel/stufen.mjs");
  let ungefragt = 0;
  for (const r of REGELN) {
    const karte = KARTEN.find((k) => k.wirkung.art === "regel" && k.wirkung.regel === r.id);
    if (!karte) { ungefragt++; console.log(`    Regel ohne Karte: ${r.id}`); continue; }
    const eigen = r.wo.startsWith("spiel/stufen.mjs");
    if (eigen) {
      /* Eine hier gebaute Regel muss in dieser Datei auch **gefragt**
         werden. Sonst wäre sie gesetzt und wirkungslos — und `gebaut`
         stünde fälschlich auf wahr. */
      const gefragt = new RegExp(`regeln\\.${r.id}\\b`).test(stufenText);
      if (!gefragt) { ungefragt++; console.log(`    Regel gesetzt, aber nie gefragt: ${r.id}`); }
      if (karte.gebaut === false) { ungefragt++; console.log(`    Regel gebaut, Karte wartet: ${r.id}`); }
    } else if (karte.gebaut !== false) {
      ungefragt++;
      console.log(`    Regel liegt in ${r.wo}, Karte gilt aber als gebaut: ${r.id}`);
    }
  }
  melde(ungefragt === 0, "jede Regel hat ihre Karte und wird an ihrer Stelle gefragt",
    `${ungefragt} Unstimmigkeit(en)`);

  melde(REGELN.filter((r) => r.wo.startsWith("spiel/stufen.mjs")).length >= 5,
    "mindestens fünf Meta-Regeln sind hier wirklich gebaut",
    `${REGELN.filter((r) => r.wo.startsWith("spiel/stufen.mjs")).length}`);

  const metaZiehbar = ziehbareKarten().filter(istMeta).length;
  melde(metaZiehbar >= 5, "mindestens fünf Meta-Karten sind ziehbar", `${metaZiehbar}`);
}

/* ── 4 · Die Ziehung selbst ──────────────────────────────────────── */

{
  const a = ziehKarten(macheZufall(99), probeSpieler());
  const b = ziehKarten(macheZufall(99), probeSpieler());
  melde(JSON.stringify(a) === JSON.stringify(b), "dieselbe Saat gibt dieselbe Hand");
  melde(JSON.stringify(ziehKarten(macheZufall(100), probeSpieler())) !== JSON.stringify(a),
    "eine andere Saat gibt eine andere Hand");

  melde(a.length === KARTEN_JE_WAHL, `eine Hand hat ${KARTEN_JE_WAHL} Karten`, `${a.length}`);

  /* Genau ein Griff in den Strom je Karte. Das ist keine Zierde: Beim
     alten Verwerfen hing jede spätere Ziehung im Lauf daran, wie oft
     zufällig ein Doppel kam. */
  const z = macheZufall(5);
  const vorher = z.zustand();
  ziehKarten(z, probeSpieler());
  const leer = macheZufall(5);
  for (let i = 0; i < KARTEN_JE_WAHL; i++) leer.zahl();
  melde(z.zustand() === leer.zustand(),
    `eine Hand kostet genau ${KARTEN_JE_WAHL} Griffe in den Zufallsstrom`,
    `${vorher === z.zustand() ? "gar keinen" : "abweichend"}`);

  /* Keine zwei Karten auf denselben Wert. */
  const zufall = macheZufall(1);
  let doppelt = 0;
  for (let i = 0; i < 4000; i++) {
    const h = ziehKarten(zufall, probeSpieler());
    const werte = h.filter((k) => k.wert).map((k) => k.wert);
    if (new Set(werte).size !== werte.length) doppelt++;
    if (new Set(h.map((k) => k.id)).size !== h.length) doppelt++;
  }
  melde(doppelt === 0, "in 4.000 Händen liegt kein Wert und keine Karte doppelt", `${doppelt}`);
}

/* ── 5 · Ziehstatistik: wirken die drei Werte? ───────────────────── */

const ZIEHUNGEN = 10000;

/* Eine Messreihe: `ZIEHUNGEN` Hände, gezählt nach Seltenheit, Gruppe
   und Meta-Anteil. Immer mit derselben Saat, damit der Unterschied
   zwischen zwei Reihen vom Wert kommt und nicht vom Würfel. */
function reihe({ werte = {}, regeln = {}, saat = 20260905 } = {}) {
  const zufall = macheZufall(saat);
  const seltenheit = Object.fromEntries(SELTENHEITEN.map((s) => [s.id, 0]));
  const gruppe = Object.fromEntries(GRUPPEN_IDS.map((g) => [g, 0]));
  let karten = 0, meta = 0, mengeSumme = 0, mengeZahl = 0, haende = 0;
  for (let i = 0; i < ZIEHUNGEN; i++) {
    const hand = ziehKarten(zufall, probeSpieler(werte, regeln));
    haende++;
    for (const k of hand) {
      karten++;
      seltenheit[k.seltenheit]++;
      gruppe[k.gruppe]++;
      if (k.meta) meta++;
      if (k.wert === "leben") { mengeSumme += k.menge; mengeZahl++; }
    }
  }
  const anteil = (n) => (100 * n) / karten;
  return {
    karten, haende, meta, seltenheit, gruppe,
    anteil, metaAnteil: anteil(meta),
    jeHand: karten / haende,
    lebenMenge: mengeZahl ? mengeSumme / mengeZahl : 0
  };
}

const grund = reihe();

laut(`\n── Ziehstatistik: ${ZIEHUNGEN.toLocaleString("de-DE")} Ziehungen je Reihe ${"─".repeat(18)}\n`);
laut(`  Grundreihe: ${grund.karten} Karten in ${grund.haende} Händen (${grund.jeHand.toFixed(2)} je Hand)\n`);

/* 5a · kartenseltenheit */
{
  const reihen = [0, 25, 50, 100].map((v) => [v, reihe({ werte: { kartenseltenheit: v } })]);
  laut("  kartenseltenheit  |  " + SELTENHEITEN.map((s) => s.name.padStart(9)).join(" | "));
  laut("  " + "-".repeat(18) + "|" + "-".repeat(11 * SELTENHEITEN.length));
  for (const [v, m] of reihen) {
    laut(`  ${String(v).padStart(16)}  |  `
      + SELTENHEITEN.map((s) => (m.anteil(m.seltenheit[s.id]).toFixed(1) + " %").padStart(9)).join(" | "));
  }

  const ohne = reihen[0][1], voll = reihen[reihen.length - 1][1];

  /* ⚠️ **Nicht** „jede Stufe wächst um denselben Faktor" — das war der
     erste Anlauf, und er war rot: „Selten" gewinnt nur ×1,25, weil ihm
     die beiden Stufen darüber Anteil wegnehmen. Der Entwurf verspricht
     aber etwas anderes und Schärferes, nämlich `seltenheitsSchub` **je
     Stufe verschieden**. Genau das wird hier geprüft: Jede Stufe
     gewinnt, und je seltener, desto mehr. Ein gemeinsamer Faktor
     bestünde die erste Zusicherung und fiele durch die zweite. */
  const zuwachs = SELTENHEITEN.map((s) =>
    voll.anteil(voll.seltenheit[s.id]) / ohne.anteil(ohne.seltenheit[s.id]));
  for (let i = 1; i < SELTENHEITEN.length; i++) {
    const s = SELTENHEITEN[i];
    melde(zuwachs[i] > 1.1, `kartenseltenheit 100 bringt mehr „${s.name}"`,
      `${ohne.anteil(ohne.seltenheit[s.id]).toFixed(1)} % → `
      + `${voll.anteil(voll.seltenheit[s.id]).toFixed(1)} % (×${zuwachs[i].toFixed(2)})`);
    melde(zuwachs[i] > zuwachs[i - 1],
      `und „${s.name}" gewinnt mehr als „${SELTENHEITEN[i - 1].name}"`,
      `×${zuwachs[i].toFixed(2)} gegen ×${zuwachs[i - 1].toFixed(2)}`);
  }
  melde(voll.anteil(voll.seltenheit.gemein) < ohne.anteil(ohne.seltenheit.gemein) * 0.8,
    "und deutlich weniger „Gemein“",
    `${ohne.anteil(ohne.seltenheit.gemein).toFixed(1)} % → ${voll.anteil(voll.seltenheit.gemein).toFixed(1)} %`);

  /* Monoton: jede Zwischenstufe muss auch dazwischen liegen. Ohne das
     bestünde die Zusicherung auch bei einem Sprung, der nur an den
     Enden stimmt. */
  const verflucht = reihen.map(([, m]) => m.anteil(m.seltenheit.verflucht));
  melde(verflucht.every((v, i) => i === 0 || v >= verflucht[i - 1]),
    "der Anteil „Verflucht“ wächst monoton mit dem Wert",
    verflucht.map((v) => v.toFixed(1)).join(" → "));
}

/* 5b · kartenwert */
{
  laut("\n  kartenwert        |  mittlere Menge einer Lebenskarte");
  const reihen = [-50, 0, 50, 100].map((v) => [v, reihe({ werte: { kartenwert: v } })]);
  for (const [v, m] of reihen) laut(`  ${String(v).padStart(16)}  |  ${m.lebenMenge.toFixed(2)}`);

  const [, minus] = reihen[0], [, null0] = reihen[1], [, plus100] = reihen[3];
  melde(plus100.lebenMenge > null0.lebenMenge * 1.8,
    "kartenwert +100 verdoppelt die Zahlen ungefähr",
    `${null0.lebenMenge.toFixed(2)} → ${plus100.lebenMenge.toFixed(2)}`);
  melde(minus.lebenMenge < null0.lebenMenge,
    "kartenwert −50 senkt sie",
    `${null0.lebenMenge.toFixed(2)} → ${minus.lebenMenge.toFixed(2)}`);

  /* Eine Karte darf nie nichts geben. */
  const winzig = probeSpieler({ kartenwert: -100000 });
  const kleinste = Math.min(...ziehbareKarten()
    .filter((k) => k.wirkung.art === "wert")
    .map((k) => mengeVon(k, winzig.werte)));
  melde(kleinste >= 1, "auch bei absurd kleinem kartenwert gibt jede Karte mindestens 1", `${kleinste}`);
}

/* 5c · neigung_<gruppe> */
{
  laut("\n  neigung_angriff   |  Anteil Gruppe „angriff“");
  const reihen = [0, 100, 300].map((v) => [v, reihe({ werte: { neigung_angriff: v } })]);
  for (const [v, m] of reihen) laut(`  ${String(v).padStart(16)}  |  ${m.anteil(m.gruppe.angriff).toFixed(1)} %`);

  const [, ohne] = reihen[0], [, viel] = reihen[2];
  melde(viel.anteil(viel.gruppe.angriff) > ohne.anteil(ohne.gruppe.angriff) * 1.5,
    "neigung_angriff verschiebt die Gruppe messbar",
    `${ohne.anteil(ohne.gruppe.angriff).toFixed(1)} % → ${viel.anteil(viel.gruppe.angriff).toFixed(1)} %`);

  /* Gegenprobe in die andere Richtung: Wer Angriff hebt, muss die
     übrigen Gruppen zusammen senken. Ohne sie bestünde die Zusicherung
     auch, wenn der Regler schlicht **alle** Anteile hübe. */
  melde(viel.anteil(viel.gruppe.wehr) < ohne.anteil(ohne.gruppe.wehr),
    "und senkt dabei die Gruppe „wehr“",
    `${ohne.anteil(ohne.gruppe.wehr).toFixed(1)} % → ${viel.anteil(viel.gruppe.wehr).toFixed(1)} %`);

  /* Jede Gruppe muss über Karten erreichbar sein — sonst hätte ihr
     Neigungsregler nichts zu verschieben. */
  const leer = GRUPPEN_IDS.filter((g) => grund.gruppe[g] === 0);
  melde(leer.length === 0, "jede Gruppe ist über Karten erreichbar",
    leer.length ? `ohne Karten: ${leer.join(", ")}` : "");
}

/* ── 6 · Die sechs gebauten Meta-Regeln wirken ───────────────────── */

laut(`\n── Meta-Regeln ${"─".repeat(46)}\n`);

/* weitsicht */
{
  const mit = ziehKarten(macheZufall(3), probeSpieler({}, { weitsicht: true }));
  melde(mit.length === KARTEN_JE_WAHL + 1, "weitsicht legt eine Karte mehr in die Hand",
    `${mit.length} statt ${KARTEN_JE_WAHL}`);
  laut(`  weitsicht:    ${KARTEN_JE_WAHL} → ${mit.length} Karten je Hand`);
}

/* ketzerei */
{
  const ohne = reihe();
  const mit = reihe({ regeln: { ketzerei: true } });
  melde(mit.metaAnteil > ohne.metaAnteil * 1.5,
    `ketzerei (×${META_SCHUB}) hebt den Meta-Anteil messbar`,
    `${ohne.metaAnteil.toFixed(1)} % → ${mit.metaAnteil.toFixed(1)} %`);
  laut(`  ketzerei:     Meta-Anteil ${ohne.metaAnteil.toFixed(1)} % → ${mit.metaAnteil.toFixed(1)} %`);
}

/* nachhall */
{
  const welt = { zufall: macheZufall(77), gegner: [] };
  const s = probeSpieler({}, { nachhall: true });
  s.offeneWahlen = 2;
  s.karten = ziehKarten(welt.zufall, s);
  const genommen = s.karten[1].id;
  nimmKarte(welt, s, 1);
  melde(s.karten.some((k) => k.id === genommen),
    "nachhall legt die genommene Karte wieder in die Hand", genommen);
  laut(`  nachhall:     „${genommen}" liegt wieder da`);

  /* Gegenprobe: ohne die Regel darf das nicht verlässlich gelten. */
  const welt2 = { zufall: macheZufall(77), gegner: [] };
  const s2 = probeSpieler();
  s2.offeneWahlen = 2;
  s2.karten = ziehKarten(welt2.zufall, s2);
  const g2 = s2.karten[1].id;
  nimmKarte(welt2, s2, 1);
  melde(!s2.karten.some((k) => k.id === g2),
    "ohne nachhall kommt sie nicht wieder", g2);
}

/* gedaechtnis */
{
  const welt = { zufall: macheZufall(88), gegner: [] };
  const s = probeSpieler({}, { gedaechtnis: true });
  s.offeneWahlen = 2;
  s.karten = ziehKarten(welt.zufall, s);
  const liegengelassen = s.karten.filter((_, i) => i !== 0).map((k) => k.id);
  nimmKarte(welt, s, 0);
  melde(s.karten.every((k) => !liegengelassen.includes(k.id)),
    "gedaechtnis bietet Abgelehntes nicht noch einmal an",
    liegengelassen.join(", "));
  melde(Array.isArray(s.abgelehnt) && s.abgelehnt.length === liegengelassen.length,
    "und merkt sich genau die abgelehnten", `${s.abgelehnt?.length}`);
  laut(`  gedaechtnis:  ${liegengelassen.length} Karten gemieden`);

  /* Es darf den Vorrat nie leerräumen. */
  const hungrig = probeSpieler({}, { gedaechtnis: true });
  hungrig.abgelehnt = KARTEN.map((k) => k.id);
  const hand = ziehKarten(macheZufall(9), hungrig);
  melde(hand.length === KARTEN_JE_WAHL,
    "ein volles Gedächtnis gibt trotzdem eine volle Hand", `${hand.length}`);
}

/* aderlass */
{
  const welt = { zufall: macheZufall(55), gegner: [] };
  const s = probeSpieler({}, { aderlass: true });
  s.leben = 3;
  s.offeneWahlen = 1;
  s.karten = ziehKarten(welt.zufall, s);
  nimmKarte(welt, s, 0);
  melde(s.leben === s.lebenMax, "aderlass macht beim Aufstieg wieder ganz",
    `${s.leben} von ${s.lebenMax}`);
  laut(`  aderlass:     3 → ${s.leben} von ${s.lebenMax}`);

  const t = probeSpieler();
  t.leben = 3; t.offeneWahlen = 1;
  const welt2 = { zufall: macheZufall(55), gegner: [] };
  t.karten = ziehKarten(welt2.zufall, t);
  nimmKarte(welt2, t, 0);
  melde(t.leben < t.lebenMax, "ohne aderlass heilt der Aufstieg nicht voll",
    `${t.leben} von ${t.lebenMax}`);
}

/* blutzoll */
{
  const gegner = [
    { leben: 100, tot: false }, { leben: 1, tot: false }, { leben: 40, tot: true }
  ];
  const welt = { zufall: macheZufall(66), gegner };
  const s = probeSpieler({}, { blutzoll: true });
  s.offeneWahlen = 1;
  s.karten = ziehKarten(welt.zufall, s);
  nimmKarte(welt, s, 0);
  melde(gegner[0].leben === 80, "blutzoll nimmt ein Fünftel", `${gegner[0].leben}`);
  melde(gegner[1].leben >= 1, "und tötet dabei niemanden", `${gegner[1].leben}`);
  melde(gegner[2].leben === 40, "und rührt Tote nicht an", `${gegner[2].leben}`);
  laut(`  blutzoll:     100 → ${gegner[0].leben}, der mit 1 bleibt bei ${gegner[1].leben}`);
}

/* hatRegel */
{
  const s = probeSpieler({}, { weitsicht: true });
  melde(hatRegel(s, "weitsicht") === true, "hatRegel findet eine gesetzte Regel");
  melde(hatRegel(s, "ketzerei") === false, "und meldet eine ungesetzte als falsch");
  melde(hatRegel({}, "weitsicht") === false, "und stürzt ohne regeln-Feld nicht ab");
  melde(hatRegel(undefined, "weitsicht") === false, "und auch ohne Spieler nicht");
}

/* Eine Meta-Karte darf keine Zahl geben — das ist ihre Definition. */
{
  const s = probeSpieler();
  const vorher = JSON.stringify(s.werte);
  const metaVorlage = ziehbareKarten().find(istMeta);
  const welt = { zufall: macheZufall(2), gegner: [] };
  s.offeneWahlen = 1;
  s.karten = [{
    id: metaVorlage.id, titel: metaVorlage.titel, text: metaVorlage.text,
    seltenheit: metaVorlage.seltenheit, meta: true, wert: null, menge: 0,
    regel: metaVorlage.wirkung.regel, zeilen: []
  }];
  nimmKarte(welt, s, 0);
  melde(JSON.stringify(s.werte) === vorher, "eine Meta-Karte ändert keinen einzigen Wert");
  melde(hatRegel(s, metaVorlage.wirkung.regel), "sondern setzt ihre Regel");
}

/* ── 7 · Was auf der Karte steht ─────────────────────────────────── */

{
  let ohneZeile = 0, ohneZahl = 0;
  const zufall = macheZufall(31);
  for (let i = 0; i < 500; i++) {
    for (const k of ziehKarten(zufall, probeSpieler())) {
      if (!Array.isArray(k.zeilen) || k.zeilen.length === 0) { ohneZeile++; continue; }
      for (const z of k.zeilen) if (!z.zahl || !z.text) ohneZahl++;
    }
  }
  melde(ohneZeile === 0, "jede gezogene Karte trägt mindestens eine Werte-Zeile", `${ohneZeile}`);
  melde(ohneZahl === 0, "und jede Zeile eine Zahl und einen Text", `${ohneZahl}`);

  /* Die Zahl auf der Karte muss die Zahl sein, die man bekommt.
     Sonst stünde „+10" da und es kämen 17 — der Fehler, den niemand
     bemerkt, weil beides für sich plausibel aussieht. */
  const s = probeSpieler({ kartenwert: 60 });
  let daneben = 0;
  for (const k of ziehKarten(macheZufall(12), s)) {
    if (!k.wert) continue;
    if (!k.zeilen[0].zahl.includes(String(k.menge))) daneben++;
  }
  melde(daneben === 0, "die Zahl auf der Karte ist die Zahl, die sie gibt", `${daneben} daneben`);
}

/* Malbar? Dieselbe Nachschlagereihenfolge wie `zeichneText`. */
{
  const { glyphen, umlaute } = bekannteZeichen();
  const kannMalen = (z) => {
    if (z === " " || glyphen[z] !== undefined) return true;
    const gross = z.toUpperCase();
    return glyphen[gross] !== undefined || umlaute[z] !== undefined || umlaute[gross] !== undefined;
  };
  const fehlend = new Set();
  const pruefe = (t) => { for (const z of String(t ?? "")) if (!kannMalen(z)) fehlend.add(z); };
  for (const k of KARTEN) {
    pruefe(k.titel); pruefe(k.text);
    for (const z of k.zeilen ?? []) { pruefe(z.zahl); pruefe(z.text); }
  }
  for (const s of SELTENHEITEN) pruefe(s.name);
  /* Auch die erzeugten Zeilen — sie entstehen aus den Wertnamen. */
  const zufall = macheZufall(17);
  for (let i = 0; i < 400; i++) {
    for (const k of ziehKarten(zufall, probeSpieler())) {
      pruefe(k.titel); pruefe(k.text);
      for (const z of k.zeilen) { pruefe(z.zahl); pruefe(z.text); }
    }
  }
  melde(fehlend.size === 0, "jeder Kartentext lässt sich mit der Bildpunktschrift malen",
    fehlend.size ? `fehlt: ${[...fehlend].join(" ")}` : "");

  /* „ß".toUpperCase() ist „SS" — zwei Zeichen. Ein Titel mit ß wäre
     im Zeichner ein Sonderfall, den die Anzeige nicht kennt. */
  const mitEszett = KARTEN.filter((k) => k.titel.includes("ß"));
  melde(mitEszett.length === 0, "kein Kartentitel enthält ein ß",
    mitEszett.map((k) => k.id).join(", "));
}

/* Die Seltenheitsfarben müssen echte Farben der Palette sein — eine
   erfundene Farbe fiele nur im Bild auf, und dort erst spät. */
{
  const palette = liesDatei("runtime/palette.js");
  const fremd = SELTENHEITEN.filter((s) => !palette.includes(s.farbe));
  melde(fremd.length === 0, "jede Seltenheitsfarbe steht in runtime/palette.js",
    fremd.map((s) => `${s.id} ${s.farbe}`).join(", "));
}

/* ── 8 · Der Kartenkatalog ist Teil des Regelkerns ───────────────── */

{
  const text = liesDatei("spiel/katalog/karten.mjs").replace(/\/\*[\s\S]*?\*\//g, "");
  melde(!/Math\.random/.test(text), "der Kartenkatalog ohne Math.random");
  melde(!/\b(document|window|navigator)\b/.test(text), "der Kartenkatalog ohne Browser");
}

/* ── 9 · Die Kartenhand ──────────────────────────────────────────── */

/* Diese Prüfungen sind die Antwort auf Fehlerbuch E8: Der Zeichenpass
   für die Wesen war gebaut, geprüft und gemergt — und **niemand setzte
   ein Wesen in die Welt**. Deshalb wird hier nicht die Zeichenfunktion
   allein geprüft, sondern der ganze Weg: Klick → Eingabe → `bedieneWahl`
   → Zeiger → `nimmKarte`.

   ⚠️ Was sie **nicht** kann: sagen, ob es gut aussieht. Ein Browser
   fehlt hier, und mit ihm alles, was E5 meint. Das steht in
   `docs/rueckmeldung/kartenhand.md`. */

laut(`\n── Kartenhand ${"─".repeat(45)}\n`);

/* Ein Zeichner, der nichts malt, sondern mitschreibt. Damit lässt sich
   messen, **wo** etwas landet — und nicht nur, dass es nicht abstürzt. */
function macheAufnahme() {
  return {
    fillStyle: "#000000",
    rechtecke: [],
    fillRect(x, y, b, h) { this.rechtecke.push({ x, y, b, h, farbe: this.fillStyle }); }
  };
}

/* 9a · Wo die Karten liegen */
{
  for (const n of [3, 4]) {
    for (let gewaehlt = 0; gewaehlt < n; gewaehlt++) {
      const felder = felderFuer(n, gewaehlt);
      melde(felder.length === n, `${n} Karten geben ${n} Felder`, `${felder.length}`);

      const raus = felder.filter((f) =>
        f.x < 0 || f.y < 0 || f.x + f.b > BREITE || f.y + f.h > HOEHE);
      melde(raus.length === 0,
        `${n} Karten, ${gewaehlt} gewählt: keine ragt aus dem Bild`,
        raus.map((f) => `#${f.i} ${f.x},${f.y}`).join(" "));

      const gross = felder.filter((f) => f.gross);
      melde(gross.length === 1 && gross[0].i === gewaehlt,
        `${n} Karten: genau die gewählte ist gross`, `${gross.length}`);
      melde(gross[0].b > KARTE_B && gross[0].h > KARTE_H,
        "und wirklich grösser als die anderen",
        `${gross[0].b}x${gross[0].h} gegen ${KARTE_B}x${KARTE_H}`);
    }
  }

  /* Am **unteren** Rand — das ist Janniks Wortlaut, nicht Geschmack. */
  const felder = felderFuer(3, 1);
  const tiefste = Math.max(...felder.map((f) => f.y + f.h));
  melde(HOEHE - tiefste <= 8, "die Hand liegt am unteren Bildrand",
    `${HOEHE - tiefste} Bildpunkte Luft`);

  /* Wie in einer Hand gehalten: die Karten überlappen. */
  melde(SCHRITT_X < KARTE_B, "die Karten überlappen einander",
    `${KARTE_B - SCHRITT_X} Bildpunkte`);

  /* Der Bogen: die mittlere Karte steht höher als die äusseren. Ohne
     ihn wäre es eine Reihe und keine Hand — und genau das sähe man,
     ohne dass eine Prüfung anschlüge. */
  const flach = felderFuer(3, 99);
  melde(flach[1].y < flach[0].y && flach[1].y < flach[2].y,
    "die mittlere Karte steht im Bogen höher",
    `${flach[0].y} · ${flach[1].y} · ${flach[2].y}`);
}

/* 9b · Was man anklickt, ist auch das, was man sieht */
{
  const felder = felderFuer(3, 1);
  const reihenfolge = [...felder.filter((f) => !f.gross), ...felder.filter((f) => f.gross)];
  const treffer = (x, y) => {
    for (let i = reihenfolge.length - 1; i >= 0; i--) {
      const f = reihenfolge[i];
      if (x >= f.x && x < f.x + f.b && y >= f.y && y < f.y + f.h) return f.i;
    }
    return null;
  };

  let daneben = 0;
  for (const f of reihenfolge) {
    /* Die Mitte jeder Karte muss ihre eigene Karte treffen — ausser bei
       den kleinen, die unter der grossen liegen können. */
    const mx = Math.floor(f.x + f.b / 2), my = Math.floor(f.y + f.h / 2);
    const t = treffer(mx, my);
    if (t === null) daneben++;
  }
  melde(daneben === 0, "jede Kartenmitte trifft überhaupt eine Karte", `${daneben}`);

  /* Die gewählte Karte liegt oben — in der Überlappung gewinnt sie.
     Ohne diese Zusicherung klickte man auf das, was man sieht, und
     träfe, was darunter liegt. */
  const gross = felder.find((f) => f.gross);
  const eck = treffer(gross.x + 2, gross.y + 2);
  melde(eck === gross.i, "in der Überlappung gewinnt die hervorgehobene Karte",
    `getroffen: ${eck}, erwartet: ${gross.i}`);

  /* Gegenprobe: Ein Punkt weit über der Hand trifft nichts. Sonst
     schluckte die Hand jeden Tipp im Bild — auch den auf den
     Ausweich-Knopf. */
  melde(treffer(BREITE / 2, 30) === null, "über der Hand trifft man nichts");
  melde(treffer(2, HOEHE - 2) === null, "und in der linken unteren Ecke auch nicht");
}

/* 9c · Der kürzeste Weg im Ring */
{
  let falsch = 0;
  for (const n of [3, 4]) {
    for (let von = 0; von < n; von++) {
      for (let nach = 0; nach < n; nach++) {
        const { richtung, anzahl } = schritteZu(nach, von, n);
        /* Nachgerechnet mit derselben Formel, die `bedieneWahl` benutzt. */
        let z = von;
        for (let s = 0; s < anzahl; s++) z = (z + richtung + n) % n;
        if (z !== nach) { falsch++; console.log(`    ${von} → ${nach} (n=${n}) landet auf ${z}`); }
        if (anzahl > Math.floor(n / 2)) { falsch++; console.log(`    ${von} → ${nach}: ${anzahl} Schritte, das geht kürzer`); }
      }
    }
  }
  melde(falsch === 0, "der Klickweg ist immer der kürzeste im Ring", `${falsch} daneben`);
}

/* 9d · Passt der Text auf die Karte? */
{
  const proKlein = Math.floor((KARTE_B - 8 + 1) / VORSCHUB);
  const proGross = Math.floor((GROSS_B - 8 + 1) / VORSCHUB);

  /* Ein Wort lässt sich nicht umbrechen. Das längste Titelwort muss
     also in **eine** Zeile der kleinen Karte passen — sonst wird es
     stumm gekürzt, und aus „LEICHENFLEDDERER" wird „LEICHENFLEDDERE.". */
  const woerter = KARTEN.flatMap((k) => k.titel.split(" "));
  const laengstes = woerter.reduce((a, b) => (b.length > a.length ? b : a), "");
  melde(laengstes.length <= proKlein,
    "das längste Titelwort passt in eine Zeile der kleinen Karte",
    `„${laengstes}" ${laengstes.length} von ${proKlein}`);

  /* Und jeder Titel in höchstens zwei Zeilen, ohne Kürzungspunkt. */
  const gekuerzt = KARTEN.filter((k) => brich(k.titel, KARTE_B - 8, 2).join(" ") !== k.titel);
  melde(gekuerzt.length === 0, "jeder Titel passt in zwei Zeilen der kleinen Karte",
    gekuerzt.map((k) => k.titel).join(", "));

  /* Die Wertzeile ist der Kern der Karte — sie muss auf der grossen
     Karte in **eine** Zeile passen, sonst ist „besser lesen können"
     eine Behauptung. Geprüft an allen wirklich erzeugten Zeilen. */
  const zufall = macheZufall(4711);
  let zuLang = 0, laengste = "";
  const gesehen = new Set();
  for (let i = 0; i < 3000; i++) {
    for (const k of ziehKarten(zufall, probeSpieler())) {
      gesehen.add(k.id);
      for (const z of k.zeilen) {
        const ganz = `${z.zahl} ${z.text}`;
        if (ganz.length > proGross) { zuLang++; if (ganz.length > laengste.length) laengste = ganz; }
      }
    }
  }
  melde(zuLang === 0, "jede Wertzeile passt in eine Zeile der grossen Karte",
    zuLang ? `${zuLang} mal, am längsten „${laengste}"` : `bis ${proGross} Zeichen`);

  /* Und: in 3.000 Händen ist wirklich **jede** ziehbare Karte einmal
     dabei gewesen. Ohne diese Zusicherung prüften die Zeilen oben nur
     die Karten, die der Würfel zufällig mochte. */
  const fehlend = ziehbareKarten().filter((k) => !gesehen.has(k.id));
  melde(fehlend.length === 0, "in 3.000 Händen kam jede ziehbare Karte mindestens einmal",
    fehlend.map((k) => k.id).join(", "));
  laut(`  ${gesehen.size} verschiedene Karten in 3.000 Händen gesehen`);
}

/* 9e · Nichts läuft aus der Karte heraus */
{
  const zufall = macheZufall(1234);
  const jaeger = JAEGER_FARBEN[0];
  let rausKlein = 0, rausGross = 0, gemalt = 0;
  const gesehen = new Set();

  for (let i = 0; i < 2000 && gesehen.size < ziehbareKarten().length; i++) {
    for (const k of ziehKarten(zufall, probeSpieler({ kartenwert: i % 3 === 0 ? 100 : 0 }))) {
      if (gesehen.has(k.id)) continue;
      gesehen.add(k.id);
      gemalt++;

      const a = macheAufnahme();
      maleKlein(a, k, 10, 20);
      for (const r of a.rechtecke) {
        if (r.x < 10 || r.y < 20 || r.x + r.b > 10 + KARTE_B || r.y + r.h > 20 + KARTE_H) {
          rausKlein++;
          if (rausKlein === 1) console.log(`    ragt aus der kleinen Karte: ${k.id} bei ${r.x},${r.y}`);
          break;
        }
      }

      const b = macheAufnahme();
      maleGross(b, k, 10, 20, jaeger);
      for (const r of b.rechtecke) {
        if (r.x < 10 || r.y < 20 || r.x + r.b > 10 + GROSS_B || r.y + r.h > 20 + GROSS_H) {
          rausGross++;
          if (rausGross === 1) console.log(`    ragt aus der grossen Karte: ${k.id} bei ${r.x},${r.y}`);
          break;
        }
      }
    }
  }
  melde(gemalt >= 20, "es wurden genug verschiedene Karten gemalt", `${gemalt}`);
  melde(rausKlein === 0, "keine kleine Karte malt über ihren Rand hinaus", `${rausKlein}`);
  melde(rausGross === 0, "keine grosse Karte malt über ihren Rand hinaus", `${rausGross}`);
}

/* 9f · Die Zahlen sind grün, der Rest nicht */
{
  const karte = ziehKarten(macheZufall(21), probeSpieler()).find((k) => k.wert);
  const a = macheAufnahme();
  maleKlein(a, karte, 0, 0);
  const gruen = a.rechtecke.filter((r) => r.farbe === ZAHL_FARBE);
  melde(gruen.length > 0, "die Zahl wird grün gemalt",
    `${gruen.length} Bildpunkte in ${ZAHL_FARBE}`);

  /* Der Titel darf **nicht** grün sein — sonst wäre „hervorgehoben"
     kein Unterschied mehr. Der Titel steht in den obersten zwei Zeilen. */
  const imTitel = gruen.filter((r) => r.y < 9 + ZEILE * 2);
  melde(imTitel.length === 0, "und nur die Zahl, nicht der Titel", `${imTitel.length}`);

  /* Gegenprobe: Der Zeilentext daneben ist matt. Ohne sie bestünde die
     Zusicherung auch, wenn die ganze Karte grün wäre. */
  const matt = a.rechtecke.filter((r) => r.farbe === FARBEN.schriftMatt);
  melde(matt.length > 0, "der Name des Werts daneben ist matt", `${matt.length} Bildpunkte`);

  melde(ZAHL_FARBE === FARBEN.seucheHell, "das Grün kommt aus der Palette", ZAHL_FARBE);

  /* Auch eine Meta-Karte trägt eine grüne Zahl — ihre Zeilen kommen aus
     dem Katalog und nicht aus einer Wertrechnung. */
  const meta = ziehbareKarten().find(istMeta);
  const b = macheAufnahme();
  maleGross(b, {
    titel: meta.titel, text: meta.text, zeilen: meta.zeilen,
    seltenheitName: seltenheitVon(meta).name, farbe: seltenheitVon(meta).farbe
  }, 0, 0, JAEGER_FARBEN[0]);
  melde(b.rechtecke.some((r) => r.farbe === ZAHL_FARBE),
    "auch eine Meta-Karte trägt eine grüne Zahl", meta.id);
}

/* 9g · Der ganze Weg: Klick → Eingabe → Zeiger → Karte

   Das ist die eigentliche Prüfung. Sie stellt dieselbe Kette wie
   `runtime/start.js`: Die Hand übersetzt einen Tipp in Achsenausschläge,
   `macheFlanken()` macht daraus Flanken — **dieselbe** Funktion, die
   auch die Eingaben aus dem Netz umformt —, und `bedieneWahl()` bewegt
   den Zeiger. Wäre die Übersetzung falsch, träfe der Klick eine andere
   Karte, ohne dass irgendwo etwas bricht. */
{
  const horcher = [];
  const altesAdd = globalThis.addEventListener;
  globalThis.addEventListener = (art, fn) => horcher.push({ art, fn });

  const { macheKartenhand } = await import("../runtime/karten-hand.js");
  const { macheMenue, bedieneWahl } = await import("../runtime/oberflaeche.js");

  /* Eine Leinwand, die nur ihre Masse kennt — mehr braucht die
     Umrechnung von Bildschirm auf Bild nicht. */
  const leinwand = { getBoundingClientRect: () => ({ left: 0, top: 0, width: BREITE, height: HOEHE }) };
  const hand = macheKartenhand(leinwand);
  globalThis.addEventListener = altesAdd;

  melde(horcher.length === 1 && horcher[0].art === "pointerdown",
    "die Hand horcht auf genau einen Zeiger", horcher.map((h) => h.art).join(","));

  const zeigerDown = horcher[0].fn;
  let angehalten = 0;
  const tippe = (x, y) => {
    angehalten = 0;
    zeigerDown({
      clientX: x, clientY: y, pointerType: "touch", button: 0,
      stopPropagation() { angehalten++; }, preventDefault() {}
    });
  };

  /* Eine Welt, so klein wie möglich — `bedieneWahl` braucht Spieler,
     Karten und den Zeiger, sonst nichts. */
  function probeWelt(regeln = {}) {
    const s = probeSpieler({}, regeln);
    s.id = 0;
    s.offeneWahlen = 1;
    const welt = { phase: "wahl", zufall: macheZufall(2026), gegner: [], spieler: [s] };
    s.karten = ziehKarten(welt.zufall, s);
    return welt;
  }

  /* Ein Bild wie in `start.js`: mischen, Flanken bilden, bedienen,
     quittieren. Der Rückgabewert ist der Zeiger danach. */
  function bild(welt, menue, hand, flanken, rohe = { x: 0, y: 0, ausweichen: false }) {
    const eigene = hand.mische(rohe, welt);
    const eingaben = flanken([eigene]);
    if (welt.phase === "wahl") {
      bedieneWahl(welt, menue, eingaben);
      hand.quittiere();
    }
    return menue.wahlZeiger[0];
  }

  {
    const welt = probeWelt();
    const menue = macheMenue();
    menue.sperre = 0;
    const flanken = macheFlanken();
    hand.zeichne(macheAufnahme(), welt, menue, 0);

    const felder = felderFuer(welt.spieler[0].karten.length, 0);
    const ziel = felder[2];
    tippe(ziel.x + ziel.b / 2, ziel.y + ziel.h / 2);
    melde(angehalten === 1, "ein Tipp auf eine Karte wird abgefangen (sonst frisst ihn der Stick)");

    let bilder = 0;
    while (menue.wahlZeiger[0] !== 2 && bilder++ < 40) bild(welt, menue, hand, flanken);
    melde(menue.wahlZeiger[0] === 2,
      "ein Tipp auf die dritte Karte hebt die dritte Karte hervor",
      `Zeiger ${menue.wahlZeiger[0]} nach ${bilder} Bildern`);
    laut(`  Tipp auf Karte 3: nach ${bilder} Bildern hervorgehoben`);

    /* Der zweite Tipp nimmt sie. Vorher ist die Kette leer — das ist
       die Bedingung, unter der die Hand einen Tipp als „nehmen" liest. */
    const genommen = welt.spieler[0].karten[2];
    const wert = genommen.wert;
    const vorher = wert ? welt.spieler[0].werte[wert] : null;
    tippe(ziel.x + ziel.b / 2, ziel.y + ziel.h / 2);
    bilder = 0;
    while (welt.spieler[0].offeneWahlen > 0 && bilder++ < 40) bild(welt, menue, hand, flanken);
    melde(welt.spieler[0].offeneWahlen === 0,
      "ein zweiter Tipp auf dieselbe Karte nimmt sie", `nach ${bilder} Bildern`);
    if (wert) {
      melde(welt.spieler[0].werte[wert] === vorher + genommen.menge,
        "und der Wert der Karte kommt wirklich an",
        `${vorher} → ${welt.spieler[0].werte[wert]} (+${genommen.menge})`);
    } else {
      melde(hatRegel(welt.spieler[0], genommen.regel), "und ihre Regel wird gesetzt", genommen.regel);
    }
  }

  /* Gegenprobe 1: Ohne Tipp bewegt sich nichts. Sonst bestünde die
     Prüfung oben auch, wenn der Zeiger von allein wanderte. */
  {
    const welt = probeWelt();
    const menue = macheMenue();
    menue.sperre = 0;
    const flanken = macheFlanken();
    hand.zeichne(macheAufnahme(), welt, menue, 0);
    for (let i = 0; i < 40; i++) bild(welt, menue, hand, flanken);
    melde(menue.wahlZeiger[0] === 0 && welt.spieler[0].offeneWahlen === 1,
      "ohne Tipp bleibt der Zeiger stehen und nichts wird genommen",
      `Zeiger ${menue.wahlZeiger[0]}, offen ${welt.spieler[0].offeneWahlen}`);
  }

  /* Gegenprobe 2: Ein Tipp neben die Karten wird nicht abgefangen —
     sonst käme der Ausweich-Knopf auf dem Telefon nie mehr durch. */
  {
    const welt = probeWelt();
    const menue = macheMenue();
    const flanken = macheFlanken();
    hand.zeichne(macheAufnahme(), welt, menue, 0);
    tippe(BREITE / 2, 30);
    melde(angehalten === 0, "ein Tipp neben die Karten läuft weiter zum Stick");
  }

  /* Gegenprobe 3 — die eigentliche Falle: Die Kette darf **nur**
     vorrücken, wenn ein Weltschritt sie wirklich benutzt hat. Auf einem
     144-Hz-Bildschirm rechnet die Welt nicht bei jedem Bild; ein
     Eingabebild ohne Weltschritt wäre sonst verloren, und der Zeiger
     bliebe auf halbem Weg stehen. */
  {
    const welt = probeWelt();
    const menue = macheMenue();
    menue.sperre = 0;
    const flanken = macheFlanken();
    hand.zeichne(macheAufnahme(), welt, menue, 0);
    const felder = felderFuer(welt.spieler[0].karten.length, 0);
    const ziel = felder[2];
    tippe(ziel.x + ziel.b / 2, ziel.y + ziel.h / 2);

    /* Zwanzig Bilder ohne einen einzigen Weltschritt. */
    const vorher = hand.kette().length;
    for (let i = 0; i < 20; i++) hand.mische({ x: 0, y: 0, ausweichen: false }, welt);
    melde(hand.kette().length === vorher,
      "ohne Weltschritt rückt die Klickkette nicht vor",
      `${vorher} → ${hand.kette().length}`);

    let bilder = 0;
    while (menue.wahlZeiger[0] !== 2 && bilder++ < 40) bild(welt, menue, hand, flanken);
    melde(menue.wahlZeiger[0] === 2, "und danach kommt sie trotzdem an", `Zeiger ${menue.wahlZeiger[0]}`);
  }

  /* Gegenprobe 4: Verlässt die Welt die Kartenwahl, wird die Kette
     geräumt. Eine Bewegung, die in der nächsten Welle ankäme, wäre ein
     Ruck ohne Ursache. */
  {
    const welt = probeWelt();
    const menue = macheMenue();
    const flanken = macheFlanken();
    hand.zeichne(macheAufnahme(), welt, menue, 0);
    const felder = felderFuer(welt.spieler[0].karten.length, 0);
    tippe(felder[2].x + 4, felder[2].y + 4);
    melde(hand.kette().length > 0, "nach einem Tipp wartet etwas in der Kette",
      `${hand.kette().length}`);
    welt.phase = "welle";
    const raus = hand.mische({ x: 0, y: 0, ausweichen: true }, welt);
    melde(hand.kette().length === 0, "ausserhalb der Kartenwahl ist die Kette leer");
    melde(raus.ausweichen === true, "und die eigene Eingabe kommt unverändert durch");
  }

  /* Gegenprobe 5: Ohne gemalte Hand trifft kein Tipp. Sonst schluckte
     die Hand Zeiger, während sie gar nicht da ist. */
  {
    const welt = probeWelt();
    welt.phase = "welle";
    hand.mische({ x: 0, y: 0, ausweichen: false }, welt);
    tippe(BREITE / 2, HOEHE - 40);
    melde(angehalten === 0, "ist keine Hand gemalt, wird kein Tipp abgefangen");
  }

  /* 9h · Vier Karten: `weitsicht` darf die Hand nicht sprengen */
  {
    const welt = probeWelt({ weitsicht: true });
    const menue = macheMenue();
    menue.sperre = 0;
    const flanken = macheFlanken();
    const n = welt.spieler[0].karten.length;
    melde(n === KARTEN_JE_WAHL + 1, "mit weitsicht liegen vier Karten in der Hand", `${n}`);
    hand.zeichne(macheAufnahme(), welt, menue, 0);
    const felder = felderFuer(n, 0);
    const ziel = felder[3];
    tippe(ziel.x + ziel.b / 2, ziel.y + ziel.h / 2);
    let bilder = 0;
    while (menue.wahlZeiger[0] !== 3 && bilder++ < 40) bild(welt, menue, hand, flanken);
    melde(menue.wahlZeiger[0] === 3, "und die vierte Karte lässt sich antippen",
      `Zeiger ${menue.wahlZeiger[0]} nach ${bilder} Bildern`);
    laut(`  vier Karten: Tipp auf die vierte nach ${bilder} Bildern angekommen`);
  }
}

if (LAUT) console.log("");
ende();
