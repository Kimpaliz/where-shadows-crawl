/* [Aufgabe: Koop] Der Vermittler — wie sich zwei Browser überhaupt finden.

   ── Das Problem, das ein Vermittler löst ────────────────────────────

   Zwei Rechner hinter zwei Routern finden sich **nicht von allein**.
   Keiner der beiden hat eine Adresse, die der andere anwählen könnte;
   beide sitzen hinter einer Adressumsetzung, die nur Verbindungen
   nach außen durchlässt. Es braucht eine Stelle, die beide von sich
   aus erreichen und über die sie einander ihre Verbindungsangebote
   zustecken.

   Genau das und nichts weiter tut der Vermittler. Sobald die
   Verbindung steht, laufen **alle** Spieldaten direkt von Browser zu
   Browser; der Vermittler sieht nur, dass sich jemand verbinden wollte.

   ── Warum kein Paket, sondern das Protokoll selbst ──────────────────

   Benutzt wird der öffentliche PeerJS-Vermittler — aber **nicht** die
   PeerJS-Bibliothek. Das Projekt hat null Abhängigkeiten, und das ist
   keine Marotte: Eine Bibliothek von einem fremden Auslieferungsnetz
   ist eine zweite Stelle, die ausfallen kann, eine zweite, die sich
   ändern kann, und eine, die man nicht liest. Das Protokoll darunter
   ist schlichtes JSON über einen WebSocket — knapp hundert Zeilen.

   ⚠️ **Der Vermittler ist ein fremder Dienst.** Er kann ausfallen,
   und er ist nichts, worauf sich jemand verlassen sollte. Fällt er
   aus, muss die Lobby das **sagen** und nicht hängen — deshalb ist
   hier alles mit einer Frist versehen, und jeder Fehler hat einen Text
   in normaler Sprache.

   ⚠️⚠️ **Am 05.09.2026 gemessen, und der Befund ist unangenehm:** Der
   öffentliche Vermittler nimmt die Anmeldung an und beantwortet
   Lebenszeichen — aber sobald ein Teilnehmer ein Angebot
   **weiterreichen** will, schließt er dessen Verbindung mit Code 1000,
   und beim Empfänger kommt **nichts** an. Vier Fälle mit nackten
   Sockets, ohne eine Zeile Spielcode:

   | Fall | Absender danach | Empfänger |
   | --- | --- | --- |
   | nur dasitzen | offen | — |
   | nur Lebenszeichen | offen | — |
   | Angebot an eine Kennung, die es nicht gibt | **zu (1000)** | — |
   | Angebot an eine Kennung, die es gibt | **zu (1000)** | **nichts** |

   Das Protokoll hier folgt der Beschreibung; der Dienst hält sie
   gerade nicht ein. Deshalb ist der Weg **gebaut und lesbar**, aber
   die Runde über diesen Vermittler kam in dieser Umgebung nicht
   zustande. Was daraus folgt, steht in
   `docs/rueckmeldung/lobby-und-netz.md` — es ist eine Entscheidung
   über einen fremden Dienst und keine, die man im Vorbeigehen trifft.
   Wichtig ist nur, dass es **auffällt**: Der Abbruch wird gemeldet,
   statt in einem Wartebild zu verschwinden.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/lobbycode.mjs` (die Kennung), `netz/verbindung.mjs` (bekommt
   die Angebote zugestellt), `netz/sitzung.mjs` (steuert beides). */

export const VERMITTLER = "wss://0.peerjs.com/peerjs";

/* Alle fünf Sekunden ein Lebenszeichen. Ohne das trennt der Vermittler
   nach kurzer Zeit — und zwar stillschweigend, weshalb der Fehler
   sonst erst beim nächsten Beitritt auffiele. */
const HERZSCHLAG_MS = 5000;

/* Wie lange auf die Bestätigung des Vermittlers gewartet wird, bevor
   die Lobby aufgibt. Länger als zehn Sekunden zu warten hilft niemandem:
   Wer dann noch nichts gehört hat, hört auch in einer Minute nichts. */
const FRIST_MS = 10000;

/* Ein Zufallswort, mit dem sich dieselbe Kennung wiedererkennen lässt.
   Nicht sicherheitsrelevant — der Vermittler verlangt es schlicht. */
function marke() {
  return Math.random().toString(36).slice(2, 12);
}

/* Verbindet sich unter `kennung` mit dem Vermittler.

   `beiSignal(von, art, inhalt)` bekommt jedes eingehende Angebot.
   `beiFehler(text)` bekommt einen Satz in normaler Sprache.

   Gibt ein Versprechen auf `{ sende, schliesse, kennung }` zurück,
   das erst erfüllt wird, wenn der Vermittler die Kennung bestätigt
   hat — vorher etwas zu senden hätte keinen Empfänger. */
export function verbindeMitVermittler({ kennung, beiSignal, beiFehler, beiTrennung }) {
  return new Promise((erfuellt, abgelehnt) => {
    const adresse = `${VERMITTLER}?key=peerjs&id=${encodeURIComponent(kennung)}` +
      `&token=${marke()}&version=1.5.4`;

    let draht;
    try {
      draht = new WebSocket(adresse);
    } catch {
      abgelehnt(new Error("Der Vermittler ist nicht erreichbar."));
      return;
    }

    let offen = false;
    let herzschlag = null;

    const frist = setTimeout(() => {
      if (offen) return;
      try { draht.close(); } catch { /* schon zu */ }
      abgelehnt(new Error(
        "Der Vermittler antwortet nicht. Das liegt an ihm, nicht am Spiel — " +
        "in ein paar Minuten noch einmal versuchen."
      ));
    }, FRIST_MS);

    draht.addEventListener("message", (ereignis) => {
      let nachricht;
      try { nachricht = JSON.parse(ereignis.data); } catch { return; }

      if (nachricht.type === "OPEN") {
        offen = true;
        clearTimeout(frist);
        /* Erst jetzt schlagen — vorher weiß der Vermittler noch nicht,
           wer da klopft. */
        herzschlag = setInterval(() => {
          if (draht.readyState === WebSocket.OPEN)
            draht.send(JSON.stringify({ type: "HEARTBEAT" }));
        }, HERZSCHLAG_MS);

        erfuellt({
          kennung,
          /* Ein Angebot an einen bestimmten Gegenüber. */
          sende(ziel, art, inhalt) {
            if (draht.readyState !== WebSocket.OPEN) return false;
            draht.send(JSON.stringify({ type: art, dst: ziel, payload: inhalt }));
            return true;
          },
          schliesse() {
            clearInterval(herzschlag);
            try { draht.close(); } catch { /* schon zu */ }
          }
        });
        return;
      }

      if (nachricht.type === "ID-TAKEN") {
        clearTimeout(frist);
        try { draht.close(); } catch { /* schon zu */ }
        abgelehnt(new Error(
          "Diesen Lobbycode gibt es gerade schon. Mach eine neue Lobby auf — " +
          "dann bekommst du einen anderen Code."
        ));
        return;
      }

      /* Die drei, aus denen eine Verbindung entsteht. `src` ist der
         Absender; wer antworten will, schickt an genau diese Kennung. */
      if (nachricht.type === "OFFER" || nachricht.type === "ANSWER" || nachricht.type === "CANDIDATE") {
        beiSignal?.(nachricht.src, nachricht.type, nachricht.payload);
      }
    });

    draht.addEventListener("error", () => {
      clearTimeout(frist);
      if (!offen) abgelehnt(new Error("Der Vermittler ist nicht erreichbar."));
      else beiFehler?.("Die Verbindung zum Vermittler ist gestört.");
    });

    draht.addEventListener("close", () => {
      clearTimeout(frist);
      clearInterval(herzschlag);
      /* Nach dem Aufbau ist das kein Beinbruch: Der Vermittler wird nur
         zum Finden gebraucht. Wer schon verbunden ist, spielt weiter. */
      if (offen) beiTrennung?.();
      else abgelehnt(new Error("Der Vermittler hat die Verbindung abgewiesen."));
    });
  });
}
