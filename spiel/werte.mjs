/* [Aufgabe: Regelkern] Die acht Werte eines Spielers und ihre Wirkung.

   Hier steht die Rechnung — **einmal**, für alle. Wer wissen will, was
   „+10 Ruestung" wirklich bringt, liest diese Datei und nicht drei
   Stellen im Kampf.

   Die Formeln folgen einer Regel: **Jeder Wert muss auf dem Bildschirm
   spürbar sein** (docs/SPIEL.md 5.1). Ein Wert, dessen erste zehn
   Punkte nichts ändern, ist kein Wert, sondern eine Falle für den
   Spieler.

   ── Warum Rüstung nicht linear ist ─────────────────────────────────

   `ruestung / (ruestung + 30)` sättigt: 10 Rüstung nehmen 25 % weg,
   30 nehmen die Hälfte, 90 nehmen drei Viertel. Linear abgezogen wäre
   Rüstung ab einem Punkt Unverwundbarkeit — und jede Zahl danach
   wertlos. Gesättigt bleibt jeder weitere Punkt etwas wert und keiner
   beendet das Spiel.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/kampf.mjs` (Schaden hin und zurück), `spiel/bewegung.mjs`
   (Tempo), `spiel/beute.mjs` (Gier), `spiel/laden.mjs` (Glück),
   `spiel/stufen.mjs` (verteilt Punkte darauf). */

export const WERTE = [
  "leben", "schaden", "hast", "tempo", "ruestung", "glueck", "gier", "genesung"
];

/* Was jeder Wert in normaler Sprache bedeutet — dieselbe Quelle für
   die Anzeige im Spiel und für die Prüfung, dass keiner fehlt. */
export const WERT_TEXT = {
  leben: ["Leben", "Wie viel du aushältst."],
  schaden: ["Schaden", "Jeder Treffer haut härter zu."],
  hast: ["Hast", "Deine Waffen schlagen öfter zu."],
  tempo: ["Tempo", "Du läufst schneller."],
  ruestung: ["Rüstung", "Treffer kosten dich weniger."],
  glueck: ["Glück", "Bessere Angebote, mehr Beute."],
  gier: ["Gier", "Du ziehst Grabgold an und es ist mehr wert."],
  genesung: ["Genesung", "Nach jeder Welle kommt Leben zurück."]
};

export const GRUND_LEBEN = 50;
export const GRUND_TEMPO = 78;

export function macheWerte(zusatz = {}) {
  const w = {};
  for (const name of WERTE) w[name] = zusatz[name] ?? 0;
  return w;
}

export function lebenMax(werte) {
  return GRUND_LEBEN + werte.leben;
}

export function laufTempo(werte) {
  return GRUND_TEMPO * (1 + werte.tempo / 100);
}

/* Hast verkürzt die Abklingzeit, aber nur asymptotisch: Bei 100 Hast
   schlägt eine Waffe doppelt so oft zu, bei 300 viermal. Ein direkter
   Abzug würde bei genug Hast **null** ergeben — unendlich viele Schläge
   je Sekunde, und das Spiel wäre vorbei. */
export function abklingzeit(werte, grund) {
  return grund / (1 + werte.hast / 100);
}

export function schadensminderung(werte) {
  const r = Math.max(0, werte.ruestung);
  return r / (r + 30);
}

/* Aufsammelreichweite. Der Grundwert ist bewusst klein: Beute muss man
   holen, das ist der Motor des Spiels (docs/SPIEL.md 1). */
export const GRUND_AUFSAMMELN = 16;

export function aufsammelReichweite(werte) {
  return GRUND_AUFSAMMELN + werte.gier * 1.4;
}

export function goldFaktor(werte) {
  return 1 + werte.gier / 100;
}

export function genesungJeWelle(werte) {
  return werte.genesung;
}

/* Der Gruppenbonus (Bauteil 10): Wer vier Waffen desselben Merkmals
   trägt, bekommt für dieses Merkmal einen Aufschlag. Vier statt zwei
   ist Absicht — bei zwei wäre der Bonus ein Nebeneffekt, bei vier ist
   er eine Entscheidung gegen die beste Einzelwaffe. */
export const GRUPPE_AB = 4;
export const GRUPPE_BONUS = 0.30;

export function merkmalZaehlung(waffen) {
  const zahl = new Map();
  for (const w of waffen) {
    for (const m of w.vorlage.merkmale) zahl.set(m, (zahl.get(m) ?? 0) + 1);
  }
  return zahl;
}

/* Der Aufschlag für **eine** Waffe: Sie bekommt ihn, wenn eines ihrer
   Merkmale die Schwelle erreicht. Mehrere erfüllte Merkmale zählen
   nicht doppelt — sonst wäre die Sense mit zwei Merkmalen automatisch
   die beste Waffe des Spiels, ohne dass jemand das entschieden hätte. */
export function gruppenAufschlag(waffe, zaehlung) {
  for (const m of waffe.vorlage.merkmale) {
    if ((zaehlung.get(m) ?? 0) >= GRUPPE_AB) return GRUPPE_BONUS;
  }
  return 0;
}
