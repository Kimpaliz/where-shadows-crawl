/* [Aufgabe: Prüfwesen] Sind die Kataloge in sich stimmig?

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   Kataloge sind Daten, und Daten brechen leise. Ein Tippfehler im
   Namen eines Merkmals macht keine Fehlermeldung — er macht nur den
   Gruppenbonus für diese Waffe unerreichbar, und niemand merkt, dass
   eine Fraktion des Spiels nie zustande kommt. Eine Fernwaffe ohne
   `geschosstempo` wirft ein Geschoss mit Geschwindigkeit `undefined`;
   das fliegt nach `NaN` und trifft nie.

   Genau ein solcher Fall ist beim Umstellen auf echte Umlaute passiert:
   Mein eigenes Skript benannte den **Schlüssel** `ruestung` in
   `rüstung` um. Die Rüstungskarte hätte im Spiel `undefined` angezeigt,
   und keine Prüfung hätte etwas gesagt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   Allen Dateien unter `spiel/katalog/`, dazu `spiel/werte.mjs`. */

import { macheMelder } from "./helfer.mjs";
import { WAFFEN, MERKMALE, STUFEN_FAKTOR, STUFEN_PREIS, preisDerWaffe } from "../spiel/katalog/waffen.mjs";
import { GEGNER, lebenInWelle, schadenInWelle } from "../spiel/katalog/gegner.mjs";
import { VERHALTEN_IDS } from "../spiel/gegner-verhalten.mjs";
import { GEGENSTAENDE, SELTEN_AB_WELLE } from "../spiel/katalog/gegenstaende.mjs";
import { baueWelle, budgetDerWelle, dauerDerWelle, artenInWelle, WELLEN_JE_LAUF } from "../spiel/katalog/wellen.mjs";
import { WERTE, WERT_TEXT } from "../spiel/werte.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { WAFFEN_PLAETZE } from "../spiel/laden.mjs";

const { melde, ende } = macheMelder({ still: true });
const eindeutig = (liste) => new Set(liste.map((x) => x.id)).size === liste.length;

/* ── Die Werte ───────────────────────────────────────────────────── */

/* Bis zum 05.09.2026 stand hier `WERTE.length === 8`. Seit die Werte
   eine Tabelle sind (`spiel/werte.mjs`) sind es 55, und 32 davon werden
   erzeugt — eine feste Zahl wäre ab jetzt nur noch eine Bremse. Was
   bleibt, ist der eigentliche Regressionsschutz: Keiner der acht
   ursprünglichen Werte darf still verschwinden, und keine Kennung darf
   doppelt vorkommen. Alles Weitere prüft `pruefe-werte.mjs`. */
const ERSTE_ACHT = ["leben", "schaden", "hast", "tempo", "ruestung", "glueck", "gier", "genesung"];
const fehlend = ERSTE_ACHT.filter((w) => !WERTE.includes(w));
melde(fehlend.length === 0, "die acht ursprünglichen Werte gibt es noch", fehlend.join(" "));
melde(new Set(WERTE).size === WERTE.length, "keine Wertkennung doppelt", `${WERTE.length} Werte`);
for (const w of WERTE) {
  melde(WERT_TEXT[w] !== undefined && Array.isArray(WERT_TEXT[w]) && WERT_TEXT[w].length === 2,
    `Wert "${w}" hat Name und Beschreibung`);
}
for (const k of Object.keys(WERT_TEXT)) {
  melde(WERTE.includes(k), `Beschreibung "${k}" gehört zu einem echten Wert`);
}

/* ── Waffen ──────────────────────────────────────────────────────── */

melde(eindeutig(WAFFEN), "Waffenkennungen sind eindeutig");
melde(STUFEN_FAKTOR.length === 4 && STUFEN_PREIS.length === 4, "vier Waffenstufen");
melde(STUFEN_FAKTOR.every((v, i, a) => i === 0 || v > a[i - 1]), "jede Stufe schlägt härter");
melde(STUFEN_PREIS.every((v, i, a) => i === 0 || v > a[i - 1]), "jede Stufe kostet mehr");
/* Der Preis muss schneller steigen als die Wirkung, sonst wäre
   Verschmelzen nie besser als Nachkaufen — und Bauteil 7 tot. */
melde(STUFEN_PREIS[3] / STUFEN_PREIS[0] > STUFEN_FAKTOR[3] / STUFEN_FAKTOR[0],
  "Stufenpreise steigen schneller als die Wirkung");

for (const w of WAFFEN) {
  melde(typeof w.name === "string" && w.name.length > 0, `${w.id}: hat einen Namen`);
  melde(["nahkampf", "fern"].includes(w.art), `${w.id}: gültige Art`, w.art);
  melde(w.reichweite > 0 && w.abklingzeit > 0 && w.schaden > 0, `${w.id}: Zahlen sind positiv`);
  melde(w.ziele >= 1, `${w.id}: trifft mindestens einen`);
  melde(w.preis > 0, `${w.id}: hat einen Preis`);
  melde(Array.isArray(w.merkmale) && w.merkmale.length > 0, `${w.id}: hat Merkmale`);
  for (const m of w.merkmale) melde(MERKMALE.includes(m), `${w.id}: Merkmal "${m}" ist bekannt`);
  /* Ohne Geschosstempo fliegt ein Geschoss mit `undefined` — also nach
     `NaN`, also nirgendwohin. Es sieht aus, als würde die Waffe nicht
     schießen. */
  if (w.art === "fern") melde(w.geschosstempo > 0, `${w.id}: Fernwaffe hat Geschosstempo`);
  melde(preisDerWaffe(w.id, 1) > 0, `${w.id}: Preisrechnung liefert etwas`);
}

/* Jedes Merkmal muss auf mindestens `GRUPPE_AB` Waffen erreichbar sein
   — ein Merkmal, dessen Gruppenbonus niemand erreichen kann, ist eine
   Falle für den Spieler. */
for (const m of MERKMALE) {
  const n = WAFFEN.filter((w) => w.merkmale.includes(m)).length;
  melde(n >= 1, `Merkmal "${m}" kommt vor`, `${n} Waffen`);
}
melde(WAFFEN.length >= WAFFEN_PLAETZE, "es gibt mehr Waffen als Gürtelplätze");

/* ── Gegner ──────────────────────────────────────────────────────── */

melde(eindeutig(GEGNER), "Gegnerkennungen sind eindeutig");
for (const g of GEGNER) {
  melde(g.leben > 0 && g.tempo > 0 && g.schaden > 0 && g.radius > 0, `${g.id}: Zahlen sind positiv`);
  melde(g.gold > 0 && g.wissen > 0, `${g.id}: lässt etwas fallen`);
  /* Bis zum 05.09.2026 stand hier eine **abgeschriebene** Liste der drei
     damaligen Verhalten. Sie hat still gearbeitet, solange es nur drei
     gab — und in dem Moment, als `spiel/gegner-verhalten.mjs` drei
     weitere bekam, war sie kein Wächter mehr, sondern ein Riegel: Die
     neuen Verhalten waren gebaut und geprüft und ließen sich trotzdem
     keinem Gegner geben. Gefragt wird jetzt der Katalog selbst. */
  melde(VERHALTEN_IDS.includes(g.verhalten), `${g.id}: bekanntes Verhalten`, g.verhalten);
  melde(g.wucht >= 0, `${g.id}: Wucht ist nicht negativ`);
  if (g.verhalten === "speit") {
    melde(g.abstand > 0 && g.abklingzeit > 0 && g.geschosstempo > 0, `${g.id}: Speier ist vollständig`);
  }
  melde(g.kosten >= 0, `${g.id}: Kosten sind gesetzt`);
  /* Der Hauptmann kostet bewusst null — er kommt aus einem eigenen
     Budget. Alle anderen müssen etwas kosten, sonst füllt einer allein
     jede Welle. */
  if (!g.elite) melde(g.kosten > 0, `${g.id}: normaler Gegner kostet Budget`);
}
melde(GEGNER.some((g) => g.elite), "es gibt mindestens einen Elitegegner");

/* Die Gegenrichtung, und sie ist die eigentlich neue: Ein Verhalten,
   das niemand benutzt, ist gebauter und geprüfter Code, den kein
   Spieler je zu sehen bekommt. Genau der Zustand bestand am 05.09.2026
   für `kreist`, `sammelt` und `stur` — die Fachprüfung war grün, weil
   sie das Verhalten selbst prüft und nicht seinen Gebrauch.

   Dasselbe Muster wie oben bei den Merkmalen: Ein Katalogeintrag ohne
   Benutzer ist kein Fehler im Code, sondern eine Lücke im Spiel.

   ⚠️ **Die Ausnahmeliste ist bewusst zweiseitig geprüft.** Sie darf
   nicht zur stillen Ablage werden, in der ein Verhalten für immer
   liegen bleibt: Wird ein aufgeführtes Verhalten benutzt, wird die
   Prüfung rot, bis es aus der Liste verschwindet. Das ist derselbe
   Gedanke wie bei einer Sperrklinke — eine Ausnahme darf schrumpfen,
   nie wachsen, ohne dass jemand sie begründet. */
const VERHALTEN_OHNE_BENUTZER = {
  /* Gemessen am 05.09.2026: `spiel/kampf.mjs` lässt **nur** Arten mit
     `verhalten === "speit"` schießen (`feuereGegner`, eine Zeile). Ein
     kreisender Gegner hält per Bauart Abstand und tut deshalb ohne
     Fernangriff **gar nichts** — er wäre kein Gegner, sondern ein
     Karussell. Der Aaskrähe steht `kreist` zu (sie fliegt schon heute
     Bögen), aber erst mit einem Fernangriff.

     Was es aufhebt: die Schussbedingung in `spiel/kampf.mjs` von der
     Verhaltenskennung auf die vorhandenen Felder umstellen
     (`abstand`/`abklingzeit`/`geschosstempo`). Nicht in dieser Arbeit
     gemacht, weil `spiel/kampf.mjs` gleichzeitig einem anderen Agenten
     gehört (Zweig `bild/angriffe-und-anzeige`) — zwei Schreiber in
     einer Datei ist genau der Fall, der am selben Tag schon einmal
     1.215 Zeilen auf den falschen Zweig gelegt hat. */
  kreist: "braucht einen Fernangriff; spiel/kampf.mjs lässt nur \"speit\" schießen"
};

for (const id of VERHALTEN_IDS) {
  const n = GEGNER.filter((g) => g.verhalten === id).length;
  const grund = VERHALTEN_OHNE_BENUTZER[id];
  if (grund) {
    melde(n === 0, `Verhalten "${id}" ist benutzt — die Ausnahme kann weg`, grund);
    continue;
  }
  melde(n >= 1, `Verhalten "${id}" hat einen Benutzer`, `${n} Gegnerarten`);
}

/* Teurere Gegner müssen auch mehr Gold geben, sonst lohnt sich das
   Erschlagen des Schwierigen nie. */
/* Verglichen wird zwischen **Kostenstufen**, nicht zwischen einzelnen
   Gegnern: Zwei Arten derselben Stufe duerfen sich unterscheiden (der
   Balg kommt zu viert und gibt deshalb je Stueck weniger als der
   Schlurfer). Der erste Anlauf verglich Gegner mit Gegner und meldete
   genau das als Fehler — die Pruefung war zu grob, nicht die Auslegung
   falsch. */
const stufen = new Map();
for (const g of GEGNER) {
  if (g.elite) continue;
  const s = stufen.get(g.kosten) ?? { min: Infinity, max: -Infinity };
  s.min = Math.min(s.min, g.gold);
  s.max = Math.max(s.max, g.gold);
  stufen.set(g.kosten, s);
}
const sortiert = [...stufen.entries()].sort((a, b) => a[0] - b[0]);
let goldSteigt = true;
for (let i = 1; i < sortiert.length; i++) {
  if (sortiert[i][1].min <= sortiert[i - 1][1].max) goldSteigt = false;
}
melde(goldSteigt, "eine teurere Kostenstufe gibt mehr Gold",
  sortiert.map(([k, s]) => `${k}:${s.min}-${s.max}`).join(" "));

/* ── Fundstücke ──────────────────────────────────────────────────── */

melde(eindeutig(GEGENSTAENDE), "Fundstückkennungen sind eindeutig");
for (const g of GEGENSTAENDE) {
  melde(g.preis > 0, `${g.id}: hat einen Preis`);
  melde(Object.keys(g.werte).length > 0, `${g.id}: ändert wenigstens einen Wert`);
  for (const k of Object.keys(g.werte)) {
    melde(WERTE.includes(k), `${g.id}: "${k}" ist ein echter Wert`);
  }
  melde(SELTEN_AB_WELLE[g.selten] !== undefined, `${g.id}: Seltenheit ${g.selten} ist bekannt`);
}
/* Die Hälfte soll auch etwas nehmen — ein Katalog aus lauter reinen
   Boni ist keine Entscheidung, sondern eine Reihenfolge. */
const mitNachteil = GEGENSTAENDE.filter((g) => Object.values(g.werte).some((v) => v < 0)).length;
melde(mitNachteil >= GEGENSTAENDE.length * 0.3,
  "genug Fundstücke haben einen Nachteil", `${mitNachteil} von ${GEGENSTAENDE.length}`);

/* ── Wellen ──────────────────────────────────────────────────────── */

let budgetSteigt = true, dauerSteigt = true, artenWachsen = true;
for (let w = 1; w < WELLEN_JE_LAUF; w++) {
  if (budgetDerWelle(w + 1, 1) <= budgetDerWelle(w, 1)) budgetSteigt = false;
  if (dauerDerWelle(w + 1) < dauerDerWelle(w)) dauerSteigt = false;
  if (artenInWelle(w + 1).length < artenInWelle(w).length) artenWachsen = false;
}
melde(budgetSteigt, "jede Welle bringt mehr als die vorige");
melde(dauerSteigt, "die Wellen werden nicht kürzer");
melde(artenWachsen, "es kommen nie Gegnerarten abhanden");
/* Auf eine ganze Zahl gerundet, deshalb mit einem Bildpunkt Spiel:
   13 mal 2 ist 26, gerundet wird aber 12,5 mal 2 zu 25. Eine Pruefung
   auf exakte Gleichheit wuerde hier eine korrekte Rechnung melden. */
melde(Math.abs(budgetDerWelle(1, 2) - budgetDerWelle(1, 1) * 2) <= 1,
  "das Budget verdoppelt sich bei zwei Spielern",
  `${budgetDerWelle(1, 1)} gegen ${budgetDerWelle(1, 2)}`);
melde(budgetDerWelle(6, 4) > budgetDerWelle(6, 1) * 3.5,
  "und vervierfacht sich bei vier");
melde(lebenInWelle(GEGNER[0], 1) === GEGNER[0].leben, "in Welle 1 gilt der Grundwert");
melde(lebenInWelle(GEGNER[0], 5) > GEGNER[0].leben, "spätere Wellen sind zäher");
melde(schadenInWelle(GEGNER[0], 5) > GEGNER[0].schaden, "spätere Wellen hauen härter");

/* Jede Welle muss auch wirklich Gegner enthalten — eine leere Welle
   wäre eine geschenkte Minute, und man würde es nicht bemerken. */
for (let w = 1; w <= WELLEN_JE_LAUF; w++) {
  const plan = baueWelle(w, 1, macheZufall(w * 31 + 7)).plan;
  melde(plan.length > 0, `Welle ${w} enthält Gegner`, `${plan.length}`);
  const zuSpaet = plan.filter((e) => e.zeit >= dauerDerWelle(w)).length;
  melde(zuSpaet === 0, `Welle ${w}: niemand erscheint nach dem Ende`, `${zuSpaet} zu spät`);
  const inReihenfolge = plan.every((e, i, a) => i === 0 || e.zeit >= a[i - 1].zeit);
  melde(inReihenfolge, `Welle ${w}: der Bauplan ist nach Zeit sortiert`);
}

/* Alle vier Wellen ein Hauptmann — und zwar wirklich. */
for (let w = 1; w <= WELLEN_JE_LAUF; w++) {
  const plan = baueWelle(w, 1, macheZufall(5)).plan;
  const elite = plan.some((e) => e.art === "hauptmann");
  melde(elite === (w % 4 === 0), `Welle ${w}: Hauptmann ${w % 4 === 0 ? "kommt" : "kommt nicht"}`);
}

ende();
