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
import { bekannteZeichen } from "../runtime/schrift.js";

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

if (LAUT) console.log("");
ende();
