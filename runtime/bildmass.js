/* [Aufgabe: Bedienung] Wie groß das Bild auf dem Glas wird.

   ── Warum das eine eigene Datei ist ────────────────────────────────

   Es ist die einzige Rechnung im ganzen Spiel, deren Fehler man
   **sieht**, ohne dass irgendetwas kaputt wäre: Ein krummer Faktor
   macht aus harten Kanten Verläufe, und ein zu kleiner Faktor lässt
   das Bild als Fleck in der Mitte stehen. Beides fällt niemandem als
   Fehler auf — es sieht nur schlechter aus.

   Sie steht deshalb hier und nicht in `runtime/start.js`: Dort hinge
   sie an einer Leinwand, an `window` und an drei Horchern, und ein
   Wächter müsste sie **nachbauen**, um sie zu prüfen. Ein nachgebauter
   Wächter prüft aber seine eigene Kopie, nicht das, was läuft.
   `werkzeuge/pruefe-app.mjs` importiert genau diese Funktion.

   ── Ganzzahlig in echten Bildpunkten, nicht in CSS-Punkten ─────────

   Gerechnet wird auf 480 x 270. Auf den Bildschirm kommt das mit einem
   **ganzen** Faktor — lieber ein schwarzer Rand als ein krummer
   Faktor. Der Haken: Ein CSS-Punkt ist auf einem Telefon längst kein
   Bildpunkt mehr.

   ⚠️ **Gemessen am 06.09.2026, Pixel 7 quer** (915 x 412 CSS-Punkte,
   `devicePixelRatio` 2,625): Die Rechnung in CSS-Punkten fand den
   ganzen Faktor **1** und schrieb 480 x 270 CSS-Punkte hin. Auf dem
   Glas waren das **2,625** echte Punkte je Spielpunkt — jede dritte
   Reihe einen Punkt breiter als ihre Nachbarn, also genau die unechte
   Pixelgrafik, die vermieden werden sollte. Und das Bild belegte
   **34,4 %** der Fläche.

   Wird stattdessen in echten Bildpunkten ganzzahlig gerechnet, kommen
   auf demselben Gerät **4** Punkte je Spielpunkt heraus.

   ── Der Fall, der krumm bleiben muss ───────────────────────────────

   Passt das Bild nicht einmal einfach hinein, gibt es keinen ganzen
   Faktor mehr. Dann ist krumm besser als nichts: Sonst bekäme ein
   kleiner Bildschirm überhaupt kein Bild.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/start.js` (setzt das Ergebnis auf die Leinwand),
   `runtime/zeichnen.js` (`BREITE`, `HOEHE`),
   `werkzeuge/pruefe-app.mjs` (rechnet es gegen echte Gerätemaße nach). */

/* Der Faktor in **CSS-Punkten**, mit dem die Leinwand beschriftet wird.
   `dpr` ist `devicePixelRatio`: wie viele echte Bildpunkte auf einem
   CSS-Punkt liegen. */
export function bildFaktor({ breite, hoehe, fensterBreite, fensterHoehe, dpr = 1 }) {
  const echt = Math.floor(Math.min(
    fensterBreite * dpr / breite,
    fensterHoehe * dpr / hoehe
  ));
  if (echt >= 1) return echt / dpr;
  /* Kein ganzer Faktor mehr — krumm ist besser als kein Bild. */
  return Math.min(fensterBreite / breite, fensterHoehe / hoehe);
}

/* Was daraus auf dem Glas wird — für Wächter und für Messungen.
   `punkteJeSpielpunkt` ist die Zahl, die ganz sein muss; `anteil` ist
   der Bruchteil der Bildschirmfläche, den das Bild belegt. */
export function bildLage({ breite, hoehe, fensterBreite, fensterHoehe, dpr = 1 }) {
  const faktor = bildFaktor({ breite, hoehe, fensterBreite, fensterHoehe, dpr });
  return {
    faktor,
    punkteJeSpielpunkt: faktor * dpr,
    anteil: (breite * faktor * hoehe * faktor) / (fensterBreite * fensterHoehe)
  };
}
