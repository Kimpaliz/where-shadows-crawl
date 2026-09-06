/* [Aufgabe: Bild] Teilchen, die eine eigene Bahn fliegen.

   ── Janniks Ansage ─────────────────────────────────────────────────

   *„schöne partikeleffekte"*, und davor schon einmal *„mehr partikel
   effekte"* (docs/ROADMAP.md, Phase 16).

   ── Was vorher da war und warum es nicht reicht ────────────────────

   `zeichneStaub()` in `runtime/zeichnen.js` malt zu jedem Treffer einen
   Kranz aus fünf bis zwölf Punkten. Das ist gut gebaut und kostet
   nichts — aber es sind **keine Teilchen**, sondern eine Formel:

   * Sie leben genau so lange wie der Funke (0,18 s) und keine
     Hundertstelsekunde länger.
   * Sie fliegen alle vom selben Punkt gerade nach außen. Es gibt keine
     Schwerkraft, keine Reibung, keinen Aufstieg.
   * Ihr Ort ist eine Funktion von `(x, y, k)`. Zwei Treffer an
     derselben Stelle werfen **denselben** Staub, weil es keinen
     Zustand gibt, in dem etwas anders sein könnte.

   Für einen Einschlag ist das genau richtig. Für eine Flamme, die
   aufsteigt, einen Blitz, der Funken schlägt, oder einen Meteor, der
   Glut auswirft, ist es zu wenig: All das braucht ein Teilchen, das
   **weiterlebt**, nachdem sein Anlass vorbei ist.

   ── Warum die Teilchen im Zeichner wohnen und nicht im Regelkern ───

   Weil sie nichts entscheiden. Der Regelkern muss auf zwei Rechnern
   denselben Weltzustand ergeben (`docs/SPIEL.md` 11); alles darin
   kostet Simulationszeit und muss über die Leitung stimmen. Ein
   Glutkorn, das zwei Bildpunkte weiter links liegt, ändert nichts —
   also gehört es nicht dorthin, wo Gleichlauf bezahlt wird.

   ⚠️ **Trotzdem wird hier nicht gewürfelt.** `Math.random()` steht auch
   im Zeichner nicht, und zwar aus einem Grund, den dieses Projekt
   teuer gelernt hat: Ein Bild, das man nicht zweimal gleich hinbekommt,
   lässt sich nicht vergleichen — und der halbe Wert einer Messung
   steckt darin, denselben Zustand zweimal ansehen zu können. Die
   Streuung kommt deshalb aus einem **Zähler durch eine Hashfunktion**,
   genau wie `streu()` in `runtime/zeichnen.js` sie aus dem Ort zieht.
   Derselbe Ablauf bei derselben Bildrate ergibt dieselben Teilchen.

   ── Die Obergrenze ist keine Vorsicht, sondern eine Messung ────────

   Ein Teilchen kostet je Bild eine Handvoll Rechenschritte und ein
   `fillRect`. Bei 60 Bildern je Sekunde und `HOECHSTZAHL` Teilchen sind
   das rund 38.000 Rechtecke je Sekunde — auf einem Telefon der
   spürbare Teil. Läuft der Schwarm über, werden die **ältesten**
   verworfen: Die jüngsten gehören zu dem, was gerade passiert, und
   genau das will man sehen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/effekte.js` (füllt den Schwarm aus dem, was in der Welt
   passiert, und malt die Felder selbst), `runtime/zeichnen.js` (ruft
   beide), `runtime/palette.js` (die Farben),
   `werkzeuge/pruefe-partikel.mjs` (misst Bahn, Grenze und Verglimmen). */

import { FARBEN } from "./palette.js";

/* Wie viele Teilchen höchstens gleichzeitig fliegen. */
export const HOECHSTZAHL = 640;

/* Die Sorten. Jede ist ein Satz Zahlen, kein eigener Programmzweig —
   dieselbe Entscheidung wie bei den Angriffsformen im Regelkern: Eine
   achte Sorte ist ein Eintrag und keine achte Verzweigung.

   | Feld | was es bedeutet |
   | --- | --- |
   | `leben` | Lebensdauer in Sekunden |
   | `streuung` | wie weit die Anfangsrichtung vom Sollwinkel abweicht |
   | `tempo` | Anfangstempo in Bildpunkten je Sekunde |
   | `reibung` | Anteil des Tempos, der je Sekunde verloren geht |
   | `auftrieb` | Bildpunkte je Sekunde nach **oben** (negatives y) |
   | `schwere` | Bildpunkte je Sekunde nach unten |
   | `groesse` | Kantenlänge in Bildpunkten, 1 oder 2 |
   | `schrumpft`| ob ein 2er-Teilchen am Ende auf 1 fällt |

   Auftrieb und Schwere sind zwei Felder und nicht eines mit Vorzeichen,
   weil sie verschiedene Dinge sind: Eine Flamme steigt, weil sie heiß
   ist; Glut fällt, weil sie schwer ist. Wer beides in einer Zahl
   führt, kann nicht sagen, was er gemeint hat. */
export const SORTEN = {
  /* Ein Einschlag: schnell weg, kurz, hell. Ergänzt den vorhandenen
     Staubkranz, statt ihn zu ersetzen — der Kranz gibt die Form, diese
     hier geben ihm einen Nachhall. */
  funke: { leben: 0.42, streuung: 3.15, tempo: 74, reibung: 3.4, auftrieb: 0, schwere: 26, groesse: 1, schrumpft: false },
  /* Flamme: steigt und wird langsamer. Die einzige Sorte mit Auftrieb —
     im exakten Top-Down ist „oben" keine Höhe, sondern der obere
     Bildrand; eine Flamme, die dorthin zieht, liest sich trotzdem als
     Hitze, weil alles andere es nicht tut. */
  flamme: { leben: 0.75, streuung: 0.9, tempo: 26, reibung: 2.1, auftrieb: 20, schwere: 0, groesse: 2, schrumpft: true },
  /* Schwaden der Aura: kriechen langsam nach außen und verwehen. */
  schwaden: { leben: 1.15, streuung: 0.35, tempo: 13, reibung: 1.0, auftrieb: 4, schwere: 0, groesse: 1, schrumpft: false },
  /* Glut eines Meteoreinschlags: weit weg und dann zu Boden. */
  glut: { leben: 0.95, streuung: 3.15, tempo: 96, reibung: 2.6, auftrieb: 0, schwere: 62, groesse: 2, schrumpft: true },
  /* Entladung eines Blitzes: sehr kurz, sehr schnell, sehr klein. */
  entladung: { leben: 0.26, streuung: 3.15, tempo: 128, reibung: 6.5, auftrieb: 0, schwere: 0, groesse: 1, schrumpft: false },
  /* Der Schweif eines Geschosses: bleibt fast liegen, wo es war. */
  schweif: { leben: 0.3, streuung: 0.6, tempo: 9, reibung: 3.0, auftrieb: 0, schwere: 0, groesse: 1, schrumpft: false },
  /* Blut eines Toten: schwer, kurz, fällt hin. */
  blut: { leben: 0.6, streuung: 3.15, tempo: 58, reibung: 3.0, auftrieb: 0, schwere: 96, groesse: 1, schrumpft: false }
};

export const SORTEN_IDS = Object.keys(SORTEN);

/* ── Farben ──────────────────────────────────────────────────────── */

/* Zwei Farben mischen. Steht ein zweites Mal hier statt als Import aus
   `runtime/zeichnen.js`, weil diese Datei sonst von dem abhinge, was
   sie selbst zeichnet — und `zeichnen.js` hängt am Browser
   (`document.createElement`), diese Datei nicht. Eine Prüfung könnte
   den Schwarm dann nicht ohne Browser messen. Vier Zeilen Rechnung sind
   der billigere Preis. */
export function mische(hex, ziel, anteil) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(ziel.slice(1), 16);
  const teil = (v) => Math.round(((a >> v) & 255) * (1 - anteil) + ((b >> v) & 255) * anteil);
  return "#" + [teil(16), teil(8), teil(0)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/* Vier Stufen von heiß nach kalt, **abgeleitet** aus der Grundfarbe.

   Nicht als vier neue Palettenfarben je Sorte: Das wären bei sieben
   Sorten und fünf Schadensarten fünfunddreißig Einträge, von denen
   niemand mehr wüsste, welcher wozu gehört — und die Palette ist genau
   die Datei, die klein bleiben muss (`runtime/palette.js`). Abgeleitet
   ist außerdem selbstheilend: Wer die Farbe einer Schadensart ändert,
   ändert ihre Teilchen mit.

   Die Kurve ist bewusst nicht linear. Ein Teilchen ist im ersten
   Viertel seines Lebens **fast weiß** — das ist der Augenblick, in dem
   man es überhaupt bemerkt —, dann schnell auf seiner eigenen Farbe,
   und verglimmt zuletzt gegen die Kontur, statt einfach zu
   verschwinden. Ein Teilchen, das von einem Bild aufs nächste weg ist,
   liest sich als Aussetzer und nicht als Ende; dieselbe Begründung wie
   beim Ausblenden der Schadenszahlen in `runtime/zeichnen.js`. */
export function rampeFuer(grundfarbe) {
  return [
    mische(grundfarbe, "#ffffff", 0.62),
    mische(grundfarbe, "#ffffff", 0.28),
    grundfarbe,
    mische(grundfarbe, FARBEN.kontur, 0.42)
  ];
}

/* Welche Stufe ein Teilchen mit dem Alter `a` (0 bis 1) trägt. Die
   Schwellen sind ungleich verteilt, siehe oben: kurz weiß, lang eigen,
   kurz erloschen. */
export function stufeFuerAlter(a) {
  if (a < 0.16) return 0;
  if (a < 0.38) return 1;
  if (a < 0.78) return 2;
  return 3;
}

/* ── Streuung ohne Würfel ─────────────────────────────────────────── */

/* Dieselbe Hashfunktion wie `streu()` in `runtime/zeichnen.js`, nur mit
   einem Zähler statt einem Ort als Eingang. Sie liefert eine Zahl in
   [0,1), ist überall gleich und braucht keinen Zustand außer dem
   Zähler — und der ist bei jedem Durchlauf derselbe, solange dieselben
   Ereignisse in derselben Reihenfolge kommen. */
export function hash(n) {
  let h = (Math.round(n) * 374761393 + 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ── Der Schwarm ─────────────────────────────────────────────────── */

/* Ein Teilchen ist ein flaches Objekt in einem Feld fester Länge. Kein
   `push`/`shift`, kein Wegwerfen: Bei 640 Teilchen und 60 Bildern je
   Sekunde entstünden sonst 38.400 kurzlebige Objekte je Sekunde, und
   der Aufräumer des Browsers macht daraus ein regelmäßiges Stocken —
   genau die Sorte Ruckeln, die man für ein langsames Spiel hält und
   nicht für einen Fehler an einer Stelle. Stattdessen werden die
   Plätze wiederverwendet: `rest <= 0` heißt frei. */
export function macheSchwarm(hoechstzahl = HOECHSTZAHL) {
  const teilchen = Array.from({ length: hoechstzahl }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, rest: 0, leben: 1,
    rampe: null, groesse: 1, schrumpft: false,
    reibung: 0, auftrieb: 0, schwere: 0
  }));
  /* Wo der nächste freie Platz gesucht wird. Rundum, damit die Suche
     nicht jedes Mal vorn anfängt und bei vollem Schwarm quadratisch
     wird. */
  let zeiger = 0;
  let zaehler = 0;

  /* Der älteste Platz, wenn alle belegt sind: der mit der kleinsten
     Restzeit. Er wird überschrieben — siehe die Kopfnotiz. */
  function freierPlatz() {
    for (let i = 0; i < teilchen.length; i++) {
      const p = teilchen[(zeiger + i) % teilchen.length];
      if (p.rest <= 0) { zeiger = (zeiger + i + 1) % teilchen.length; return p; }
    }
    let aeltester = teilchen[0];
    for (const p of teilchen) if (p.rest < aeltester.rest) aeltester = p;
    return aeltester;
  }

  return {
    /* Nur zum Nachsehen und Prüfen. */
    alle: () => teilchen,
    lebende: () => teilchen.filter((p) => p.rest > 0).length,
    hoechstzahl,

    /* Ein Stoß Teilchen. `nx`/`ny` ist die Vorzugsrichtung; ohne eine
       (Vollkreis) einfach `0, 0` übergeben, dann streut es rundum. */
    stosse(sorteId, anzahl, x, y, grundfarbe, nx = 0, ny = 0, tempoFaktor = 1) {
      const sorte = SORTEN[sorteId];
      if (!sorte) return 0;
      const rampe = rampeFuer(grundfarbe);
      /* Ohne Vorzugsrichtung wird rundum gestreut — dann ist der
         Grundwinkel gleichgültig und die Streuung deckt den Vollkreis. */
      const rund = !(nx || ny);
      const grund = rund ? 0 : Math.atan2(ny, nx);
      let gesetzt = 0;

      for (let i = 0; i < anzahl; i++) {
        const p = freierPlatz();
        const a = hash(zaehler++), b = hash(zaehler++), c = hash(zaehler++);
        const w = grund + (a * 2 - 1) * (rund ? Math.PI : sorte.streuung);
        /* Nicht alle gleich schnell: Ein Stoß, in dem jedes Teilchen
           dasselbe Tempo hat, bleibt als **Ring** erkennbar und sieht
           aus wie eine Welle, nicht wie ein Auseinanderstieben. */
        const tempo = sorte.tempo * (0.45 + b * 0.75) * tempoFaktor;
        p.x = x; p.y = y;
        p.vx = Math.cos(w) * tempo;
        p.vy = Math.sin(w) * tempo;
        /* Auch die Lebensdauer streut, sonst erlöschen alle im selben
           Bild — und ein Stoß, der auf einen Schlag verschwindet, ist
           genau das Aussetzen, das die Farbrampe oben vermeiden soll. */
        p.leben = sorte.leben * (0.7 + c * 0.6);
        p.rest = p.leben;
        p.rampe = rampe;
        p.groesse = sorte.groesse;
        p.schrumpft = sorte.schrumpft;
        p.reibung = sorte.reibung;
        p.auftrieb = sorte.auftrieb;
        p.schwere = sorte.schwere;
        gesetzt++;
      }
      return gesetzt;
    },

    /* Ein Schritt. `dt` in Sekunden.

       ⚠️ **Die Reibung wird abgezogen, nicht potenziert.** `v *=
       Math.pow(1 - r, dt)` wäre die glattere Kurve, aber `Math.pow` ist
       teuer und wird hier bis zu 640-mal je Bild gerufen. Bei einer
       Reibung von 3,4 und einem Bild von 1/60 s nimmt das Tempo je
       Bild um 5,7 % ab — der Unterschied zur Potenz liegt weit unter
       einem Bildpunkt und ist im Bild nicht zu sehen. */
    schritt(dt) {
      for (const p of teilchen) {
        if (p.rest <= 0) continue;
        p.rest -= dt;
        if (p.rest <= 0) continue;
        const bremse = Math.max(0, 1 - p.reibung * dt);
        p.vx *= bremse;
        p.vy *= bremse;
        p.vy += (p.schwere - p.auftrieb) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    },

    /* Malen. Der Aufrufer hat die Kamera bereits verschoben
       (`c.translate`), deshalb stehen hier Weltkoordinaten.

       Auf **ganze Bildpunkte** gerundet, wie alles andere auch: Ein
       Teilchen auf einem halben Bildpunkt lässt der Browser weich
       auslaufen, und genau daran erkennt man unechte Pixelgrafik
       (`docs/SPIEL.md` 7). */
    zeichne(c) {
      for (const p of teilchen) {
        if (p.rest <= 0 || !p.rampe) continue;
        const alter = 1 - p.rest / p.leben;
        c.fillStyle = p.rampe[stufeFuerAlter(alter)];
        const g = p.schrumpft && alter > 0.55 ? 1 : p.groesse;
        c.fillRect(Math.round(p.x), Math.round(p.y), g, g);
      }
    },

    leeren() {
      for (const p of teilchen) p.rest = 0;
    }
  };
}
