/* [Aufgabe: Katalog] Die Spielarten — Daten, kein Verhalten.

   ── Warum es diesen Katalog gibt ───────────────────────────────────

   Janniks Satz vom 05.09.2026, „Arena Modus (aktuell vorhanden)",
   macht aus dem ganzen Spiel **einen Modus von mehreren**. Ohne einen
   Modus-Begriff wäre jeder zweite Modus eine Verzweigung mitten im
   Regelkern — und die bekommt man nie wieder heraus. Also steht hier,
   was eine Spielart *ist*; wie sie ausgeführt wird, steht in
   `spiel/welt.mjs` und `spiel/lauf.mjs`.

   ── Die drei Endebedingungen einer Runde ───────────────────────────

   Sie sind der eigentliche Inhalt dieser Datei, und sie kommen alle
   drei aus Janniks Ansagen:

   | `endet` | die Runde endet, wenn … | wo |
   | --- | --- | --- |
   | `zeit` | die Uhr abgelaufen ist | Arena, normale Welle |
   | `elite` | der Hauptmann tot ist | Arena, jede vierte Welle |
   | `ort` | die Kutsche den Checkpoint erreicht hat | Karawane |

   Vorher gab es genau eine, fest in `schritt()`. Eine Bosswelle, die
   nach dreißig Sekunden endet, obwohl der Boss noch steht, wäre keine
   Bosswelle — und eine Karawanenrunde hat gar keine Uhr, sondern ein
   Ziel.

   ── Und die Verliererbedingung ─────────────────────────────────────

   In der Arena ist der Lauf vorbei, wenn **alle** liegen. In der
   Karawane ist er vorbei, wenn **die Kutsche fällt** — auch wenn alle
   vier noch stehen. Auch das stand vorher fest im Regelkern.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/lauf.mjs` (fragt nach dem Ablauf), `spiel/welt.mjs` (fragt
   nach der Endebedingung), `spiel/katalog/wellen.mjs` (fragt nach der
   Wellenlänge). Importiert selbst nichts. */

export const MODI = [
  {
    id: "arena",
    name: "Bannkreis",
    text: "Endlose Nächte im Steinkreis. Die Fackel brennt in der Mitte, "
      + "die Toten kommen aus dem Dunkel, und irgendwann kommen zu viele.",

    /* Janniks Ansage: „Im arena modus endloswellen, jede welle 30
       sekunden (boss wellen bis der boss besiegt ist)". */
    endlos: true,
    wellenSekunden: 30,
    elitewelleJede: 4,
    endet: (welle) => (welle % 4 === 0 ? "elite" : "zeit"),

    /* Endlos heißt: Es gibt kein Gewinnen. Nur ein „wie weit". */
    weltform: "kreis",
    verloren: (welt) => welt.spieler.every((s) => s.zustand === "liegt"),

    /* ⚠️ Gemessen am 05.09.2026, und der Befund ist unangenehm: Die
       Regel „am Wellenende steht jeder von selbst wieder auf" war für
       zwölf Wellen genau richtig — sie strich das Zusehen, ohne die
       Todesangst zu nehmen. **Endlos trägt sie nicht.** Zu zweit und zu
       viert endete der Lauf nie: Der Prüfstand lief bis zur Notbremse
       bei Welle 201 durch, weil ein Sturz nichts kostet, solange nicht
       alle gleichzeitig liegen — und das wird zu viert nie.

       Deshalb steht das hier auf falsch: Wer fällt, bleibt liegen, bis
       ein Mitspieler ihn holt. Allein ist es damit wie vorher; zu
       mehreren kostet ein Sturz jetzt etwas.

       Das ist eine **Zwischenlösung**, keine Entscheidung — die trifft
       Jannik (Vorgang „Was kostet ein Sturz im endlosen Modus?"). */
    stehtAmWellenendeAuf: false
  },

  {
    id: "karawane",
    name: "Karawane",
    text: "Eine Kutsche durch den dunklen Wald. Sie trägt das einzige "
      + "Licht, und auf ihr sitzt der Krämer. Wer zu weit abkommt, "
      + "steht im Finstern.",

    /* Janniks Ansage: „die runde geht solange bis die kutsche den
       nächsten checkpoint erreicht hat. das kann 30-60 sekunden dauern
       bei normaler schwierigkeit". Die Zeitspanne ist deshalb keine
       Regel, sondern eine **Erwartung** — sie ergibt sich daraus, wie
       sehr die Kutsche aufgehalten wird. Sie steht hier, damit die
       Messung weiß, was sie prüfen soll. */
    endlos: true,
    erwarteteSekunden: [30, 60],
    endet: () => "ort",

    weltform: "strasse",
    verloren: (welt) => welt.kutsche != null && welt.kutsche.leben <= 0,

    /* Noch nicht gebaut — Phase 6 (Welt ohne Kreis) und 7 (Biome)
       stehen davor. Der Eintrag ist trotzdem hier, weil er die
       Endebedingung `ort` begründet: Ohne ihn sähe sie aus wie
       Vorratsbau. */
    gebaut: false
  }
];

export const MODUS_NACH_ID = new Map(MODI.map((m) => [m.id, m]));

export const STANDARD_MODUS = "arena";

export function modus(id = STANDARD_MODUS) {
  const m = MODUS_NACH_ID.get(id);
  if (!m) throw new Error(`Unbekannter Modus: ${id}`);
  return m;
}

/* Nur die Modi, die man wirklich spielen kann. Das Vorspiel zeigt
   diese Liste — einen Eintrag anzubieten, der nichts tut, wäre ein
   Versprechen, das das Spiel nicht hält. */
export function spielbareModi() {
  return MODI.filter((m) => m.gebaut !== false);
}
