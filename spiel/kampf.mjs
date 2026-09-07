/* [Aufgabe: Regelkern] Waffen, Geschosse, Schaden — hin und zurück.

   ── Der Spieler drückt hier nichts ─────────────────────────────────

   Jede Waffe hat ihre eigene Uhr, sucht sich beim Ablauf selbst ein
   Ziel in Reichweite und schlägt zu (docs/SPIEL.md, Bauteil 2). Es
   gibt keine Angriffstaste und keinen Zielvorgang. Wer das ändern
   will, ändert das Spiel und nicht diese Datei. (Ausweichen ist keine
   Angriffstaste — siehe `spiel/ausweichen.mjs`.)

   ── Wo der Schaden entsteht: nicht hier ────────────────────────────

   Diese Datei sammelt nur, **was** in die Rechnung geht: Waffe, Stufe,
   Gruppenbonus, Schadensart, Fläche. Gerechnet wird in
   `berechneSchaden()` in `spiel/werte.mjs`, und zwar an genau einer
   Stelle. Vorher stand die Formel hier mitten in der Schleife — mit
   fünf Schadensarten, Krit und Widerständen wäre sie an drei Stellen
   gelandet und an zweien veraltet.

   **Gerechnet wird beim Einschlag, nicht beim Abschuss.** Der
   Widerstand gehört dem Ziel: Ein Geschoss, das seinen Schaden schon
   beim Abwurf kennt, träfe zwei verschieden gepanzerte Gegner gleich
   hart.

   ── Warum Zeitschaden nicht stapelt ────────────────────────────────

   Brand und Gift **erneuern** sich beim erneuten Treffer, statt sich
   aufzuaddieren. Sonst wäre jede schnell schlagende Feuerwaffe
   automatisch die stärkste des Spiels: Zwanzig Stapel Brand schlagen
   jede Einzelwaffe, ohne dass jemand das entschieden hätte.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/welt.mjs` (ruft je Schritt), `spiel/werte.mjs` (Abklingzeit,
   Schadensrechnung, Rüstung, Gruppenbonus), `spiel/schadensarten.mjs`
   (die fünf Arten), `spiel/bewegung.mjs` (Rückstoß),
   `spiel/beute.mjs` (was ein Toter fallen lässt),
   `spiel/katalog/waffen.mjs` (die Daten). */

import {
  SCHWUNG_DAUER, SCHWUNG_BAND, GROESSTER_GEGNER, bogenDerWaffe, schwungRadius,
  schwungAnteil, imAusschnitt, imBand
} from "./schwung.mjs";
import {
  abklingzeit, merkmalZaehlung, gruppenAufschlag, berechneSchaden,
  schadenAmSpieler, widerstandAus, waffenReichweite, angriffeJeSchlag,
  geschosseJeAngriff, durchschlaege, regenerationJeSekunde, wert
} from "./werte.mjs";
import { STANDARD_ART } from "./schadensarten.mjs";
import { schadenDerWaffe } from "./katalog/waffen.mjs";
import { stosse } from "./bewegung.mjs";
import { richtungenDerSalve, geschosseDerSalve, anteilJeGeschoss } from "./salven.mjs";
import { lassBeuteFallen } from "./beute.mjs";

/* Wie lange ein Spieler nach einem Treffer unverwundbar ist. Ohne
   diese Pause würde ein Gegner, der auf einem steht, sechzigmal je
   Sekunde treffen — jeder Kontakt wäre sofort tödlich, und Rüstung
   und Leben wären beide sinnlos. */
export const UNVERWUNDBAR = 0.5;

export const BRAND_DAUER = 3;
export const GIFT_DAUER = 5;
export const FROST_DAUER = 1.5;

/* Brand ist Feuer, Gift ist Fluch. Das ist keine Zierde: Nur so
   greifen Widerstände und Schadensart-Modifier auch auf das, was
   **nach** dem Schlag passiert. Ohne diese Zuordnung wäre ein
   Feuer-Bau auf dem Papier stark und im Brand wirkungslos. */
export const BRAND_ART = "feuer";
export const GIFT_ART = "fluch";

/* ⚠️ Hier stand bis zum 06.09.2026 ein Re-Export
   `export { STANDARD_WINKEL as FAECHER }` mit der Begründung,
   `pruefe-werte.mjs` lese den Namen. **Das war frei erfunden** — die
   Datei importiert `kampf.mjs` überhaupt nicht, und `git log -S FAECHER
   -- werkzeuge/` ist leer, hat es also auch nie getan. Der Export hatte
   null Leser und ist ersatzlos entfallen; der Winkel heißt
   `STANDARD_WINKEL` und wohnt in `spiel/salven.mjs`, wo er hingehört.

   Die Lehre steht als Fehlerbuch-Fall dabei: Eine Begründung, die einen
   Leser nennt, muss diesen Leser nachweisen — sonst schützt sie einen
   toten Export dauerhaft vor dem Aufräumen. */

export function feuereWaffen(welt, dt) {
  for (const s of welt.spieler) {
    if (s.zustand !== "lebt") continue;
    const zaehlung = merkmalZaehlung(s.waffen);

    for (const waffe of s.waffen) {
      waffe.bereitIn -= dt;
      if (waffe.bereitIn > 0) continue;

      const v = waffe.vorlage;
      const reichweite = waffenReichweite(s.werte, v);
      const ziele = zieleInReichweite(welt, s.x, s.y, reichweite, v.ziele);
      if (ziele.length === 0) { waffe.bereitIn = 0; continue; }

      waffe.bereitIn = abklingzeit(s.werte, v.abklingzeit);

      /* Alles, was **nicht** vom Ziel abhängt — einmal je Schlag
         gesammelt und an den Einschlag weitergereicht. */
      const schlag = {
        art: v.schadensart ?? STANDARD_ART,
        grund: schadenDerWaffe(waffe) + s.werte.schaden * v.mitschaden,
        gruppenBonus: gruppenAufschlag(waffe, zaehlung),
        /* Flächenschaden gilt nur für Waffen, die mehrere auf einmal
           treffen. Sonst wäre er ein zweiter Schadenswert ohne eigene
           Entscheidung. */
        zusatzProzent: v.ziele > 1 ? wert(s.werte, "flaechenschaden") : 0
      };

      for (let n = 0; n < angriffeJeSchlag(s.werte); n++) {
        if (v.art === "nahkampf") holeAus(s, ziele[0], schlag, v, waffe, reichweite, n);
        else wirfSalve(welt, s, ziele[0], schlag, v, waffe, reichweite);
      }
    }
  }
}

/* ── Der Nahkampf: ausholen, dann treffen ─────────────────────────

   ⚠️ **Bis zum 06.09.2026 stand hier etwas anderes**, und Jannik hat
   genau das gesehen: `s.schlagZeit = 0.14` setzen und im **selben
   Bild** allen Zielen im **vollen Kreis** Schaden geben. Gezeichnet
   wurde dazu ein Bogen von 11 x 11 Bildpunkten in **Laufrichtung**.

   Drei Dinge waren damit falsch, und alle drei stehen in seiner Ansage:
   Der Schlag zeigte nicht auf den Gegner, die Animation hatte mit dem
   Treffer nichts zu tun (sie reichte 11,8 Bildpunkte weit, die Waffen
   30 bis 52), und jede Nahkampfwaffe sah gleich aus.

   Jetzt ist der Schlag eine **Bewegung**: `holeAus()` legt Richtung,
   Öffnung und Reichweite fest, `schwungSchritt()` fährt das Band nach
   außen und trifft, wer dort gerade steht. Die Geometrie steht in
   `spiel/schwung.mjs` und wird vom Zeichner **noch einmal** benutzt —
   deshalb kann die gemalte Form nicht mehr von der treffenden
   abweichen. */

/* Wie weit zwei Schläge desselben Bereitwerdens auseinanderliegen.

   `angriffeJeSchlag` gibt bei genug `zusatzangriffe` zwei oder drei
   Schwünge auf einmal. Ohne Verzug lägen sie exakt übereinander: Der
   Schaden wäre da, aber zu sehen wäre ein einziger Bogen. 0,05 s sind
   drei Bilder — genug, dass man sie zählt, und wenig genug, dass der
   letzte noch vor der nächsten Abklingzeit fertig ist. */
const NACHSCHLAG_VERZUG = 0.05;

/* Ausholen. Der Schaden fällt hier **nicht** — er fällt, wenn das Band
   beim Gegner vorbeikommt.

   Die Richtung ist die zum **nächsten** Gegner (`ziele[0]`, nach
   Abstand sortiert). Das ist Janniks „angriffe finde immer in
   richtigung der gegner statt", und es kostet nichts: Die Zielsuche
   lief ohnehin schon. */
function holeAus(s, ziel, schlag, v, waffe, reichweite, nummer) {
  const dx = ziel.x - s.x, dy = ziel.y - s.y;
  /* Steht der Gegner exakt auf der Figur, gibt es keine Richtung.
     Dann die Blickrichtung nehmen — irgendwohin muss der Bogen zeigen,
     und `0/0` wäre `NaN` und damit ein Bogen, der nie trifft. */
  const d = Math.hypot(dx, dy);
  const rx = d > 0 ? dx / d : s.blickX;
  const ry = d > 0 ? dy / d : s.blickY;

  s.schwuenge.push({
    waffe: waffe.id, art: schlag.art,
    rx, ry,
    bogen: bogenDerWaffe(v),
    reichweite,
    /* Wie viele Gegner dieser Schwung noch treffen darf. `v.ziele` galt
       vorher für den ganzen Kreis auf einmal; jetzt gilt es für die
       ganze Bewegung, und wer zuerst im Band liegt, wird zuerst
       getroffen. */
    offen: v.ziele,
    zeit: -nummer * NACHSCHLAG_VERZUG,
    schlag, wirkung: v.wirkung,
    /* Ein Gegner wird von **einem** Schwung genau einmal getroffen.
       Ohne diese Menge träfe das Band ihn in jedem Bild neu, in dem es
       ihn überdeckt — bei ±10 Bildpunkten Banddicke wären das drei bis
       vier Bilder und damit der drei- bis vierfache Schaden. */
    getroffen: new Set()
  });
}

/* Ein Bild Schwung: Band nach außen schieben, treffen, Abgelaufenes
   wegräumen. */
export function schwungSchritt(welt, dt) {
  for (const s of welt.spieler) {
    if (s.schwuenge.length === 0) continue;
    /* Wer fällt, hört auf zu schlagen. Ein Bogen, der über einem
       Knienden weiterfährt, wäre ein Treffer aus dem Nichts. */
    if (s.zustand !== "lebt") { s.schwuenge.length = 0; continue; }

    for (const sw of s.schwuenge) {
      sw.zeit += dt;
      /* Noch nicht dran (Nachschlag) oder schon satt. Beides malt der
         Zeichner trotzdem — die Bewegung läuft zu Ende. */
      if (sw.zeit <= 0 || sw.offen <= 0) continue;
      const radius = schwungRadius(sw, schwungAnteil(sw));

      /* Wer jetzt im Band liegt. Über das Raster gesucht, damit ein
         Schwung nicht mit der Gegnerzahl teurer wird — dieselbe
         Begründung wie bei `zieleInReichweite`. */
      const kandidaten = [];
      welt.gitter.umkreis(s.x, s.y, radius + SCHWUNG_BAND + GROESSTER_GEGNER, (g) => {
        if (g.tot || sw.getroffen.has(g)) return;
        const dx = g.x - s.x, dy = g.y - s.y;
        const d = Math.hypot(dx, dy);
        if (!imBand(sw, d, g.radius, radius)) return;
        if (!imAusschnitt(sw, dx, dy)) return;
        kandidaten.push([d, g]);
      });
      /* Der nächste zuerst. `sort` ist seit ES2019 stabil, und das
         Raster liefert immer dieselbe Reihenfolge — zwei Rechner im
         Netz-Koop treffen deshalb dieselben Gegner in derselben
         Reihenfolge. */
      if (kandidaten.length > 1) kandidaten.sort((a, b) => a[0] - b[0]);

      for (const [, g] of kandidaten) {
        if (sw.offen <= 0) break;
        /* ⚠️ **Derselbe Gegner kann zweimal in der Liste stehen.** Das
           Raster schluesselt seine Zellen mit `cx * 73856093 ^ cy *
           19349663` und prueft die Zelle danach nicht nach — zwei
           verschiedene Zellen koennen sich also eine Liste teilen, und
           `umkreis()` reicht sie dann zweimal durch. Der Filter beim
           Sammeln oben hilft nicht: Dort ist der Gegner noch in keiner
           `getroffen`-Menge.

           Gemessen am 06.09.2026 auf einem Ring aus 24 Gegnern: Die
           Pechfackel (drei Ziele) verbrauchte alle drei, aber nur zwei
           Gegner nahmen Schaden — einer bekam ihn doppelt. Ein
           Rundumschlag haette so die Haelfte seiner Ziele an einen
           einzigen verschenkt. */
        if (sw.getroffen.has(g)) continue;
        sw.getroffen.add(g);
        sw.offen--;
        schlageZu(welt, s, g, sw.schlag, sw.wirkung, sw.waffe);
      }
    }

    s.schwuenge = s.schwuenge.filter((sw) => sw.zeit < SCHWUNG_DAUER);
  }
}

/* Eine Salve. **Wie** die Geschosse liegen, entscheidet das Muster der
   Waffe (`spiel/salven.mjs`); hier wird nur noch daraus gebaut.

   Der Schaden wird auf die Geschosse **verteilt**, nicht vervielfacht —
   sonst wäre ein Vierfach-Muster schlicht vierfacher Schaden und jede
   andere Waffe unbrauchbar. Die Begründung samt Aufschlag steht bei
   `anteilJeGeschoss()`. */
function wirfSalve(welt, s, ziel, schlag, v, waffe, reichweite) {
  const dx = ziel.x - s.x, dy = ziel.y - s.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d;

  /* Was die Waffe vorsieht plus was der Spieler sich erkauft hat. */
  const anzahl = geschosseDerSalve(v.salve, geschosseJeAngriff(s.werte) - 1);

  /* ⚠️ Der Anteil kommt aus der **Waffe**, nicht aus der Gesamtzahl.
     Sonst würde `zusatzgeschosse` sich selbst entwerten: Wer sich ein
     drittes Geschoss erkauft, bekäme drei Geschosse zu je einem Drittel
     — also gar nichts. Gemessen hat genau das 5 von 24 Läufen
     verändert, bevor die Zeile so dastand. Ein Waffenmuster ist die
     Bauart der Waffe und darf nicht gratis Schaden geben; ein gekaufter
     Wert ist gekaufter Schaden. */
  const anteil = anteilJeGeschoss(v.salve?.geschosse ?? 1, v.salve?.form,
    v.suchend === true);

  /* Der Zufall kommt aus der Welt, nie aus `Math.random` — zwei
     Rechner im Netz-Koop müssen dieselbe Streuung würfeln.
     `welt.zufall` ist ein Objekt mit `zahl()`, keine Funktion. */
  const richtungen = richtungenDerSalve(nx, ny, anzahl, v.salve, welt.zufall);

  for (const r of richtungen) {
    /* `laengs` zeigt in Flugrichtung, `quer` senkrecht dazu. */
    const startX = s.x + nx * r.laengs - ny * r.quer;
    const startY = s.y + ny * r.laengs + nx * r.quer;

    welt.geschosse.push({
      x: startX, y: startY, vx: r.rx * v.geschosstempo, vy: r.ry * v.geschosstempo,
      schlag, anteil, wirkung: v.wirkung, waffe: waffe.id, radius: 3,
      rest: durchschlaege(s.werte, v), getroffen: new Set(),
      lebenszeit: reichweite / v.geschosstempo + 0.35,
      suchend: v.suchend === true, ziel: v.suchend ? ziel : null,
      tempo: v.geschosstempo, besitzer: s, feindlich: false
    });
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

/* Ein Einschlag: hier fällt die Kritentscheidung und hier greift der
   Widerstand des Ziels. Beides gehört zum **Ziel** und darf deshalb
   nicht schon beim Abschuss feststehen. */
export function schlageZu(welt, spieler, g, schlag, wirkung, waffenId, anteil = 1) {
  const treffer = berechneSchaden({
    ...schlag,
    /* Ein Geschoss aus einer Salve trägt nur seinen Anteil. Der
       Nahkampf ruft ohne `anteil` und bekommt darum die 1 — er hat
       keine Salve, sondern trifft alle Ziele in Reichweite. */
    grund: schlag.grund * anteil,
    werte: spieler.werte,
    widerstaende: g.art.widerstaende,
    zufall: welt.zufall
  });
  trefferAufGegner(welt, spieler, g, treffer, wirkung, waffenId);
  return treffer;
}

/* `treffer` ist das Ergebnis von `berechneSchaden()`:
   `{ menge, krit, art }`. Die schwebende Zahl trägt beides mit —
   welche Farbe sie bekommt und ob sie größer erscheint, entscheidet
   der Zeichner (`runtime/`), nicht der Regelkern. */
export function trefferAufGegner(welt, spieler, g, treffer, wirkung, waffenId) {
  const menge = treffer.menge;
  g.leben -= menge;
  /* Die Richtung des Schlages wandert mit in den Funken — der Zeichner
     braucht sie für den Schnittstrahl (`runtime/zeichnen.js`,
     `zeichneStaub`) und kennt den Angreifer sonst nicht mehr. Sie ist
     reine Optik und steht deshalb **nicht** im Netz-Abdruck. */
  const fx = g.x - spieler.x, fy = g.y - spieler.y;
  const fd = Math.hypot(fx, fy) || 1;
  welt.funken.push({
    x: g.x, y: g.y, zeit: 0.18, art: treffer.art ?? STANDARD_ART, waffe: waffenId,
    rx: fx / fd, ry: fy / fd
  });
  welt.zahlen.push({
    x: g.x, y: g.y - g.radius, wert: Math.round(menge), zeit: 0.7, hoch: 0,
    krit: treffer.krit === true, art: treffer.art ?? STANDARD_ART
  });

  if (wirkung.wucht) stosse(g, g.x - spieler.x, g.y - spieler.y, wirkung.wucht * 26);
  /* Zeitschaden trägt den Widerstand des Ziels genauso wie der Schlag
     selbst — sonst wäre ein Feuerwiderstand gegen die Pechfackel nur
     ein Sechstel wert, weil ihr Schaden im Brand steckt. */
  if (wirkung.brand) {
    g.brand = BRAND_DAUER;
    g.brandRate = (wirkung.brand / BRAND_DAUER)
      * (1 - widerstandAus(g.art.widerstaende, BRAND_ART));
  }
  if (wirkung.gift) {
    g.gift = GIFT_DAUER;
    g.giftRate = (wirkung.gift / GIFT_DAUER)
      * (1 - widerstandAus(g.art.widerstaende, GIFT_ART));
  }
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
          nimmSchaden(welt, s, p.schaden, p.schadensart);
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
      /* `anteil` verteilt den Schlag auf die Geschosse der Salve. Ohne
         ihn wäre ein Vierfach-Muster vierfacher Schaden — siehe
         `anteilJeGeschoss()` in `spiel/salven.mjs`. */
      schlageZu(welt, p.besitzer, g, p.schlag, p.wirkung, p.waffe, p.anteil);
      if (--p.rest <= 0) p.weg = true;
    });
  }
  welt.geschosse = welt.geschosse.filter((p) => !p.weg);
}

/* Wer auf Abstand wehtut, ist der einzige Grund, freiwillig nach vorn
   zu gehen.

   ⚠️ **Hier stand `if (art.verhalten !== "speit") continue;`** — die
   Fähigkeit zu schießen hing am **Namen** des Verhaltens. Das ist
   dieselbe Bauart, die am 05.09.2026 schon einmal teuer war: Eine
   abgeschriebene Verhaltensliste in `werkzeuge/pruefe-katalog.mjs`
   machte drei fertig gebaute Verhalten unbenutzbar. Ein Name ist keine
   Fähigkeit.

   Gefragt wird jetzt, was ein Gegner **hat**: die drei Felder, ohne die
   ein Schuss gar nicht beschreibbar ist. Für den heutigen Katalog ist
   das nachweislich dieselbe Menge — jede `speit`-Art trägt alle drei,
   keine andere Art trägt eine davon (`werkzeuge/pruefe-katalog.mjs`
   prüft beide Richtungen). Die Änderung ist deshalb ein Umbau ohne
   sichtbare Änderung, und der Balancelauf bleibt zeichengleich.

   Was sie **möglich macht**: ein Gegner, der auf Abstand kreist und
   dabei spuckt. `kreist` gibt es seit #71 fertig gebaut, und ohne
   Fernangriff wäre ein kreisender Gegner ein Karussell — er hält per
   Bauart Abstand und käme nie an. Welche Art das bekommt, ist eine
   Auslegungsfrage und steht offen. */
export function feuereGegner(welt, dt) {
  for (const g of welt.gegner) {
    const art = g.art;
    if (!(art.abstand > 0 && art.abklingzeit > 0 && art.geschosstempo > 0)) continue;
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
      schadensart: gegnerArt(art),
      lebenszeit: 4, wirkung: {}, getroffen: new Set(), rest: 1
    });
  }
}

/* Womit ein Gegner wehtut. `spiel/katalog/gegner.mjs` trägt das Feld
   `schadensart` noch nicht; bis dahin gilt die Standardart, gegen die
   Rüstung ganz normal hilft. Raten wäre hier schlimmer als nichts tun:
   Wer dem Speier auf Verdacht `fluch` gäbe, machte Rüstung gegen ihn
   still wertlos. */
export function gegnerArt(art) {
  return art?.schadensart ?? STANDARD_ART;
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
      nimmSchaden(welt, s, g.schaden, gegnerArt(g.art));
      stosse(g, g.x - s.x, g.y - s.y, 30);
    });
  }
}

export function nimmSchaden(welt, spieler, menge, art = STANDARD_ART) {
  const echt = schadenAmSpieler(spieler.werte, menge, art);
  spieler.leben -= echt;
  spieler.unverwundbar = UNVERWUNDBAR;
  spieler.trefferZeit = 0.25;
  welt.zahlen.push({
    x: spieler.x, y: spieler.y - 10, wert: -Math.round(echt), zeit: 0.8, hoch: 0,
    krit: false, art
  });
  if (spieler.leben <= 0) {
    spieler.leben = 0;
    spieler.zustand = "liegt";
    spieler.aufheben = 0;
  }
}

export function heile(spieler, menge) {
  spieler.leben = Math.min(spieler.lebenMax, spieler.leben + menge);
}

/* Leben, das von selbst zurückkommt. Getrennt von `genesung`: Genesung
   zahlt am Wellenende und belohnt Überleben, Regeneration zahlt
   laufend und belohnt Ausweichen. Zwei Werte, zwei Spielweisen.

   Ohne den frühen Ausstieg liefe `heile()` sechzigmal je Sekunde für
   jeden Spieler, obwohl der Grundwert null ist. */
export function regeneriere(welt, dt) {
  for (const s of welt.spieler) {
    if (s.zustand !== "lebt") continue;
    const je = regenerationJeSekunde(s.werte);
    if (je <= 0) continue;
    heile(s, je * dt);
  }
}

/* Brand und Gift. Gift geht als Fluch an der Rüstung vorbei — das ist
   der einzige Grund, warum das Seuchenglas gegen den Knochenritter
   etwas taugt, und damit der Grund, warum es Schadensarten gibt. */
export function wirkeZeitschaden(welt, dt) {
  for (const g of welt.gegner) {
    if (g.tot) continue;
    if (g.brand > 0) { g.brand -= dt; g.leben -= g.brandRate * dt; }
    if (g.gift > 0) { g.gift -= dt; g.leben -= g.giftRate * dt; }
    if (g.leben <= 0) toeteGegner(welt, g, g.letzterTreffer ?? null);
  }
}
