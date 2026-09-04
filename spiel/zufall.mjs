/* [Aufgabe: Regelkern] Der Zufall dieses Spiels — gesät, nie `Math.random`.

   Warum das keine Kleinigkeit ist: An dieser einen Entscheidung hängen
   drei spätere Dinge auf einmal (docs/SPIEL.md 8).

   1. **Prüfbarkeit.** Ein Balancelauf, der bei jedem Aufruf andere
      Zahlen bekommt, misst nichts.
   2. **Fehlersuche.** „Bei Saat 41 stirbt man in Welle 6" ist ein
      Befund; „manchmal stirbt man" ist keiner.
   3. **Netz-Koop.** Rechnen zwei Rechner dieselbe Welt aus denselben
      Tastendrücken, müssen nur die Tastendrücke über die Leitung —
      aber nur, wenn auch der Zufall auf beiden gleich fällt.

   Gewürfelt wird deshalb **nur** an einer Stelle: beim Start eines
   Laufs in `runtime/start.js`. Alles darunter bekommt den Strom
   gereicht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   Jedem Modul unter `spiel/`, das eine Entscheidung würfelt:
   `welt.mjs` (Gegner setzen), `laden.mjs` (Angebote), `stufen.mjs`
   (Auswahlkarten), `beute.mjs` (Streuung). Kennt selbst nichts davon. */

/* mulberry32 — ein Strom aus 32 Bit Zustand. Klein, schnell, und für
   Spielzwecke reichlich gut verteilt. Wichtiger als die Qualität ist
   hier, dass er auf jedem Rechner **bitgleich** dasselbe liefert:
   Nur ganzzahlige Operationen, keine Gleitkomma-Zwischenschritte, die
   sich zwischen Browsern unterscheiden könnten. */
export function macheZufall(saat) {
  let zustand = (saat >>> 0) || 1;

  /* Eine Zahl in [0, 1). */
  const zahl = () => {
    zustand = (zustand + 0x6d2b79f5) >>> 0;
    let t = zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    zahl,
    /* [von, bis) als Gleitkomma. */
    zwischen: (von, bis) => von + zahl() * (bis - von),
    /* [von, bis] als ganze Zahl, beide Enden eingeschlossen. */
    ganz: (von, bis) => von + Math.floor(zahl() * (bis - von + 1)),
    /* Ein Element aus einer Liste. Leere Liste gibt `undefined` — der
       Aufrufer entscheidet, ob das ein Fehler ist. */
    ausListe: (liste) => liste[Math.floor(zahl() * liste.length)],
    /* Trifft mit der Wahrscheinlichkeit p (0…1). */
    trifft: (p) => zahl() < p,
    /* Eine Kopie der Liste in zufälliger Reihenfolge (Fisher-Yates).
       Kopie, nicht an Ort und Stelle: Kataloge sind gemeinsam benutzte
       Daten und dürfen von einer Ziehung nicht umsortiert werden. */
    mische: (liste) => {
      const k = liste.slice();
      for (let i = k.length - 1; i > 0; i--) {
        const j = Math.floor(zahl() * (i + 1));
        [k[i], k[j]] = [k[j], k[i]];
      }
      return k;
    },
    /* Der Zustand, um einen Strom fortzusetzen oder zu vergleichen. */
    zustand: () => zustand
  };
}

/* Ein abgeleiteter Strom: aus einer Saat und einem Namen. Damit
   bekommt jeder Bereich seinen eigenen Strom, ohne dass die Reihenfolge
   der Aufrufe zwischen den Bereichen etwas ausmacht — sonst würde eine
   zusätzliche Ziehung im Laden alle Gegner der nächsten Welle
   verschieben. */
export function abgeleitet(saat, name) {
  let h = saat >>> 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(h ^ name.charCodeAt(i), 0x01000193) >>> 0;
  }
  return macheZufall(h);
}
