/* [Aufgabe: Regelkern] Wer sich wohin bewegt — Spieler, Gegner, Rückstoß.

   ── Die eine Regel, die das Spielgefühl macht ──────────────────────

   Gegner **drängen sich auseinander**. Ohne das läuft eine Welle als
   ein einziger Punkt auf den Spieler zu: Fünfzig Schlurfer auf
   derselben Stelle sehen aus wie einer und lassen sich mit einer
   Sichel abarbeiten. Mit dem Drängen entsteht eine Front — und damit
   überhaupt erst die Frage, wo man durchläuft.

   Die zweite Regel: **Der Spieler ist immer schneller als das meiste.**
   Kann man nicht weglaufen, ist der Laufweg keine Entscheidung mehr,
   und ohne Laufweg ist von Brotato nichts übrig (docs/SPIEL.md 1).
   Deshalb ist genau **eine** Gegnerart schneller als der Grundwert von
   78 (die Aaskrähe mit 74 liegt knapp darunter, der Hetzer mit 62
   deutlich) — schnelle Gegner sind Ausnahmen, keine Regel.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/welt.mjs` (ruft je Schritt), `spiel/werte.mjs` (Tempo),
   `spiel/gitter.mjs` (Nachbarn fürs Drängen),
   `spiel/katalog/gegner.mjs` (Verhalten, Tempo, Wucht). */

import { laufTempo } from "./werte.mjs";

/* Wie stark sich zwei Gegner auseinanderschieben, wenn sie sich
   überlappen. 90 statt „ganz auseinander" ist gemessen: Bei voller
   Trennung zittert die Front, weil sich jedes Bild alle gegenseitig
   wegstoßen; bei 90 setzt sie sich weich. */
const DRAENGEN = 90;

/* Rückstoß klingt exponentiell ab — ein linearer Abfall gäbe einen
   harten Halt, und der sieht aus wie ein Fehler. */
const RUECKSTOSS_ABFALL = 8.5;

export function bewegeSpieler(spieler, eingabe, dt, arenaRadius) {
  if (spieler.zustand !== "lebt") { spieler.vx = 0; spieler.vy = 0; return; }

  let ex = eingabe?.x ?? 0;
  let ey = eingabe?.y ?? 0;
  const laenge = Math.hypot(ex, ey);
  /* Diagonal darf nicht schneller sein als gerade — der klassische
     Fehler, bei dem sich alle nur noch schräg bewegen. */
  if (laenge > 1) { ex /= laenge; ey /= laenge; }

  const tempo = laufTempo(spieler.werte);
  spieler.vx = ex * tempo;
  spieler.vy = ey * tempo;
  spieler.x += spieler.vx * dt;
  spieler.y += spieler.vy * dt;

  if (laenge > 0.01) { spieler.blickX = ex / (laenge > 1 ? laenge : 1); spieler.blickY = ey / (laenge > 1 ? laenge : 1); }

  haltImKreis(spieler, arenaRadius - spieler.radius);
}

/* Der Bannkreis hält (docs/SPIEL.md 3). Er ist keine Wand, an der man
   klebt, sondern eine harte Grenze: Wer hinaus will, rutscht am Rand
   entlang — das ist derselbe Effekt wie eine Wand, aber ohne dass die
   Figur beim Anlaufen stehen bleibt. */
export function haltImKreis(ding, radius) {
  const d = Math.hypot(ding.x, ding.y);
  if (d > radius && d > 0) {
    ding.x = (ding.x / d) * radius;
    ding.y = (ding.y / d) * radius;
  }
}

/* Das nächste erreichbare Ziel. Liegende Spieler zählen nicht — sonst
   würde die ganze Welle einen Knienden umringen und niemand käme
   heran, um ihn aufzuheben (docs/SPIEL.md 4.2). */
export function naechsterSpieler(spieler, x, y) {
  let bester = null, bestesQuadrat = Infinity;
  for (const s of spieler) {
    if (s.zustand !== "lebt") continue;
    const q = (s.x - x) ** 2 + (s.y - y) ** 2;
    if (q < bestesQuadrat) { bestesQuadrat = q; bester = s; }
  }
  return bester;
}

export function bewegeGegner(welt, dt) {
  const { gegner, spieler, gitter, arena } = welt;

  gitter.leeren();
  for (const g of gegner) gitter.setze(g.x, g.y, g);

  for (const g of gegner) {
    const art = g.art;
    const ziel = naechsterSpieler(spieler, g.x, g.y);

    let wx = 0, wy = 0;
    if (ziel) {
      const dx = ziel.x - g.x, dy = ziel.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      wx = dx / d; wy = dy / d;

      if (art.verhalten === "schwankt") {
        /* Ein Bogen statt einer Geraden: quer zur Laufrichtung, mit
           eigener Phase je Gegner. Trifft man schlechter, und es
           bricht die Front auf. */
        g.phase += dt * 3.4;
        const s = Math.sin(g.phase) * 0.7;
        const qx = -wy, qy = wx;
        wx += qx * s; wy += qy * s;
        const l = Math.hypot(wx, wy) || 1;
        wx /= l; wy /= l;
      } else if (art.verhalten === "speit") {
        /* Bleibt auf Abstand: kommt heran, bis er schießen kann, und
           weicht zurück, wenn man ihm zu nah kommt. */
        const abstand = Math.hypot(dx, dy);
        if (abstand < art.abstand * 0.75) { wx = -wx; wy = -wy; }
        else if (abstand < art.abstand) { wx = 0; wy = 0; }
      }
    }

    /* Frost bremst, Rückstoß überlagert. */
    const tempo = art.tempo * (g.frost > 0 ? 1 - g.frostStaerke : 1);
    let vx = wx * tempo + g.stossX;
    let vy = wy * tempo + g.stossY;

    /* Auseinanderdrängen — nur gegen Nachbarn im Raster. */
    let sx = 0, sy = 0;
    const reich = g.radius * 2;
    gitter.umkreis(g.x, g.y, reich, (h) => {
      if (h === g) return;
      const dx = g.x - h.x, dy = g.y - h.y;
      const q = dx * dx + dy * dy;
      const min = g.radius + h.radius;
      if (q >= min * min || q === 0) return;
      const d = Math.sqrt(q);
      const kraft = (min - d) / min;
      sx += (dx / d) * kraft; sy += (dy / d) * kraft;
    });
    vx += sx * DRAENGEN; vy += sy * DRAENGEN;

    g.x += vx * dt; g.y += vy * dt;
    g.vx = vx; g.vy = vy;

    /* Abklingen. */
    const abfall = Math.exp(-RUECKSTOSS_ABFALL * dt);
    g.stossX *= abfall; g.stossY *= abfall;
    if (g.frost > 0) g.frost -= dt;

    haltImKreis(g, arena.radius + 40);
  }
}

/* Rückstoß, gedämpft durch die Wucht der Art: Ein Knochenritter lässt
   sich kaum schieben (`wucht: 0.2`), ein Balg fliegt. */
export function stosse(g, dx, dy, staerke) {
  const d = Math.hypot(dx, dy) || 1;
  g.stossX += (dx / d) * staerke * g.art.wucht;
  g.stossY += (dy / d) * staerke * g.art.wucht;
}
