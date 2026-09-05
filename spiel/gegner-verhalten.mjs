/* [Aufgabe: Regelkern] Wie ein Gegner sich entscheidet, nicht nur wohin er läuft.

   ── Warum ein eigener Katalog ───────────────────────────────────────

   Bis zum 05.09.2026 stand jedes Verhalten als `if`-Zweig mitten in
   `spiel/bewegung.mjs`: Ein neues Verhalten hieß, die Bewegungsfunktion
   selbst aufzuschneiden. Jetzt ist ein Verhalten ein Eintrag hier —
   `spiel/bewegung.mjs` fragt nur noch „was sagt dieser Eintrag zu
   dieser Lage" und kennt keine einzige Gegnerart mehr beim Namen.

   Janniks Ansage vom 05.09.2026, wörtlich: „coole monster mit mehr
   mechaniken statt nur folgen und schiessen". Die Messlatte dafür steht
   in dieser Datei, nicht in der Roadmap: **Jedes Verhalten muss dem
   Spieler eine andere Frage stellen** — nicht nur anders aussehen. Ein
   Verhalten, das sich am Ende wie `laeuft` mit anderem Wackeln anfühlt,
   ist keine sechste Antwort, sondern die dritte in Verkleidung.
   `werkzeuge/pruefe-gegner.mjs` hält das mechanisch fest: keine zwei
   Einträge mit derselben Frage, keiner ohne Benutzer im Katalog.

   ── Die sechs Fragen ────────────────────────────────────────────────

   | Verhalten  | fragt |
   | ---        | --- |
   | `laeuft`   | Hältst du die Front, oder wirst du erdrückt? |
   | `schwankt` | Triffst du ein Ziel, das quer zu deiner Linie steht? |
   | `speit`    | Gehst du auf ihn zu, oder lässt du dir seinen Abstand aufzwingen? |
   | `kreist`   | Reagierst du auf einen, der sich nie in Reichweite stellt, sondern dauernd um dich herum bleibt? |
   | `sammelt`  | Erkennst du den Ladevorgang, bevor der Ausbruch dich trifft? |
   | `stur`     | Liest du eine Linie voraus, die sich anderthalb Sekunden lang nicht mehr nach dir richtet? |

   ── Die Vertragsform ────────────────────────────────────────────────

   `richte(ctx)` bekommt die schon berechnete Gerade zum nächsten
   Spieler (`ctx.wx`/`ctx.wy`, ein Einheitsvektor, `{0,0}` wenn niemand
   lebt) und darf daraus eine andere Richtung machen — bis hin zu
   „steht still" (`{wx:0, wy:0}`). Zusätzlich darf sie `tempoFaktor`
   zurückgeben; ohne ihn gilt 1. `spiel/bewegung.mjs` multipliziert ihn
   auf `g.tempo`, zusammen mit der Frost-Bremse — ein ladender Wächter
   ist trotzdem eingefroren, wenn er eingefroren ist.

   Zustand, den ein Verhalten über mehrere Bilder braucht (`sammelt`,
   `stur`), liegt **auf dem Gegner selbst** (`g.sammelModus`, `g.sturUhr`
   …) und wird beim ersten Aufruf angelegt — `spiel/welt.mjs` weiß
   nichts davon und muss es nicht wissen (Bauregel 7: ein neues Feld ist
   eine Konfiguration, kein zweites Gitter). `kreist` kommt sogar ganz
   ohne neues Feld aus: `g.phase` ist beim Setzen bereits ein gewürfelter
   Winkel (`spiel/welt.mjs`, `setzeGegner`), und sein Vorzeichen reicht
   als fester Münzwurf „im oder gegen den Uhrzeigersinn".

   Gewürfelt wird ausschließlich über `ctx.zufall` (`welt.zufall`), nie
   über `Math.random` — `werkzeuge/pruefe-kern.mjs` erzwingt das für
   jede Datei unter `spiel/`, textuell und an einem echten Lauf: zwei
   Welten mit derselben Saat müssen bitgleich bleiben, auch mit einem
   ladenden Wächter oder einer sturen Hauptmannswelle darin.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/bewegung.mjs` (ruft `richteVerhalten` je Gegner und Bild),
   `spiel/katalog/gegner.mjs` (jede Art nennt ihre `verhalten`-Kennung),
   `werkzeuge/pruefe-gegner.mjs` (prüft, dass jede Kennung existiert und
   jeder Eintrag benutzt wird). */

/* Wie lange ein Wächter lädt, bevor er ausbricht — mit Streuung, damit
   nicht alle Wächter einer Welle im selben Bild ausbrechen. Und wie
   lange und wie schnell der Ausbruch selbst dauert. */
const SAMMELN_LADE = 1.0;
const SAMMELN_LADE_STREUUNG = [0.25, 1.0];
const SAMMELN_STURM = 0.4;
const SAMMELN_LADE_TEMPO = 0.06;
/* Exportiert, weil `werkzeuge/pruefe-gegner.mjs` damit nachrechnet, ob
   der Ausbruch den Spieler überhaupt überholen kann — ein Ladevorgang,
   dem man spazierend davonläuft, ist eine Ankündigung ohne Drohung.
   Die Zahl gehört diesem Verhalten; sie ein zweites Mal in die Prüfung
   zu tippen wäre genau die Doppelung, an der die Verhaltensliste in
   `pruefe-katalog.mjs` schon einmal veraltet ist. */
export const SAMMELN_STURM_TEMPO = 2.5;

/* Wie oft ein sturer Gegner seine Richtung neu nach dem Spieler
   ausrichtet. Dazwischen hält er sie, auch wenn der Spieler längst
   woanders steht. */
const STUR_INTERVALL = 1.5;

/* Der Ring, in dem ein kreisender Gegner bleiben will, wenn die Art
   selbst keinen `abstand` nennt — kommt nur zum Tragen, wenn ein
   Katalogeintrag das Feld vergisst; `werkzeuge/pruefe-gegner.mjs`
   verlangt es trotzdem von jeder Art mit `verhalten: "kreist"`. */
const KREIST_STANDARDRING = 70;

const NACH_ID = new Map();

function definiere(eintrag) {
  NACH_ID.set(eintrag.id, eintrag);
  return eintrag;
}

export const VERHALTEN = [
  definiere({
    id: "laeuft", name: "Läuft",
    frage: "Hältst du die Front, oder wirst du erdrückt?",
    richte({ wx, wy }) { return { wx, wy }; }
  }),

  definiere({
    id: "schwankt", name: "Schwankt",
    frage: "Triffst du ein Ziel, das quer zu deiner Linie steht?",
    richte({ g, dt, wx, wy }) {
      /* Ein Bogen statt einer Geraden: quer zur Laufrichtung, mit
         eigener Phase je Gegner. Trifft man schlechter, und es bricht
         die Front auf. */
      g.phase += dt * 3.4;
      const s = Math.sin(g.phase) * 0.7;
      const qx = -wy, qy = wx;
      const nx = wx + qx * s, ny = wy + qy * s;
      const l = Math.hypot(nx, ny) || 1;
      return { wx: nx / l, wy: ny / l };
    }
  }),

  definiere({
    id: "speit", name: "Speit",
    frage: "Gehst du auf ihn zu, oder lässt du dir seinen Abstand aufzwingen?",
    richte({ art, dx, dy, wx, wy }) {
      /* Bleibt auf Abstand: kommt heran, bis er schießen kann, und
         weicht zurück, wenn man ihm zu nah kommt. */
      const abstand = Math.hypot(dx, dy);
      if (abstand < art.abstand * 0.75) return { wx: -wx, wy: -wy };
      if (abstand < art.abstand) return { wx: 0, wy: 0 };
      return { wx, wy };
    }
  }),

  definiere({
    id: "kreist", name: "Kreist",
    frage: "Reagierst du auf einen, der sich nie in Reichweite stellt, sondern dauernd um dich herum bleibt?",
    richte({ g, art, dx, dy, wx, wy }) {
      const ring = art.abstand ?? KREIST_STANDARDRING;
      const d = Math.hypot(dx, dy) || 1;
      /* Fester Münzwurf aus dem Geburtswinkel — siehe Kopfnotiz. */
      const dreh = g.phase < Math.PI ? 1 : -1;
      const tx = -wy * dreh, ty = wx * dreh;
      let radial = 0;
      if (d > ring * 1.15) radial = 1;
      else if (d < ring * 0.85) radial = -1;
      const nx = tx + wx * radial * 0.7;
      const ny = ty + wy * radial * 0.7;
      const l = Math.hypot(nx, ny) || 1;
      return { wx: nx / l, wy: ny / l };
    }
  }),

  definiere({
    id: "sammelt", name: "Sammelt sich",
    frage: "Erkennst du den Ladevorgang, bevor der Ausbruch dich trifft?",
    richte({ g, dt, wx, wy, zufall }) {
      /* Zwei Zustände: `laedt` (fast reglos, ein Wärmen für den
         Ausbruch) und `stuermt` (kurz, schnell, in einer beim Start des
         Sturms festgelegten Richtung — nicht nachgeführt, sonst wäre
         der Ausbruch kein Ausbruch, sondern nur ein schnellerer
         `laeuft`). Beide Felder werden beim ersten Bild dieses Gegners
         angelegt; `zufall` streut den ersten Ladevorgang, damit nicht
         jeder Wächter einer Welle im selben Bild losbricht. */
      if (g.sammelModus === undefined) {
        g.sammelModus = "laedt";
        g.sammelUhr = zufall.zwischen(SAMMELN_LADE_STREUUNG[0], SAMMELN_LADE_STREUUNG[1]);
      }
      g.sammelUhr -= dt;

      if (g.sammelModus === "laedt") {
        if (g.sammelUhr <= 0) {
          g.sammelModus = "stuermt";
          g.sammelUhr = SAMMELN_STURM;
          g.sammelWx = wx; g.sammelWy = wy;
        }
        return { wx: 0, wy: 0, tempoFaktor: SAMMELN_LADE_TEMPO };
      }

      if (g.sammelUhr <= 0) {
        g.sammelModus = "laedt";
        g.sammelUhr = SAMMELN_LADE;
        return { wx: 0, wy: 0, tempoFaktor: SAMMELN_LADE_TEMPO };
      }
      return { wx: g.sammelWx, wy: g.sammelWy, tempoFaktor: SAMMELN_STURM_TEMPO };
    }
  }),

  definiere({
    id: "stur", name: "Stur",
    frage: "Liest du eine Linie voraus, die sich anderthalb Sekunden lang nicht mehr nach dir richtet?",
    richte({ g, dt, wx, wy, zufall }) {
      /* Peilt nur alle `STUR_INTERVALL` Sekunden neu — dazwischen hält
         er die einmal gewählte Richtung stur, auch wenn der Spieler
         längst zur Seite getreten ist. `zufall` streut nur den ersten
         Zeitpunkt, damit nicht alle sturen Gegner im selben Bild
         umschwenken. */
      if (g.sturUhr === undefined) {
        g.sturUhr = zufall.zwischen(0, STUR_INTERVALL);
        g.sturWx = wx; g.sturWy = wy;
      }
      g.sturUhr -= dt;
      if (g.sturUhr <= 0) {
        g.sturUhr = STUR_INTERVALL;
        g.sturWx = wx; g.sturWy = wy;
      }
      return { wx: g.sturWx, wy: g.sturWy };
    }
  })
];

export const VERHALTEN_IDS = VERHALTEN.map((v) => v.id);
export const VERHALTEN_NACH_ID = NACH_ID;

/* Fällt eine Kennung nicht in den Katalog (kann bei sauberen Daten
   nicht passieren, `werkzeuge/pruefe-gegner.mjs` prüft das), wird der
   Gegner nicht blind — er läuft geradewegs, statt stehenzubleiben. */
export function richteVerhalten(id, ctx) {
  const eintrag = NACH_ID.get(id);
  if (!eintrag) return { wx: ctx.wx, wy: ctx.wy };
  return eintrag.richte(ctx);
}
