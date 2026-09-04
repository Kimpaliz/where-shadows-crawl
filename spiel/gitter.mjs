/* [Aufgabe: Regelkern] Ein Raster über der Arena, damit Nachbarsuche
   nicht quadratisch wird.

   ── Warum es das gibt ──────────────────────────────────────────────

   Drei Dinge fragen jedes Bild „wer ist hier in der Nähe": das
   Auseinanderdrängen der Gegner, die Zielsuche der Waffen und das
   Einsammeln der Beute. Jeden mit jedem zu vergleichen wäre bei 300
   Gegnern 45.000 Vergleiche **je Frage und Bild**. Mit einem Raster
   sind es die paar in den umliegenden Zellen.

   Das ist kein vorsorglicher Ausbau: Zu viert wächst das Budget einer
   späten Welle auf mehrere hundert Gegner (`katalog/wellen.mjs`), und
   das Auseinanderdrängen ist der einzige Grund, warum ein Haufen
   Gegner wie ein Haufen aussieht und nicht wie eine Figur.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/bewegung.mjs`, `spiel/kampf.mjs`, `spiel/beute.mjs`.
   Kennt selbst nichts vom Spiel — es speichert Punkte, keine Gegner. */

export function macheGitter(zellgroesse) {
  /* Eine flache `Map` von Zellenschlüssel auf Liste. Neu aufgebaut je
     Bild: Bei ständig bewegten Punkten ist Neubauen billiger als
     Umhängen, und es kann nicht veralten. */
  const zellen = new Map();

  const schluessel = (cx, cy) => cx * 73856093 ^ cy * 19349663;

  return {
    zellgroesse,

    leeren() { zellen.clear(); },

    /* `wert` ist beliebig — meist der Gegner selbst. */
    setze(x, y, wert) {
      const k = schluessel(Math.floor(x / zellgroesse), Math.floor(y / zellgroesse));
      const liste = zellen.get(k);
      if (liste) liste.push(wert);
      else zellen.set(k, [wert]);
    },

    /* Alles in den Zellen, die den Kreis (x, y, r) berühren. Es kommt
       **mehr** zurück als im Kreis liegt — der Aufrufer prüft den
       genauen Abstand selbst. Das ist Absicht: Die Zelle grob zu
       fassen und genau nachzumessen ist schneller, als das Raster fein
       zu machen. */
    umkreis(x, y, r, hinein) {
      const von = Math.floor((x - r) / zellgroesse);
      const bis = Math.floor((x + r) / zellgroesse);
      const vonY = Math.floor((y - r) / zellgroesse);
      const bisY = Math.floor((y + r) / zellgroesse);
      for (let cx = von; cx <= bis; cx++) {
        for (let cy = vonY; cy <= bisY; cy++) {
          const liste = zellen.get(schluessel(cx, cy));
          if (liste) for (const w of liste) hinein(w);
        }
      }
    },

    /* Nur für Messungen und Prüfungen. */
    zellenzahl: () => zellen.size
  };
}
