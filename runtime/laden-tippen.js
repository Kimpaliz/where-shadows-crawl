/* [Aufgabe: Bedienung] Den Krämer mit dem Finger bedienen.

   ── Warum es das gibt ───────────────────────────────────────────────

   Janniks Ansage vom 05.09.2026: „ich will das auf handy ui mit finger
   druck benutzt werden kann."

   Gemessen war der Krämer der **einzige** Bildschirm, an dem ein Finger
   nichts ausrichten konnte. Die Lobby besteht aus HTML-Knöpfen; die
   Kartenwahl hat seit #69 ihren eigenen Tippweg; der Endbildschirm und
   der Truhen-Moment brauchen nur den einen Knopf, den es unten rechts
   gibt. Der Krämer dagegen kannte **ausschließlich** Achse und Knopf —
   auf dem Telefon hieße das: mit dem Daumen durch sechs Felder wandern,
   um das vierte zu kaufen.

   ── Warum ein Tipp keine Abkürzung nimmt ────────────────────────────

   Dieselbe Bauart wie `runtime/karten-hand.js`, und aus demselben
   Grund: `bedieneLaden()` läuft im Netzspiel auf **allen** Rechnern für
   **alle** Spieler. Ein Tipp, der `menue.ladenZeiger` örtlich
   verschöbe, ließe die Welten auseinanderlaufen — man sähe es erst nach
   Minuten, wenn jemand etwas anderes gekauft hat als der Nachbar sieht.

   Deshalb wird ein Tipp in **dieselben Eingaben** übersetzt, die auch
   Tastatur und Daumen erzeugen: so viele Achsenschritte, wie zwischen
   dem Zeiger und dem getroffenen Feld liegen, danach der Knopf. Über
   die Leitung geht damit nichts Neues.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/oberflaeche.js` (`ladenFelder()` — dieselbe Geometrie, nach
   der auch gemalt wird), `runtime/karten-hand.js` (`schritteZu()`, die
   Ringrechnung; der Krämerzeiger ist wie die Hand zyklisch),
   `runtime/start.js` (mischt die Kette in die eigene Eingabe). */

import { ladenFelder, LADEN_FELDER } from "./oberflaeche.js";
import { schritteZu } from "./karten-hand.js";
import { BREITE, HOEHE } from "./zeichnen.js";

export function macheLadenhand(leinwand) {
  /* Was zuletzt gemalt wurde — genauer: die Felder der **eigenen**
     Spalte. Getroffen wird nur, was auch dasteht; außerhalb des Krämers
     ist das `null`, und dann fängt dieser Weg keinen Tipp ab. */
  let sicht = null;

  /* Die Eingabeschritte, die ein Tipp auslöst, einer je Bild. */
  const kette = [];
  let ausgegeben = false;
  /* Wo der Zeiger nach allen wartenden Schritten stehen wird. Örtliche
     Vorausrechnung, weil `menue.ladenZeiger` im Netzspiel um den
     Eingabeverzug hinterherhinkt — danach zu zielen ergäbe zu viele
     Schritte und liefe am Ziel vorbei. */
  let geplant = null;

  function ortAufLeinwand(e) {
    const r = leinwand.getBoundingClientRect();
    /* Ohne Größe wäre das eine Division durch null und der Ort still
       `NaN` — der Tipp ginge ins Leere, ohne dass etwas meldet. */
    if (!(r.width > 0) || !(r.height > 0)) return null;
    return {
      x: (e.clientX - r.left) / r.width * BREITE,
      y: (e.clientY - r.top) / r.height * HOEHE
    };
  }

  /* Getroffen wird über `tippB`/`tippH`, nicht über `b`/`h`: Die
     Trefferfläche ist größer als der gemalte Kasten, siehe
     `TIPP_MINDESTHOEHE` in `runtime/oberflaeche.js`. */
  function getroffen(ort) {
    if (!sicht || !ort) return null;
    for (const f of sicht.felder) {
      if (ort.x >= f.x && ort.x < f.x + f.tippB
        && ort.y >= f.y && ort.y < f.y + f.tippH) return f;
    }
    return null;
  }

  function tippe(feld) {
    if (kette.length === 0 || geplant === null) geplant = sicht.zeiger;

    /* Zweiter Tipp auf dasselbe Feld löst es aus. Genau wie bei der
       Kartenhand wird der Knopf auch angehängt, wenn noch Bewegung
       wartet: Alles in der Kette führt bereits auf `geplant` zu. */
    if (geplant === feld.i) {
      /* Nie zwei Knöpfe übereinander. Beim Krämer wäre das teurer als
         bei den Karten: Zwei Knöpfe auf „NEU" würfeln zweimal und
         kosten zweimal Gold, ohne dass jemand es wollte. */
      if (kette.some((e) => e.knopf === true)) return;
      kette.push({ knopf: true }, { knopf: false });
      /* Der Zeiger bleibt nach einem Kauf stehen (`bedieneLaden`),
         anders als bei der Kartenwahl. `geplant` darf also bleiben. */
      return;
    }
    const { richtung, anzahl } = schritteZu(feld.i, geplant, LADEN_FELDER);
    for (let s = 0; s < anzahl; s++) kette.push({ x: richtung }, { x: 0 });
    geplant = feld.i;
  }

  /* In der Einfangphase am Fenster: sonst fängt `#stickfeld` den Tipp
     auf der linken Bildhälfte ab — es liegt als halbbreite Fläche über
     dem Bild (`index.html`). Angehalten wird das Ereignis nur, wenn es
     wirklich ein Feld trifft; sonst bliebe der Stick im Krämer tot,
     obwohl dort gar nichts zu treffen ist. */
  addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const feld = getroffen(ortAufLeinwand(e));
    if (!feld) return;
    e.stopPropagation();
    e.preventDefault();
    tippe(feld);
  }, true);

  return {
    /* Die eigene Eingabe, überlagert von dem, was der Finger will.
       Außerhalb des Krämers wird geräumt — eine Bewegung, die in der
       nächsten Welle ankäme, wäre ein Ruck ohne Ursache. */
    mische(eigene, welt) {
      if (!welt || welt.phase !== "laden") {
        kette.length = 0;
        geplant = null;
        ausgegeben = false;
        sicht = null;
        return eigene;
      }
      if (kette.length === 0) return eigene;
      ausgegeben = true;
      return { ...eigene, ...kette[0] };
    },

    /* Erst wenn ein Weltschritt die Eingabe wirklich abgeholt hat,
       rückt die Kette nach. Ein Eingabebild, das kein Schritt abholt,
       wäre sonst verloren — auf einem Schirm mit 144 Hz gilt das für
       zwei von drei Bildern. */
    quittiere() {
      if (!ausgegeben) return;
      ausgegeben = false;
      kette.shift();
    },

    /* Was gerade dasteht — gerufen vom Zeichner, mit demselben
       `eigenerPlatz`, den auch die Kartenhand bekommt. Ohne eigenen
       Platz (Zuschauer) wird nichts tippbar. */
    merke(welt, menue, eigenerPlatz) {
      const s = welt?.spieler?.[eigenerPlatz];
      if (!s || welt.phase !== "laden" || s.bereit) { sicht = null; return; }
      const spalte = ladenFelder(welt).get(s.id);
      if (!spalte) { sicht = null; return; }
      sicht = { felder: spalte.felder, zeiger: menue.ladenZeiger[s.id] ?? 0 };
    }
  };
}
