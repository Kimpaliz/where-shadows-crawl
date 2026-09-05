/* [Aufgabe: Prüfwesen] Der Gegnerkatalog und seine Verhalten — stimmig
   und wirklich benutzbar.

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   `spiel/gegner-verhalten.mjs` und `spiel/katalog/gegner.mjs` reden
   nur über eine Zeichenkette miteinander (`art.verhalten`). Ein
   Tippfehler dort bricht nichts sichtbar — `richteVerhalten()` fängt
   eine unbekannte Kennung ab und lässt den Gegner geradeaus laufen
   (siehe dort). Der Gegner bewegt sich also weiter, nur **stumm
   falsch**: Ein „kreist"-Wächter würde nie kreisen, und niemand merkt
   es beim Spielen, weil „laufen" für sich genommen kein Fehlverhalten
   *aussieht*.

   Genauso leise brechen `widerstaende`: `spiel/werte.mjs` behandelt
   jeden Schlüssel, den es nicht kennt, als „gibt es nicht" — ein
   verschriebenes `"schitt"` statt `"schnitt"` wäre also nicht falsch,
   sondern **wirkungslos**, und der Knochenritter verlöre genau die
   Zähigkeit, die ihn ausmacht, ohne dass irgendetwas rot wird.

   ── Die eine Einschränkung, die diese Prüfung offen lässt ──────────

   `spiel/gegner-verhalten.mjs` nennt sechs Verhalten. Diese Prüfung
   bestätigt, dass alle sechs **funktionieren** — nicht, dass alle
   sechs **im Katalog stehen**. Nur drei stehen darin (`laeuft`,
   `schwankt`, `speit`): `werkzeuge/pruefe-katalog.mjs` — außerhalb
   dieser Aufgabe, nicht verändert — lässt bislang nur diese drei als
   `g.verhalten` durch. `kreist`, `sammelt` und `stur` sind fertig,
   geprüft und tot: Kein Katalogeintrag nutzt sie. Das ist eine offene
   Übergabe (siehe `docs/rueckmeldung/monster.md`), keine Lücke in
   dieser Prüfung.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/katalog/gegner.mjs` (die Kataloge), `spiel/gegner-verhalten.mjs`
   (die sechs Verhalten), `spiel/katalog/wellen.mjs` (der zweite
   Hauptmann), `spiel/werte.mjs` (`widerstandAus`, `berechneSchaden` —
   nur gelesen, nicht verändert), `spiel/schadensarten.mjs` (die fünf
   gültigen Schlüssel), `runtime/sprite-daten.js` (`GEGNER_BILDER`,
   nur gelesen — der eigentliche Wächter dafür ist
   `werkzeuge/pruefe-sprites.mjs`, hier nur die Katalog-Seite davon). */

import { macheMelder } from "./helfer.mjs";
import {
  GEGNER, GEGNER_NACH_ID, lebenInWelle, schadenInWelle
} from "../spiel/katalog/gegner.mjs";
import {
  VERHALTEN, VERHALTEN_IDS, VERHALTEN_NACH_ID, richteVerhalten
} from "../spiel/gegner-verhalten.mjs";
import {
  baueWelle, istElitewelle, elitewellenIndex, dauerDerWelle, WELLEN_JE_LAUF
} from "../spiel/katalog/wellen.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { macheWerte, widerstandAus, berechneSchaden } from "../spiel/werte.mjs";
import { SCHADENSARTEN } from "../spiel/schadensarten.mjs";
import { GEGNER_BILDER } from "../runtime/sprite-daten.js";

const { melde, ende } = macheMelder({ still: true });
const SCHADENSART_IDS = SCHADENSARTEN.map((a) => a.id);

/* ── 1 · Jede benutzte Verhalten-Kennung existiert wirklich ─────────

   Der Fall aus dem Kopf von `pruefe-katalog.mjs`: „Ein Tippfehler im
   Namen eines Merkmals macht keine Fehlermeldung." Hier dasselbe Muster
   für `verhalten`, mit einer echten Konsequenz statt eines toten
   Merkmals — ein Gegner, der falsch läuft. */

for (const g of GEGNER) {
  melde(VERHALTEN_NACH_ID.has(g.verhalten),
    `${g.id}: Verhalten "${g.verhalten}" existiert in gegner-verhalten.mjs`);
}

/* ── 2 · Die sechs Verhalten selbst: eindeutig und funktionsfähig ───

   „keine zwei Einträge mit derselben Frage, keiner ohne Benutzer im
   Katalog" — der Anspruch aus dem Kopf von `gegner-verhalten.mjs`.
   Den zweiten Teil kann diese Prüfung, siehe oben, nicht erzwingen.
   Den ersten schon: Zwei Verhalten mit derselben Frage wären zwei
   Antworten auf dieselbe Situation und keine sechste Mechanik. */

melde(VERHALTEN.length === 6, "sechs Verhalten sind eingetragen", `${VERHALTEN.length}`);
melde(new Set(VERHALTEN_IDS).size === VERHALTEN_IDS.length, "keine Verhalten-Kennung doppelt");
melde(new Set(VERHALTEN.map((v) => v.frage)).size === VERHALTEN.length,
  "keine zwei Verhalten stellen dieselbe Frage");
for (const v of VERHALTEN) {
  melde(typeof v.frage === "string" && v.frage.length > 0, `${v.id}: hat eine Frage`);
  melde(typeof v.richte === "function", `${v.id}: hat eine richte()-Funktion`);
}

/* Ruft jedes Verhalten wirklich auf — mit einem Ziel schräg vorn und,
   für die zustandsbehafteten (`sammelt`, `stur`, `kreist`), über
   mehrere Bilder hinweg, damit `g.sammelModus` & Co. tatsächlich beide
   Zweige durchlaufen. Ohne diesen Lauf bewiese „hat eine
   richte()-Funktion" oben nur, dass sie *existiert* — nicht, dass sie
   funktioniert. */
function testGegner(phase = 0) {
  return { x: 0, y: 0, radius: 6, phase, tempo: 30, stossX: 0, stossY: 0, frost: 0 };
}
const TEST_ZUFALL = macheZufall(4242);
for (const v of VERHALTEN) {
  const g = testGegner(1.7);
  const art = GEGNER.find((e) => e.verhalten === v.id) ?? { abstand: 90, wucht: 1 };
  let alleEndlich = true, alleSinnvoll = true;
  for (let bild = 0; bild < 90; bild++) {
    const dt = 1 / 60;
    const dx = 40, dy = -30, d = Math.hypot(dx, dy);
    const r = richteVerhalten(v.id, {
      g, art, dt, dx, dy, d, wx: dx / d, wy: dy / d, zufall: TEST_ZUFALL
    });
    if (!Number.isFinite(r.wx) || !Number.isFinite(r.wy)) alleEndlich = false;
    const laenge = Math.hypot(r.wx, r.wy);
    /* Entweder ein Einheitsvektor (bewegt sich) oder exakt (0,0)
       (steht bewusst still, z. B. „sammelt" beim Laden). Alles
       dazwischen wäre eine falsch normierte Richtung. */
    if (!(Math.abs(laenge - 1) < 1e-9 || laenge === 0)) alleSinnvoll = false;
    if (r.tempoFaktor !== undefined && !(Number.isFinite(r.tempoFaktor) && r.tempoFaktor > 0)) {
      alleSinnvoll = false;
    }
  }
  melde(alleEndlich, `${v.id}: liefert über 90 Bilder immer endliche Werte`);
  melde(alleSinnvoll, `${v.id}: jede Richtung ist Einheitsvektor oder Stillstand, tempoFaktor > 0`);
}

/* Der dokumentierte Rückfall bei unbekannter Kennung: geradeaus statt
   blind (siehe Kopf von `gegner-verhalten.mjs`). */
{
  const ctx = { g: testGegner(), wx: 0.6, wy: 0.8, dx: 1, dy: 1, d: 1.41, dt: 1 / 60, zufall: TEST_ZUFALL };
  const r = richteVerhalten("nichtVorhanden", ctx);
  melde(r.wx === 0.6 && r.wy === 0.8, "unbekannte Kennung fällt auf die Gerade zurück statt zu erstarren");
}

/* ── 3 · Widerstände: nur gültige Schlüssel, sinnvolle Werte ────── */

for (const g of GEGNER) {
  if (!g.widerstaende) continue;
  for (const [schluessel, wert] of Object.entries(g.widerstaende)) {
    melde(SCHADENSART_IDS.includes(schluessel),
      `${g.id}: Widerstand "${schluessel}" ist eine echte Schadensart`, schluessel);
    melde(typeof wert === "number" && Number.isFinite(wert),
      `${g.id}: Widerstand gegen ${schluessel} ist eine Zahl`, `${wert}`);
    /* Werte über 100 wären mehr als „schluckt alles" und ein Zeichen
       für eine vertauschte Stelle (5,5 statt 55 zum Beispiel). Unter
       -100 wäre mehr als doppelter Schaden aus einer einzigen Zahl —
       auch das eher ein Tippfehler als Absicht. */
    melde(wert >= -100 && wert <= 100,
      `${g.id}: Widerstand gegen ${schluessel} liegt in einem plausiblen Bereich`, `${wert}`);
  }
}

/* Mindestens eine Art muss gegen eine Schadensart deutlich zäher sein
   — Janniks Vorgabe, am Knochenritter gemessen statt behauptet. */
{
  const ritter = GEGNER_NACH_ID.get("knochenritter");
  const schnittWiderstand = widerstandAus(ritter?.widerstaende, "schnitt");
  const fluchWiderstand = widerstandAus(ritter?.widerstaende, "fluch");
  melde(schnittWiderstand >= 0.4,
    "der Knochenritter ist gegen Schnitt deutlich zäher", `${(schnittWiderstand * 100).toFixed(0)} %`);
  melde(fluchWiderstand < 0,
    "und dafür gegen Fluch verwundbar — der Gegenzug existiert wirklich", `${(fluchWiderstand * 100).toFixed(0)} %`);
}

/* Der gemessene Unterschied, den ein Widerstand macht: derselbe
   Grundschaden, einmal Schnitt, einmal Fluch, gegen den Knochenritter.
   `berechneSchaden()` selbst bleibt unverändert (verboten für diese
   Aufgabe) — hier wird sie nur mit echten Werten aufgerufen. */
{
  const werte = macheWerte();
  const ritter = GEGNER_NACH_ID.get("knochenritter");
  const schnitt = berechneSchaden({ grund: 20, art: "schnitt", werte, widerstaende: ritter.widerstaende });
  const fluch = berechneSchaden({ grund: 20, art: "fluch", werte, widerstaende: ritter.widerstaende });
  melde(fluch.menge > schnitt.menge * 1.5,
    "Fluch tut dem Knochenritter deutlich mehr weh als Schnitt bei gleichem Grundschaden",
    `Schnitt ${schnitt.menge.toFixed(1)}  ·  Fluch ${fluch.menge.toFixed(1)}`);
}

/* ── 4 · Die zwei neuen Hauptleute: echte Steigerungen, nicht nur
   größere Zahlen an derselben Stelle ──────────────────────────────── */

{
  const gebeinfuerst = GEGNER_NACH_ID.get("gebeinfuerst");
  const vielfrass = GEGNER_NACH_ID.get("vielfrass");
  const ritter = GEGNER_NACH_ID.get("knochenritter");
  const speier = GEGNER_NACH_ID.get("speier");

  melde(gebeinfuerst !== undefined, "der Gebeinfürst hat einen Katalogeintrag");
  melde(vielfrass !== undefined, "der Vielfraß hat einen Katalogeintrag");

  if (gebeinfuerst && ritter) {
    melde(gebeinfuerst.leben > ritter.leben && gebeinfuerst.schaden > ritter.schaden,
      "der Gebeinfürst ist wirklich eine Steigerung des Knochenritters",
      `Leben ${ritter.leben} → ${gebeinfuerst.leben}, Schaden ${ritter.schaden} → ${gebeinfuerst.schaden}`);
    melde(gebeinfuerst.verhalten === ritter.verhalten,
      "und kämpft in derselben Familie (Nahkampf)", gebeinfuerst.verhalten);
  }
  if (vielfrass && speier) {
    melde(vielfrass.leben > speier.leben && vielfrass.schaden > speier.schaden,
      "der Vielfraß ist wirklich eine Steigerung des Speiers",
      `Leben ${speier.leben} → ${vielfrass.leben}, Schaden ${speier.schaden} → ${vielfrass.schaden}`);
    melde(vielfrass.verhalten === "speit" && vielfrass.abklingzeit < speier.abklingzeit,
      "und spuckt gieriger — kürzere Abklingzeit als der Speier",
      `${speier.abklingzeit}s → ${vielfrass.abklingzeit}s`);
  }
  for (const id of ["gebeinfuerst", "vielfrass"]) {
    const g = GEGNER_NACH_ID.get(id);
    melde(g?.elite === true, `${id}: als Elite markiert`);
    melde(GEGNER_BILDER[id] !== undefined, `${id}: hat ein Bild in runtime/sprite-daten.js`);
  }
  /* Zwei verschiedene Silhouetten — sonst wären es zwei Namen für
     dieselbe Figur. */
  melde(gebeinfuerst?.radius !== vielfrass?.radius || gebeinfuerst?.verhalten !== vielfrass?.verhalten,
    "die beiden Hauptleute unterscheiden sich in Statur oder Kampfweise");
}

/* ── 5 · Die Bosswelle: hauptmann bleibt immer dabei, der zweite kommt
   ab der zweiten Bosswelle dazu, abwechselnd ─────────────────────── */

{
  const modus = undefined; /* elitewelleJede = 4, siehe wellen.mjs Standard */
  let ersteOhneZweiten = true, alleMitHauptmann = true, wechseltAb = true, keinerZuSpaet = true;
  const gesehen = [];
  for (let w = 4; w <= 48; w += 4) {
    if (!istElitewelle(w, modus)) continue;
    const dauer = dauerDerWelle(w, modus);
    const plan = baueWelle(w, 1, macheZufall(w * 7 + 3), modus).plan;
    const hauptmannDa = plan.some((e) => e.art === "hauptmann");
    if (!hauptmannDa) alleMitHauptmann = false;
    const zweite = plan.filter((e) => e.art === "gebeinfuerst" || e.art === "vielfrass");
    if (elitewellenIndex(w, modus) === 1 && zweite.length > 0) ersteOhneZweiten = false;
    if (elitewellenIndex(w, modus) >= 2 && zweite.length === 0) wechseltAb = false;
    if (plan.some((e) => e.zeit >= dauer)) keinerZuSpaet = false;
    gesehen.push(zweite[0]?.art ?? "–");
  }
  melde(alleMitHauptmann, "jede Bosswelle bringt weiterhin den Hauptmann");
  melde(ersteOhneZweiten, "die allererste Bosswelle bleibt bei ihm allein");
  melde(wechseltAb, "ab der zweiten Bosswelle kommt ein zweiter Hauptmann dazu");
  melde(keinerZuSpaet, "kein Hauptmann erscheint nach dem Ende der Welle");
  /* Echte Abwechslung, nicht immer derselbe zweite: über zwölf
     Bosswellen (Welle 8…48) müssen beide vorkommen. */
  const arten = new Set(gesehen.filter((a) => a !== "–"));
  melde(arten.has("gebeinfuerst") && arten.has("vielfrass"),
    "beide Hauptleute kommen über mehrere Bosswellen wirklich dran", gesehen.join(" "));
  /* Und `elitewellenIndex` selbst bleibt ganzzahlig, solange
     `istElitewelle` schon zugestimmt hat — sonst würde die
     Rotation an krummen Wellenzahlen leise durcheinandergeraten. */
  let alleGanz = true;
  for (let w = 4; w <= 48; w++) {
    if (istElitewelle(w, modus) && !Number.isInteger(elitewellenIndex(w, modus))) alleGanz = false;
  }
  melde(alleGanz, "elitewellenIndex ist an jeder Bosswelle eine ganze Zahl");
}

/* ── 6 · Und die bekannte Grenze dieser Aufgabe, maschinell belegt statt
   nur behauptet: die drei stillen Verhalten stehen wirklich in keinem
   Katalogeintrag ─────────────────────────────────────────────────── */

{
  const benutzt = new Set(GEGNER.map((g) => g.verhalten));
  const unbenutzt = VERHALTEN_IDS.filter((id) => !benutzt.has(id));
  melde(unbenutzt.length === 3 && ["kreist", "sammelt", "stur"].every((id) => unbenutzt.includes(id)),
    "die bekannte Lücke ist genau die drei gesperrten Verhalten — nicht mehr, nicht weniger",
    unbenutzt.join(" "));
}

ende();
