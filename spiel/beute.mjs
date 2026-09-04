/* [Aufgabe: Regelkern] Grabgold — was fällt, was liegen bleibt, was
   mitgeht.

   ── Das hier ist der Motor des Spiels ──────────────────────────────

   Beute liegt **dort, wo die Gegner sind**, und verschwindet am
   Wellenende. Wer sicher am Rand läuft, überlebt die Welle und steht
   im Laden mit leeren Händen; wer hineingeht, kauft sich die nächste
   Welle. Diese eine Spannung trägt das ganze Spiel (docs/SPIEL.md 1).

   Deshalb sind zwei Dinge ausdrücklich **nicht** so gebaut, wie es
   bequemer wäre:

   1. **Kein automatisches Einsammeln.** Die Grundreichweite ist klein
      (16 Bildpunkte, `werte.mjs`); wer mehr will, kauft Gier — und
      bezahlt sie mit etwas anderem.
   2. **Grabgold ist zugleich Wissen.** Eine getötete Kreatur gibt für
      sich genommen **nichts**. Erst das Aufheben zählt. Gäbe es
      Erfahrung schon fürs Töten, könnte man aus sicherer Entfernung
      aufsteigen und die Spannung wäre halbiert.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/kampf.mjs` (lässt fallen), `spiel/welt.mjs` (ruft je Schritt
   und räumt am Wellenende), `spiel/werte.mjs` (Gier),
   `spiel/stufen.mjs` (Wissen führt zum Aufstieg). */

import { aufsammelReichweite, goldFaktor } from "./werte.mjs";

/* Wie schnell aufgesammelte Beute zum Spieler fliegt, sobald sie in
   Reichweite ist. Schnell genug, dass es sich nach Sog anfühlt, und
   nicht so schnell, dass man den Zusammenhang zwischen Reichweite und
   Gier nicht mehr sieht. */
const SOG = 320;
const AUFHEBEN_ABSTAND = 6;

export function lassBeuteFallen(welt, g, toeter) {
  const zufall = welt.zufall;
  const menge = g.art.gold;
  /* Ein einzelner großer Klumpen wäre einfacher — aber mehrere kleine
     Stücke zeigen dem Spieler, wo gekämpft wurde, und machen das
     Einsammeln zu einem Weg statt zu einem Schritt. */
  const stuecke = Math.min(6, Math.max(1, Math.round(menge / 2)));
  const jeStueck = menge / stuecke;
  const jeWissen = g.art.wissen / stuecke;

  for (let i = 0; i < stuecke; i++) {
    const winkel = zufall.zwischen(0, Math.PI * 2);
    const wucht = zufall.zwischen(14, 46);
    welt.beute.push({
      x: g.x, y: g.y,
      vx: Math.cos(winkel) * wucht, vy: Math.sin(winkel) * wucht,
      gold: jeStueck, wissen: jeWissen,
      gross: g.art.elite === true,
      hupf: zufall.zwischen(0, Math.PI * 2)
    });
  }
  if (toeter) toeter.getoetet = (toeter.getoetet ?? 0) + 1;
}

export function bewegeBeute(welt, dt) {
  for (const b of welt.beute) {
    /* Auswurf klingt ab. */
    const abfall = Math.exp(-6 * dt);
    b.vx *= abfall; b.vy *= abfall;
    b.hupf += dt * 5;

    let zieher = null, bestes = Infinity;
    for (const s of welt.spieler) {
      if (s.zustand !== "lebt") continue;
      const r = aufsammelReichweite(s.werte);
      const q = (s.x - b.x) ** 2 + (s.y - b.y) ** 2;
      if (q <= r * r && q < bestes) { bestes = q; zieher = s; }
    }

    if (zieher) {
      const dx = zieher.x - b.x, dy = zieher.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      b.vx = (dx / d) * SOG; b.vy = (dy / d) * SOG;
      if (d <= AUFHEBEN_ABSTAND) {
        zieher.gold += b.gold * goldFaktor(zieher.werte);
        zieher.wissen += b.wissen;
        b.weg = true;
        continue;
      }
    }

    b.x += b.vx * dt; b.y += b.vy * dt;
  }
  welt.beute = welt.beute.filter((b) => !b.weg);
}

/* Am Wellenende ist weg, was liegt. Ohne diesen Satz wäre die ganze
   Datei eine Verzögerung und keine Entscheidung. */
export function raeumeBeute(welt) {
  const verloren = welt.beute.reduce((s, b) => s + b.gold, 0);
  welt.beute = [];
  return verloren;
}
