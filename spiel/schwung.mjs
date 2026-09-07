/* [Aufgabe: Regelkern] Der Schwung einer Nahkampfwaffe — wo er gerade
   liegt und wen er dort erwischt.

   ── Janniks Ansage, wörtlich ────────────────────────────────────────

   „wo sind die eindeutigen initial attack animationnen? angriffe finde
   immer in richtigung der gegner statt und tgreffen nur wenn die
   Animation trifft."

   ── Was vorher passierte ───────────────────────────────────────────

   Ein Nahkampfschlag setzte `schlagZeit = 0.14` und teilte im **selben
   Bild** Schaden an alle Ziele im **vollen Kreis** aus. Gezeichnet
   wurde dazu ein einziger Bogen, 11 x 11 Bildpunkte groß, in
   **Laufrichtung** — nicht in Richtung des Gegners. Gemessen am
   06.09.2026 reichte dieser Bogen 11,8 Bildpunkte weit, während die
   Waffen 30 bis 52 treffen. Wer zusah, sah ein Zucken vor der Figur
   und Gegner sterben, die es nie berührt hat.

   Alle drei Teile von Janniks Satz waren also verletzt: keine eigene
   Animation, nicht in Richtung des Gegners, und der Treffer hing nicht
   an der Animation.

   ── Was ein Schwung ist ────────────────────────────────────────────

   Ein Kreisausschnitt, der in `SCHWUNG_DAUER` von innen nach außen
   fährt: Richtung liegt beim Ausholen fest (auf den nächsten Gegner),
   der Radius wächst von `SCHWUNG_NAH` bis zur Reichweite der Waffe,
   und die Öffnung ist die Bauart der Waffe (`bogen` im Katalog, in
   Grad). Getroffen wird, wer in dem Moment im Band liegt, in dem das
   Band dort vorbeikommt — **einmal**, dafür sorgt `getroffen`.

   Damit ist die gezeichnete Form und die treffende Form dieselbe
   Rechnung, und nicht zwei, die auseinanderlaufen können.

   ── Warum diese Datei nichts trifft ────────────────────────────────

   Hier steht nur **Geometrie**: reine Funktionen ohne Welt, ohne
   Zufall, ohne Schaden. Der Einschlag selbst wohnt in
   `spiel/kampf.mjs` — sonst würden sich die beiden Dateien gegenseitig
   importieren. Der Nebeneffekt ist der eigentliche Grund: So kann
   `runtime/zeichnen.js` **dieselben** Funktionen benutzen, um den Bogen
   zu malen, ohne den Regelkern in den Browser zu ziehen.

   ⚠️ **Kein `Math.random`, kein `welt.zufall`.** Ein Schwung darf sich
   nicht würfeln: Im Netz-Koop rechnen zwei Rechner denselben Schlag,
   und der Zeichner rechnet ihn ein drittes Mal nach. Drei Würfe wären
   drei Ergebnisse.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/kampf.mjs` (holt den Schwung und verteilt den Schaden),
   `spiel/welt.mjs` (führt die Liste je Spieler),
   `spiel/katalog/waffen.mjs` (`bogen` je Waffe),
   `runtime/zeichnen.js` (malt genau diese Geometrie). */

/* Wie lange ein Schwung von innen nach außen braucht. Der alte Wert
   von `schlagZeit`, unverändert übernommen: 0,14 s sind bei 60 Bildern
   rund achteinhalb Schritte — genug, dass man die Bewegung sieht, und
   wenig genug, dass die Sichel mit 0,42 s Abklingzeit nicht in ihren
   eigenen vorigen Schlag hineinschlägt. */
export const SCHWUNG_DAUER = 0.14;

/* Wo der Bogen anfängt. Nicht 0: Ein Bogen, der in der Figur beginnt,
   ist im ersten Bild nicht zu sehen. */
export const SCHWUNG_NAH = 6;

/* Halbe Dicke des treffenden Bandes.
   ⚠️ **Diese Zahl ist der Grund, warum kein Gegner durch die Ritzen
   fällt.** Der Radius springt je Schritt um
   `(reichweite − 6) / 8,4` Bildpunkte — bei der weitesten Nahkampfwaffe
   (Weihwasserkessel, 52) sind das 5,5. Ein Band von ±10 überlappt sich
   also von Schritt zu Schritt um mehr als das Doppelte. Wer sie unter
   die halbe Schrittweite senkt, baut Löcher zwischen zwei Bildern, die
   niemand sieht und jeder spürt. */
export const SCHWUNG_BAND = 10;

/* Der Körperradius des dicksten Gegners im Katalog (`gebeinfuerst`, 14).

   ⚠️ **Diese Zahl ist der Unterschied zwischen „trifft drei" und
   „trifft zwei".** Das Raster liefert alles in den Zellen, die einen
   Kreis berühren — und `imBand()` lässt einen Gegner mitzählen, dessen
   **Körper** das Band berührt, also bis zu seinem Radius weiter außen.
   Wer das Raster nur mit `radius + SCHWUNG_BAND` fragt, bekommt die
   dicken Gegner am äußeren Rand gar nicht erst zu sehen und hält das
   Ergebnis trotzdem für vollständig.

   Gemessen am 06.09.2026, bevor die Zahl dastand: Die Pechfackel
   (drei Ziele, 150°) traf auf einem Ring aus 24 Gegnern nur **zwei**.
   Nicht weil der Ausschnitt zu schmal war, sondern weil die Abfrage zu
   eng war.

   `werkzeuge/pruefe-angriffe.mjs` rechnet gegen den Katalog nach und
   wird rot, sobald ein Gegner dicker wird. */
export const GROESSTER_GEGNER = 14;

/* Wie weit ein Schwung im Katalog aufmacht, wenn die Waffe nichts sagt.
   Ein Viertelkreis ist die vorsichtige Annahme: Sie trifft, worauf sie
   zeigt, und nichts daneben. */
export const BOGEN_VORGABE = 90;

/* Der Öffnungswinkel einer Waffe in Bogenmaß — `bogen` steht im Katalog
   in **Grad**, weil das die Einheit ist, in der man über einen
   Rundumschlag redet („360") und nicht „6,28". */
export function bogenDerWaffe(vorlage) {
  return ((vorlage.bogen ?? BOGEN_VORGABE) * Math.PI) / 180;
}

/* Der Radius zum Zeitpunkt `t` (0 bis 1). Linear: Ein Schlag holt nicht
   aus und bremst nicht ab, er fährt durch. */
export function schwungRadius(sw, t) {
  const gedeckelt = Math.max(0, Math.min(1, t));
  return SCHWUNG_NAH + (sw.reichweite - SCHWUNG_NAH) * gedeckelt;
}

/* Der Fortschritt eines Schwungs, 0 bis 1. Vor dem eigenen Einsatz
   (`zeit < 0`, siehe `verzug` in `spiel/kampf.mjs`) ist er negativ und
   der Schwung tut noch nichts. */
export function schwungAnteil(sw) {
  return sw.zeit / SCHWUNG_DAUER;
}

/* Liegt (dx, dy) im Ausschnitt? Bei einem Rundumschlag (360°) immer —
   und zwar ohne Winkelrechnung, sonst entschiede bei genau 180° die
   Rundung darüber, ob der Gegner hinter einem noch dazugehört. */
export function imAusschnitt(sw, dx, dy) {
  if (sw.bogen >= Math.PI * 2) return true;
  const d = Math.hypot(dx, dy);
  if (d === 0) return true;
  const kosinus = (dx * sw.rx + dy * sw.ry) / d;
  return kosinus >= Math.cos(Math.min(Math.PI, sw.bogen / 2)) - RANDLUFT;
}

/* ⚠️ **Der Rand gehört zum Schwung.** Ohne diese Winzigkeit fällt
   genau das heraus, was auf der Kante liegt — und das ist keine
   Ausnahme, sondern der Regelfall: Die äußersten Klingen (`keulen()`
   unten) liegen konstruktionsbedingt **auf** dem Rand, und ihr
   Richtungsvektor entsteht über zwei Multiplikationen und eine Addition,
   `Math.cos(bogen / 2)` dagegen direkt. Beide Wege enden ein paar
   Bitstellen auseinander. Gemessen am 06.09.2026 lagen dadurch bei
   Sense und Richtschwert je zwei von acht bzw. fünf Klingen „außerhalb"
   ihres eigenen Ausschnitts.

   1e-9 im Kosinus ist bei diesen Winkeln rund ein Milliardstel
   Bogenmaß — kleiner als jeder Bildpunkt, den es zu treffen gäbe, und
   groß genug gegen jeden Rundungsfehler dieser Rechnung. */
const RANDLUFT = 1e-9;

/* Trifft das Band in diesem Augenblick einen Körper mit Radius `r` im
   Abstand `d`? Zwei Bedingungen, und die zweite ist die wichtigere:
   Das Band darf die Waffe nicht **weiter** tragen als ihre Reichweite —
   sonst wäre `SCHWUNG_BAND` ein heimlicher Reichweitenbonus von zehn
   Bildpunkten für jede Nahkampfwaffe. */
export function imBand(sw, d, r, radius) {
  if (d > sw.reichweite + r) return false;
  return d <= radius + SCHWUNG_BAND + r && d >= radius - SCHWUNG_BAND - r;
}

/* ── Wie der Schwung gemalt wird ─────────────────────────────────────

   Der treffende Ausschnitt ist ein durchgehender Kreisausschnitt; der
   Zeichner kann keinen Ausschnitt malen, sondern setzt **Klingen** —
   Kopien desselben kleinen Bogens entlang der Öffnung.

   ⚠️ **Warum das hier steht und nicht im Zeichner.** Die Zahl der
   Klingen ist eine Entscheidung über das Bild, ihre Lage ist es nicht:
   Sie muss auf demselben `bogen` und demselben `rx/ry` beruhen wie der
   Treffer, sonst sieht man wieder etwas anderes, als getroffen wird —
   der Fehler, wegen dem diese ganze Datei entstanden ist.

   Eine Klinge je 30 Grad. Bei 30 bis 52 Bildpunkten Reichweite liegen
   die Klingen damit 16 bis 27 Bildpunkte auseinander und berühren sich
   **nicht** — das ist Absicht. Eine geschlossene Fläche in dieser Größe
   wäre eine gefüllte Tortenscheibe und würde die Gegner darin
   verdecken; ein Fächer aus Klingen liest sich als Bewegung. */
export function keulenZahl(bogen) {
  if (bogen >= Math.PI * 2) return 10;
  return Math.max(2, Math.min(10, Math.round(bogen / (Math.PI / 6)) + 1));
}

/* Die Richtungen der Klingen, als Einheitsvektoren. Beim Rundumschlag
   gleichmäßig über den vollen Kreis (sonst lägen erste und letzte
   Klinge aufeinander), sonst von einem Rand der Öffnung zum anderen. */
export function keulen(sw) {
  const zahl = keulenZahl(sw.bogen);
  const voll = sw.bogen >= Math.PI * 2;
  const raus = [];
  for (let i = 0; i < zahl; i++) {
    const ab = voll
      ? (i / zahl) * Math.PI * 2
      : (-0.5 + i / (zahl - 1)) * sw.bogen;
    const kos = Math.cos(ab), sin = Math.sin(ab);
    raus.push({ x: sw.rx * kos - sw.ry * sin, y: sw.rx * sin + sw.ry * kos });
  }
  return raus;
}
