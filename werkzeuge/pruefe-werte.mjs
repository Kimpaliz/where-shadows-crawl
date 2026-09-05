/* [Aufgabe: Prüfwesen] Die Werte-Tabelle, die fünf Schadensarten, die Schadensrechnung und der Sprung.

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   | Prüfung | was sonst passiert |
   | --- | --- |
   | Wertkennungen sind reines ASCII | `ruestung` still zu `rüstung` umbenannt — die Anzeige zeigt `undefined`, **nichts wird rot**. Genau das ist in diesem Projekt schon passiert (docs/FEHLERBUCH.md) |
   | die ersten acht Werte stehen vorn und in ihrer Reihenfolge | `spiel/stufen.mjs` zieht seine Karten aus `for (const w of WERTE)`; eine andere Reihenfolge ist eine andere Nacht — gemessen sprang der Vier-Spieler-Lauf von Welle 103,3 auf 201,0 |
   | jeder Wert wird von `macheWerte()` auch angelegt | ein Wert in der Tabelle, den niemand im Objekt hat: die Karte gibt Punkte aus, und die Rechnung liest `undefined` |
   | jede Waffe trägt die Art ihres ersten Merkmals | eine Feuerwaffe mit der Art `frost`: der Bau des Spielers geht ins Leere, und niemand findet heraus, warum |
   | genau eine Art geht an der Rüstung vorbei | zwei Wege um dieselbe Verteidigung herum — Rüstung wäre kein Wert mehr |
   | flacher Zuschlag **vor** Prozentmodifier | 20 % Schaden daneben, ohne eine einzige Fehlermeldung |
   | der Kritwurf würfelt nur mit Chance über null | eine Ziehung mehr aus dem gesäten Strom: jede bisherige Messung wäre entwertet, obwohl sich am Spiel nichts geändert hat |
   | der Sprung trägt genau seine Reichweite | die Zahl auf dem Papier wäre eine andere als die im Spiel |
   | der Sprung ist kein Teleport | man sieht ihn nicht, und es liest sich als Fehler |

   ── Wie diese Prüfung rot gemacht wurde ────────────────────────────

   Der Nachweis steht in `docs/rueckmeldung/werte-fundament.md`,
   Abschnitt „Baustein 4". Eine Prüfung, die nie rot war, prüft
   womöglich nichts.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/werte.mjs`, `spiel/schadensarten.mjs`, `spiel/ausweichen.mjs`,
   `spiel/katalog/waffen.mjs`, `spiel/katalog/gegner.mjs` (nur lesend),
   `runtime/palette.js` (die Farben der Arten). */

import { macheMelder } from "./helfer.mjs";
import {
  WERTE, WERTE_TABELLE, WERT_NACH_ID, WERT_TEXT, GRUPPEN, GRUPPEN_IDS,
  macheWerte, wert, berechneSchaden, schadenAmSpieler, widerstandAus,
  kritChance, kritFaktor, KRIT_GRUND, waffenReichweite, angriffeJeSchlag,
  geschosseJeAngriff, durchschlaege, goldFaktor, erfahrungsFaktor,
  kartenWertFaktor, kartenNeigung, kartenSeltenheitChance,
  regenerationJeSekunde, schadensminderung
} from "../spiel/werte.mjs";
import {
  SCHADENSARTEN, ART_IDS, ART_NACH_ID, STANDARD_ART, MERKMAL_ART,
  artZuMerkmalen, istArt
} from "../spiel/schadensarten.mjs";
import {
  AUSWEICH_WEITE, AUSWEICH_DAUER, AUSWEICH_ABKLING,
  ausweichReichweite, ausweichAbklingzeit, ausweichTempo, ruesteAusweichen
} from "../spiel/ausweichen.mjs";
import { WAFFEN, MERKMALE } from "../spiel/katalog/waffen.mjs";
import { GEGNER, TEMPO_DECKEL } from "../spiel/katalog/gegner.mjs";
import { macheWelt, starteWelle, schritt, SCHRITT } from "../spiel/welt.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { FARBEN } from "../runtime/palette.js";

const { melde, ende } = macheMelder({ still: true });

/* ── 1 · Die Tabelle ─────────────────────────────────────────────── */

const FORMEN = ["flach", "prozent", "multiplikator"];

melde(WERTE_TABELLE.length >= 40, "die Tabelle trägt die neuen Achsen",
  `${WERTE_TABELLE.length} Werte`);
melde(WERTE.length === WERTE_TABELLE.length,
  "die Kennungsliste ist genau so lang wie die Tabelle",
  `${WERTE.length} gegen ${WERTE_TABELLE.length}`);
melde(new Set(WERTE).size === WERTE.length, "keine Kennung doppelt");

let ohneFeld = 0, falscheForm = 0, falscheGruppe = 0, nichtAscii = 0, leer = 0;
for (const e of WERTE_TABELLE) {
  if (e.id === undefined || e.name === undefined || e.text === undefined
    || e.grund === undefined || e.gruppe === undefined || e.form === undefined) ohneFeld++;
  if (!FORMEN.includes(e.form)) falscheForm++;
  if (!GRUPPEN_IDS.includes(e.gruppe)) falscheGruppe++;
  /* Die eine Falle, die dieses Projekt schon einmal getroffen hat: Ein
     Umlaut in der **Kennung** bricht jedes Nachschlagen, ohne dass
     etwas abstürzt. Umlaute gehören in den Anzeigenamen. */
  if (!/^[a-z0-9_]+$/.test(String(e.id))) nichtAscii++;
  if (String(e.name).trim() === "" || String(e.text).trim() === "") leer++;
}
melde(ohneFeld === 0, "jeder Eintrag hat alle sechs Felder", `${ohneFeld} unvollständig`);
melde(falscheForm === 0, `jede Form ist eine von ${FORMEN.join("/")}`, `${falscheForm} falsch`);
melde(falscheGruppe === 0, "jede Gruppe ist bekannt", `${falscheGruppe} falsch`);
melde(nichtAscii === 0, "jede Kennung ist reines ASCII in Kleinbuchstaben",
  `${nichtAscii} mit Umlaut oder Grossbuchstaben`);
melde(leer === 0, "kein Name und kein Text ist leer", `${leer} leer`);

/* Alle drei Formen müssen wirklich vorkommen — eine Form, die niemand
   benutzt, ist eine Behauptung in der Kopfnotiz und kein Vertrag. */
for (const f of FORMEN) {
  const n = WERTE_TABELLE.filter((e) => e.form === f).length;
  melde(n > 0, `die Form "${f}" kommt vor`, `${n} Werte`);
}
for (const [g, name] of GRUPPEN) {
  const n = WERTE_TABELLE.filter((e) => e.gruppe === g).length;
  melde(n > 0, `die Gruppe "${g}" (${name}) ist besetzt`, `${n} Werte`);
}

/* ── 2 · Die acht des ersten Entwurfs, vorn und in ihrer Reihenfolge ─

   `spiel/stufen.mjs` baut den Kartentopf mit `for (const w of WERTE)`.
   Steht die Reihenfolge anders, zieht derselbe gesäte Strom andere
   Karten — dieselbe Menge, eine andere Nacht. */
const ERSTE_ACHT = ["leben", "schaden", "hast", "tempo", "ruestung", "glueck", "gier", "genesung"];
melde(WERTE.slice(0, 8).join(",") === ERSTE_ACHT.join(","),
  "die acht ursprünglichen Werte stehen vorn und in ihrer Reihenfolge",
  WERTE.slice(0, 8).join(","));

/* ── 3 · macheWerte und WERT_TEXT ────────────────────────────────── */

{
  const w = macheWerte();
  const fehlend = WERTE.filter((id) => typeof w[id] !== "number");
  melde(fehlend.length === 0, "macheWerte legt jede Kennung als Zahl an",
    fehlend.slice(0, 5).join(" "));
  melde(Object.keys(w).length === WERTE.length,
    "und legt nichts an, was nicht in der Tabelle steht",
    `${Object.keys(w).length} gegen ${WERTE.length}`);

  const abweich = WERTE.filter((id) => w[id] !== WERT_NACH_ID.get(id).grund);
  melde(abweich.length === 0, "jeder Wert startet auf seinem Grundwert", abweich.join(" "));

  const gesetzt = macheWerte({ schaden: 7, krit_chance: 12 });
  melde(gesetzt.schaden === 7 && gesetzt.krit_chance === 12,
    "macheWerte übernimmt vorgegebene Werte");

  const texte = WERTE.filter((id) => !Array.isArray(WERT_TEXT[id]) || WERT_TEXT[id].length !== 2);
  melde(texte.length === 0, "jeder Wert hat Name und Beschreibung", texte.join(" "));
  const fremd = Object.keys(WERT_TEXT).filter((k) => !WERTE.includes(k));
  melde(fremd.length === 0, "keine Beschreibung ohne zugehörigen Wert", fremd.join(" "));

  /* `wert()` ist die Bremse gegen `NaN`: Ein altes Werteobjekt ohne die
     neue Kennung darf keine Rechnung vergiften. */
  melde(wert({}, "krit_chance") === 0, "ein fehlender Wert zählt als 0");
  melde(wert({ krit_chance: NaN }, "krit_chance") === 0, "NaN zählt als 0");
  melde(wert(undefined, "krit_chance") === 0, "ein fehlendes Werteobjekt zählt als 0");
  melde(regenerationJeSekunde(macheWerte()) === 0, "ohne Punkte keine Regeneration");
  melde(regenerationJeSekunde(macheWerte({ lebensregeneration: 3 })) === 3,
    "mit Punkten kommt Leben zurück");
}

/* ── 4 · Die erzeugten Werte ─────────────────────────────────────── */

{
  let fehlt = 0;
  for (const art of ART_IDS) {
    for (const muster of ["schaden_%_flach", "schaden_%_prozent",
      "krit_chance_%", "krit_schaden_%", "widerstand_%"]) {
      if (!WERT_NACH_ID.has(muster.replace("%", art))) fehlt++;
    }
  }
  melde(fehlt === 0, "jede Schadensart hat ihre fünf Achsen", `${fehlt} fehlen`);

  const neigungen = GRUPPEN_IDS.filter((g) => !WERT_NACH_ID.has(`neigung_${g}`));
  melde(neigungen.length === 0, "jede Gruppe hat ihre Kartenneigung", neigungen.join(" "));

  const erzeugt = WERTE.filter((id) =>
    /^(schaden_[a-z]+_(flach|prozent)|krit_chance_[a-z]+|krit_schaden_[a-z]+|widerstand_[a-z]+|neigung_[a-z]+)$/.test(id));
  melde(erzeugt.length === ART_IDS.length * 5 + GRUPPEN_IDS.length,
    "die erzeugten Werte sind vollzählig und keiner zu viel",
    `${erzeugt.length} erzeugt, ${WERTE.length - erzeugt.length} getippt`);
}

/* ── 5 · Die Schadensarten ───────────────────────────────────────── */

melde(SCHADENSARTEN.length === 5, "es gibt fünf Schadensarten", `${SCHADENSARTEN.length}`);
melde(new Set(ART_IDS).size === 5, "die Artkennungen sind eindeutig");
melde(istArt(STANDARD_ART), "die Standardart ist eine echte Art", STANDARD_ART);
melde(!istArt("feuur"), "ein Tippfehler ist keine Art");

const durchRuestung = SCHADENSARTEN.filter((a) => a.ignoriertRuestung);
melde(durchRuestung.length === 1,
  "genau eine Art geht an der Rüstung vorbei",
  durchRuestung.map((a) => a.id).join(" "));

let farbeFalsch = 0, nichtInPalette = 0, textLeer = 0;
const paletteWerte = new Set(Object.values(FARBEN));
for (const a of SCHADENSARTEN) {
  if (!/^#[0-9a-f]{6}$/.test(a.farbe)) farbeFalsch++;
  /* Eine Farbe, die es in der Palette nicht gibt, sieht auf dem
     Bildschirm aus wie ein Fremdkörper — genau das, was
     `runtime/palette.js` verhindern soll. */
  if (!paletteWerte.has(a.farbe)) nichtInPalette++;
  if (String(a.name).trim() === "" || String(a.text).trim() === "") textLeer++;
}
melde(farbeFalsch === 0, "jede Artfarbe ist ein gültiger Farbcode", `${farbeFalsch} falsch`);
melde(nichtInPalette === 0, "jede Artfarbe steht in der Palette", `${nichtInPalette} fremd`);
melde(textLeer === 0, "jede Art hat Namen und Text");

/* Zwei Arten, die man auf dem Bildschirm nicht trennen kann, sind keine
   zwei Arten. Gemessen am 05.09.2026 liegt der kleinste Abstand bei
   107,1 (frost gegen fluch); die Schranke steht bei 90 und lässt damit
   knapp ein Fünftel Luft. Sie ist keine geratene Zahl, sondern die
   gemessene minus Spielraum. */
const SCHRANKE = 90;
const zuRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function farbabstand(a, b) {
  const [r1, g1, b1] = zuRgb(a), [r2, g2, b2] = zuRgb(b);
  const rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2
    + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
}
let kleinster = Infinity, paar = "";
for (let i = 0; i < SCHADENSARTEN.length; i++) {
  for (let j = i + 1; j < SCHADENSARTEN.length; j++) {
    const d = farbabstand(SCHADENSARTEN[i].farbe, SCHADENSARTEN[j].farbe);
    if (d < kleinster) { kleinster = d; paar = `${SCHADENSARTEN[i].id}/${SCHADENSARTEN[j].id}`; }
  }
}
melde(kleinster >= SCHRANKE, `die Artfarben liegen mindestens ${SCHRANKE} auseinander`,
  `kleinster Abstand ${kleinster.toFixed(1)} bei ${paar}`);

/* Jedes Merkmal muss auf eine Art zeigen — sonst bekäme eine Waffe mit
   diesem Merkmal still die Standardart. */
const ohneArt = MERKMALE.filter((m) => !istArt(MERKMAL_ART[m]));
melde(ohneArt.length === 0, "jedes Waffenmerkmal zeigt auf eine echte Art", ohneArt.join(" "));
melde(artZuMerkmalen(["Feuer", "Schnitt"]) === "feuer", "das erste Merkmal entscheidet");
melde(artZuMerkmalen(["Unbekannt"]) === STANDARD_ART, "ein fremdes Merkmal fällt auf die Standardart");

/* ── 6 · Die Waffen ──────────────────────────────────────────────── */

{
  let ohne = 0, falsch = 0;
  for (const w of WAFFEN) {
    if (!istArt(w.schadensart)) { ohne++; continue; }
    if (w.schadensart !== artZuMerkmalen(w.merkmale)) {
      falsch++;
      console.log(`    ${w.id}: Art ${w.schadensart}, Merkmale ${w.merkmale.join("+")} ergäben ${artZuMerkmalen(w.merkmale)}`);
    }
  }
  melde(ohne === 0, "jede Waffe trägt eine echte Schadensart", `${ohne} ohne`);
  melde(falsch === 0, "jede Waffenart folgt ihrem ersten Merkmal", `${falsch} abweichend`);

  /* Eine Art, die auf keiner Waffe vorkommt, wäre eine Achse, in die
     der Spieler investieren kann, ohne dass sie je etwas tut. */
  for (const art of ART_IDS) {
    const n = WAFFEN.filter((w) => w.schadensart === art).length;
    melde(n >= 1, `die Art "${art}" kommt auf einer Waffe vor`, `${n} Waffen`);
  }
}

/* ── 7 · Die Schadensrechnung ────────────────────────────────────── */

{
  const leer = macheWerte();
  melde(berechneSchaden({ grund: 10, art: "feuer", werte: leer }).menge === 10,
    "ohne Werte bleibt der Grundschaden stehen");

  /* Der eine Schritt, dessen Position die Balance ändert. */
  const gemischt = macheWerte({ schaden_feuer_flach: 5, schaden_feuer_prozent: 100 });
  const richtig = berechneSchaden({ grund: 10, art: "feuer", werte: gemischt }).menge;
  melde(richtig === 30, "flacher Zuschlag wirkt vor dem Prozentmodifier",
    `gerechnet ${richtig}, richtig ist (10 + 5) * 2 = 30; vertauscht wären es 10 * 2 + 5 = 25`);

  /* Ein Modifier der einen Art darf die andere nicht anfassen. */
  melde(berechneSchaden({ grund: 10, art: "frost", werte: gemischt }).menge === 10,
    "ein Feuermodifier lässt Frost in Ruhe");

  melde(berechneSchaden({ grund: 10, art: "feuer", werte: leer, gruppenBonus: 0.3 }).menge === 13,
    "der Gruppenbonus greift");
  melde(berechneSchaden({ grund: 10, art: "feuer", werte: leer, zusatzProzent: 50 }).menge === 15,
    "der Zusatzprozentsatz des Aufrufers greift");

  /* Krit: kein Wurf ohne Chance — sonst verschiebt sich der gesäte
     Strom, und **das** wäre der teuerste stille Fehler von allen. */
  const zaehler = macheZufall(1234);
  let gezogen = 0;
  const zaehlend = { trifft: (p) => { gezogen++; return zaehler.trifft(p); } };
  berechneSchaden({ grund: 10, art: "feuer", werte: leer, zufall: zaehlend });
  melde(gezogen === 0, "ohne Kritchance wird nicht gewürfelt", `${gezogen} Ziehungen`);
  berechneSchaden({ grund: 10, art: "feuer", werte: macheWerte({ krit_chance: 5 }), zufall: zaehlend });
  melde(gezogen === 1, "mit Kritchance wird genau einmal gewürfelt", `${gezogen} Ziehungen`);

  const sicher = macheWerte({ krit_chance: 100, krit_schaden: 50 });
  const t = berechneSchaden({ grund: 10, art: "feuer", werte: sicher, zufall: macheZufall(3) });
  melde(t.krit === true, "bei 100 % Chance sitzt der Volltreffer");
  melde(Math.abs(t.menge - 10 * (KRIT_GRUND + 0.5)) < 1e-9,
    "und er rechnet mit Grundfaktor plus Kritschaden", `${t.menge}`);
  melde(kritFaktor(leer, "feuer") === KRIT_GRUND, "ohne Punkte gilt der Grundfaktor");
  melde(kritChance(macheWerte({ krit_chance: 400 }), "feuer") === 1,
    "die Kritchance ist bei 100 % gedeckelt");
  melde(kritChance(macheWerte({ krit_chance: -50 }), "feuer") === 0,
    "und wird nie negativ");
  melde(kritChance(macheWerte({ krit_chance: 10, krit_chance_feuer: 20 }), "feuer") === 0.3,
    "globale und Art-Kritchance addieren sich");
  melde(kritChance(macheWerte({ krit_chance_feuer: 100 }), "frost") === 0,
    "eine Art-Kritchance gilt nur für ihre Art");

  /* Widerstand des Ziels. */
  melde(berechneSchaden({ grund: 10, art: "feuer", werte: leer, widerstaende: { feuer: 50 } }).menge === 5,
    "der Widerstand des Ziels zieht ab");
  melde(berechneSchaden({ grund: 10, art: "frost", werte: leer, widerstaende: { feuer: 50 } }).menge === 10,
    "und nur gegen seine eigene Art");
  melde(berechneSchaden({ grund: 10, art: "feuer", werte: leer, widerstaende: null }).menge === 10,
    "eine fehlende Widerstandstabelle zählt als null");
  melde(widerstandAus(undefined, "feuer") === 0, "kein Feld `widerstaende`: null");
  melde(widerstandAus({ feuer: 100 }, "feuer") === 0.9,
    "der Widerstand ist bei 90 % gedeckelt");
  melde(widerstandAus({ feuer: -100 }, "feuer") === -1,
    "und bei -100 % nach unten", `${widerstandAus({ feuer: -100 }, "feuer")}`);

  melde(berechneSchaden({ grund: 0.0001, art: "feuer", werte: leer, widerstaende: { feuer: 90 } }).menge === 1,
    "ein Treffer nimmt immer mindestens 1");
}

/* ── 8 · Schaden am Spieler ──────────────────────────────────────── */

{
  const gepanzert = macheWerte({ ruestung: 30 });
  melde(schadensminderung(gepanzert) === 0.5, "30 Rüstung nimmt die Hälfte");
  melde(schadenAmSpieler(gepanzert, 100, "schnitt") === 50, "Rüstung hilft gegen Schnitt");
  melde(schadenAmSpieler(gepanzert, 100, "fluch") === 100,
    "Fluch geht an der Rüstung vorbei");
  const widerstehend = macheWerte({ widerstand_fluch: 50 });
  melde(schadenAmSpieler(widerstehend, 100, "fluch") === 50,
    "der Widerstand greift auch gegen Fluch");
  melde(schadenAmSpieler(macheWerte({ ruestung: 100000 }), 100, "schnitt") >= 1,
    "ein Treffer nimmt dem Spieler immer mindestens 1");
  melde(schadenAmSpieler(macheWerte(), 100) === 100,
    "ohne Angabe gilt die Standardart");
}

/* ── 9 · Waffe und Werte ─────────────────────────────────────────── */

{
  const einzel = { reichweite: 100, ziele: 1, wirkung: {} };
  const flaeche = { reichweite: 100, ziele: 3, wirkung: {} };
  const leer = macheWerte();
  melde(waffenReichweite(leer, einzel) === 100, "ohne Werte bleibt die Reichweite");
  const w = macheWerte({ reichweite: 10, flaechenreichweite: 50 });
  melde(Math.abs(waffenReichweite(w, einzel) - 110) < 1e-9,
    "Reichweite wirkt auf jede Waffe");
  melde(Math.abs(waffenReichweite(w, flaeche) - 160) < 1e-9,
    "Flächenweite wirkt nur auf Waffen mit mehreren Zielen");
  melde(waffenReichweite(macheWerte({ reichweite: -1000 }), einzel) > 0,
    "die Reichweite wird nie null oder negativ");

  melde(angriffeJeSchlag(leer) === 1, "ohne Punkte ein Angriff je Schlag");
  melde(angriffeJeSchlag(macheWerte({ zusatzangriffe: 2 })) === 3, "zwei Zusatzangriffe geben drei");
  melde(angriffeJeSchlag(macheWerte({ zusatzangriffe: -5 })) === 1, "nie weniger als einer");
  melde(angriffeJeSchlag(macheWerte({ zusatzangriffe: 1.9 })) === 2, "halbe Angriffe zählen nicht");
  melde(geschosseJeAngriff(leer) === 1, "ohne Punkte ein Geschoss");
  melde(geschosseJeAngriff(macheWerte({ zusatzgeschosse: 3 })) === 4, "drei Zusatzgeschosse geben vier");
  melde(durchschlaege(leer, { wirkung: {} }) === 1, "ein Geschoss trifft einen");
  melde(durchschlaege(leer, { wirkung: { durchschlag: 2 } }) === 3, "die Armbrust trifft drei");
  melde(durchschlaege(macheWerte({ durchdringung: 1 }), { wirkung: { durchschlag: 2 } }) === 4,
    "Durchdringung kommt dazu");
}

/* ── 10 · Beute und Karten ───────────────────────────────────────── */

{
  melde(goldFaktor(macheWerte()) === 1, "ohne Punkte gibt es Gold eins zu eins");
  melde(Math.abs(goldFaktor(macheWerte({ gier: 50, goldfund: 20 })) - 1.7) < 1e-9,
    "Gier und Goldfund addieren sich");
  melde(Math.abs(erfahrungsFaktor(macheWerte({ erfahrung: 30 })) - 1.3) < 1e-9,
    "Erfahrung nimmt das Wissen mal");
  melde(erfahrungsFaktor(macheWerte({ erfahrung: -500 })) === 0,
    "der Erfahrungsfaktor wird nie negativ");
  melde(Math.abs(kartenWertFaktor(macheWerte({ kartenwert: -40 })) - 0.6) < 1e-9,
    "der Kartenwert darf auch abziehen");
  melde(kartenWertFaktor(macheWerte({ kartenwert: -500 })) > 0,
    "aber eine Karte gibt nie nichts");
  melde(kartenNeigung(macheWerte(), "angriff") === 1, "ohne Neigung bleibt das Gewicht");
  melde(Math.abs(kartenNeigung(macheWerte({ neigung_angriff: 75 }), "angriff") - 1.75) < 1e-9,
    "eine Neigung hebt ihre Gruppe");
  melde(kartenNeigung(macheWerte({ neigung_angriff: 75 }), "wehr") === 1,
    "und nur ihre Gruppe");
  melde(kartenNeigung(macheWerte({ neigung_angriff: -500 }), "angriff") === 0,
    "eine Neigung wird nie negativ");
  melde(kartenSeltenheitChance(macheWerte({ kartenseltenheit: 25 })) === 0.25,
    "die Seltenheitschance ist ein Anteil");
  melde(kartenSeltenheitChance(macheWerte({ kartenseltenheit: 400 })) === 1,
    "und bei 100 % gedeckelt");
}

/* ── 11 · Der Sprung ─────────────────────────────────────────────── */

{
  const leer = macheWerte();
  melde(ausweichReichweite(leer) === AUSWEICH_WEITE, "ohne Punkte die Grundweite");
  melde(ausweichReichweite(macheWerte({ ausweichweite: 30 })) === AUSWEICH_WEITE + 30,
    "Ausweichweite kommt dazu");
  melde(ausweichReichweite(macheWerte({ ausweichweite: -1000 })) > 0,
    "der Sprung trägt nie null");
  melde(ausweichAbklingzeit(leer) === AUSWEICH_ABKLING, "ohne Punkte die Grundabklingzeit");
  melde(Math.abs(ausweichAbklingzeit(macheWerte({ ausweichhast: 100 })) - AUSWEICH_ABKLING / 2) < 1e-9,
    "100 Ausweichhast halbiert die Abklingzeit");
  melde(ausweichAbklingzeit(macheWerte({ ausweichhast: 100000 })) > 0,
    "die Abklingzeit wird nie null - sonst wäre man dauerhaft unverwundbar");

  /* Ein Sprung, der nicht schneller ist als der schnellste Gegner, ist
     keine Flucht. Der Deckel steht in `spiel/katalog/gegner.mjs`. */
  const schnellster = Math.max(...GEGNER.map((g) => g.tempo)) * TEMPO_DECKEL;
  melde(ausweichTempo(leer) > schnellster,
    "der Sprung ist schneller als der schnellste Gegner",
    `${ausweichTempo(leer).toFixed(0)} gegen ${schnellster.toFixed(1)} px/s`);

  /* Dauernde Unverwundbarkeit begänne, sobald die Abklingzeit unter die
     Sprungdauer fiele. */
  melde(AUSWEICH_ABKLING > AUSWEICH_DAUER * 4,
    "die Abklingzeit liegt weit über der Sprungdauer",
    `${(AUSWEICH_ABKLING / AUSWEICH_DAUER).toFixed(1)}-fach`);
  melde(AUSWEICH_DAUER >= SCHRITT * 4,
    "der Sprung dauert mehrere Schritte und ist kein Teleport",
    `${Math.round(AUSWEICH_DAUER / SCHRITT)} Schritte`);

  const felder = ruesteAusweichen({});
  for (const f of ["ausweichBereitIn", "ausweichRest", "ausweichX", "ausweichY", "ausweichTempo"]) {
    melde(typeof felder[f] === "number", `ruesteAusweichen setzt ${f}`);
  }
}

/* ── 12 · Der Sprung im laufenden Spiel ──────────────────────────── */

function laufe(eingaben, zusatz = {}) {
  const welt = macheWelt({ saat: 5, spielerzahl: 1 });
  starteWelle(welt, 1);
  welt.plan = [];
  welt.gegner = [];
  const s = welt.spieler[0];
  Object.assign(s.werte, zusatz);
  const start = { x: s.x, y: s.y };
  const spur = [];
  for (const e of eingaben) {
    schritt(welt, [e]);
    spur.push({ x: s.x, y: s.y, unv: s.unverwundbar });
  }
  const weg = Math.hypot(s.x - start.x, s.y - start.y);
  return { welt, s, start, spur, weg };
}

{
  const n = Math.ceil(AUSWEICH_DAUER / SCHRITT);
  const stehen = { x: 0, y: 0 };
  const rechts = { x: 1, y: 0 };
  const sprung = { x: 1, y: 0, ausweichen: true };

  const gelaufen = laufe(Array.from({ length: n }, () => rechts));
  const gesprungen = laufe([sprung, ...Array.from({ length: n }, () => stehen)]);

  melde(Math.abs(gesprungen.weg - AUSWEICH_WEITE) < 0.01,
    "der Sprung trägt genau seine Reichweite",
    `${gesprungen.weg.toFixed(2)} von ${AUSWEICH_WEITE}`);
  melde(gesprungen.weg > gelaufen.weg * 2,
    "und deutlich weiter als Laufen in derselben Zeit",
    `${gesprungen.weg.toFixed(1)} gegen ${gelaufen.weg.toFixed(1)}`);

  const schritteMitWeg = gesprungen.spur.filter((p, i, a) =>
    i > 0 && Math.hypot(p.x - a[i - 1].x, p.y - a[i - 1].y) > 0.5).length;
  melde(schritteMitWeg >= 4, "die Bewegung verteilt sich über mehrere Bilder",
    `${schritteMitWeg + 1} Schritte`);
  const groesster = Math.max(...gesprungen.spur.map((p, i, a) =>
    i === 0 ? 0 : Math.hypot(p.x - a[i - 1].x, p.y - a[i - 1].y)));
  melde(groesster < AUSWEICH_WEITE / 2, "kein Schritt springt über die halbe Weite",
    `${groesster.toFixed(2)}`);

  melde(gesprungen.spur[0].unv > 0, "der Sprung macht unverwundbar",
    `${gesprungen.spur[0].unv.toFixed(3)} s`);
  melde(gelaufen.spur[0].unv === 0, "Laufen dagegen nicht");

  /* Gegenprobe: Ohne das Feld darf nichts geschehen. Ohne sie bestünde
     die Prüfung auch, wenn der Sprung bei **jeder** Eingabe losginge. */
  const ohne = laufe(Array.from({ length: 120 }, () => rechts));
  melde(ohne.s.ausweichRest === 0 && ohne.s.ausweichBereitIn === 0,
    "ohne das Feld `ausweichen` wird nie gesprungen");
  melde(ohne.spur.every((p) => p.unv === 0), "und niemand wird unverwundbar");

  /* Dauerdruck darf keine Kette ergeben. */
  const dauer = laufe(Array.from({ length: 60 }, () => sprung));
  melde(dauer.s.ausweichBereitIn > 0, "Dauerdruck ergibt keine Sprungkette",
    `Abklingzeit noch ${dauer.s.ausweichBereitIn.toFixed(2)} s`);
  /* Gezählt wird nicht die Strecke, sondern der **Vorsprung** vor dem
     bloßen Laufen: Ein Sprung bringt gemessen rund 32 px mehr, zwei
     brächten 63. Alles unter einer vollen Sprungweite heißt also:
     genau einer. Die Strecke selbst zu messen wäre eine Zahl, die mit
     jeder Änderung am Grundtempo falsch wird. */
  const eineSekundeLaufen = laufe(Array.from({ length: 60 }, () => rechts));
  const vorsprung = dauer.weg - eineSekundeLaufen.weg;
  melde(vorsprung < AUSWEICH_WEITE, "in einer Sekunde kommt höchstens ein Sprung zustande",
    `Vorsprung ${vorsprung.toFixed(1)} px, ein Sprung brächte rund ` +
    `${(AUSWEICH_WEITE - gelaufen.weg).toFixed(1)}`);

  /* Der Bannkreis hält auch beim Sprung. */
  const welt = macheWelt({ saat: 5, spielerzahl: 1 });
  starteWelle(welt, 1);
  welt.plan = [];
  const s = welt.spieler[0];
  s.x = welt.arena.radius - s.radius - 2; s.y = 0;
  let raus = 0;
  for (let i = 0; i < 200; i++) {
    schritt(welt, [{ x: 1, y: 0, ausweichen: i % 40 === 0 }]);
    if (Math.hypot(s.x, s.y) > welt.arena.radius - s.radius + 0.01) raus++;
  }
  melde(raus === 0, "auch ein Sprung führt nicht aus dem Bannkreis", `${raus} Schritte draussen`);

  /* Stehend gesprungen: in Blickrichtung, nicht auf der Stelle. */
  const hoch = laufe([{ x: 0, y: -1 }, { x: 0, y: 0, ausweichen: true },
    ...Array.from({ length: n }, () => stehen)]);
  melde(hoch.weg > AUSWEICH_WEITE * 0.9, "stehend gesprungen geht es in Blickrichtung",
    `${hoch.weg.toFixed(1)} px`);
}

/* ── 13 · Der Umbau ist neutral ──────────────────────────────────────

   Alle neuen Achsen stehen auf null, also darf sich am Spiel nichts
   geändert haben. Zwei Läufe mit derselben Saat müssen gleich enden —
   und die Gegenprobe muss zeigen, dass die Messung überhaupt etwas
   sieht. */
{
  const spiele = (saat, extra) => {
    const welt = macheWelt({ saat, spielerzahl: 1 });
    starteWelle(welt, 3);
    const s = welt.spieler[0];
    if (extra) Object.assign(s.werte, extra);
    for (let i = 0; i < 900; i++) schritt(welt, [{ x: Math.sin(i / 40), y: Math.cos(i / 33) }]);
    return `${s.x.toFixed(6)},${s.y.toFixed(6)},${welt.gegner.length},` +
      welt.gegner.reduce((a, g) => a + g.leben, 0).toFixed(4);
  };
  const a = spiele(77), b = spiele(77);
  melde(a === b, "zwei Läufe mit derselben Saat enden gleich");
  melde(spiele(78) !== a, "eine andere Saat ergibt eine andere Nacht");
  /* Gegenprobe der Messung selbst: Mit Punkten **muss** sie einen
     Unterschied sehen, sonst misst sie nichts. */
  melde(spiele(77, { schaden: 40, krit_chance: 50 }) !== a,
    "die Messung sieht einen Unterschied, wenn es einen gibt");
}

ende();
