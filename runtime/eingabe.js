/* [Aufgabe: Bedienung] Tastatur und Gamepads für bis zu vier Jäger.

   ── Eine Achse und ein Knopf ───────────────────────────────────────

   Mehr braucht dieses Spiel nicht, und das ist kein Zufall: Es gibt
   keine Angriffstaste (docs/SPIEL.md, Bauteil 2), also läuft man nur.
   Auch die Menüs kommen mit derselben Achse und demselben Knopf aus —
   dadurch bedient man Laden und Kartenwahl mit einem Gamepad genauso
   wie mit der Tastatur, ohne dass es zwei Bedienungen gibt.

   Und es ist zugleich die Vorarbeit für Netz-Koop: Was über die
   Leitung müsste, sind zwei Achsen und ein Knopf je Spieler und Bild.

   ── Vier Leute an einer Tastatur ───────────────────────────────────

   Die Belegungen liegen bewusst weit auseinander, damit sich vier
   Hände nicht ins Gehege kommen. Ein Gamepad überschreibt die Tastatur
   für seinen Platz, sobald es etwas meldet — wer eines einsteckt, will
   es benutzen und nicht erst etwas einstellen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/start.js` (fragt je Bild ab), `runtime/oberflaeche.js`
   (Menüführung über dieselben Flanken). */

export const BELEGUNGEN = [
  { name: "WASD",   hoch: "KeyW", runter: "KeyS", links: "KeyA", rechts: "KeyD", knopf: ["Space", "KeyF"] },
  { name: "Pfeile", hoch: "ArrowUp", runter: "ArrowDown", links: "ArrowLeft", rechts: "ArrowRight", knopf: ["Enter", "ShiftRight"] },
  { name: "IJKL",   hoch: "KeyI", runter: "KeyK", links: "KeyJ", rechts: "KeyL", knopf: ["KeyU", "KeyO"] },
  { name: "Ziffernblock", hoch: "Numpad8", runter: "Numpad5", links: "Numpad4", rechts: "Numpad6", knopf: ["Numpad0", "NumpadEnter"] }
];

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
  /* Verliert das Fenster den Fokus, bleibt sonst eine Taste für immer
     gedrückt und die Figur läuft von selbst weiter. */
  addEventListener("blur", () => { tasten.clear(); frisch.clear(); });

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
        x, y, knopf,
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
