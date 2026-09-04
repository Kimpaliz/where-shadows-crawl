/* [Aufgabe: Bild] Die Farben der Nacht — an genau einer Stelle.

   ── Warum eine Palette und keine freien Farben ─────────────────────

   Pixelgrafik lebt von wenigen, wiederkehrenden Tönen. Wer je Sprite
   frei mischt, bekommt hundert Grautöne, die sich gegenseitig
   entwerten; mit einer festen Palette sieht alles aus, als käme es aus
   derselben Welt. Zugleich ist die Palette der eine Ort, an dem sich
   der ganze Stil ändern lässt.

   ── Die Regel dieser Palette ───────────────────────────────────────

   Dunkles ist **kühl** (blau-violett), Beleuchtetes ist **warm**
   (bernstein). Das ist keine Zierde: Auf einem exakt von oben
   gesehenen Bild fehlt jede Perspektive, also muss die Farbe die Tiefe
   tragen. Ein Fackelkreis in warmem Licht auf kaltem Stein liest sich
   sofort als „hier ist es sicher, dort nicht".

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprites.js` (die Zeichen der Sprites zeigen hierher),
   `runtime/zeichnen.js` (Boden, Licht, Anzeige). */

export const FARBEN = {
  /* Kontur — fast schwarz, aber blaustichig. Reines Schwarz wirkt in
     Pixelgrafik wie ein Loch. */
  kontur: "#07060c",
  konturHell: "#120f1a",

  /* Boden: Stein im Bannkreis, Erde außerhalb. */
  boden0: "#24212e",
  boden1: "#2d2939",
  boden2: "#383247",
  bodenRiss: "#171420",
  aussen0: "#0d0b13",
  aussen1: "#16131e",

  /* Der Bannkreis selbst. */
  stein: "#3a3446",
  steinHell: "#4d4559",
  steinDunkel: "#241f2e",

  /* Feuer und Licht. */
  glut: "#ff8c2e",
  flamme: "#ffb455",
  flammeHell: "#ffe0a8",
  lichtWarm: "#ffae4d",

  /* Tuch und Leder der Jäger. */
  tuch: "#241d2e",
  tuchHell: "#332941",
  leder: "#4a3524",
  lederHell: "#6b4e33",
  haut: "#c8a07a",

  /* Untote. */
  fleisch: "#5c6b54",
  fleischHell: "#75876b",
  fleischTot: "#3f4a3a",
  knochen: "#c9c3ad",
  knochenDunkel: "#8f8a78",
  lumpen: "#403a33",
  lumpenHell: "#57503f",

  /* Blut und Seuche. */
  blut: "#7d1c22",
  blutHell: "#a52a2f",
  seuche: "#6fa03a",
  seucheHell: "#9ccc55",
  frost: "#6fa8c9",
  frostHell: "#a8d6ec",
  bann: "#8f6fd0",
  bannHell: "#bfa4f0",

  /* Metall. */
  eisen: "#5a5f6b",
  eisenHell: "#828896",
  eisenDunkel: "#3a3e47",

  /* Gold. */
  gold: "#c9a44a",
  goldHell: "#f0d07a",

  /* Anzeige. */
  schrift: "#ded6c4",
  schriftMatt: "#8a8296",
  rahmen: "#3a3446"
};

/* Tippfehler oben würde still eine ungültige Farbe erzeugen — deshalb
   prüft `werkzeuge/pruefe-sprites.mjs`, dass jeder Wert ein gültiger
   Farbcode ist. Die Prüfung ist der Grund, warum dieser Kommentar hier
   stehen darf, statt dass jemand die Datei durchliest. */

/* Die vier Jäger. Sie müssen sich auf dem Bildschirm sofort
   unterscheiden lassen — deshalb sind es vier **Farbtöne** mit klar
   verschiedener Helligkeit und nicht vier Schattierungen desselben
   Blaus. Wer rot und grün schlecht trennt, sieht hier trotzdem vier
   verschiedene Dinge. */
export const JAEGER_FARBEN = [
  { name: "Stahl",  hell: "#8fb4d8", mittel: "#5d7fa8", dunkel: "#374a66" },
  { name: "Moos",   hell: "#8fd0a0", mittel: "#5a9b6d", dunkel: "#345c42" },
  { name: "Bernstein", hell: "#f0c46a", mittel: "#c08f34", dunkel: "#7a5a1e" },
  { name: "Amethyst",  hell: "#c49af0", mittel: "#8f66c0", dunkel: "#573c78" }
];
