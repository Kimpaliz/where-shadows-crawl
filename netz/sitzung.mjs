/* [Aufgabe: Koop] Wirt und Gast — wer mit wem redet und wer was entscheidet.

   ── Ein Stern, kein Netz ────────────────────────────────────────────

   Alle Gäste hängen am **Wirt**, nicht aneinander. Bei vier Spielern
   sind das 3 Leitungen statt 6, und wichtiger: Es gibt genau **eine**
   Stelle, die die Plätze vergibt und den Lauf beginnt. Bei einem Netz
   aus lauter Gleichen müssten sich vier Rechner darauf einigen, wer
   Platz 2 ist — das ist ein gelöstes Problem, aber ein teures, und es
   löst hier gar nichts, weil ohnehin einer den Code vorgelesen hat.

   Der Preis ist ehrlich: **Geht der Wirt, ist die Runde vorbei.**
   Das ist in Ordnung, solange man zu viert unter Freunden spielt, und
   es ist derselbe Handel, den fast jedes kleine Koop-Spiel eingeht.

   ── Die Saat kommt vom Wirt ─────────────────────────────────────────

   Sie reist **einmal**, beim Start, und danach nie wieder. Alles
   Weitere ergibt sich daraus (`spiel/zufall.mjs`) — genau dafür ist
   der Kern gesät gebaut. Würde jeder selbst würfeln, stünden bei
   jedem andere Gegner.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/broker.mjs`, `netz/verbindung.mjs`, `netz/lobbycode.mjs`,
   `netz/nachrichten.mjs`, `runtime/lobby.js` (die Oberfläche). */

import { verbindeMitVermittler } from "./broker.mjs";
import { macheVerbindung } from "./verbindung.mjs";
import { kennungFuer, neuerLobbyCode } from "./lobbycode.mjs";
import { packe, entpacke } from "./nachrichten.mjs";

export const MAX_SPIELER = 4;

/* Eine Sitzung als Wirt: macht die Lobby auf und wartet auf Gäste. */
export async function eroeffne({ name, beiAenderung, beiEingaben, beiStart, beiMeldung }) {
  const code = neuerLobbyCode();
  const gaeste = new Map();          /* Kennung → { platz, name, leitung } */
  let vermittler = null;
  let gestartet = false;

  const plaetze = () => [
    { platz: 0, name, wirt: true, verbunden: true },
    ...[...gaeste.values()]
      .map((g) => ({ platz: g.platz, name: g.name, wirt: false, verbunden: g.leitung.offen() }))
      .sort((a, b) => a.platz - b.platz)
  ];

  const melde = () => beiAenderung?.({ code, plaetze: plaetze(), eigenerPlatz: 0, wirt: true });

  /* Der erste freie Platz. Nicht `gaeste.size + 1`: Geht jemand und
     kommt ein anderer, bekäme der sonst einen Platz, den es schon gibt. */
  function freierPlatz() {
    const belegt = new Set([...gaeste.values()].map((g) => g.platz));
    for (let p = 1; p < MAX_SPIELER; p++) if (!belegt.has(p)) return p;
    return -1;
  }

  vermittler = await verbindeMitVermittler({
    kennung: kennungFuer(code),
    beiTrennung: () => beiMeldung?.(
      "Die Verbindung zum Vermittler ist weg. Wer schon da ist, spielt weiter — " +
      "neue Gäste können aber nicht mehr dazukommen."
    ),
    beiFehler: (text) => beiMeldung?.(text),
    beiSignal(von, art, inhalt) {
      let gast = gaeste.get(von);

      if (!gast) {
        /* Ein neuer Gast klopft. Nur auf ein Angebot hin anlegen —
           eine Wegbeschreibung ohne Angebot gehört zu niemandem. */
        if (art !== "OFFER") return;
        if (gestartet) return;
        const platz = freierPlatz();
        if (platz < 0) return;      /* voll — der Gast läuft in seine Frist */

        const leitung = macheVerbindung({
          wirt: false,
          sendeSignal: (a, i) => vermittler.sende(von, a, i),
          beiOffen: () => { melde(); schickeStand(); },
          beiZu: () => { gaeste.delete(von); melde(); schickeStand(); },
          beiFehler: (text) => beiMeldung?.(text),
          beiNachricht: (text) => nimmVonGast(von, text)
        });
        gast = { platz, name: `Jäger ${platz + 1}`, leitung };
        gaeste.set(von, gast);
      }

      gast.leitung.nimmSignal(art, inhalt);
    }
  });

  function anAlle(nachricht) {
    const text = packe(nachricht);
    for (const g of gaeste.values()) g.leitung.sende(text);
  }

  /* Wer wo sitzt — nach jeder Änderung an alle. Der Gast baut daraus
     seine eigene Anzeige; er zählt nicht selbst mit, sonst hätten zwei
     Rechner zwei Meinungen über dieselbe Lobby. */
  function schickeStand() {
    anAlle({ art: "stand", plaetze: plaetze() });
  }

  function nimmVonGast(von, text) {
    const n = entpacke(text);
    if (!n) return;
    const gast = gaeste.get(von);
    if (!gast) return;

    if (n.art === "hallo" && typeof n.name === "string") {
      gast.name = n.name.slice(0, 12) || gast.name;
      /* Der Gast erfährt hier zum ersten Mal, welchen Platz er hat. */
      gast.leitung.sende(packe({ art: "platz", platz: gast.platz }));
      melde();
      schickeStand();
    } else if (n.art === "eingaben") {
      beiEingaben?.(gast.platz, n);
    }
  }

  melde();

  return {
    wirt: true,
    code,
    eigenerPlatz: 0,
    plaetze,
    /* Der Wirt beginnt. Die Saat reist genau hier — einmal. */
    starte(saat) {
      if (gestartet) return false;
      gestartet = true;
      const spielerzahl = 1 + gaeste.size;
      anAlle({ art: "start", saat, spielerzahl });
      beiStart?.({ saat, spielerzahl, eigenerPlatz: 0 });
      return true;
    },
    sendeEingaben(nachricht) { anAlle(nachricht); },
    verlasse() {
      for (const g of gaeste.values()) g.leitung.schliesse();
      gaeste.clear();
      vermittler?.schliesse();
    }
  };
}

/* Eine Sitzung als Gast: klopft beim Wirt an. */
export async function tritteBei({ code, name, beiAenderung, beiEingaben, beiStart, beiMeldung }) {
  let eigenerPlatz = -1;
  let letzteListe = [];

  /* Der Gast meldet sich unter einer eigenen, zufälligen Kennung an —
     nicht unter dem Lobbycode. Der gehört dem Wirt, und zwei Anmeldungen
     unter derselben Kennung schließen einander aus. */
  const eigeneKennung = `wsc-gast-${Math.random().toString(36).slice(2, 12)}`;
  const wirtKennung = kennungFuer(code);

  let leitung = null;
  let steht = false;

  const vermittler = await verbindeMitVermittler({
    kennung: eigeneKennung,
    /* Nach dem Aufbau ist der Vermittler belanglos — dann läuft alles
       direkt. **Vorher** ist er alles.

       Am 05.09.2026 gemessen: Der öffentliche Vermittler schließt die
       Verbindung des Absenders, sobald der ein Angebot weiterreichen
       will. Ohne diese Unterscheidung stand der Gast danach für immer
       vor „Suche die Lobby …" — die Trennung galt als belanglos, und
       niemand sagte ihm etwas. */
    beiTrennung: () => {
      if (steht) return;
      beiMeldung?.(
        "Der Vermittler hat die Verbindung abgebrochen, bevor die Lobby " +
        "gefunden war. Das ist ein fremder Dienst — versuch es gleich " +
        "noch einmal."
      );
    },
    beiFehler: (text) => beiMeldung?.(text),
    beiSignal: (von, art, inhalt) => {
      if (von !== wirtKennung) return;
      leitung?.nimmSignal(art, inhalt);
    }
  });

  leitung = macheVerbindung({
    wirt: true,
    sendeSignal: (a, i) => vermittler.sende(wirtKennung, a, i),
    beiOffen: () => { steht = true; leitung.sende(packe({ art: "hallo", name })); },
    beiZu: () => beiMeldung?.(
      "Die Verbindung zum Wirt ist weg. Ohne ihn geht die Runde nicht weiter."
    ),
    beiFehler: (text) => beiMeldung?.(text),
    beiNachricht: (text) => {
      const n = entpacke(text);
      if (!n) return;
      if (n.art === "platz") {
        eigenerPlatz = n.platz;
        beiAenderung?.({ code, plaetze: letzteListe, eigenerPlatz, wirt: false });
      } else if (n.art === "stand") {
        letzteListe = n.plaetze ?? [];
        beiAenderung?.({ code, plaetze: letzteListe, eigenerPlatz, wirt: false });
      } else if (n.art === "start") {
        beiStart?.({ saat: n.saat, spielerzahl: n.spielerzahl, eigenerPlatz });
      } else if (n.art === "eingaben") {
        beiEingaben?.(n.platz, n);
      }
    }
  });

  await leitung.beginne();

  return {
    wirt: false,
    code,
    get eigenerPlatz() { return eigenerPlatz; },
    plaetze: () => letzteListe,
    starte() { return false; },       /* nur der Wirt beginnt */
    sendeEingaben(nachricht) { leitung.sende(packe(nachricht)); },
    verlasse() {
      leitung?.schliesse();
      vermittler?.schliesse();
    }
  };
}
