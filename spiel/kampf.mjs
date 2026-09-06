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
  abklingzeit, merkmalZaehlung, gruppenAufschlag, berechneSchaden,
  schadenAmSpieler, widerstandAus, waffenReichweite, angriffeJeSchlag,
  geschosseJeAngriff, durchschlaege, regenerationJeSekunde, wert
} from "./werte.mjs";
import { STANDARD_ART } from "./schadensarten.mjs";
import { schadenDerWaffe } from "./katalog/waffen.mjs";
import { stosse } from "./bewegung.mjs";
import { richtungenDerSalve, geschosseDerSalve, anteilJeGeschoss } from "./salven.mjs";
import { lassBeuteFallen } from "./beute.mjs";
import {
  angriffsformVon, baueKegel, baueAura, baueBogen, baueMeteore,
  kettenZiele, kettenAnteil, staerkeDesFeldes, imKegel, drehe, naechstesVon,
  bremseGeschoss, erlahmterAnteil, schwarmZiel, neuesSuchziel
} from "./angriffsformen.mjs";

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
      /* Ohne Ziel wird nicht geschlagen, und die Uhr bleibt stehen —
         sonst sammelte eine Waffe während der Ruhe Abklingzeit an und
         entlüde sich beim ersten Gegner mehrfach.

         ⚠️ **Die Aura ist die eine Ausnahme, und sie ist der Grund,
         warum sie eine Aura ist.** Ein Ring, der erst erscheint, wenn
         jemand hineinläuft, und verschwindet, sobald der Letzte fällt,
         wäre kein dauerhafter Ring, sondern ein Nahkampfschlag mit
         Kreis drumherum — also genau der „bloße Treffereffekt", gegen
         den diese ganze Änderung gebaut ist. */
      if (ziele.length === 0 && angriffsformVon(v) !== "aura") {
        waffe.bereitIn = 0; continue;
      }

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
        loeseAus(welt, s, ziele, schlag, v, waffe, reichweite);
      }
    }
  }
}

/* Welche Form der Angriff annimmt.

   ⚠️ **Die beiden ersten Zweige sind wörtlich das, was vorher hier in
   der Schleife stand.** Der Umbau ist deshalb einer ohne sichtbare
   Änderung: Jede der zwölf Waffen im Katalog fällt über
   `angriffsformVon()` auf `schlag` oder `geschoss` zurück und verhält
   sich byteweise wie zuvor (`werkzeuge/pruefe-angriffsformen.mjs`
   rechnet das nach). Erst eine Waffe, die ausdrücklich eine
   `angriffsform` nennt, geht einen anderen Weg. Das ist die Trennung,
   auf der dieses Projekt besteht: erst der Umbau, dann der Inhalt. */
function loeseAus(welt, s, ziele, schlag, v, waffe, reichweite) {
  const form = angriffsformVon(v);

  /* Worauf die gerichteten Formen zeigen. **Nicht** `ziele[0]`: Der ist
     nur dann der nächste, wenn mehr Gegner gefunden wurden als die
     Waffe Ziele hat — sonst gibt `zieleInReichweite()` sie unsortiert
     in Rasterreihenfolge zurück. Die Begründung samt Messung steht bei
     `naechstesVon()` in `spiel/angriffsformen.mjs`. */
  const naechstes = ziele.length ? naechstesVon(s.x, s.y, ziele) : null;

  if (form === "schlag") {
    s.schlagZeit = 0.14;
    s.schlagWaffe = waffe.id;
    for (const g of ziele) {
      /* Ein zweiter Schlag auf eine Leiche wäre verschenkt — ohne
         diese Zeile wäre `zusatzangriffe` genau dort am schwächsten,
         wo es am meisten trifft. */
      if (g.tot) continue;
      schlageZu(welt, s, g, schlag, v.wirkung, waffe.id);
    }
    return;
  }

  if (form === "geschoss" || form === "erlahmend" || form === "schwarm") {
    wirfSalve(welt, s, ziele, schlag, v, waffe, reichweite);
    return;
  }

  if (form === "kegel") {
    welt.felder.push(baueKegel(welt, s, naechstes, schlag, v, waffe, reichweite));
    return;
  }

  if (form === "aura") {
    /* Nur **ein** Ring je Waffe. Ohne diese Frage legte jede
       Abklingzeit einen zweiten übereinander: Der Schaden verdoppelte
       sich still mit jedem Takt, und im Bild sähe man nichts davon,
       weil zwei gleiche Ringe wie einer aussehen. Der bestehende Ring
       wird stattdessen aufgefrischt — dasselbe Muster wie bei `brand`. */
    const alt = welt.felder.find((f) => f.form === "aura"
      && f.besitzer === s && f.waffe === waffe.id);
    const neu = baueAura(welt, s, schlag, v, waffe, reichweite,
      abklingzeit(s.werte, v.abklingzeit));
    if (alt) {
      alt.rest = neu.rest;
      alt.radius = neu.radius;
      alt.takt = neu.takt;
      alt.schlag = neu.schlag;
      alt.getroffen.clear();
    } else {
      welt.felder.push(neu);
    }
    /* Der Ring taktet selbst; die Waffenuhr treibt ihn nur an. Der
       Takt schlägt in `wirkeFelder()` zu, damit er auch dann läuft,
       wenn gerade kein Ziel in Reichweite ist — eine Aura, die erst
       zuschlägt, wenn die Waffe ein Ziel *findet*, wäre keine
       dauerhafte Aura, sondern ein Nahkampfschlag mit Ring drumherum. */
    return;
  }

  if (form === "bogen") {
    s.schlagZeit = v.bogen?.dauer ?? 0.2;
    s.schlagWaffe = waffe.id;
    welt.felder.push(baueBogen(welt, s, naechstes, schlag, v, waffe, reichweite));
    return;
  }

  if (form === "meteore") {
    for (const f of baueMeteore(welt, s, naechstes, schlag, v, waffe,
      reichweite, welt.zufall)) welt.felder.push(f);
    return;
  }

  if (form === "kette") {
    schlageKette(welt, s, naechstes, schlag, v, waffe);
  }
}

/* Der Kettenblitz. Er fliegt nicht — er **steht schon**, in dem
   Augenblick, in dem er fällt. Deshalb wird hier zugeschlagen und
   danach nur noch der Linienzug für den Zeichner abgelegt.

   Der Reihe nach, nicht auf einmal: `kettenZiele()` liefert die
   getroffenen Gegner in der Reihenfolge, in der der Blitz sie berührt,
   und derselbe Linienzug wird gemalt. Zwei Reihenfolgen wären zwei
   Wahrheiten — der Blitz zöge sichtbar woanders hin, als er wehtut. */
function schlageKette(welt, s, start, schlag, v, waffe) {
  const k = v.kette ?? {};
  const kette = kettenZiele(welt.gegner, start, k.spruenge ?? 3, k.sprungweite ?? 58);
  const verlust = k.verlust ?? 0.22;
  const punkte = [{ x: s.x, y: s.y }];

  kette.forEach((g, i) => {
    punkte.push({ x: g.x, y: g.y });
    if (g.tot) return;
    schlageZu(welt, s, g, schlag, v.wirkung, waffe.id, kettenAnteil(i, verlust));
  });

  welt.blitze.push({
    punkte, rest: BLITZ_LEBEN, dauer: BLITZ_LEBEN,
    art: schlag.art, waffe: waffe.id
  });
}

/* Wie lange ein Blitzpfad zu sehen ist.

   ⚠️ **Ein Blitz ohne Standzeit ist ein Blitz, den niemand sieht.** Der
   Einschlag dauert einen Simulationsschritt (1/60 s); auf einem Bild
   mit 60 Hz wäre er in genau einem Rahmen da und in keinem zweiten —
   also ein Flackern, das man für einen Anzeigefehler hält. 0,16 s sind
   rund zehn Bilder: lang genug, um die Zacken zu lesen, kurz genug,
   dass zwei Blitze hintereinander nicht zu einem Netz verkleben.
   `runtime/zeichnen.js` liest diese Zahl mit, damit sie nicht an zwei
   Stellen steht. */
export const BLITZ_LEBEN = 0.16;

/* ── Felder: Angriffe, die eine Weile dastehen ────────────────────── */

/* Was `welt.felder` je Schritt tut. Vier Formen laufen hier
   zusammen — Kegel, Aura, Sichelbogen und Meteoreinschlag —, und der
   Unterschied zwischen ihnen sind ausschließlich **Zahlen am Feld**,
   keine Verzweigungen: Öffnungswinkel, Standzeit, Takt, ob es dem
   Besitzer folgt, ob jeder Gegner nur einmal drankommt.

   Genau das war der Zweck der Übung. Eine achte Form ist damit ein
   Eintrag in `spiel/angriffsformen.mjs` und keine achte Verzweigung
   mitten in der Kampfschleife. */
export function wirkeFelder(welt, dt) {
  for (const feld of welt.felder) {
    feld.rest -= dt;

    /* Was am Besitzer hängt, zieht mit ihm mit — die Aura ist ein
       Ring um den Spieler, kein Fleck auf dem Boden. Liegt er, hört
       das Feld auf zu wirken, verschwindet aber nicht sofort: Die
       Standzeit läuft aus, und der Ring verglimmt. */
    if (feld.folgt && feld.besitzer) {
      feld.x = feld.besitzer.x;
      feld.y = feld.besitzer.y;
      if (feld.besitzer.zustand !== "lebt") continue;
    }

    /* Die Vorwarnung eines Meteors: sichtbar, aber noch harmlos. */
    if (feld.warnRest > 0) { feld.warnRest -= dt; continue; }
    if (feld.rest <= 0) continue;

    /* Der Sichelbogen dreht seine Schneide über die Standzeit. Der
       Fortschritt kommt aus der **Restzeit** und nicht aus einem
       eigenen Zähler: Zwei Uhren für dieselbe Bewegung laufen
       irgendwann auseinander. */
    if (feld.spanne) {
      const fortschritt = Math.max(0, Math.min(1, 1 - feld.rest / feld.dauer));
      const [nx, ny] = drehe(feld.zielNx, feld.zielNy,
        -feld.spanne / 2 + feld.spanne * fortschritt);
      feld.nx = nx; feld.ny = ny;
    }

    feld.taktRest -= dt;
    if (feld.taktRest > 0) continue;
    /* Aufaddieren statt zurücksetzen: Bei einem Takt kürzer als ein
       Simulationsschritt bliebe sonst jeder Rest liegen, und das Feld
       schlüge langsamer zu, als es soll. */
    feld.taktRest += Math.max(feld.takt, dt);

    const staerke = staerkeDesFeldes(feld);
    welt.gitter.umkreis(feld.x, feld.y, feld.radius + 12, (g) => {
      if (g.tot) return;
      if (feld.einmal && feld.getroffen.has(g)) return;
      if (!imKegel(feld.x, feld.y, feld.nx, feld.ny, feld.cosHalb,
        feld.radius, g.x, g.y, g.radius)) return;
      if (feld.einmal) feld.getroffen.add(g);
      schlageZu(welt, feld.besitzer, g, feld.schlag, feld.wirkung, feld.waffe,
        feld.anteil * staerke);
    });
  }
  welt.felder = welt.felder.filter((f) => f.rest > 0);
}

/* Eine Salve. **Wie** die Geschosse liegen, entscheidet das Muster der
   Waffe (`spiel/salven.mjs`); hier wird nur noch daraus gebaut.

   Der Schaden wird auf die Geschosse **verteilt**, nicht vervielfacht —
   sonst wäre ein Vierfach-Muster schlicht vierfacher Schaden und jede
   andere Waffe unbrauchbar. Die Begründung samt Aufschlag steht bei
   `anteilJeGeschoss()`. */
function wirfSalve(welt, s, ziele, schlag, v, waffe, reichweite) {
  const ziel = ziele[0];
  const form = angriffsformVon(v);
  /* Ein Schwarm sucht **eigene** Ziele — das ist der ganze Unterschied
     zum Bannstein, der seit jeher drei suchende Steine auf denselben
     Gegner schickt. Jede andere Form nimmt weiter das nächste Ziel,
     also genau das, was vorher hier stand. */
  const schwarm = form === "schwarm";
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

  richtungen.forEach((r, i) => {
    /* `laengs` zeigt in Flugrichtung, `quer` senkrecht dazu. */
    const startX = s.x + nx * r.laengs - ny * r.quer;
    const startY = s.y + ny * r.laengs + nx * r.quer;
    const eigenesZiel = schwarm ? schwarmZiel(ziele, i) : ziel;
    const sucht = v.suchend === true || schwarm;

    welt.geschosse.push({
      x: startX, y: startY, vx: r.rx * v.geschosstempo, vy: r.ry * v.geschosstempo,
      schlag, anteil, wirkung: v.wirkung, waffe: waffe.id, radius: 3,
      rest: durchschlaege(s.werte, v), getroffen: new Set(),
      lebenszeit: reichweite / v.geschosstempo + 0.35,
      suchend: sucht, ziel: sucht ? (eigenesZiel ?? ziel) : null,
      /* Ein Schwarm zieht härter nach als ein einzelner Sucher: Er
         besteht aus vielen kleinen Geschossen mit kurzer Lebenszeit,
         und eines, das weich vorbeikurvt, trifft nie. Der Bannstein
         behält seine weiche Bahn — sie ist sein Bild. */
      lenkung: schwarm ? (v.schwarm?.lenkung ?? 11) : 6,
      sucherReichweite: schwarm ? (v.schwarm?.suchweite ?? reichweite) : 0,
      /* Bremse und Schadensverlust: nur bei `erlahmend`. Steht `bremse`
         nicht am Geschoss, tut `bremseGeschoss()` gar nichts — jedes
         bestehende Geschoss fliegt deshalb unverändert weiter. */
      bremse: form === "erlahmend" ? (v.erlahmt?.bremse ?? 0.85) : 0,
      tempoAnteil: 1,
      mindestTempo: v.erlahmt?.mindestTempo ?? 0.22,
      mindestSchaden: v.erlahmt?.mindestSchaden ?? 0.25,
      tempo: v.geschosstempo, besitzer: s, feindlich: false
    });
  });
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
  welt.funken.push({ x: g.x, y: g.y, zeit: 0.18, art: treffer.art ?? STANDARD_ART, waffe: waffenId });
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

    /* Ein Sucher, dessen Ziel fällt, sucht sich ein neues — sonst
       fliegt er geradeaus ins Leere. Bei einem Schwarm aus acht
       kleinen Geschossen mit kurzer Abklingzeit ist das der Normalfall
       und nicht die Ausnahme: Die ersten treffen, das Ziel fällt, und
       alle übrigen wären verschenkt. Nur der Schwarm sucht neu
       (`sucherReichweite > 0`) — der Bannstein behält sein Ziel, weil
       drei Steine, die mitten im Flug abbiegen, wie ein Fehler
       aussehen. */
    if (p.suchend && p.sucherReichweite > 0 && (!p.ziel || p.ziel.tot)) {
      p.ziel = neuesSuchziel(welt.gegner, p, p.sucherReichweite);
    }

    /* Suchende Geschosse lenken weich nach — hart nachgezogen sähen
       sie aus, als klebten sie am Ziel. `lenkung` fehlt an jedem
       Geschoss, das vor dieser Änderung entstand; die 6 dahinter ist
       genau der Wert, der vorher fest hier stand. */
    if (p.suchend && p.ziel && !p.ziel.tot) {
      const dx = p.ziel.x - p.x, dy = p.ziel.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const tempo = p.tempo * (p.tempoAnteil ?? 1);
      p.vx += ((dx / d) * tempo - p.vx) * Math.min(1, dt * (p.lenkung ?? 6));
      p.vy += ((dy / d) * tempo - p.vy) * Math.min(1, dt * (p.lenkung ?? 6));
    }

    /* Erlahmen: langsamer werden **und** schwächer. Tut nichts, wenn
       `bremse` fehlt oder null ist. */
    bremseGeschoss(p, dt);

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
         `anteilJeGeschoss()` in `spiel/salven.mjs`. `erlahmterAnteil()`
         kommt dazu: Ein Geschoss, das langsamer geworden ist, trifft
         auch schwächer. Es liefert 1, solange nichts bremst, und
         lässt jede bestehende Waffe damit unberührt. */
      schlageZu(welt, p.besitzer, g, p.schlag, p.wirkung, p.waffe,
        p.anteil * erlahmterAnteil(p));
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
