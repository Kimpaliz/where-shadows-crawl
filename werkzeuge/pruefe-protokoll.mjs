/* [Aufgabe: Prüfwesen] Misst das Auswertungsprotokoll selbst nach — nicht nur, dass es läuft.

   ── Zwei Sorten Zusicherungen, aus gutem Grund getrennt ─────────────

   1. **Am synthetischen Modell.** `spiel/protokoll.mjs` bekommt von Hand
      gebaute, winzige „Welt"-Schnappschüsse vorgesetzt — kein echter
      Lauf. Das prüft die beiden Fallen aus seiner eigenen Kopfnotiz
      Zeile für Zeile: dass ein Wellenende-Überlebender kein erfundener
      Toter wird, dass ein Sofort-Tod erkannt wird, obwohl er nie als
      „getroffen, aber lebend" auftaucht, und dass Gold- und
      Wissensrechnung auch dann stimmen, wenn Aufnahme und Ausgabe im
      selben Schritt zusammenfallen.
   2. **Am echten Spiel, mit mutiertem Katalog.** Vier Gegenproben, wie
      vom Auftrag verlangt: „Verdoppelst du den Waffenschaden, muss die
      Zeit bis zum Tod sinken." Jede läuft in einem **eigenen
      Kindprozess** — sonst liefert der ES-Modulcache beiden Läufen
      denselben (schon mutierten oder schon unmutierten) Katalog, und
      jede Abweichung wäre exakt 0,00. Genau diese Falle steht auch in
      `spiel/wellen.mjs` und `spiel/gase.mjs`-Vorgeschichten aus diesem
      Projekt vermerkt — hier wird sie nicht wiederholt.

   Die Mutation ändert **nur Werte** auf den Katalog-Objekten
   (`w.schaden *= 2` und Ähnliches) — nie eine Datei unter `spiel/`.
   Der Kindprozess importiert den Katalog, verändert die geladenen
   Objekte zur Laufzeit und wirft den Prozess danach weg; auf der
   Festplatte ändert sich nichts.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/protokoll.mjs` (was geprüft wird), `werkzeuge/auswertung.mjs`
   (`spieleUndMisst`, in den Kindprozessen aufgerufen), `helfer.mjs`
   (Melder, Projektwurzel). */

import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { macheMelder, WURZEL } from "./helfer.mjs";
import { macheProtokoll } from "../spiel/protokoll.mjs";
import { schwelle } from "../spiel/stufen.mjs";
import { SCHRITT } from "../spiel/welt.mjs";

const { melde, ende } = macheMelder({ still: true });

/* ── Bausteine für die synthetischen Welten ─────────────────────────

   Absichtlich keine echte `macheWelt()` — diese Prüfung stellt
   `spiel/protokoll.mjs` auf die Probe, nicht den Regelkern (dafür ist
   `pruefe-kern.mjs` da). Ein handgebautes Objekt mit genau den
   Feldern, die `abtasten()` liest, macht jeden Fall einzeln
   nachvollziehbar. */

function weltMit(u) {
  return {
    welle: u.welle, ticks: u.ticks, zeit: u.zeit, dauer: u.dauer,
    phase: u.phase ?? "welle",
    gegner: u.gegner ?? [], beute: u.beute ?? [],
    spieler: u.spieler ?? [],
    verloreneBeute: u.verloreneBeute ?? 0
  };
}

function basisSpieler(u = {}) {
  return {
    x: 0, y: 0, radius: 5, zustand: "lebt", trefferZeit: 0,
    gold: 0, wissen: 0, stufe: 1, leben: 50, lebenMax: 50,
    werte: {}, waffen: [], gegenstaende: [],
    ...u
  };
}

function basisGegner(u = {}) {
  return {
    x: 0, y: 0, radius: 5, tot: false,
    leben: 10, lebenMax: 10, art: { id: "test", gold: 1, wissen: 1 },
    ...u
  };
}

/* ── 1 · Gegner: Tod, Wellenende-Überlebender, Sofort-Tod ──────────── */

function szenarioGegner() {
  const p = macheProtokoll();
  const s = () => [basisSpieler({ x: 100, y: 0 })];

  const g1 = basisGegner({ x: 0, y: 0, leben: 10, lebenMax: 10, art: { id: "a", gold: 1, wissen: 1 } });
  const g2 = basisGegner({ x: 5, y: 5, leben: 8, lebenMax: 8, art: { id: "b", gold: 1, wissen: 1 } });
  p.abtasten(weltMit({ welle: 1, ticks: 1, dauer: 10, zeit: SCHRITT, gegner: [g1, g2], spieler: s() }));

  /* g1 wird getroffen (Leben fällt); g3 erscheint frisch und wird nie
     als „getroffen, aber lebend" gesehen — er stirbt im nächsten
     Schritt direkt aus vollem Leben. */
  g1.leben = 4;
  const g3 = basisGegner({ x: 0, y: 30, leben: 6, lebenMax: 6, art: { id: "c", gold: 1, wissen: 1 } });
  p.abtasten(weltMit({ welle: 1, ticks: 2, dauer: 10, zeit: 2 * SCHRITT, gegner: [g1, g2, g3], spieler: s() }));

  /* g1 und g3 sterben (tot=true, fallen aus dem Array); g2 bleibt am
     Leben und unangetastet. */
  g1.tot = true;
  g3.tot = true;
  p.abtasten(weltMit({ welle: 1, ticks: 3, dauer: 10, zeit: 3 * SCHRITT, gegner: [g2], spieler: s() }));

  /* Wellenende: `beendeWelle()` würde `welt.gegner` jetzt unbedingt
     leeren — g2 lebt noch (`tot` bleibt `false`) und darf deshalb
     **kein** Todesfall werden. */
  p.abtasten(weltMit({ welle: 1, ticks: 4, dauer: 10, zeit: 10, phase: "laden", gegner: [], spieler: s() }));
  /* Wellenwechsel schließt Welle 1 ab. */
  p.abtasten(weltMit({ welle: 2, ticks: 5, dauer: 10, zeit: SCHRITT, gegner: [], spieler: s() }));

  return p.auswerten();
}

{
  const a = szenarioGegner();
  melde(a.gegner.erschienenGesamt === 3, "Gegner: alle drei Erscheinungen gezählt", `${a.gegner.erschienenGesamt}`);
  melde(a.gegner.gestorben === 2, "Gegner: genau zwei Tote (g1, g3)", `${a.gegner.gestorben}`);
  melde(a.gegner.ueberlebtWellenende === 1, "Gegner: g2 zählt als Wellenende-Überlebender, nicht als Toter",
    `${a.gegner.ueberlebtWellenende}`);
  melde(a.gegner.nieGetroffen === 1, "Gegner: g2 war nie getroffen", `${a.gegner.nieGetroffen}`);
  melde(a.gegner.sofortTot === 1 && a.gegner.sofortTotAnteil === 0.5,
    `Gegner: g3 stirbt sofort, obwohl nie als „getroffen, aber lebend" gesehen`,
    `${a.gegner.sofortTot} von ${a.gegner.gestorben}`);
  melde(a.gegner.zeitBisTod.min === 0, "Gegner: g3s Zeit bis zum Tod ist null", `${a.gegner.zeitBisTod.min}`);
  melde(Math.abs(a.gegner.zeitBisTod.max - SCHRITT) < 1e-9,
    "Gegner: g1s Zeit bis zum Tod ist genau ein Schritt", `${a.gegner.zeitBisTod.max}`);
  melde(a.gegner.sterbeEntfernung.min === 100, "Gegner: g1 stirbt exakt 100 px vom Spieler entfernt",
    `${a.gegner.sterbeEntfernung.min}`);
}

/* ── 2 · Beute: aufgesammelt gegen verloren ────────────────────────── */

function szenarioBeute() {
  const p = macheProtokoll();
  const s = () => [basisSpieler()];
  const b1 = { x: 0, y: 0, weg: false };
  const b2 = { x: 1, y: 1, weg: false };

  p.abtasten(weltMit({ welle: 1, ticks: 1, dauer: 10, zeit: SCHRITT, beute: [b1, b2], spieler: s() }));
  p.abtasten(weltMit({ welle: 1, ticks: 2, dauer: 10, zeit: 2 * SCHRITT, beute: [b1, b2], spieler: s() }));

  /* b1 wird aufgesammelt: `weg = true`, fällt aus `welt.beute`. */
  b1.weg = true;
  p.abtasten(weltMit({ welle: 1, ticks: 3, dauer: 10, zeit: 3 * SCHRITT, beute: [b2], spieler: s() }));

  /* Wellenende: `raeumeBeute()` leert `welt.beute` unbedingt, ohne
     `weg` zu setzen. b2 bleibt liegen (`weg` bleibt `false`) — das
     unterscheidet Verlust von Aufsammeln, genau wie `g.tot` bei
     Gegnern. `welt.verloreneBeute` steigt exakt um den Wert von b2. */
  p.abtasten(weltMit({ welle: 1, ticks: 4, dauer: 10, zeit: 10, phase: "laden", beute: [], verloreneBeute: 7, spieler: s() }));
  p.abtasten(weltMit({ welle: 2, ticks: 5, dauer: 10, zeit: SCHRITT, beute: [], verloreneBeute: 7, spieler: s() }));

  return p.auswerten();
}

{
  const a = szenarioBeute();
  melde(a.beute.anzahlAufgesammelt === 1, "Beute: b1 zählt als aufgesammelt", `${a.beute.anzahlAufgesammelt}`);
  melde(a.beute.anzahlVerloren === 1, "Beute: b2 zählt als verloren, nicht als aufgesammelt", `${a.beute.anzahlVerloren}`);
  melde(a.beute.zeitBisAufsammeln.anzahl === 1
    && Math.abs(a.beute.zeitBisAufsammeln.min - 2 * SCHRITT) < 1e-9,
    "Beute: Zeit bis zum Aufsammeln ist genau zwei Schritte", `${a.beute.zeitBisAufsammeln.min}`);
  melde(a.beute.goldVerlorenGesamt === 7, "Beute: welt.verloreneBeute exakt übernommen", `${a.beute.goldVerlorenGesamt}`);
}

/* ── 3 · Spieler: Tod, echtes Aufhelfen gegen Wellenende-Automatik ─── */

function szenarioSpieler() {
  const p = macheProtokoll();
  const spieler = basisSpieler({ zustand: "lebt" });
  const welt = (ticks, zeit, phase) => weltMit({ welle: 1, ticks, dauer: 10, zeit, phase, spieler: [spieler] });

  p.abtasten(welt(1, SCHRITT));
  spieler.zustand = "liegt";                 // Tod 1, mitten in der Welle
  p.abtasten(welt(2, 2 * SCHRITT));          // liegt während „welle" → zählt zur Bodenzeit
  p.abtasten(welt(3, 3 * SCHRITT));          // liegt weiter → zählt
  spieler.zustand = "lebt";                  // ein Mitspieler hilft — echtes Aufhelfen
  p.abtasten(welt(4, 4 * SCHRITT));
  spieler.zustand = "liegt";                 // Tod 2, kurz vor Wellenende
  p.abtasten(welt(5, 10));                   // letzter „welle"-Schritt → zählt zur Bodenzeit
  spieler.zustand = "lebt";                  // Wellenende-Automatik: Phase ist NICHT „welle"
  p.abtasten(welt(6, 10, "laden"));
  p.abtasten(weltMit({ welle: 2, ticks: 7, dauer: 10, zeit: SCHRITT, spieler: [spieler] }));

  return p.auswerten();
}

{
  const a = szenarioSpieler();
  const sp = a.spieler[0];
  melde(sp.todeGesamt === 2, "Spieler: zwei Tode gezählt", `${sp.todeGesamt}`);
  melde(sp.aufgeholfenAnzahl === 1,
    "Spieler: nur das Aufhelfen mitten in der Welle zählt, nicht die Wellenende-Automatik",
    `${sp.aufgeholfenAnzahl}`);
  melde(Math.abs(sp.zeitAmBodenSekunden - 3 * SCHRITT) < 1e-9,
    "Spieler: drei Schritte am Boden (Tick 2, 3, 5)", `${sp.zeitAmBodenSekunden}`);
  melde(a.wellen[0].todeSpieler === 2, "Welle 1 selbst zählt beide Tode mit", `${a.wellen[0].todeSpieler}`);
}

/* ── 4 · Schadensquelle: Berührung gegen Fernkampf ─────────────────── */

function szenarioSchaden() {
  const p = macheProtokoll();
  const nah = basisGegner({ x: 3, y: 0, radius: 5 });   // 3 px von Spieler(0,0) entfernt: in Kontaktreichweite
  const spieler = basisSpieler({ x: 0, y: 0, radius: 5, trefferZeit: 0 });
  const welt = (ticks, zeit) => weltMit({ welle: 1, ticks, dauer: 10, zeit, gegner: [nah], spieler: [spieler] });

  p.abtasten(welt(1, SCHRITT));
  spieler.trefferZeit = 0.25;              // Treffer, `nah` steht in Kontaktreichweite → Berührung
  p.abtasten(welt(2, 2 * SCHRITT));
  spieler.trefferZeit = 0;                 // abgeklungen
  p.abtasten(welt(3, 3 * SCHRITT));
  spieler.x = 900;                         // niemand mehr in Kontaktreichweite
  p.abtasten(welt(4, 4 * SCHRITT));
  spieler.trefferZeit = 0.25;              // Treffer ohne Gegner in Reichweite → Fernkampf
  p.abtasten(welt(5, 5 * SCHRITT));

  return p.auswerten();
}

{
  const a = szenarioSchaden();
  melde(a.schadenQuelle.beruehrung === 1 && a.schadenQuelle.fernkampf === 1 && a.schadenQuelle.gesamt === 2,
    "Schadensquelle: je ein Treffer Berührung und Fernkampf, richtig unterschieden",
    `${a.schadenQuelle.beruehrung}/${a.schadenQuelle.fernkampf}`);
}

/* ── 5 · Gold per Differenzsumme, Wissen per Rückrechnung ──────────── */

function szenarioRessourcen() {
  const p = macheProtokoll();
  const spieler = basisSpieler({ gold: 0, wissen: 0, stufe: 1 });
  const welt = (ticks, zeit, phase, welle = 1) => weltMit({ welle, ticks, dauer: 10, zeit, phase, spieler: [spieler] });

  p.abtasten(welt(1, SCHRITT));
  spieler.gold = 20;                       // +20 aufgesammelt
  spieler.wissen = 10; spieler.stufe = 2;  // ein Aufstieg, `schwelle(1)` verbraucht, 10 bleiben übrig
  p.abtasten(welt(2, 2 * SCHRITT));
  spieler.gold = 5;                        // -15 ausgegeben (Laden) — zählt nicht als Aufnahme
  p.abtasten(welt(3, 3 * SCHRITT, "laden"));
  spieler.gold = 15;                       // +10 aufgesammelt, neue Welle
  p.abtasten(welt(4, SCHRITT, "welle", 2));

  return p.auswerten();
}

{
  const a = szenarioRessourcen();
  const sp = a.spieler[0];
  /* Naiv (Endwert minus Anfangswert) ergäbe 15 — der Unterschied zu 30
     ist genau die Aussage dieser Prüfung: Ausgeben und Aufnehmen
     dürfen sich nicht gegeneinander aufheben. */
  melde(sp.goldAufgesammeltGesamt === 30,
    "Gold: Differenzsumme zählt nur Zugänge (20+10=30), nicht den Nettoeffekt (15)",
    `${sp.goldAufgesammeltGesamt}`);
  melde(sp.wissenVerbrauchtGesamt === schwelle(1),
    "Wissen: Verbrauch aus der Aufstiegsformel zurückgerechnet", `${sp.wissenVerbrauchtGesamt} = schwelle(1)`);
  melde(sp.wissenAufgesammeltGesamt === 10 + schwelle(1),
    "Wissen: aufgesammelt = übrig + verbraucht, nicht die rohe Differenz",
    `${sp.wissenAufgesammeltGesamt}`);
}

/* ── 6 · Wiederholbarkeit: dieselbe Saat gibt dieselbe Auswertung ──── */

{
  const eigeneImports = pathToFileURL(WURZEL.endsWith("/") ? WURZEL : WURZEL + "/").href;
  const quelltext = [
    `import { spieleUndMisst } from ${JSON.stringify(eigeneImports + "werkzeuge/auswertung.mjs")};`,
    `const { protokoll } = spieleUndMisst({ spielerzahl: 2, saat: 42 });`,
    `process.stdout.write(JSON.stringify(protokoll));`
  ].join("\n");
  const datei = join(tmpdir(), `pruefe-protokoll-wiederholbar-${process.pid}.mjs`);
  writeFileSync(datei, quelltext, "utf8");
  let a, b;
  try {
    a = spawnSync(process.execPath, [datei], { encoding: "utf8", cwd: WURZEL }).stdout;
    b = spawnSync(process.execPath, [datei], { encoding: "utf8", cwd: WURZEL }).stdout;
  } finally {
    unlinkSync(datei);
  }
  melde(a === b, "zwei Läufe mit derselben Saat geben dieselbe Auswertung (zeichengleich)", `${a.length} Zeichen`);
}

/* ── Vier Gegenproben am echten Spiel, mutierter Katalog ────────────

   Jede in einem eigenen Kindprozess — siehe Kopfnotiz. Die Mutation
   ändert nur geladene Objekte im Kindprozess, nie eine Datei. */

function misst(saat, spielerzahl, mutation) {
  const basis = pathToFileURL(WURZEL.endsWith("/") ? WURZEL : WURZEL + "/").href;
  const quelltext = [
    `import { WAFFEN } from ${JSON.stringify(basis + "spiel/katalog/waffen.mjs")};`,
    `import { GEGNER } from ${JSON.stringify(basis + "spiel/katalog/gegner.mjs")};`,
    `import { MODUS_NACH_ID } from ${JSON.stringify(basis + "spiel/katalog/modi.mjs")};`,
    `import { spieleUndMisst } from ${JSON.stringify(basis + "werkzeuge/auswertung.mjs")};`,
    mutation,
    `const { protokoll } = spieleUndMisst({ spielerzahl: ${spielerzahl}, saat: ${saat} });`,
    `process.stdout.write(JSON.stringify(protokoll));`
  ].join("\n");
  const datei = join(tmpdir(), `pruefe-protokoll-messung-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(datei, quelltext, "utf8");
  try {
    const r = spawnSync(process.execPath, [datei], { encoding: "utf8", cwd: WURZEL });
    if (r.status !== 0) throw new Error(`Kindprozess (Saat ${saat}) fehlgeschlagen:\n${r.stderr}`);
    return JSON.parse(r.stdout);
  } finally {
    unlinkSync(datei);
  }
}

/* G1 · doppelter Waffenschaden verkürzt die Zeit vom ersten Treffer bis zum Tod */
{
  const basis = misst(1, 1, "");
  const doppelt = misst(1, 1, "for (const w of WAFFEN) w.schaden *= 2;");
  melde(basis.gegner.zeitBisTod && doppelt.gegner.zeitBisTod, "G1: beide Läufe liefern eine Verteilung");
  melde(doppelt.gegner.zeitBisTod.mittel < basis.gegner.zeitBisTod.mittel,
    "G1: doppelter Waffenschaden verkürzt die Zeit bis zum Tod",
    `${basis.gegner.zeitBisTod.mittel.toFixed(3)} s → ${doppelt.gegner.zeitBisTod.mittel.toFixed(3)} s`);
}

/* G2 · doppeltes Gegnerleben senkt den Sofort-Tot-Anteil und verlängert die Zeit bis zum Tod */
{
  const basis = misst(3, 1, "");
  const zaeh = misst(3, 1, "for (const g of GEGNER) g.leben *= 2;");
  melde(basis.gegner.gestorben > 0 && zaeh.gegner.gestorben > 0, "G2: beide Läufe haben Tote");
  melde(zaeh.gegner.sofortTotAnteil < basis.gegner.sofortTotAnteil,
    "G2: doppeltes Gegnerleben senkt den Anteil, der beim ersten Treffer stirbt",
    `${(basis.gegner.sofortTotAnteil * 100).toFixed(0)} % → ${(zaeh.gegner.sofortTotAnteil * 100).toFixed(0)} %`);
  melde(zaeh.gegner.zeitBisTod.mittel > basis.gegner.zeitBisTod.mittel,
    "G2: doppeltes Gegnerleben verlängert die Zeit bis zum Tod",
    `${basis.gegner.zeitBisTod.mittel.toFixed(3)} s → ${zaeh.gegner.zeitBisTod.mittel.toFixed(3)} s`);
}

/* G3 · doppeltes Grabgold verdoppelt exakt das in Welle 1 erschienene Gold —
   Welle 1 hat noch keinen Ladenbesuch hinter sich, ihr Gegnerplan hängt
   nur von Saat, Spielerzahl und Wellennummer ab, nie vom Gold. Eine
   exakte Zahl statt einer Richtung, weil hier keine Rückkopplung auf
   den Spielverlauf möglich ist. */
{
  const basis = misst(5, 1, "");
  const doppelt = misst(5, 1, "for (const g of GEGNER) g.gold *= 2;");
  const goldBasis = basis.wellen[0].goldErschienen;
  const goldDoppelt = doppelt.wellen[0].goldErschienen;
  melde(goldBasis > 0, "G3: Welle 1 lässt überhaupt Gold fallen", `${goldBasis}`);
  melde(Math.abs(goldDoppelt - goldBasis * 2) < 1e-6,
    "G3: doppeltes Grabgold verdoppelt das erschienene Gold in Welle 1 exakt",
    `${goldBasis} → ${goldDoppelt}`);
}

/* G4 · jede Welle als Bosswelle: die Zahl getöteter Hauptmänner folgt der Wellenzahl */
{
  const jedeWelleBoss = "const arena = MODUS_NACH_ID.get('arena'); arena.elitewelleJede = 1; "
    + "arena.endet = () => 'elite';";
  const a = misst(9, 1, jedeWelleBoss);
  const hauptmann = a.gegner.jeArt.find((e) => e.art === "hauptmann");
  const anzahl = hauptmann ? hauptmann.anzahl : 0;
  /* Höchstens die allerletzte, mitten unterbrochene Welle bleibt ohne
     getöteten Hauptmann — jede vorige Welle endet laut `endet: "elite"`
     erst mit seinem Tod (`rundeVorbei` in `welt.mjs`). */
  melde(a.gesamtWellen > 0, "G4: der mutierte Lauf erreicht überhaupt eine Welle", `${a.gesamtWellen}`);
  melde(anzahl >= a.gesamtWellen - 1 && anzahl <= a.gesamtWellen,
    `G4: mit „jede Welle ist Bosswelle" stirbt in praktisch jeder Welle ein Hauptmann`,
    `${anzahl} von ${a.gesamtWellen} Wellen`);
}

ende();
