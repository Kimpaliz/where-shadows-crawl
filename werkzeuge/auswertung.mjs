/* [Aufgabe: Prüfwesen] Das Auswertungsprotokoll spielen und lesbar machen.

       node werkzeuge/auswertung.mjs [--spieler 1] [--saat 1]
       node werkzeuge/auswertung.mjs --json > lauf.json
       node werkzeuge/auswertung.mjs --vergleich lauf-alt.json

   ── Wozu ───────────────────────────────────────────────────────────

   `spiel/protokoll.mjs` tastet einen Lauf ab und liefert ein Zahlenobjekt.
   Diese Datei spielt genau **einen** Lauf mit dem Kunstspieler aus
   `balance.mjs` (über dessen `beobachter`-Haken) und macht aus dem
   Ergebnis zwei Dinge: eine Tabelle für den Bildschirm, und eine JSON-Datei
   für den Vergleich zweier Stände — der eigentliche Zweck. Jannik will
   nach einer Änderung sehen, was sich verschoben hat.

   ⚠️ **Derselbe Kunstspieler wie in `balance.mjs`.** Er weicht besser
   aus als ein Mensch (er sieht alle Gegner gleichzeitig und zittert
   nicht) und kauft dümmer (er kennt keine Baupläne). Die Zahlen hier
   taugen für **Vergleiche zwischen zwei Läufen mit derselben Saat**,
   nicht als Vorhersage, was Jannik beim Spielen erlebt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/protokoll.mjs` (die Messung selbst), `werkzeuge/balance.mjs`
   (`spieleLauf` mit dem `beobachter`-Haken), `werkzeuge/pruefe-protokoll.mjs`
   (die Gegenproben, dass hier wirklich etwas gemessen wird). */

import { writeFileSync, readFileSync } from "node:fs";
import { macheProtokoll } from "../spiel/protokoll.mjs";
import { spieleLauf } from "./balance.mjs";

/* ── Kommandozeile ───────────────────────────────────────────────── */
const wert = (name, standard) => {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? Number(process.argv[i + 1]) : standard;
};
const textWert = (name) => {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : null;
};

export function spieleUndMisst({ spielerzahl = 1, saat = 1, modusId } = {}) {
  const protokoll = macheProtokoll();
  const ergebnis = spieleLauf({ spielerzahl, saat, modusId, beobachter: (welt) => protokoll.abtasten(welt) });
  return { lauf: ergebnis, protokoll: protokoll.auswerten() };
}

/* ── Formatierung ────────────────────────────────────────────────── */
const z2 = (n) => (Number.isFinite(n) ? n.toFixed(2) : "–");
const z1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : "–");
const z0 = (n) => (Number.isFinite(n) ? Math.round(n).toString() : "–");
const pz = (n) => (Number.isFinite(n) ? (n * 100).toFixed(0) + " %" : "–");

function druckeVerteilung(titel, v, einheit = "") {
  if (!v) { console.log(`  ${titel}: keine Fälle`); return; }
  console.log(`  ${titel}  ·  Median ${z1(v.median)}${einheit}  ·  10 %/90 % `
    + `${z1(v.p10)}${einheit}/${z1(v.p90)}${einheit}  ·  Spanne ${z1(v.min)}${einheit}…${z1(v.max)}${einheit}`
    + `  ·  Mittel ${z1(v.mittel)}${einheit}  ·  n=${v.anzahl}`);
}

function druckeTabelle(a) {
  const { lauf, protokoll: p } = a;
  console.log(`\n  Lauf: ${lauf.spielerzahl} Spieler, Saat ${lauf.saat}, Ausgang „${lauf.phase}" `
    + `in Welle ${lauf.welle} nach ${z1(lauf.sekunden)} s`);
  console.log(`  ⚠️  Kunstspieler — weicht besser aus als ein Mensch, kauft dümmer. `
    + `Zahlen taugen für Vergleiche, nicht als Vorhersage.\n`);

  console.log(`══ Runde ${"═".repeat(50)}\n`);
  console.log(`  Welle  Dauer geplant/echt  Restzeit  Gegner (Höchst/Mittel)   `
    + `erschienen/getötet  je Sek. erschienen/getötet (Stau)`);
  for (const w of p.wellen) {
    console.log(`  ${String(w.welle).padStart(5)}  ${z1(w.dauerGeplant).padStart(6)} s / `
      + `${z1(w.dauerTatsaechlich).padStart(6)} s  ${z1(w.restzeit).padStart(6)} s  `
      + `${z0(w.gegnerHoechststand).padStart(6)} / ${z1(w.gegnerMittel).padStart(5)}         `
      + `${String(w.erschienenAnzahl).padStart(4)} / ${String(w.getoetetAnzahl).padStart(4)}          `
      + `${z2(w.erschienenJeSekunde)} / ${z2(w.getoetetJeSekunde)}  (${z2(w.stau)})`);
  }

  console.log(`\n══ Zeitmarken der letzten Welle ${"═".repeat(28)}\n`);
  const letzte = p.wellen[p.wellen.length - 1];
  if (letzte) for (const m of letzte.marken) {
    console.log(`  ${pz(m.anteil).padStart(4)} der Welle  ·  ${String(m.gegnerZahl).padStart(3)} Gegner  ·  `
      + `Leben im Mittel ${z0(m.lebenMittel)}  ·  Tiefstand ${z0(m.lebenTief)}`);
  }

  console.log(`\n══ Gegner ${"═".repeat(48)}\n`);
  console.log(`  erschienen gesamt        ${p.gegner.erschienenGesamt}`);
  console.log(`  gestorben                ${p.gegner.gestorben}`);
  console.log(`  am Wellenende überlebt    ${p.gegner.ueberlebtWellenende}`);
  console.log(`  nie getroffen             ${p.gegner.nieGetroffen}`);
  console.log(`  stirbt beim ersten Treffer  ${pz(p.gegner.sofortTotAnteil)}`);
  druckeVerteilung("Zeit vom ersten Treffer bis zum Tod", p.gegner.zeitBisTod, " s");
  druckeVerteilung("Entfernung zum nächsten Spieler beim Sterben", p.gegner.sterbeEntfernung, " px");
  console.log(`\n  je Gegnerart:`);
  for (const a2 of p.gegner.jeArt) {
    console.log(`    ${a2.art.padEnd(14)}  ${String(a2.anzahl).padStart(4)} getötet  ·  `
      + `sofort tot ${pz(a2.sofortTotAnteil)}  ·  Median bis Tod `
      + `${a2.zeitBisTod ? z2(a2.zeitBisTod.median) + " s" : "–"}`);
  }

  console.log(`\n══ Spieler ${"═".repeat(47)}\n`);
  for (const s of p.spieler) {
    console.log(`  Spieler ${s.index}  ·  Tode ${s.todeGesamt}  ·  aufgeholfen ${s.aufgeholfenAnzahl}  ·  `
      + `Zeit am Boden ${z1(s.zeitAmBodenSekunden)} s  ·  Gold aufgesammelt ${z0(s.goldAufgesammeltGesamt)}  ·  `
      + `Wissen aufgesammelt ${z0(s.wissenAufgesammeltGesamt)}`);
  }
  console.log(`\n  Schaden nach Quelle  ·  Berührung ${p.schadenQuelle.beruehrung}  ·  `
    + `Fernkampf ${p.schadenQuelle.fernkampf}  ·  gesamt ${p.schadenQuelle.gesamt}`);

  console.log(`\n══ Beute und Aufstieg ${"═".repeat(37)}\n`);
  console.log(`  Gold erschienen/verloren    ${z0(p.beute.goldErschienenGesamt)} / `
    + `${z0(p.beute.goldVerlorenGesamt)}  (${pz(p.beute.anteilGoldVerloren)})`);
  console.log(`  Wissen erschienen           ${z0(p.beute.wissenErschienenGesamt)}`);
  console.log(`  Stücke aufgesammelt/verloren  ${p.beute.anzahlAufgesammelt} / ${p.beute.anzahlVerloren}`);
  druckeVerteilung("Zeit bis zum Aufsammeln", p.beute.zeitBisAufsammeln, " s");

  console.log(`\n══ Powerscaling ${"═".repeat(43)}\n`);
  console.log(`  Welle  Bedarf (LP/s)  Leistung (LP/s)  Verhältnis  Stufe je Spieler`);
  for (const w of p.wellen) {
    const stufen = (w.spielerEndzustand || []).map((s) => s.stufe).join(",");
    console.log(`  ${String(w.welle).padStart(5)}  ${z1(w.lebenBedarfJeSekunde).padStart(12)}  `
      + `${z1(w.leistungJeSekunde).padStart(14)}  ${z2(w.verhaeltnisLeistungZuBedarf).padStart(9)}  ${stufen}`);
  }
  console.log();
}

/* ── Vergleich zweier Stände ─────────────────────────────────────── */
function zahlenPfade(objekt, pfad = "") {
  const raus = [];
  if (typeof objekt === "number") { raus.push([pfad, objekt]); return raus; }
  if (Array.isArray(objekt)) {
    objekt.forEach((v, i) => raus.push(...zahlenPfade(v, `${pfad}[${i}]`)));
    return raus;
  }
  if (objekt && typeof objekt === "object") {
    for (const [k, v] of Object.entries(objekt)) raus.push(...zahlenPfade(v, pfad ? `${pfad}.${k}` : k));
    return raus;
  }
  return raus;
}

export function vergleiche(alt, neu) {
  const altMap = new Map(zahlenPfade(alt));
  const neuMap = new Map(zahlenPfade(neu));
  const pfade = new Set([...altMap.keys(), ...neuMap.keys()]);
  const zeilen = [];
  for (const pfad of pfade) {
    const a = altMap.has(pfad) ? altMap.get(pfad) : null;
    const n = neuMap.has(pfad) ? neuMap.get(pfad) : null;
    if (a === n) continue;
    const differenz = (a !== null && n !== null) ? n - a : null;
    zeilen.push({ pfad, alt: a, neu: n, differenz });
  }
  return zeilen.sort((x, y) => x.pfad.localeCompare(y.pfad));
}

function druckeVergleich(zeilen) {
  console.log(`\n══ Vergleich ${"═".repeat(46)}\n`);
  if (zeilen.length === 0) { console.log("  keine Zahl hat sich verschoben\n"); return; }
  for (const z of zeilen) {
    const a = z.alt === null ? "–" : z2(z.alt);
    const n = z.neu === null ? "–" : z2(z.neu);
    const d = z.differenz === null ? "" : `  (${z.differenz >= 0 ? "+" : ""}${z2(z.differenz)})`;
    console.log(`  ${z.pfad.padEnd(48)}  ${a} → ${n}${d}`);
  }
  console.log(`\n  ${zeilen.length} Zahl(en) verschoben\n`);
}

/* ── Aufruf von der Kommandozeile ────────────────────────────────── */
const selbstAufgerufen = process.argv[1] && process.argv[1].endsWith("auswertung.mjs");
if (selbstAufgerufen) {
  const spielerzahl = wert("spieler", 1);
  const saat = wert("saat", 1);
  const modusId = textWert("modus") || undefined;
  const ergebnis = spieleUndMisst({ spielerzahl, saat, modusId });

  const vergleichsDatei = textWert("vergleich");
  if (vergleichsDatei) {
    const alt = JSON.parse(readFileSync(vergleichsDatei, "utf8"));
    const altProtokoll = alt.protokoll ?? alt;
    druckeVergleich(vergleiche(altProtokoll, ergebnis.protokoll));
  } else if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify(ergebnis, null, 2) + "\n");
  } else {
    druckeTabelle(ergebnis);
  }

  const ausgabeDatei = textWert("speichern");
  if (ausgabeDatei) {
    writeFileSync(ausgabeDatei, JSON.stringify(ergebnis, null, 2));
    console.log(`  gespeichert: ${ausgabeDatei}`);
  }
}
