/* [Aufgabe: Regelkern] Die fünf Schadensarten — Daten, kein Verhalten.

   Warum es sie gibt, stand vor dieser Datei schon als Kommentar in
   `spiel/kampf.mjs`: Gift ging an der Rüstung vorbei, und das war der
   einzige Grund, warum das Seuchenglas gegen den Knochenritter etwas
   taugte. Genau diese eine Ausnahme wird hier zur Regel — aus einem
   Sonderfall wird eine Achse, auf der ein Bau entstehen kann.

   ── Warum fünf und warum diese fünf ────────────────────────────────

   Die acht Waffenmerkmale (`spiel/katalog/waffen.mjs`) sind
   **Fraktionen** und dienen dem Gruppenbonus; sie sagen nichts
   darüber, *wie* ein Treffer wehtut. Fünf Arten sind wenig genug, dass
   ein Spieler sie sich merkt, und genug, dass ein Widerstand eine
   Entscheidung ist. Jedes Merkmal fällt eindeutig auf eine Art
   (`MERKMAL_ART` weiter unten) — deshalb muss niemand raten, welche
   Art eine neue Waffe bekommt.

   `fluch` ist die Art, die **an der Rüstung vorbeigeht**. Es gibt
   genau eine solche Art, und das ist Absicht: Zwei wären zwei Wege um
   dieselbe Verteidigung herum, und Rüstung wäre kein Wert mehr.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/werte.mjs` (erzeugt aus dieser Liste die Werte je Art und
   rechnet den Schaden), `spiel/kampf.mjs` (trägt die Art in Treffer,
   Geschosse und schwebende Zahlen), `spiel/katalog/waffen.mjs` (jede
   Waffe nennt ihre Art). Importiert selbst nichts — ein Katalog hängt
   an niemandem. */

/* Die Farben stammen aus `runtime/palette.js` und sind keine freien
   Werte: Eine Schadenszahl in einem Ton, den es sonst nirgends gibt,
   sieht aus wie ein Fremdkörper. Gemessen wird der Abstand der fünf
   Töne in `werkzeuge/pruefe-werte.mjs` — zwei Arten, die sich auf dem
   Bildschirm nicht trennen lassen, sind keine zwei Arten. */
export const SCHADENSARTEN = [
  {
    id: "schnitt", name: "Schnitt", farbe: "#828896",
    ignoriertRuestung: false,
    text: "Klingen und Dornen. Schnell, aber Panzer bremsen sie."
  },
  {
    id: "wucht", name: "Wucht", farbe: "#c9c3ad",
    ignoriertRuestung: false,
    text: "Was zerschlägt statt zu schneiden. Wirft zurück."
  },
  {
    id: "feuer", name: "Feuer", farbe: "#ff8c2e",
    ignoriertRuestung: false,
    text: "Brennt weiter, wenn der Schlag längst vorbei ist."
  },
  {
    id: "frost", name: "Frost", farbe: "#a8d6ec",
    ignoriertRuestung: false,
    text: "Nimmt weniger Leben als Tempo."
  },
  {
    id: "fluch", name: "Fluch", farbe: "#bfa4f0",
    ignoriertRuestung: true,
    text: "Fragt nicht nach Rüstung. Die einzige Art, die das darf."
  }
];

export const ART_IDS = SCHADENSARTEN.map((a) => a.id);
export const ART_NACH_ID = new Map(SCHADENSARTEN.map((a) => [a.id, a]));

/* Die Art, in der gerechnet wird, wenn niemand eine nennt: Ein
   Treffer ohne Art wäre ein Treffer, den kein Widerstand und kein
   Modifier je erreicht — er würde still an allen fünf Achsen
   vorbeilaufen, ohne dass etwas rot wird. */
export const STANDARD_ART = "schnitt";

/* Von der Fraktion zur Art. Das ist die Zuordnungsregel, nach der die
   `schadensart` jeder Waffe im Katalog gesetzt ist; sie steht hier und
   nicht dort, damit `werkzeuge/pruefe-werte.mjs` sie nachrechnen kann.
   Ohne diese Prüfung wäre eine Waffe mit dem Merkmal `Feuer` und der
   Art `frost` ein stiller Fehler: Der Bau des Spielers ginge ins Leere
   und niemand fände heraus, warum.

   Mehrere Merkmale: das **erste** entscheidet. */
export const MERKMAL_ART = {
  Schnitt: "schnitt",
  Wucht: "wucht",
  Feuer: "feuer",
  Frost: "frost",
  Bann: "fluch",
  Seuche: "fluch",
  Blut: "schnitt",
  Segen: "fluch"
};

export function artZuMerkmalen(merkmale) {
  for (const m of merkmale) {
    const art = MERKMAL_ART[m];
    if (art) return art;
  }
  return STANDARD_ART;
}

/* Ob eine Kennung überhaupt eine Art ist. Ein Tippfehler in
   `schadensart: "feuur"` würde sonst still zur Standardart werden. */
export function istArt(id) {
  return ART_NACH_ID.has(id);
}
