/* [Aufgabe: Bild] Was man von den neuen Angriffen sieht.

   ── Wofür diese Datei da ist ───────────────────────────────────────

   `spiel/angriffsformen.mjs` hat den Angriffen eine **Dauer** gegeben:
   Ein Flammenkegel steht 1,8 s, eine Aura läuft mit, eine Sichel fährt
   durch einen Bogen, ein Meteor kündigt sich an. Nichts davon ist zu
   sehen, solange es niemand malt — und ein Angriff, den man nicht
   sieht, ist genau der „bloße Treffereffekt", gegen den die ganze
   Änderung gebaut ist.

   Hier stehen zwei Dinge, die zusammengehören:

   1. **Die Felder und Blitze selbst malen** — Kegel, Ring, Schneide,
      Einschlag, Blitzpfad.
   2. **Den Teilchenschwarm füttern** (`runtime/partikel.js`) aus dem,
      was in der Welt passiert.

   ── Warum ausschließlich mit `fillRect` ────────────────────────────

   Ein Kegel ließe sich mit `c.arc()` und `c.fill()` in drei Zeilen
   malen. Der Browser zieht die Kante dabei weich — und genau daran
   erkennt man unechte Pixelgrafik (`docs/SPIEL.md` 7). Deshalb wird
   jeder Bogen **gestippelt**: einzelne Bildpunkte auf konzentrischen
   Ringen, auf ganze Bildpunkte gerundet. Das kostet ein paar hundert
   Rechtecke je Bild und sieht dafür nach dem Spiel aus, in dem es
   steht — und ein löchriger Kegel liest sich ohnehin mehr nach Feuer
   als eine geschlossene Fläche.

   ── Warum der Zeichner mitzählt, statt die Welt zu fragen ──────────

   Ein Treffer ist ein Eintrag in `welt.funken` mit einer Restzeit —
   nirgends steht, ob er **neu** ist. Der Regelkern könnte eine laufende
   Nummer mitgeben, aber dann trüge er einen Zustand, den nur der
   Zeichner braucht, über die Leitung (`docs/SPIEL.md` 11). Stattdessen
   merkt sich diese Datei in einem `WeakSet`, welche Objekte sie schon
   gesehen hat. Verschwindet ein Funke aus der Welt, verschwindet er
   auch aus dem Gedächtnis — ohne dass jemand aufräumen muss.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/partikel.js` (der Schwarm), `runtime/zeichnen.js` (ruft
   hier), `runtime/palette.js` (die Farben),
   `spiel/angriffsformen.mjs` (was ein Feld ist),
   `spiel/kampf.mjs` (`BLITZ_LEBEN`),
   `spiel/schadensarten.mjs` (Farbe je Art),
   `werkzeuge/pruefe-partikel.mjs` (misst beides). */

import { FARBEN } from "./palette.js";
import { ART_NACH_ID, STANDARD_ART } from "../spiel/schadensarten.mjs";
import { staerkeDesFeldes } from "../spiel/angriffsformen.mjs";
import { hash } from "./partikel.js";

/* Die Farbe einer Schadensart. Steht ein zweites Mal hier statt als
   Import aus `runtime/zeichnen.js`: Die Datei dort baut beim Laden
   Leinwände (`document.createElement`) und ließe sich aus einer Prüfung
   heraus nicht laden. Vier Zeilen sind der Preis dafür, dass
   `werkzeuge/pruefe-partikel.mjs` ohne Browser läuft. */
export function artFarbe(art) {
  return ART_NACH_ID.get(art)?.farbe ?? ART_NACH_ID.get(STANDARD_ART).farbe;
}

/* Wie viele Teilchen je Sekunde ein stehendes Feld auswirft. Je Form
   verschieden, weil sie verschieden groß und verschieden lang da sind:
   Ein Kegel mit 1,8 s Standzeit darf nicht so dicht qualmen wie ein
   Einschlag, der in einem Drittel einer Sekunde vorbei ist. */
const AUSWURF = { kegel: 46, aura: 16, bogen: 0, meteore: 0 };

/* ── Die Felder malen ─────────────────────────────────────────────── */

/* Ein gestippelter Kreisbogen. `von` und `bis` sind Winkel im
   Bogenmaß, `dichte` ein Anteil zwischen 0 und 1 — 1 heißt geschlossen,
   0,5 heißt jeder zweite Punkt fehlt.

   Der Abstand zwischen zwei Punkten wird über den **Radius** gerechnet
   und nicht über eine feste Schrittzahl: Ein Bogen mit Radius 60
   braucht dreimal so viele Punkte wie einer mit Radius 20, um gleich
   dicht auszusehen. Mit fester Schrittzahl wäre der äußere Ring
   löchrig und der innere ein Klumpen. */
function stippleBogen(c, mx, my, r, von, bis, dichte, saat, groesse = 1) {
  const spanne = bis - von;
  const schritte = Math.max(2, Math.round(Math.abs(spanne) * r / 1.6));
  for (let i = 0; i <= schritte; i++) {
    if (hash(saat + i * 7 + Math.round(r) * 131) > dichte) continue;
    const w = von + spanne * (i / schritte);
    c.fillRect(Math.round(mx + Math.cos(w) * r),
      Math.round(my + Math.sin(w) * r), groesse, groesse);
  }
}

/* Der Flammenkegel: Ringe von innen nach außen, nach außen hin dünner.

   Die Dichte fällt mit dem Radius **und** mit dem Alter. Beides
   zusammen ist das Ausglühen: Der Kegel wird kürzer und löchriger,
   während seine Stärke im Regelkern auf `restStaerke` fällt. Ohne den
   Gleichlauf der beiden sähe er stark aus und träfe schwach — genau
   die Sorte Lüge, gegen die `staerkeDesFeldes()` gebaut ist, und
   deshalb wird dieselbe Funktion hier gelesen. */
function maleKegel(c, f, zeit) {
  const grund = Math.atan2(f.ny, f.nx);
  const staerke = staerkeDesFeldes(f);
  const farbe = artFarbe(f.art);
  const hell = mischeHex(farbe, "#ffffff", 0.28);
  const saat = Math.round(f.x * 13 + f.y * 7);

  for (let r = 5; r <= f.radius; r += 3) {
    const anteilAussen = r / f.radius;
    /* Innen dicht, außen ausgefranst — eine Flamme ist an ihrer Wurzel
       geschlossen und an ihrer Spitze ein Schleier.

       ⚠️ **Nach oben gedeckelt, und zwar auf 0,72.** Der erste Entwurf
       ließ die Dichte am Kegelgrund auf 1 laufen und malte dort
       zusätzlich mit zwei Bildpunkten breiten Tupfen. Im Browser
       gemessen war das kein Feuer, sondern ein **geschlossener,
       fast weißer Keil** — eine Fläche, hinter der man die Gegner
       nicht mehr sah, die man gerade verbrennt. Ein löchriger Kegel
       liest sich mehr nach Flamme als ein voller; das ist der ganze
       Grund, warum hier gestippelt und nicht gefüllt wird. */
    const dichte = Math.min(0.72, (1 - anteilAussen * 0.62) * (0.35 + staerke * 0.65));
    /* Der Kegel wird zur Spitze hin nicht enger: Er ist ein Kegel,
       also wächst die Bogenlänge mit dem Radius. Eng gemacht wird nur
       das **Flackern**, das die Kante über die Zeit atmen lässt. */
    const flacker = 1 + 0.09 * Math.sin(zeit * 9 + r * 0.4);
    const halb = f.halbWinkel * flacker;
    /* Hell nur ganz am Grund. Auch das ist gemessen: Bei 0,4 war die
       halbe Fläche des Kegels heller als die Schadensart, und damit
       war die Farbe keine Auskunft mehr, sondern Dekoration. */
    c.fillStyle = anteilAussen < 0.22 ? hell : farbe;
    stippleBogen(c, f.x, f.y, r, grund - halb, grund + halb, dichte,
      saat + Math.round(zeit * 24) * 3, r < f.radius * 0.18 ? 2 : 1);
  }
}

/* Die Aura: ein Ring am Rand plus ein dünner Schleier davor.

   Nur ein Ring und keine gefüllte Scheibe. Das Spiel ist dunkel und
   eng; eine Scheibe von 40 Bildpunkten Durchmesser um jede Figur
   deckte im Vierspieler-Gedränge den halben Bildschirm zu, und man
   sähe die Gegner nicht mehr, die man treffen will. Der Ring sagt
   dasselbe — bis hierhin — und nimmt nichts weg. */
function maleAura(c, f, zeit) {
  const farbe = artFarbe(f.art);
  const saat = Math.round(f.x * 5 + f.y * 11);
  /* Der Ring dreht sich langsam. Ein stehender Ring aus Punkten sieht
     nach Zaun aus, ein wandernder nach Wirkung. */
  const dreh = zeit * 0.9;
  /* ⚠️ **Der aeussere Ring traegt die reine Artfarbe, nicht die
     aufgehellte.** Der erste Entwurf mischte 30 % Weiss hinein und war
     im Browser gemessen ein **weisser** Ring: Die Fluch-Farbe `#bfa4f0`
     ist ohnehin schon hell, und weiter aufgehellt verliert sie genau
     das, wofuer sie da ist — man soll dem Ring ansehen, welche
     Schadensart er austeilt (dieselbe Regel wie bei den Trefferzeichen
     und den schwebenden Zahlen). Aufgehellt wird jetzt nur der innere
     Faden, und der ist duenn genug, dass er die Aussage nicht
     ueberschreibt. */
  c.fillStyle = farbe;
  stippleBogen(c, f.x, f.y, f.radius, dreh, dreh + Math.PI * 2, 0.62, saat);
  c.fillStyle = mischeHex(farbe, "#ffffff", 0.35);
  stippleBogen(c, f.x, f.y, f.radius - 3, -dreh * 1.4, -dreh * 1.4 + Math.PI * 2, 0.22, saat + 97);
}

/* Der Sichelbogen: die Schneide, und hinter ihr der Weg, den sie schon
   genommen hat.

   ⚠️ **Der Nachzieher ist kein Schmuck.** Die Schneide steht 0,22 s
   lang und ist an jedem einzelnen Bild ein schmaler Strich — ohne die
   verglühende Spur dahinter sähe man auf einem Standbild nur einen
   Strich und könnte nicht sagen, dass etwas geschwungen wurde. Erst
   die Spur macht aus einem Strich eine Bewegung. Sie zeigt dabei genau
   den Bereich, der **schon** getroffen hat: Was hinter ihr liegt, ist
   vorbei. */
function maleBogen(c, f) {
  const farbe = artFarbe(f.art);
  const zielW = Math.atan2(f.zielNy, f.zielNx);
  const jetzt = Math.atan2(f.ny, f.nx);
  const von = zielW - f.spanne / 2;

  /* Die Spur: vom Anfang des Schwungs bis zur Schneide, nach hinten
     immer dünner. */
  c.fillStyle = mischeHex(farbe, FARBEN.kontur, 0.35);
  for (let r = 10; r <= f.radius; r += 4) {
    stippleBogen(c, f.x, f.y, r, von, jetzt, 0.3, Math.round(f.x * 3 + r * 29));
  }

  /* Die Schneide selbst: hell, dicht, zwei Bildpunkte breit. */
  c.fillStyle = mischeHex(farbe, "#ffffff", 0.55);
  for (let r = 8; r <= f.radius; r += 2) {
    stippleBogen(c, f.x, f.y, r, jetzt - f.halbWinkel, jetzt + f.halbWinkel, 0.95,
      Math.round(r * 17), r > f.radius * 0.5 ? 2 : 1);
  }
}

/* Der Meteor: erst die Warnung am Boden, dann der Einschlag.

   Im exakten Top-Down gibt es keine Höhe — ein fallender Stein wäre
   ein Punkt, der größer wird, und das liest sich als „kommt näher"
   erst, wenn man weiß, dass etwas fällt. Deshalb liegt die ganze
   Auskunft **am Boden**: ein Ring, der sich zusammenzieht. Wenn er den
   Einschlagpunkt erreicht hat, schlägt es ein. Das ist ablesbar, ohne
   dass es jemand erklärt — und es ist genau die Zeit, die man zum
   Weglaufen hat. */
function maleMeteor(c, f, zeit) {
  const farbe = artFarbe(f.art);
  const saat = Math.round(f.x * 23 + f.y * 3);

  if (f.warnRest > 0) {
    /* Der Ring zieht sich von außen auf den Punkt zusammen. `warnRest`
       läuft gegen null, also ist `warnRest / warnung` der Anteil, der
       noch fehlt — und genau der ist der Radius. */
    const anteil = Math.max(0, Math.min(1, f.warnRest / Math.max(0.01, f.warnDauer ?? 0.55)));
    const r = f.radius * (0.35 + anteil * 1.5);
    c.fillStyle = mischeHex(farbe, FARBEN.kontur, 0.25);
    stippleBogen(c, f.x, f.y, r, 0, Math.PI * 2, 0.55, saat);
    /* Der Zielpunkt selbst blinkt mit, damit man ihn auch dann sieht,
       wenn der Ring gerade groß ist. */
    c.fillStyle = artFarbe(f.art);
    stippleBogen(c, f.x, f.y, 3, zeit * 6, zeit * 6 + Math.PI * 2, 0.5, saat + 11);
    return;
  }

  /* Der Einschlag: eine helle Scheibe, die in ihrer kurzen Standzeit
     verglimmt. Von innen nach außen aufgebaut wie der Kegel. */
  const alter = Math.max(0, Math.min(1, 1 - f.rest / Math.max(0.01, f.dauer)));
  c.fillStyle = mischeHex(farbe, "#ffffff", 0.5 * (1 - alter));
  for (let r = 2; r <= f.radius; r += 2) {
    stippleBogen(c, f.x, f.y, r, 0, Math.PI * 2, (1 - alter) * (1 - r / f.radius * 0.6),
      saat + r * 41, r < 6 ? 2 : 1);
  }
}

/* Alle Felder. Wird **unter** dem Licht gemalt: Ein Flammenkegel ist
   ein Ding in der Szene und kein Hinweis über ihr. Damit er im
   Dunkeln nicht verschwindet, leuchtet er selbst — siehe
   `lichtQuellen()` weiter unten. */
export function zeichneFelder(c, welt, zeit) {
  for (const f of welt.felder ?? []) {
    if (f.form === "kegel") maleKegel(c, f, zeit);
    else if (f.form === "aura") maleAura(c, f, zeit);
    else if (f.form === "bogen") maleBogen(c, f);
    else if (f.form === "meteore") maleMeteor(c, f, zeit);
  }
}

/* ── Die Blitze ──────────────────────────────────────────────────── */

/* Ein Blitz von Punkt zu Punkt, gezackt.

   Die Zacken kommen aus dem **Ort** der beiden Endpunkte und nicht aus
   einem Würfel: Derselbe Blitz sieht in jedem Bild seiner kurzen
   Standzeit gleich aus. Ein Blitz, der je Bild neu zuckt, flackert wie
   ein Anzeigefehler; einer, der stehen bleibt, liest sich als
   Entladung, die einen Augenblick nachglüht.

   Gemalt wird mit `fillRect` je Bildpunkt entlang der Strecke — kein
   `lineTo`, weil eine Linie mit halben Bildpunkten weiche Kanten
   bekäme. */
function maleBlitzstrecke(c, ax, ay, bx, by, saat, ausschlag) {
  const dx = bx - ax, dy = by - ay;
  const laenge = Math.hypot(dx, dy);
  if (!(laenge > 0)) return;
  const nx = dx / laenge, ny = dy / laenge;
  const schritte = Math.max(2, Math.round(laenge));

  for (let i = 0; i <= schritte; i++) {
    const t = i / schritte;
    /* Der Ausschlag ist in der Mitte am größten und an den Enden null
       — sonst hinge der Blitz nicht an den Gegnern, die er trifft. */
    const bauch = Math.sin(t * Math.PI);
    /* Drei Knicke je Strecke. Mehr sieht nach Rauschen aus, weniger
       nach einem Knick in der Leitung. */
    const zack = (hash(saat + Math.floor(t * 3)) * 2 - 1)
      + (hash(saat + 99 + Math.floor(t * 7)) * 2 - 1) * 0.4;
    const seite = zack * ausschlag * bauch;
    c.fillRect(Math.round(ax + nx * laenge * t - ny * seite),
      Math.round(ay + ny * laenge * t + nx * seite), 1, 1);
  }
}

export function zeichneBlitze(c, welt) {
  for (const b of welt.blitze ?? []) {
    const alter = Math.max(0, Math.min(1, 1 - b.rest / b.dauer));
    const farbe = artFarbe(b.art);
    const saat = Math.round(b.punkte[0].x * 31 + b.punkte[0].y * 17);

    /* Zwei Durchgänge: ein breiter, dunkler Schein und darüber der
       helle Kern. Ein einfarbiger Blitz auf dunklem Grund sieht aus
       wie ein Kratzer im Bild. */
    c.fillStyle = mischeHex(farbe, FARBEN.kontur, 0.3);
    for (let i = 0; i + 1 < b.punkte.length; i++) {
      maleBlitzstrecke(c, b.punkte[i].x, b.punkte[i].y,
        b.punkte[i + 1].x, b.punkte[i + 1].y, saat + i * 13, 7 - alter * 4);
    }
    c.fillStyle = mischeHex(farbe, "#ffffff", 0.6 * (1 - alter));
    for (let i = 0; i + 1 < b.punkte.length; i++) {
      maleBlitzstrecke(c, b.punkte[i].x, b.punkte[i].y,
        b.punkte[i + 1].x, b.punkte[i + 1].y, saat + i * 13, 5 - alter * 3);
    }
  }
}

/* ── Licht ───────────────────────────────────────────────────────── */

/* Welche Felder Licht abgeben, für `zeichneLicht()` in
   `runtime/zeichnen.js`.

   Ein Flammenkegel, der eine dunkle Ecke **nicht** erhellt, ist kein
   Feuer, sondern ein Aufkleber. Umgekehrt darf nicht jedes Feld
   leuchten: Die Lichtrechnung läuft über 120 × 68 Zellen je Bild, und
   jede zusätzliche Quelle kostet dort 8.160 Durchläufe. Deshalb nennt
   jedes Feld selbst, wie stark es leuchtet (`leuchtet`), der
   Sichelbogen zum Beispiel gar nicht — und die Zahl der Quellen ist
   nach oben gedeckelt.

   ⚠️ **Die Deckelung nimmt die ersten, nicht die stärksten.** Sortieren
   wäre je Bild eine Sortierung über eine Liste, die sich ständig
   ändert; die ersten zu nehmen ist die Reihenfolge, in der sie
   entstanden sind, und damit stabil. Bei sechs gleichzeitigen
   Leuchtfeldern ist der Unterschied ohnehin keiner. */
export const LICHT_FELDER_HOECHSTENS = 6;

export function lichtQuellen(welt) {
  const raus = [];
  for (const f of welt.felder ?? []) {
    if (!(f.leuchtet > 0) || f.warnRest > 0) continue;
    raus.push({
      x: f.x, y: f.y,
      staerke: f.leuchtet * staerkeDesFeldes(f),
      reichweite: f.radius + 26
    });
    if (raus.length >= LICHT_FELDER_HOECHSTENS) break;
  }
  return raus;
}

/* ── Den Schwarm füttern ─────────────────────────────────────────── */

/* Zwei Farben mischen — dieselbe Rechnung wie in `runtime/partikel.js`
   und `runtime/zeichnen.js`. Sie steht dreimal, und das ist Absicht:
   Die drei Dateien sollen einander nicht brauchen, damit zwei davon
   ohne Browser laufen. Eine gemeinsame vierte Datei für sechs Zeilen
   Rechnung wäre mehr Verwaltung als Ersparnis. */
function mischeHex(hex, ziel, anteil) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(ziel.slice(1), 16);
  const teil = (v) => Math.round(((a >> v) & 255) * (1 - anteil) + ((b >> v) & 255) * anteil);
  return "#" + [teil(16), teil(8), teil(0)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/* Wie viele Funken ein Treffer zusätzlich wirft, je Schadensart. Die
   Zahlen liegen bewusst unter denen der `STAUB`-Tabelle in
   `runtime/zeichnen.js`: Der Staubkranz dort ist die Form des
   Einschlags, diese hier sind sein Nachhall. Zusammen zu viel, und
   jeder Treffer wäre eine Explosion. */
const TREFFER_FUNKEN = { schnitt: 3, wucht: 4, feuer: 6, frost: 4, fluch: 4, tod: 9 };

export function macheEffekte(schwarm) {
  /* Was schon gespritzt hat. `WeakSet`, damit nichts aufgeräumt werden
     muss: Verschwindet der Funke aus `welt.funken`, verschwindet auch
     der Eintrag. */
  const gesehen = new WeakSet();
  /* Aufgelaufene Auswurfzeit je Feld — ein Feld, das 46 Teilchen je
     Sekunde wirft, wirft bei 60 Bildern je Sekunde nicht jedes Bild
     eines. Ohne Konto wäre der Auswurf an die Bildrate gekoppelt, und
     auf einem 144-Hz-Bildschirm qualmte derselbe Kegel dreimal so
     dicht. */
  const konto = new WeakMap();
  /* Wann ein Geschoss zuletzt einen Schweifpunkt gesetzt hat. */
  const schweif = new WeakMap();

  return {
    /* Einmal je Bild, **vor** dem Malen. `dt` in Sekunden. */
    fuettere(welt, dt) {
      if (!welt) return;

      /* 1 · Treffer und Tode. */
      for (const f of welt.funken ?? []) {
        if (gesehen.has(f)) continue;
        gesehen.add(f);
        const tod = f.art === "tod";
        const anzahl = TREFFER_FUNKEN[f.art] ?? TREFFER_FUNKEN.schnitt;
        schwarm.stosse(tod ? "blut" : "funke", anzahl, f.x, f.y,
          tod ? FARBEN.blutHell : artFarbe(f.art));
      }

      /* 2 · Blitze: an jedem Knick eine Entladung. Die Knicke sind die
         getroffenen Gegner — dort, wo es wirklich wehtut. */
      for (const b of welt.blitze ?? []) {
        if (gesehen.has(b)) continue;
        gesehen.add(b);
        const farbe = artFarbe(b.art);
        for (let i = 1; i < b.punkte.length; i++) {
          schwarm.stosse("entladung", 7, b.punkte[i].x, b.punkte[i].y, farbe);
        }
      }

      /* 3 · Die Felder. Ein Kegel qualmt laufend, ein Einschlag wirft
         einmal aus — der Unterschied steckt in `AUSWURF`, nicht in
         einer Verzweigung. */
      for (const f of welt.felder ?? []) {
        const farbe = artFarbe(f.art);

        if (f.form === "meteore") {
          /* Ein Einschlag wirft **einmal**, in dem Bild, in dem die
             Warnung abläuft. Danach steht er nur noch da und verglimmt. */
          if (f.warnRest <= 0 && !gesehen.has(f)) {
            gesehen.add(f);
            schwarm.stosse("glut", 22, f.x, f.y, farbe);
          }
          continue;
        }

        if (f.form === "bogen") {
          /* An der Schneide, nach außen: die Späne des Schwungs. */
          if (!gesehen.has(f)) {
            gesehen.add(f);
            schwarm.stosse("funke", 5, f.x + f.nx * f.radius * 0.7,
              f.y + f.ny * f.radius * 0.7, farbe, f.nx, f.ny, 0.8);
          }
          continue;
        }

        const jeSekunde = AUSWURF[f.form] ?? 0;
        if (jeSekunde <= 0) continue;
        const offen = (konto.get(f) ?? 0) + jeSekunde * dt;
        const ganze = Math.floor(offen);
        konto.set(f, offen - ganze);
        if (ganze <= 0) continue;

        if (f.form === "kegel") {
          /* Aus dem ganzen Kegel, nicht nur aus der Spitze: Der Auswurf
             sitzt auf einem zufälligen Radius entlang der Achse und
             fliegt weiter nach außen. */
          for (let i = 0; i < ganze; i++) {
            const t = 0.2 + hash(Math.round(f.rest * 1000) + i * 37) * 0.8;
            const w = Math.atan2(f.ny, f.nx)
              + (hash(Math.round(f.rest * 1000) + i * 53) * 2 - 1) * f.halbWinkel;
            schwarm.stosse("flamme", 1,
              f.x + Math.cos(w) * f.radius * t, f.y + Math.sin(w) * f.radius * t,
              farbe, Math.cos(w), Math.sin(w), 0.5 + staerkeDesFeldes(f) * 0.5);
          }
        } else if (f.form === "aura") {
          /* Auf dem Ring, nach außen kriechend. */
          for (let i = 0; i < ganze; i++) {
            const w = hash(Math.round(f.rest * 1000) + i * 61) * Math.PI * 2;
            schwarm.stosse("schwaden", 1,
              f.x + Math.cos(w) * f.radius, f.y + Math.sin(w) * f.radius,
              farbe, Math.cos(w), Math.sin(w));
          }
        }
      }

      /* 4 · Geschossschweife. Nur für Geschosse, die eine Sorte
         verdienen — ein Schweif hinter jedem Wurfmesser wäre bei acht
         Irrlichtern und drei Bannsteinen gleichzeitig ein Nebelfeld.
         Gesetzt wird höchstens alle 0,03 s je Geschoss, damit die
         Spur nicht an der Bildrate hängt. */
      for (const p of welt.geschosse ?? []) {
        if (!p.suchend && !(p.bremse > 0)) continue;
        const seit = (schweif.get(p) ?? 0) + dt;
        if (seit < 0.03) { schweif.set(p, seit); continue; }
        schweif.set(p, 0);
        schwarm.stosse("schweif", 1, p.x, p.y,
          artFarbe(p.schlag?.art ?? STANDARD_ART));
      }

      schwarm.schritt(dt);
    },

    /* Nur zum Nachsehen und Prüfen. */
    schwarm
  };
}
