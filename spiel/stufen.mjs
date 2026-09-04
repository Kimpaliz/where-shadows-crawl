/* [Aufgabe: Regelkern] Aufstieg mitten in der Welle und die vier Karten.

   ── Die Koop-Anpassung, die hier drinsteckt ────────────────────────

   In Brotato hält der Aufstieg das Spiel an; man wählt und es geht
   weiter (Bauteil 6). Zu viert wäre das viermal Warten hintereinander
   — der sichere Weg, den Abend zäh zu machen.

   Deshalb: **Alle wählen gleichzeitig.** Steigt einer auf, hält die
   Welt an; steigt in derselben Sekunde ein zweiter auf, wählen beide
   nebeneinander. Weiter geht es erst, wenn niemand mehr offen hat.
   Der Machtschub mitten in der Welle bleibt, das Warten fällt weg.

   Ein Spieler kann dabei **mehrere** Aufstiege offen haben (wer ein
   großes Beutefeld auf einmal einsammelt, steigt zweimal). Sie werden
   nacheinander abgearbeitet, nicht zusammengefasst — sonst verschenkt
   man eine Wahl.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/welt.mjs` (hält an und läuft weiter), `spiel/beute.mjs`
   (liefert das Wissen), `spiel/werte.mjs` (die acht Werte). */

import { WERTE, WERT_TEXT, lebenMax } from "./werte.mjs";

/* Wie viel Wissen die nächste Stufe kostet. Wächst überlinear: Sonst
   steigt man in Welle 12 im Sekundentakt auf und das Spiel besteht
   aus Kartenwählen. */
export function schwelle(stufe) {
  return Math.round(4 + stufe * 3 + Math.pow(stufe, 1.6));
}

/* Wie viel eine Karte gibt. Die Zahlen sind so gewählt, dass ein
   Kartenzug ungefähr gleich viel wert ist — sonst wäre die Wahl keine.
   `+2 Schaden` und `+8 Leben` fühlen sich verschieden an und sind
   rechnerisch nahe beieinander. */
export const KARTEN_MENGE = {
  leben: 10, schaden: 2, hast: 5, tempo: 4,
  ruestung: 3, glueck: 6, gier: 7, genesung: 2
};

/* Wie oft ein Wert überhaupt angeboten wird. Leben und Schaden sind
   häufiger, weil sie immer etwas taugen; Genesung ist selten, weil sie
   nur in einem Bau wirklich trägt. */
const GEWICHT = {
  leben: 14, schaden: 14, hast: 12, tempo: 10,
  ruestung: 10, glueck: 8, gier: 10, genesung: 6
};

const KARTEN_JE_WAHL = 4;

/* Vier verschiedene Werte. Verschieden ist wichtig: Zweimal dieselbe
   Karte wäre eine Wahl, die keine ist. */
export function ziehKarten(zufall, glueck) {
  const topf = [];
  for (const w of WERTE) {
    for (let i = 0; i < GEWICHT[w]; i++) topf.push(w);
  }
  const karten = [];
  const genommen = new Set();
  let schutz = 0;
  while (karten.length < KARTEN_JE_WAHL && schutz++ < 200) {
    const w = zufall.ausListe(topf);
    if (genommen.has(w)) continue;
    genommen.add(w);
    /* Glück macht die Karten stärker, nicht zahlreicher — mehr Karten
       wären mehr Auswahl und damit weniger Entscheidung. */
    const bonus = 1 + Math.min(0.6, glueck / 250);
    karten.push({
      wert: w,
      menge: Math.max(1, Math.round(KARTEN_MENGE[w] * bonus)),
      name: WERT_TEXT[w][0],
      text: WERT_TEXT[w][1]
    });
  }
  return karten;
}

/* Prüft alle Spieler auf fällige Aufstiege. Gibt zurück, ob die Welt
   deswegen anhalten muss. */
export function pruefeAufstieg(welt) {
  let anhalten = false;
  for (const s of welt.spieler) {
    while (s.wissen >= schwelle(s.stufe)) {
      s.wissen -= schwelle(s.stufe);
      s.stufe++;
      s.offeneWahlen++;
    }
    if (s.offeneWahlen > 0) {
      if (!s.karten) s.karten = ziehKarten(welt.zufall, s.werte.glueck);
      anhalten = true;
    }
  }
  return anhalten;
}

/* Eine Karte annehmen. Liegt danach noch ein Aufstieg an, werden
   sofort neue Karten gezogen. */
export function nimmKarte(welt, spieler, index) {
  if (!spieler.karten || spieler.offeneWahlen <= 0) return false;
  const karte = spieler.karten[index];
  if (!karte) return false;

  spieler.werte[karte.wert] += karte.menge;
  /* Mehr Leben heilt auch — sonst wäre die Lebenskarte mitten in einer
     Welle wertlos, genau wenn man sie braucht. */
  if (karte.wert === "leben") {
    spieler.lebenMax = lebenMax(spieler.werte);
    spieler.leben += karte.menge;
  }

  spieler.offeneWahlen--;
  spieler.karten = spieler.offeneWahlen > 0
    ? ziehKarten(welt.zufall, spieler.werte.glueck)
    : null;
  return true;
}

export function alleGewaehlt(welt) {
  return welt.spieler.every((s) => s.offeneWahlen === 0);
}
