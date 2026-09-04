/* [Aufgabe: Prüfwesen] Spielt ganze Läufe durch — ohne Browser.

       node werkzeuge/balance.mjs [--laeufe 40] [--spieler 1] [--saat 1]
       node werkzeuge/balance.mjs --tabelle        (1 bis 4 Spieler)

   ── Wozu ───────────────────────────────────────────────────────────

   Jede Zahl in `spiel/katalog/` ist eine Behauptung darüber, wie sich
   das Spiel anfühlt. Ohne einen Lauf, der sie nachrechnet, bleibt sie
   eine Behauptung. Dieser Prüfstand ist der Grund, warum `spiel/`
   keinen Browser kennen darf (docs/SPIEL.md 8): Vierzig Läufe à zwölf
   Wellen sind hier Sekunden statt zwei Stunden Spielzeit.

   ⚠️ **Was er nicht misst.** Der Kunstspieler weicht besser aus als
   ein Mensch (er sieht alle Gegner gleichzeitig und zittert nicht) und
   kauft dümmer (er kennt keine Baupläne). Die Zahlen taugen deshalb
   für **Vergleiche** — „Welle 9 ist härter als Welle 8", „zu viert
   fällt mehr Gold" —, nicht als Vorhersage, wie weit Jannik kommt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/lauf.mjs` (dieselbe Schnittstelle, die auch das Spiel
   benutzt), `werkzeuge/pruefe-balance.mjs` (macht aus diesen Messungen
   Wächter). */

import { starteLauf, naechsteWelle, oeffneKraemer, schrittImLauf, SCHRITT, WELLEN_JE_LAUF } from "../spiel/lauf.mjs";
import { kaufe, wuerfleNeu, WAFFEN_PLAETZE } from "../spiel/laden.mjs";
import { nimmKarte } from "../spiel/stufen.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { basename } from "node:path";

/* ── Der Kunstspieler ───────────────────────────────────────────────

   Drei Kräfte, gewichtet: weg von Gegnern, hin zur Beute, weg vom
   Rand. Bewusst einfach — ein cleverer Bot würde messen, wie gut *er*
   ist, nicht wie hart das Spiel ist. */
export function botEingabe(welt, spieler) {
  if (spieler.zustand !== "lebt") return { x: 0, y: 0 };
  let fx = 0, fy = 0;

  /* Der Bot haelt genau so viel Abstand, wie seine kuerzeste Waffe
     ueberbrueckt. Eine feste Zahl hier misst nicht das Spiel, sondern
     den Bot: Mit 70 wich er vor einer Waffe mit 34 Reichweite zurueck
     und hat nie zugeschlagen. */
  const naechste = Math.min(...spieler.waffen.map((w) => w.vorlage.reichweite));
  const abstand = Math.max(30, naechste - 4);
  for (const g of welt.gegner) {
    const dx = spieler.x - g.x, dy = spieler.y - g.y;
    const d = Math.hypot(dx, dy);
    if (d > abstand || d === 0) continue;
    const kraft = (abstand - d) / abstand;
    fx += (dx / d) * kraft * 2.6;
    fy += (dy / d) * kraft * 2.6;
  }

  let nah = null, bestes = Infinity;
  for (const b of welt.beute) {
    const q = (b.x - spieler.x) ** 2 + (b.y - spieler.y) ** 2;
    if (q < bestes) { bestes = q; nah = b; }
  }
  if (nah && bestes < 130 ** 2) {
    const dx = nah.x - spieler.x, dy = nah.y - spieler.y;
    const d = Math.hypot(dx, dy) || 1;
    fx += (dx / d) * 1.0; fy += (dy / d) * 1.0;
  }

  /* Einen liegenden Mitspieler holt der Bot — sonst misst der Lauf zu
     viert nur, wie schnell die Gruppe zerfällt. */
  for (const h of welt.spieler) {
    if (h === spieler || h.zustand !== "liegt") continue;
    const dx = h.x - spieler.x, dy = h.y - spieler.y;
    const d = Math.hypot(dx, dy) || 1;
    fx += (dx / d) * 1.8; fy += (dy / d) * 1.8;
  }

  const rand = Math.hypot(spieler.x, spieler.y);
  if (rand > welt.arena.radius - 26 && rand > 0) {
    fx -= (spieler.x / rand) * 2.2; fy -= (spieler.y / rand) * 2.2;
  }

  const l = Math.hypot(fx, fy);
  return l > 0 ? { x: fx / l, y: fy / l } : { x: 0, y: 0 };
}

/* Kauft, was am meisten hilft: Waffen, solange Plätze frei sind, dann
   das Teuerste, was noch bezahlbar ist. Würfelt einmal neu, wenn gar
   nichts passt und Gold übrig bleibt. */
function botKauft(welt, spieler, welle) {
  for (let runde = 0; runde < 8; runde++) {
    const bezahlbar = spieler.angebote
      .map((a, i) => [a, i])
      .filter(([a]) => !a.gekauft && a.preis <= spieler.gold);
    if (bezahlbar.length === 0) break;

    /* Waffen zuerst, aber nur bis vier. Sechs Waffen und null
       Verteidigung waere offensichtlich schlechtes Spiel und wuerde
       den Bot messen statt die Auslegung. */
    const eilig = spieler.waffen.length < 4;
    const bewerte = (a) => (a.sorte === "waffe" && eilig ? 1000 : 0) + a.preis;
    bezahlbar.sort((a, b) => bewerte(b[0]) - bewerte(a[0]));
    if (!kaufe(spieler, bezahlbar[0][1])) break;
  }
  if (spieler.gold > 60 && spieler.malGewuerfelt < 2) {
    if (wuerfleNeu(welt, spieler, welle)) botKauft(welt, spieler, welle);
  }
}

function botWaehlt(welt, zufall) {
  for (const s of welt.spieler) {
    let schutz = 0;
    while (s.offeneWahlen > 0 && schutz++ < 40) {
      /* Gewichtet, aber nicht optimal — ein Bot, der immer Schaden
         nimmt, misst nur einen einzigen Bauplan. */
      /* Leben und Schaden doppelt gewichtet — das ist, was ein
         vernuenftiger Mensch tut, und nicht, was ein Rechner
         optimieren wuerde. */
      const karten = s.karten ?? [];
      const topf = [];
      karten.forEach((k, i) => {
        const mal = (k.wert === "leben" || k.wert === "schaden") ? 2 : 1;
        for (let n = 0; n < mal; n++) topf.push(i);
      });
      nimmKarte(welt, s, topf.length ? topf[zufall.ganz(0, topf.length - 1)] : 0);
    }
  }
}

/* Eine Notbremse fuer endlose Modi. 200 Wellen sind rund zwei
   Stunden Spielzeit — wer so weit kommt, hat das Spiel gebrochen, und
   genau das soll die Messung melden statt ewig zu laufen. */
export const WELLEN_DECKEL = 200;

export function spieleLauf({ spielerzahl = 1, saat = 1, modusId } = {}) {
  const welt = starteLauf({ spielerzahl, saat, modusId });
  const botZufall = macheZufall(saat ^ 0x5eed);
  const wellenBericht = [];
  let schritte = 0;

  while (!["gewonnen", "verloren"].includes(welt.phase)
    && schritte < 60 * 60 * 240 && welt.welle <= WELLEN_DECKEL) {
    if (welt.phase === "laden" || welt.phase === "vorspiel") {
      if (welt.phase === "laden") {
        oeffneKraemer(welt);
        for (const s of welt.spieler) botKauft(welt, s, welt.welle + 1);
      }
      const vorher = welt.spieler.map((s) => ({ leben: s.leben, gold: s.gold }));
      if (!naechsteWelle(welt)) break;
      wellenBericht.push({
        welle: welt.welle,
        lebenVorher: vorher.map((v) => Math.round(v.leben)),
        goldVorher: vorher.map((v) => Math.round(v.gold))
      });
      continue;
    }
    if (welt.phase === "wahl") { botWaehlt(welt, botZufall); schrittImLauf(welt, []); continue; }

    const eingaben = welt.spieler.map((s) => botEingabe(welt, s));
    schrittImLauf(welt, eingaben);
    schritte++;
  }

  return {
    saat, spielerzahl, phase: welt.phase, welle: welt.welle,
    sekunden: schritte * SCHRITT,
    spieler: welt.spieler.map((s) => ({
      stufe: s.stufe, gold: Math.round(s.gold), getoetet: s.getoetet,
      leben: Math.round(s.leben), lebenMax: s.lebenMax,
      waffen: s.waffen.map((w) => `${w.id}${w.stufe}`),
      gegenstaende: s.gegenstaende.length,
      werte: Object.fromEntries(Object.entries(s.werte).map(([k, v]) => [k, Math.round(v)]))
    })),
    verloreneBeute: Math.round(welt.verloreneBeute),
    wellenBericht
  };
}

export function messreihe({ laeufe = 40, spielerzahl = 1, saat = 1 } = {}) {
  const ergebnisse = [];
  for (let i = 0; i < laeufe; i++) ergebnisse.push(spieleLauf({ spielerzahl, saat: saat + i * 977 }));
  const gewonnen = ergebnisse.filter((e) => e.phase === "gewonnen").length;
  const wellen = ergebnisse.map((e) => e.welle).sort((a, b) => a - b);
  const stufen = ergebnisse.map((e) => e.spieler[0].stufe);
  const mittel = (l) => l.reduce((a, b) => a + b, 0) / l.length;

  /* Wie viele Läufe **in** Welle n enden. Der Mittelwert allein
     verdeckt genau das, was man wissen will: ob es eine Wand gibt.
     Eine Wand sieht im Mittelwert aus wie eine Kurve. */
  /* Bei einem endlosen Modus gibt es keine feste Wellenzahl — das
     Histogramm muss so weit reichen wie der weiteste Lauf. */
  const weiteste = Math.max(WELLEN_JE_LAUF, ...ergebnisse.map((e) => e.welle));
  const stirbtIn = new Array(weiteste + 1).fill(0);
  for (const e of ergebnisse) if (e.phase === "verloren") stirbtIn[e.welle]++;
  const abgebrochen = ergebnisse.filter((e) => e.phase !== "verloren" && e.phase !== "gewonnen").length;

  return {
    laeufe, spielerzahl,
    siegquote: gewonnen / laeufe,
    welleMittel: mittel(wellen),
    welleMedian: wellen[Math.floor(wellen.length / 2)],
    welleSchlechteste: wellen[0],
    stufeMittel: mittel(stufen),
    stirbtIn, abgebrochen,
    ergebnisse
  };
}

/* ── Aufruf von der Kommandozeile ───────────────────────────────── */
const wert = (name, standard) => {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? Number(process.argv[i + 1]) : standard;
};

/* Nur wenn **diese** Datei aufgerufen wurde. `endsWith("balance.mjs")`
   war falsch: `pruefe-balance.mjs` endet genauso, und der Pruefstand
   druckte beim Import seine ganze Kommandozeilenausgabe mitten in die
   Pruefkette. Verglichen wird deshalb der Dateiname als Ganzes. */
const selbstAufgerufen = process.argv[1] && basename(process.argv[1]) === "balance.mjs";
if (selbstAufgerufen) {
  if (process.argv.includes("--tabelle")) {
    const laeufe = wert("laeufe", 24);
    console.log(`\n  Spieler  Siege  Welle Mittel  Median  schlechteste  Stufe`);
    console.log("  " + "-".repeat(60));
    for (let n = 1; n <= 4; n++) {
      const m = messreihe({ laeufe, spielerzahl: n, saat: 1 });
      console.log(`  ${String(n).padStart(7)}  ${(m.siegquote * 100).toFixed(0).padStart(4)}%  `
        + `${m.welleMittel.toFixed(1).padStart(11)}  ${String(m.welleMedian).padStart(6)}  `
        + `${String(m.welleSchlechteste).padStart(12)}  ${m.stufeMittel.toFixed(1).padStart(5)}   `
        + m.stirbtIn.slice(1).map((z) => z === 0 ? " ." : String(z).padStart(2)).join(""));
    }
    console.log(`\n  ${laeufe} Laeufe je Spielerzahl\n`);
  } else {
    const m = messreihe({
      laeufe: wert("laeufe", 40), spielerzahl: wert("spieler", 1), saat: wert("saat", 1)
    });
    console.log(`\n  ${m.laeufe} Laeufe, ${m.spielerzahl} Spieler`);
    console.log(`  Siegquote        ${(m.siegquote * 100).toFixed(0)} %`);
    console.log(`  Welle im Mittel  ${m.welleMittel.toFixed(1)}`);
    console.log(`  Median           ${m.welleMedian}`);
    console.log(`  schlechtester    ${m.welleSchlechteste}`);
    console.log(`  Stufe im Mittel  ${m.stufeMittel.toFixed(1)}\n`);
    const b = m.ergebnisse[0];
    console.log(`  Beispiel (Saat ${b.saat}): ${b.phase} in Welle ${b.welle}, `
      + `${b.spieler[0].getoetet} getoetet, Waffen ${b.spieler[0].waffen.join(" ")}`);
    console.log(`  Werte: ${JSON.stringify(b.spieler[0].werte)}\n`);
  }
}
