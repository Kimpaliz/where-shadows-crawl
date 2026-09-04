/* [Aufgabe: Katalog] Wie eine Welle zusammengestellt wird.

   Eine Welle wird nicht Gegner für Gegner aufgeschrieben, sondern
   **eingekauft**: Sie bekommt ein Budget, und daraus werden Gegner
   gezogen, solange es reicht. Der Grund ist Wartbarkeit — ein neuer
   Gegner braucht nur einen `kosten`-Wert und ist ab da automatisch
   Teil aller passenden Wellen. Zwölf handgeschriebene Wellenlisten
   müsste man dagegen zwölfmal anfassen.

   Das Budget wächst mit der Welle **und** mit der Zahl der Spieler
   (docs/SPIEL.md 4.4). Die Lebenspunkte je Gegner wachsen nur mit der
   Welle — sonst würden schwache Bauten doppelt bestraft.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/katalog/gegner.mjs` (der Warenkorb), `spiel/welt.mjs`
   (bekommt den fertigen Bauplan und setzt ihn um), `spiel/zufall.mjs`
   (zieht). */

import { GEGNER, GEGNER_NACH_ID } from "./gegner.mjs";

/* Zwölf Stunden der Nacht (docs/SPIEL.md 9). */
export const WELLEN_JE_LAUF = 12;

/* Die Welle wird länger, aber nicht endlos: Ab einer Minute wird
   Ausweichen zur Fleißarbeit statt zur Entscheidung. */
export function dauerDerWelle(welle) {
  return Math.min(55, 20 + welle * 3);
}

/* Das Budget. Quadratisch, weil die Macht des Spielers es auch ist:
   Waffen werden stärker (Stufen), zahlreicher (bis sechs) **und** die
   Werte wachsen — drei Faktoren, die sich multiplizieren. Ein linear
   wachsendes Budget würde ab Welle 6 langweilig. */
export function budgetDerWelle(welle, spielerzahl) {
  const grund = 6 + 5 * welle + 1.5 * welle * welle;
  return Math.round(grund * spielerzahl);
}

/* Alle vier Wellen ein Hauptmann (Bauteil 9). */
export function istElitewelle(welle) {
  return welle % 4 === 0;
}

/* Welche Gegnerarten in dieser Welle überhaupt vorkommen. Neue Arten
   kommen gestaffelt dazu — alles ab Welle 1 wäre unlesbar, und der
   Spieler soll jede Art einmal einzeln kennenlernen. */
const AB_WELLE = {
  schlurfer: 1, balg: 1, hetzer: 2, aaskraehe: 3,
  speier: 6, waechter: 7, knochenritter: 8, hauptmann: 99
};

export function artenInWelle(welle) {
  return GEGNER.filter((g) => !g.elite && (AB_WELLE[g.id] ?? 1) <= welle);
}

/* Der Bauplan einer Welle: eine Liste von Einträgen
   `{ art, zeit }` — welche Art wann erscheint. Die Zeit ist über die
   Welle verteilt, mit einem ruhigen Anfang: Wer in Sekunde 0 von acht
   Gegnern umstellt wird, hat nichts entschieden.

   Rein rechnend, ohne Weltzustand — deshalb einzeln prüfbar. */
export function baueWelle(welle, spielerzahl, zufall) {
  const budget = budgetDerWelle(welle, spielerzahl);
  const dauer = dauerDerWelle(welle);
  const arten = artenInWelle(welle);
  const plan = [];
  let rest = budget;

  if (istElitewelle(welle)) {
    const anzahl = Math.max(1, Math.floor(spielerzahl / 2));
    for (let i = 0; i < anzahl; i++) {
      plan.push({ art: "hauptmann", zeit: dauer * 0.25 + i * 1.5 });
    }
  }

  /* Bezahlbare Arten teurer zuerst prüfen, damit das Budget nicht
     ausschließlich in Schlurfer fließt. Die Ziehung bleibt zufällig —
     sonst sähe jede Welle 7 gleich aus. */
  let schutz = 0;
  while (rest > 0 && schutz++ < 4000) {
    const bezahlbar = arten.filter((g) => g.kosten <= rest);
    if (bezahlbar.length === 0) break;
    const art = zufall.ausListe(bezahlbar);
    const schwarm = art.schwarm ?? 1;
    /* Der Anfang ist ruhig: Die Wurzel drückt die frühen Zeitpunkte
       zusammen und streut die späten. */
    const anteil = Math.sqrt(zufall.zahl());
    const zeit = anteil * dauer * 0.86;
    for (let i = 0; i < schwarm && rest > 0; i++) {
      plan.push({ art: art.id, zeit: zeit + i * 0.12 });
      rest -= art.kosten;
    }
  }

  plan.sort((a, b) => a.zeit - b.zeit);
  return { welle, dauer, budget, plan };
}
