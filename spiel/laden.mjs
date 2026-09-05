/* [Aufgabe: Regelkern] Der Krämer zwischen den Wellen.

   Vier Angebote je Spieler, jeder mit eigenem Gold (docs/SPIEL.md 4.1).
   Neuwürfeln kostet und wird jedes Mal teurer; was man nicht kauft,
   ist beim nächsten Mal weg.

   ── Zwei Entscheidungen, die man leicht anders träfe ───────────────

   1. **Zwei gleiche Waffen derselben Stufe verschmelzen von selbst**
      (Bauteil 7). Brotato lässt das den Spieler anklicken. Hier
      passiert es beim Kauf, weil ein vergessener Klick eine stille
      Verschlechterung wäre — und weil die Entscheidung ohnehin schon
      beim Kauf fällt, nicht danach.
   2. **Verkaufen gibt die Hälfte.** Weniger, und man traut sich nie zu
      verschmelzen; mehr, und man kauft folgenlos alles durch.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/katalog/waffen.mjs` und `…/gegenstaende.mjs` (die Ware),
   `spiel/werte.mjs` (Glück, und die Werte, die Fundstücke ändern),
   `spiel/lauf.mjs` (ruft ihn zwischen den Wellen auf),
   `spiel/truhen.mjs` (wendet ein Fundstück genauso an wie ein Kauf,
   über `wendeGegenstandAn`). */

import { WAFFEN, macheWaffe, preisDerWaffe } from "./katalog/waffen.mjs";
import { GEGENSTAENDE, GEGENSTAND_NACH_ID, SELTEN_AB_WELLE } from "./katalog/gegenstaende.mjs";
import { lebenMax } from "./werte.mjs";

export const WAFFEN_PLAETZE = 6;
export const ANGEBOTE = 4;
export const VERKAUFS_ANTEIL = 0.5;

/* Preise steigen mit der Welle — aber langsamer als das Gold. Sonst
   stünde man in Welle 10 vor denselben Angeboten wie in Welle 2 und
   könnte sie genauso wenig bezahlen. */
export function preisAufschlag(welle) {
  return 1 + 0.07 * (welle - 1);
}

export function neuwuerfelnPreis(welle, malGewuerfelt) {
  return Math.round((3 + welle) * Math.pow(1.6, malGewuerfelt));
}

/* Ein Angebot ist entweder eine Waffe oder ein Fundstück. */
function zieheAngebot(zufall, welle, glueck, spieler) {
  /* Wer noch Platz im Gürtel hat, bekommt öfter Waffen angeboten —
     sonst sitzt man in Welle 3 mit einer Sichel und lauter Amuletten. */
  const platzFrei = spieler.waffen.length < WAFFEN_PLAETZE;
  const waffenAnteil = platzFrei ? 0.55 : 0.25;

  if (zufall.trifft(waffenAnteil)) {
    const w = zufall.ausListe(WAFFEN);
    /* Glück gibt eine Chance auf eine Waffe, die schon eine Stufe
       höher steht — teurer, aber ein Sprung. */
    const stufe = zufall.trifft(Math.min(0.35, glueck / 300)) ? 2 : 1;
    return {
      sorte: "waffe", id: w.id, stufe, name: w.name, text: w.text,
      merkmale: w.merkmale,
      preis: Math.round(preisDerWaffe(w.id, stufe) * preisAufschlag(welle))
    };
  }

  const erlaubt = GEGENSTAENDE.filter((g) => (SELTEN_AB_WELLE[g.selten] ?? 1) <= welle);
  /* Glück verschiebt die Ziehung nach oben: Aus drei Zügen wird der
     seltenste genommen. Das ist spürbarer als eine geänderte
     Wahrscheinlichkeit und leichter zu erklären. */
  const zuege = zufall.trifft(Math.min(0.5, glueck / 200)) ? 3 : 1;
  let bester = null;
  for (let i = 0; i < zuege; i++) {
    const g = zufall.ausListe(erlaubt);
    if (!bester || g.selten > bester.selten) bester = g;
  }
  return {
    sorte: "gegenstand", id: bester.id, name: bester.name, text: bester.text,
    werte: bester.werte, selten: bester.selten,
    preis: Math.round(bester.preis * preisAufschlag(welle))
  };
}

export function macheAngebote(zufall, welle, spieler) {
  const liste = [];
  for (let i = 0; i < ANGEBOTE; i++) {
    liste.push(zieheAngebot(zufall, welle, spieler.werte.glueck, spieler));
  }
  return liste;
}

export function oeffneLaden(welt, welle) {
  for (const s of welt.spieler) {
    s.angebote = macheAngebote(welt.zufall, welle, s);
    s.malGewuerfelt = 0;
    s.bereit = false;
  }
}

export function wuerfleNeu(welt, spieler, welle) {
  const preis = neuwuerfelnPreis(welle, spieler.malGewuerfelt);
  if (spieler.gold < preis) return false;
  spieler.gold -= preis;
  spieler.malGewuerfelt++;
  spieler.angebote = macheAngebote(welt.zufall, welle, spieler);
  return true;
}

export function kaufe(spieler, index) {
  const a = spieler.angebote?.[index];
  if (!a || a.gekauft) return false;
  if (spieler.gold < a.preis) return false;

  if (a.sorte === "waffe") {
    if (!nimmWaffe(spieler, a.id, a.stufe)) return false;
  } else {
    wendeGegenstandAn(spieler, a.id);
  }

  spieler.gold -= a.preis;
  a.gekauft = true;
  return true;
}

/* Ein Fundstück auf einen Spieler anwenden — herausgelöst aus `kaufe()`,
   damit eine Truhe (spiel/truhen.mjs) sich genauso anfühlt wie ein
   Kauf: dieselbe Wertänderung, dieselbe Sonderregel für Leben (sofort
   heilen, nicht nur die Obergrenze anheben). Kennt selbst keinen Preis
   — das Bezahlen bleibt Sache des Aufrufers. */
export function wendeGegenstandAn(spieler, gegenstandId) {
  const g = GEGENSTAND_NACH_ID.get(gegenstandId);
  if (!g) return false;
  spieler.gegenstaende.push(g.id);
  for (const [k, v] of Object.entries(g.werte)) spieler.werte[k] += v;
  spieler.lebenMax = lebenMax(spieler.werte);
  spieler.leben = Math.min(spieler.leben, spieler.lebenMax);
  if (g.werte.leben > 0) spieler.leben += g.werte.leben;
  return true;
}

/* Nimmt eine Waffe auf und verschmilzt, was sich verschmelzen lässt —
   auch mehrstufig: Wer zwei Stufe-2-Sicheln hat und eine dritte kauft,
   bekommt keine Stufe 3 aus dem Nichts, aber zwei gleiche Stufen
   finden sich sofort. */
export function nimmWaffe(spieler, id, stufe = 1) {
  let neu = macheWaffe(id, stufe);
  let verschmolzen = true;
  while (verschmolzen && neu.stufe < 4) {
    verschmolzen = false;
    const partner = spieler.waffen.findIndex((w) => w.id === id && w.stufe === neu.stufe);
    if (partner >= 0) {
      spieler.waffen.splice(partner, 1);
      neu = macheWaffe(id, neu.stufe + 1);
      verschmolzen = true;
    }
  }
  if (spieler.waffen.length >= WAFFEN_PLAETZE) return false;
  spieler.waffen.push(neu);
  return true;
}

export function verkaufe(spieler, index, welle) {
  const w = spieler.waffen[index];
  if (!w) return false;
  spieler.gold += Math.floor(preisDerWaffe(w.id, w.stufe) * preisAufschlag(welle) * VERKAUFS_ANTEIL);
  spieler.waffen.splice(index, 1);
  return true;
}
