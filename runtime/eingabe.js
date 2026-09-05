/* [Aufgabe: Bedienung] Tastatur und Gamepads für bis zu vier Jäger.

   ── Eine Achse und ein Knopf ───────────────────────────────────────

   Mehr braucht dieses Spiel nicht, und das ist kein Zufall: Es gibt
   keine Angriffstaste (docs/SPIEL.md, Bauteil 2), also läuft man nur.
   Auch die Menüs kommen mit derselben Achse und demselben Knopf aus —
   dadurch bedient man Laden und Kartenwahl mit einem Gamepad genauso
   wie mit der Tastatur, ohne dass es zwei Bedienungen gibt.

   Und es ist zugleich die Vorarbeit für Netz-Koop: Was über die
   Leitung müsste, sind zwei Achsen und ein Knopf je Spieler und Bild.

   ── Ausweichen ─────────────────────────────────────────────────────

   Dazugekommen ist `ausweichen` — derselbe Knopf, der im Menü
   bestätigt. Das ist Absicht und kein Sparen: Wer im Kampf steht,
   drückt ihn zum Ausweichen; wer im Laden steht, zum Kaufen. Zwei
   Knöpfe für zwei Zusammenhänge wären auf einem Telefon zwei Knöpfe zu
   viel, und auf einem Gamepad läge der zweite auf einer Taste, die
   niemand sucht.

   ── Vier Leute an einer Tastatur ───────────────────────────────────

   Die Belegungen liegen bewusst weit auseinander, damit sich vier
   Hände nicht ins Gehege kommen. Ein Gamepad überschreibt die Tastatur
   für seinen Platz, sobald es etwas meldet — wer eines einsteckt, will
   es benutzen und nicht erst etwas einstellen.

   ── Der Daumen ─────────────────────────────────────────────────────

   Auf dem Telefon gibt es weder Tastatur noch Gamepad. Der Stick unten
   links ist deshalb **kein festes Feld**, sondern nimmt die ganze linke
   Hälfte: Der Daumen setzt die Mitte dort, wo er zuerst aufkommt.
   Ein kleines festes Feld wäre blind zu treffen zu schwer — man
   schaut beim Spielen auf die Mitte des Bildes, nicht auf den Daumen.

   Beides speist **denselben** Weg wie die Tastatur (`tasten`/`frisch`),
   statt einen zweiten Pfad zu bauen. Ein kurzer Tipp auf den Knopf ist
   dadurch genauso vor dem Verlorengehen geschützt wie ein kurzer
   Tastendruck.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/start.js` (fragt je Bild ab), `runtime/oberflaeche.js`
   (Menüführung über dieselben Flanken), `index.html` (die Elemente des
   Daumen-Sticks). */

export const BELEGUNGEN = [
  { name: "WASD",   hoch: "KeyW", runter: "KeyS", links: "KeyA", rechts: "KeyD", knopf: ["Space", "KeyF", "ShiftLeft"] },
  { name: "Pfeile", hoch: "ArrowUp", runter: "ArrowDown", links: "ArrowLeft", rechts: "ArrowRight", knopf: ["Enter", "ShiftRight"] },
  { name: "IJKL",   hoch: "KeyI", runter: "KeyK", links: "KeyJ", rechts: "KeyL", knopf: ["KeyU", "KeyO"] },
  { name: "Ziffernblock", hoch: "Numpad8", runter: "Numpad5", links: "Numpad4", rechts: "Numpad6", knopf: ["Numpad0", "NumpadEnter"] }
];

/* Der Knopf des Daumens läuft als Pseudo-Taste durch dieselben Mengen
   wie die echten. Ein eigener Zustand daneben wäre eine zweite
   Wahrheit — und der kurze Tipp, den `frisch` rettet, ginge dort
   wieder verloren. */
const BERUEHRUNGSKNOPF = "Beruehrungsknopf";

/* Wie weit der Daumen ziehen muss, bis der Stick voll ausschlägt.
   48 Bildpunkte ist der halbe Ring aus `index.html`: Der Knopf bleibt
   damit sichtbar im Ring, statt an seinem Rand zu kleben. */
const STICK_RADIUS = 48;

/* Ab wann ein Gamepad-Stick als bewegt gilt. Ohne diese Schwelle
   driftet jede Figur langsam nach links, weil kaum ein Stick exakt
   null meldet. */
const TOTZONE = 0.28;

export function macheEingabe() {
  const tasten = new Set();
  /* Ein Tastendruck, der zwischen zwei Bildern anfängt **und** endet,
     wäre ohne diesen Puffer verloren: `tasten` hätte ihn beim nächsten
     Blick nicht mehr. Bei einem schnellen Tipp im Laden passiert genau
     das — der Knopf tut dann scheinbar nichts. Gemerkt wird der Druck
     deshalb hier, bis er einmal gelesen wurde. */
  const frisch = new Set();
  const abgefangen = new Set();
  for (const b of BELEGUNGEN) {
    abgefangen.add(b.hoch); abgefangen.add(b.runter);
    abgefangen.add(b.links); abgefangen.add(b.rechts);
    for (const k of b.knopf) abgefangen.add(k);
  }

  addEventListener("keydown", (e) => {
    if (e.repeat) return;
    tasten.add(e.code);
    frisch.add(e.code);
    /* Nur die belegten Tasten abfangen — sonst wäre F5 tot und der
       Browser fühlte sich kaputt an. */
    if (abgefangen.has(e.code)) e.preventDefault();
  });
  addEventListener("keyup", (e) => tasten.delete(e.code));

  /* ── Der Daumen ────────────────────────────────────────────────────

     `stick` ist die Achse des Daumens, `-1` bis `1`. `zeiger` merkt
     sich, **welcher** Finger den Stick zieht: Ohne diese Nummer würde
     der Finger auf dem Ausweich-Knopf die Achse mit übernehmen, sobald
     er sich ein wenig bewegt — man liefe beim Ausweichen los. */
  const stick = { x: 0, y: 0, zeiger: null, mitteX: 0, mitteY: 0 };
  const feld = document.getElementById("stickfeld");
  const ring = document.getElementById("stickring");
  const knopfPunkt = document.getElementById("stickknopf");
  const bedienung = document.getElementById("bedienung");
  const knopfFlaeche = document.getElementById("knopf");
  const querhinweis = document.getElementById("querhinweis");

  const stickLos = () => {
    stick.x = 0; stick.y = 0; stick.zeiger = null;
    bedienung?.classList.remove("zieht");
  };

  /* `setPointerCapture` wirft, wenn es zu der Nummer gerade keinen
     aktiven Finger gibt — etwa wenn der Browser den Finger schon
     verloren hat, während das Ereignis noch unterwegs war. Am
     05.09.2026 in der Konsole gesehen: `NotFoundError`, und zwar als
     **unbehandelter** Fehler, der den Rest des Aufrufs abbrach. Weil
     `preventDefault()` danach stand, scrollte die Seite in genau dem
     Fall unter dem Daumen weg. Deshalb abgefangen — und der Griff ist
     ohnehin nur eine Bequemlichkeit: Ohne ihn merkt der Zug nur, wenn
     der Finger das Feld verlässt, und dafür gibt es `pointerleave`. */
  const greife = (element, nummer) => {
    try { element.setPointerCapture(nummer); } catch { /* ohne Griff geht es auch */ }
  };

  if (feld && ring && knopfPunkt) {
    feld.addEventListener("pointerdown", (e) => {
      stick.zeiger = e.pointerId;
      stick.mitteX = e.clientX; stick.mitteY = e.clientY;
      ring.style.left = knopfPunkt.style.left = `${e.clientX}px`;
      ring.style.top = knopfPunkt.style.top = `${e.clientY}px`;
      bedienung.classList.add("zieht");
      /* Erst abwehren, dann greifen: Andersherum bräche ein Fehler beim
         Greifen das Abwehren mit ab, und die Seite scrollte weg. */
      e.preventDefault();
      greife(feld, e.pointerId);
    });
    feld.addEventListener("pointermove", (e) => {
      if (e.pointerId !== stick.zeiger) return;
      let dx = e.clientX - stick.mitteX, dy = e.clientY - stick.mitteY;
      const laenge = Math.hypot(dx, dy);
      /* Über den Ring hinaus wird nicht schneller — sonst hinge das
         Tempo daran, wie groß das Telefon ist. */
      if (laenge > STICK_RADIUS) { dx = dx / laenge * STICK_RADIUS; dy = dy / laenge * STICK_RADIUS; }
      knopfPunkt.style.left = `${stick.mitteX + dx}px`;
      knopfPunkt.style.top = `${stick.mitteY + dy}px`;
      stick.x = dx / STICK_RADIUS;
      stick.y = dy / STICK_RADIUS;
      e.preventDefault();
    });
    for (const art of ["pointerup", "pointercancel", "pointerleave"])
      feld.addEventListener(art, (e) => { if (e.pointerId === stick.zeiger) stickLos(); });
  }

  if (knopfFlaeche) {
    knopfFlaeche.addEventListener("pointerdown", (e) => {
      tasten.add(BERUEHRUNGSKNOPF); frisch.add(BERUEHRUNGSKNOPF);
      knopfFlaeche.classList.add("gedrueckt");
      e.preventDefault();
      greife(knopfFlaeche, e.pointerId);
    });
    for (const art of ["pointerup", "pointercancel", "pointerleave"])
      knopfFlaeche.addEventListener(art, () => {
        tasten.delete(BERUEHRUNGSKNOPF);
        knopfFlaeche.classList.remove("gedrueckt");
      });
  }

  /* Wann die Daumenbedienung erscheint. `pointer: coarse` allein wäre
     zu großzügig — ein Laptop mit Touchscreen meldet
     `maxTouchPoints > 0` und hätte den Stick mitten im Bild, obwohl
     dort eine Maus liegt. Beides zusammen trifft das Telefon und lässt
     den Schreibtisch in Ruhe. Ein echtes `touchstart` schaltet
     zusätzlich frei, falls ein Gerät sich anders meldet, als es ist. */
  const istBeruehrung = () =>
    matchMedia("(pointer: coarse)").matches && navigator.maxTouchPoints > 0;

  function zeigeBedienung(an) {
    if (!bedienung) return;
    if (an) bedienung.removeAttribute("hidden");
    else bedienung.setAttribute("hidden", "");
  }
  zeigeBedienung(istBeruehrung());
  addEventListener("touchstart", () => zeigeBedienung(true), { once: true, passive: true });

  /* Hochkant passt das Bild nur verkleinert hinein (gemessen am
     05.09.2026: 480 Bildpunkte breit auf 375 Bildpunkten Fenster).
     Der Hinweis sagt, was hilft, statt den Spieler raten zu lassen. */
  function pruefeLage() {
    if (!querhinweis) return;
    const hoch = window.innerHeight > window.innerWidth;
    if (hoch && istBeruehrung()) querhinweis.removeAttribute("hidden");
    else querhinweis.setAttribute("hidden", "");
  }
  addEventListener("resize", pruefeLage);
  /* Wie in `start.js`: Beim Drehen kennt `orientationchange` die neuen
     Maße noch nicht, deshalb ein zweiter Anlauf danach. Ohne ihn bliebe
     der Hinweis „quer halten" quer stehen. */
  addEventListener("orientationchange", () => { pruefeLage(); setTimeout(pruefeLage, 250); });
  pruefeLage();

  /* Verliert das Fenster den Fokus, bleibt sonst eine Taste für immer
     gedrückt und die Figur läuft von selbst weiter. Der Daumen zählt
     dazu: Wer während des Ziehens den Anruf annimmt, bekäme sonst eine
     Figur, die endlos nach links läuft. */
  addEventListener("blur", () => { tasten.clear(); frisch.clear(); stickLos(); });

  const vorher = [false, false, false, false];
  const vorherX = [0, 0, 0, 0];
  const vorherY = [0, 0, 0, 0];

  function lies(spielerzahl) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const raus = [];

    for (let i = 0; i < spielerzahl; i++) {
      const b = BELEGUNGEN[i];
      const liegt = (k) => tasten.has(k) || frisch.has(k);
      let x = (liegt(b.rechts) ? 1 : 0) - (liegt(b.links) ? 1 : 0);
      let y = (liegt(b.runter) ? 1 : 0) - (liegt(b.hoch) ? 1 : 0);
      let knopf = b.knopf.some(liegt);

      /* Der Daumen gehört dem ersten Platz — ein Telefon hat einen
         Spieler. Er überschreibt die Tastatur nur, wenn er wirklich
         zieht; sonst stünde die Achse auf null, sobald man ihn loslässt
         und weiter mit der Tastatur spielt. */
      if (i === 0) {
        if (stick.zeiger !== null && (stick.x !== 0 || stick.y !== 0)) { x = stick.x; y = stick.y; }
        if (liegt(BERUEHRUNGSKNOPF)) knopf = true;
      }

      const pad = pads[i];
      if (pad && pad.connected) {
        const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
        if (Math.abs(ax) > TOTZONE || Math.abs(ay) > TOTZONE) { x = ax; y = ay; }
        /* Steuerkreuz gilt auch — viele spielen damit lieber. */
        if (pad.buttons[14]?.pressed) x = -1;
        if (pad.buttons[15]?.pressed) x = 1;
        if (pad.buttons[12]?.pressed) y = -1;
        if (pad.buttons[13]?.pressed) y = 1;
        if (pad.buttons[0]?.pressed || pad.buttons[9]?.pressed) knopf = true;
      }

      /* Flanken: Menüs sollen auf **Drücken** reagieren, nicht auf
         Gedrückthalten — sonst rast der Auswahlbalken durch. */
      const stufeX = Math.abs(x) > 0.6 ? Math.sign(x) : 0;
      const stufeY = Math.abs(y) > 0.6 ? Math.sign(y) : 0;
      raus.push({
        /* `ausweichen` ist derselbe Knopf. Der Regelkern fragt ihn im
           Kampf, die Menüs fragen `knopf` — zwei Namen für eine Taste,
           weil beide Seiten von der jeweils anderen nichts wissen
           müssen. */
        x, y, knopf, ausweichen: knopf,
        knopfFlanke: knopf && !vorher[i],
        xFlanke: stufeX !== 0 && stufeX !== vorherX[i] ? stufeX : 0,
        yFlanke: stufeY !== 0 && stufeY !== vorherY[i] ? stufeY : 0
      });
      vorher[i] = knopf;
      vorherX[i] = stufeX;
      vorherY[i] = stufeY;
    }
    /* Erst leeren, wenn alle Spieler gelesen haben — sonst sähe nur
       der erste den kurzen Druck. */
    frisch.clear();
    return raus;
  }

  /* Wie viele Gamepads angeschlossen sind — nur zur Anzeige im
     Vorspiel, damit man sieht, dass sie erkannt wurden. */
  function pads() {
    const p = navigator.getGamepads ? navigator.getGamepads() : [];
    return [...p].filter((g) => g && g.connected).length;
  }

  return { lies, pads, tasten };
}
