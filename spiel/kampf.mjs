/* [Aufgabe: Regelkern] Waffen, Geschosse, Schaden — hin und zurück.

   ── Der Spieler drückt hier nichts ─────────────────────────────────

   Jede Waffe hat ihre eigene Uhr, sucht sich beim Ablauf selbst ein
   Ziel in Reichweite und schlägt zu (docs/SPIEL.md, Bauteil 2). Es
   gibt keine Angriffstaste und keinen Zielvorgang. Wer das ändern
   will, ändert das Spiel und nicht diese Datei.

   ── Warum Zeitschaden nicht stapelt ────────────────────────────────

   Brand und Gift **erneuern** sich beim erneuten Treffer, statt sich
   aufzuaddieren. Sonst wäre jede schnell schlagende Feuerwaffe
   automatisch die stärkste des Spiels: Zwanzig Stapel Brand schlagen
   jede Einzelwaffe, ohne dass jemand das entschieden hätte.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/welt.mjs` (ruft je Schritt), `spiel/werte.mjs` (Abklingzeit,
   Schaden, Rüstung, Gruppenbonus), `spiel/bewegung.mjs` (Rückstoß),
   `spiel/beute.mjs` (was ein Toter fallen lässt),
   `spiel/katalog/waffen.mjs` (die Daten). */

import { abklingzeit, schadensminderung, merkmalZaehlung, gruppenAufschlag } from "./werte.mjs";
import { schadenDerWaffe } from "./katalog/waffen.mjs";
import { stosse } from "./bewegung.mjs";
import { lassBeuteFallen } from "./beute.mjs";

/* Wie lange ein Spieler nach einem Treffer unverwundbar ist. Ohne
   diese Pause würde ein Gegner, der auf einem steht, sechzigmal je
   Sekunde treffen — jeder Kontakt wäre sofort tödlich, und Rüstung
   und Leben wären beide sinnlos. */
export const UNVERWUNDBAR = 0.5;

export const BRAND_DAUER = 3;
export const GIFT_DAUER = 5;
export const FROST_DAUER = 1.5;

export function feuereWaffen(welt, dt) {
  for (const s of welt.spieler) {
    if (s.zustand !== "lebt") continue;
    const zaehlung = merkmalZaehlung(s.waffen);

    for (const waffe of s.waffen) {
      waffe.bereitIn -= dt;
      if (waffe.bereitIn > 0) continue;

      const v = waffe.vorlage;
      const ziele = zieleInReichweite(welt, s.x, s.y, v.reichweite, v.ziele);
      if (ziele.length === 0) { waffe.bereitIn = 0; continue; }

      waffe.bereitIn = abklingzeit(s.werte, v.abklingzeit);
      const menge = (schadenDerWaffe(waffe) + s.werte.schaden * v.mitschaden)
        * (1 + gruppenAufschlag(waffe, zaehlung));

      if (v.art === "nahkampf") {
        s.schlagZeit = 0.14;
        s.schlagWaffe = waffe.id;
        for (const g of ziele) trefferAufGegner(welt, s, g, menge, v.wirkung, waffe.id);
      } else {
        const g = ziele[0];
        const dx = g.x - s.x, dy = g.y - s.y;
        const d = Math.hypot(dx, dy) || 1;
        welt.geschosse.push({
          x: s.x, y: s.y, vx: (dx / d) * v.geschosstempo, vy: (dy / d) * v.geschosstempo,
          schaden: menge, wirkung: v.wirkung, waffe: waffe.id, radius: 3,
          rest: (v.wirkung.durchschlag ?? 0) + 1, getroffen: new Set(),
          lebenszeit: v.reichweite / v.geschosstempo + 0.35,
          suchend: v.suchend === true, ziel: v.suchend ? g : null,
          tempo: v.geschosstempo, besitzer: s, feindlich: false
        });
      }
    }
  }
}

/* Die `anzahl` nächsten Gegner im Umkreis. Über das Raster gesucht,
   damit die Zielsuche nicht mit der Gegnerzahl teurer wird. */
export function zieleInReichweite(welt, x, y, reichweite, anzahl) {
  const gefunden = [];
  welt.gitter.umkreis(x, y, reichweite, (g) => {
    const q = (g.x - x) ** 2 + (g.y - y) ** 2;
    const r = reichweite + g.radius;
    if (q <= r * r) gefunden.push([q, g]);
  });
  if (gefunden.length > anzahl) gefunden.sort((a, b) => a[0] - b[0]);
  return gefunden.slice(0, anzahl).map((p) => p[1]);
}

export function trefferAufGegner(welt, spieler, g, menge, wirkung, waffenId) {
  g.leben -= menge;
  welt.funken.push({ x: g.x, y: g.y, zeit: 0.18, art: waffenId });
  welt.zahlen.push({ x: g.x, y: g.y - g.radius, wert: Math.round(menge), zeit: 0.7, hoch: 0 });

  if (wirkung.wucht) stosse(g, g.x - spieler.x, g.y - spieler.y, wirkung.wucht * 26);
  if (wirkung.brand) { g.brand = BRAND_DAUER; g.brandRate = wirkung.brand / BRAND_DAUER; }
  if (wirkung.gift) { g.gift = GIFT_DAUER; g.giftRate = wirkung.gift / GIFT_DAUER; }
  if (wirkung.frost) { g.frost = FROST_DAUER; g.frostStaerke = wirkung.frost; }
  if (wirkung.lebensraub) heile(spieler, wirkung.lebensraub);

  if (g.leben <= 0) toeteGegner(welt, g, spieler);
}

/* Töten allein gibt **nichts** — weder Gold noch Wissen. Beides liegt
   danach am Boden und muss geholt werden (`spiel/beute.mjs`). Das ist
   Absicht und nicht vergessen. */
export function toeteGegner(welt, g, toeter) {
  if (g.tot) return;
  g.tot = true;
  lassBeuteFallen(welt, g, toeter);
  welt.funken.push({ x: g.x, y: g.y, zeit: 0.3, art: "tod" });
}

export function bewegeGeschosse(welt, dt) {
  for (const p of welt.geschosse) {
    p.lebenszeit -= dt;
    if (p.lebenszeit <= 0) { p.weg = true; continue; }

    /* Suchende Geschosse lenken weich nach — hart nachgezogen sähen
       sie aus, als klebten sie am Ziel. */
    if (p.suchend && p.ziel && !p.ziel.tot) {
      const dx = p.ziel.x - p.x, dy = p.ziel.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      p.vx += ((dx / d) * p.tempo - p.vx) * Math.min(1, dt * 6);
      p.vy += ((dy / d) * p.tempo - p.vy) * Math.min(1, dt * 6);
    }

    p.x += p.vx * dt; p.y += p.vy * dt;

    if (p.feindlich) {
      for (const s of welt.spieler) {
        if (s.zustand !== "lebt") continue;
        if ((s.x - p.x) ** 2 + (s.y - p.y) ** 2 <= (s.radius + p.radius) ** 2) {
          nimmSchaden(welt, s, p.schaden);
          p.weg = true;
          break;
        }
      }
      continue;
    }

    welt.gitter.umkreis(p.x, p.y, p.radius + 10, (g) => {
      if (p.weg || g.tot || p.getroffen.has(g)) return;
      const r = g.radius + p.radius;
      if ((g.x - p.x) ** 2 + (g.y - p.y) ** 2 > r * r) return;
      p.getroffen.add(g);
      trefferAufGegner(welt, p.besitzer, g, p.schaden, p.wirkung, p.waffe);
      if (--p.rest <= 0) p.weg = true;
    });
  }
  welt.geschosse = welt.geschosse.filter((p) => !p.weg);
}

/* Speier schießen. Sie sind die einzige Gegnerart, die auf Abstand
   wehtut — und damit der einzige Grund, freiwillig nach vorn zu gehen. */
export function feuereGegner(welt, dt) {
  for (const g of welt.gegner) {
    const art = g.art;
    if (art.verhalten !== "speit") continue;
    g.bereitIn -= dt;
    if (g.bereitIn > 0) continue;

    let ziel = null, bestes = Infinity;
    for (const s of welt.spieler) {
      if (s.zustand !== "lebt") continue;
      const q = (s.x - g.x) ** 2 + (s.y - g.y) ** 2;
      if (q < bestes) { bestes = q; ziel = s; }
    }
    if (!ziel || bestes > (art.abstand * 1.3) ** 2) { g.bereitIn = 0.2; continue; }

    g.bereitIn = art.abklingzeit;
    const dx = ziel.x - g.x, dy = ziel.y - g.y;
    const d = Math.hypot(dx, dy) || 1;
    welt.geschosse.push({
      x: g.x, y: g.y, vx: (dx / d) * art.geschosstempo, vy: (dy / d) * art.geschosstempo,
      schaden: g.schaden, radius: 3, feindlich: true, waffe: "speichel",
      lebenszeit: 4, wirkung: {}, getroffen: new Set(), rest: 1
    });
  }
}

/* Berührungsschaden. Der Gegner wird dabei zurückgestoßen — sonst
   klebt er am Spieler und die Unverwundbarkeit macht ihn harmlos. */
export function beruehrung(welt, dt) {
  for (const s of welt.spieler) {
    if (s.unverwundbar > 0) s.unverwundbar -= dt;
    if (s.zustand !== "lebt" || s.unverwundbar > 0) continue;

    welt.gitter.umkreis(s.x, s.y, s.radius + 14, (g) => {
      if (g.tot || s.unverwundbar > 0) return;
      const r = g.radius + s.radius;
      if ((g.x - s.x) ** 2 + (g.y - s.y) ** 2 > r * r) return;
      nimmSchaden(welt, s, g.schaden);
      stosse(g, g.x - s.x, g.y - s.y, 30);
    });
  }
}

export function nimmSchaden(welt, spieler, menge) {
  const echt = Math.max(1, menge * (1 - schadensminderung(spieler.werte)));
  spieler.leben -= echt;
  spieler.unverwundbar = UNVERWUNDBAR;
  spieler.trefferZeit = 0.25;
  welt.zahlen.push({ x: spieler.x, y: spieler.y - 10, wert: -Math.round(echt), zeit: 0.8, hoch: 0 });
  if (spieler.leben <= 0) {
    spieler.leben = 0;
    spieler.zustand = "liegt";
    spieler.aufheben = 0;
  }
}

export function heile(spieler, menge) {
  spieler.leben = Math.min(spieler.lebenMax, spieler.leben + menge);
}

/* Brand und Gift. Gift geht an der Rüstung vorbei — das ist der
   einzige Grund, warum das Seuchenglas gegen den Knochenritter etwas
   taugt, und damit der Grund, warum es Schadensarten gibt. */
export function wirkeZeitschaden(welt, dt) {
  for (const g of welt.gegner) {
    if (g.tot) continue;
    if (g.brand > 0) { g.brand -= dt; g.leben -= g.brandRate * dt; }
    if (g.gift > 0) { g.gift -= dt; g.leben -= g.giftRate * dt; }
    if (g.leben <= 0) toeteGegner(welt, g, g.letzterTreffer ?? null);
  }
}
