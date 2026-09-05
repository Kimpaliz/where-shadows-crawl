/* [Aufgabe: Koop] Der Gleichschritt — wann ein Tick gerechnet werden darf.

   ── Die Idee in einem Satz ──────────────────────────────────────────

   Niemand rechnet Tick N, bevor er die Eingaben **aller** für Tick N
   hat. Dann rechnen alle dasselbe, und über die Leitung müssen nur
   zwei Achsen und ein Knopf je Spieler und Tick (`netz/nachrichten.mjs`).

   ── Warum die Eingaben in die Zukunft geschickt werden ──────────────

   Würde man die Eingabe für Tick N erst zu Tick N verschicken, müsste
   jeder auf die Post warten, bevor er ein einziges Bild rechnen kann —
   das Spiel liefe dann im Takt der Leitung, also ruckelig und immer
   langsamer als die langsamste Verbindung.

   Stattdessen schickt jeder in Bild N seine Eingabe für Tick
   **N + Verzug**. Die Post hat also `Verzug` Ticks Zeit anzukommen.
   Der Preis ist ehrlich: Was man drückt, wirkt erst `Verzug` Ticks
   später. Bei 60 Ticks je Sekunde sind drei Ticks **50 ms** — das ist
   ungefähr die Grenze, unterhalb derer man eine Verzögerung nicht mehr
   als solche empfindet, sondern höchstens als „etwas schwammig".

   ── Warum die ersten Ticks vorgefüllt sind ──────────────────────────

   Für die Ticks 0 bis Verzug−1 kann niemand rechtzeitig etwas
   geschickt haben — sie liegen vor dem ersten Bild. Ohne Vorfüllen
   stünde der Gleichschritt sofort still und wartete auf Post, die es
   nie geben wird. Sie bekommen deshalb eine ruhende Eingabe: Der Lauf
   beginnt damit, dass alle für 50 ms stillstehen, und das ist genau
   das, was man ohnehin sieht.

   ── Keine Uhr in dieser Datei ───────────────────────────────────────

   `holeTick()` kennt keine Zeit. Es sagt nur „geht" oder „geht nicht",
   und **wer** fehlt. Ob jemand lange genug fehlt, um ihn zu
   überspringen, entscheidet `runtime/start.js` — dort gibt es eine
   Uhr, hier nicht. Genau deshalb lässt sich diese Datei ohne Browser
   und ohne Wartezeit prüfen (`werkzeuge/pruefe-netz.mjs`).

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/nachrichten.mjs` (Packen), `netz/sitzung.mjs` (Versand),
   `runtime/start.js` (Takt und Frist), `werkzeuge/pruefe-netz.mjs`. */

import { ruhendeEingabe } from "./nachrichten.mjs";

/* Drei Ticks bei 60 je Sekunde sind 50 ms. Gemessen wird das nicht in
   dieser Datei — die Zahl steht hier, weil sie zum Gleichschritt
   gehört, und ihre Begründung steht oben. */
export const VERZUG = 3;

/* Wie viele vergangene Eingaben jede Nachricht mitschleppt. Der Kanal
   ist unzuverlässig (netz/verbindung.mjs), also geht hin und wieder
   ein Paket verloren. Es noch einmal anzufordern wäre zu langsam —
   billiger ist es, die letzten paar Eingaben jedes Mal mitzuschicken:
   Sie sind drei Byte groß, und damit übersteht der Gleichschritt den
   Verlust von bis zu `NACHHALL - 1` Paketen hintereinander, ohne dass
   irgendjemand etwas merkt. */
export const NACHHALL = 8;

export function macheLockstep({ eigenerPlatz = 0, plaetze = [0], verzug = VERZUG } = {}) {
  /* Tick → { platz → Eingabe }. Eine Map und kein Feld: Die Ticks
     laufen weit, und ein Feld mit Löchern wäre irgendwann groß. */
  const post = new Map();
  const weggebrochen = new Set();
  let naechster = 0;
  let blockiertSeit = 0;

  const fach = (tick) => {
    let f = post.get(tick);
    if (!f) { f = new Map(); post.set(tick, f); }
    return f;
  };

  /* Die Ticks vor dem ersten Bild — siehe Kopfnotiz. */
  for (let t = 0; t < verzug; t++)
    for (const p of plaetze) fach(t).set(p, ruhendeEingabe());

  function setze(platz, tick, eingabe) {
    /* Was für einen längst gerechneten Tick kommt, ist Nachhall und
       wird weggeworfen — es einzutragen würde nichts ändern und die
       Map wachsen lassen. */
    if (tick < naechster) return;
    const f = fach(tick);
    /* Das erste Wort gilt. Käme dieselbe Eingabe zweimal verschieden
       an, wäre die zweite Fassung eine andere Welt — und welche der
       beiden gilt, dürfte nicht davon abhängen, welches Paket zuletzt
       eintraf. */
    if (!f.has(platz)) f.set(platz, eingabe);
  }

  return {
    verzug,

    /* Die eigene Eingabe für einen Tick in der Zukunft. */
    setzeEigene(tick, eingabe) { setze(eigenerPlatz, tick, eingabe); },

    /* Eine, die über die Leitung kam. */
    setzeFremde(platz, tick, eingabe) { setze(platz, tick, eingabe); },

    /* Wer nicht mehr mitspielt. Seine Figur steht ab dann still —
       sie verschwindet nicht, denn ein Jäger, der sich in Luft
       auflöst, wäre für die anderen eine Falschaussage über die Welt
       (und der Regelkern kennt kein Entfernen mitten im Lauf). */
    meldeWeg(platz) { weggebrochen.add(platz); },
    istWeg(platz) { return weggebrochen.has(platz); },

    /* Wessen Eingabe für den nächsten Tick fehlt. `runtime/start.js`
       fragt das, wenn es zu lange dauert. */
    fehlendePlaetze() {
      const f = post.get(naechster);
      return plaetze.filter((p) => !weggebrochen.has(p) && !f?.has(p));
    },

    /* Wie viele Anläufe hintereinander schon blockiert waren. Zählt
       Anläufe, nicht Millisekunden — eine Uhr gehört hier nicht her. */
    blockiertSeit: () => blockiertSeit,

    /* Der nächste Tick, wenn er vollständig ist — sonst `null`. */
    holeTick() {
      const f = post.get(naechster);
      for (const p of plaetze) {
        if (weggebrochen.has(p)) continue;
        if (!f?.has(p)) { blockiertSeit++; return null; }
      }
      const eingaben = plaetze.map((p) => f?.get(p) ?? ruhendeEingabe());
      const tick = naechster;
      post.delete(naechster);
      naechster++;
      blockiertSeit = 0;
      return { tick, eingaben };
    },

    naechsterTick: () => naechster
  };
}
