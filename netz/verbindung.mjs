/* [Aufgabe: Koop] Eine Leitung von Browser zu Browser.

   ── Was hier gebaut wird ────────────────────────────────────────────

   Der Vermittler (`netz/broker.mjs`) bringt zwei Browser dazu, einander
   ihre Verbindungsangebote zuzustecken. Aus diesen Angeboten entsteht
   hier die eigentliche Leitung — ein `RTCDataChannel`, über den danach
   **alles** läuft, ohne dass noch jemand dazwischensteht.

   ── Zwei Entscheidungen, die man später nicht mehr billig ändert ────

   1. **Der Kanal ist unzuverlässig und ungeordnet**
      (`ordered: false`, `maxRetransmits: 0`). Das klingt falsch und
      ist genau richtig: Eine Eingabe für Tick 900 ist wertlos, wenn
      sie ankommt, während schon Tick 950 läuft. Ein zuverlässiger
      Kanal hielte alles Spätere auf, um sie doch noch zuzustellen —
      und das ist genau der Ruckler, den man vermeiden will. Verlorene
      Eingaben fängt der Lockstep ab, indem er sie mehrfach mitschickt.

   2. **STUN, kein TURN.** Die beiden STUN-Server sagen einem Browser
      nur, wie er von außen aussieht. Das genügt für die allermeisten
      Anschlüsse.

   ⚠️ **Hinter manchen Netzen kommt gar keine Verbindung zustande.**
   Bei einer symmetrischen Adressumsetzung — verbreitet in Firmen- und
   manchen Mobilfunknetzen — hilft STUN nicht, weil der Router für jedes
   Ziel eine andere Außenadresse benutzt. Dagegen hilft nur ein
   TURN-Server, der den ganzen Verkehr weiterreicht, und den gibt es
   nicht umsonst. Deshalb hat die Verbindung hier eine **Frist** und
   sagt danach ehrlich, dass es am Netz liegt — statt einen Ladebalken
   zu zeigen, der nie zu Ende geht.

   ── Angebote reisen in einer Hülle ──────────────────────────────────

   Was der Browser liefert (`localDescription.toJSON()`), reicht dem
   Vermittler **nicht**: Er lässt es nicht durch und trennt statt zu
   antworten. Deshalb geht hier nichts roh hinaus — `verpackeSignal`
   legt die gemessene Hülle darum, `entpackeSignal` nimmt sie wieder
   ab. Die Begründung samt Messwerten steht in
   `netz/vermittler-format.mjs`; hier steht sie nicht noch einmal,
   damit es nur **eine** Stelle gibt, die sie erklärt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/broker.mjs` (Zustellung der Angebote), `netz/sitzung.mjs`
   (Wirt und Gast), `netz/nachrichten.mjs` (was gesendet wird),
   `netz/vermittler-format.mjs` (die Hülle). */

import {
  verpackeSignal, entpackeSignal, kennungAusSignal, neueVerbindungsKennung
} from "./vermittler-format.mjs";

export const EISDIENSTE = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];

/* Wie lange auf eine Leitung gewartet wird. Zwanzig Sekunden sind
   großzügig — ein Aufbau über zwei Router dauert selten länger als
   fünf. Wer nach zwanzig nichts hat, bekommt nichts mehr. */
const FRIST_MS = 20000;

/* Baut eine Leitung auf.

   `wirt`: true, wenn dieser Browser das Angebot macht. Nur einer der
   beiden darf das — machen es beide, entstehen zwei halbe Verbindungen,
   die einander nicht kennen.

   `sendeSignal(art, inhalt)` reicht ein Angebot an den Gegenüber
   weiter. `beiNachricht(text)` bekommt, was ankommt. */
export function macheVerbindung({ wirt, sendeSignal, beiNachricht, beiOffen, beiZu, beiFehler }) {
  const gegen = new RTCPeerConnection({ iceServers: EISDIENSTE });
  let kanal = null;
  let fertig = false;

  /* Die Kennung dieser einen Leitung. Wer anruft, vergibt sie sofort —
     die ersten Wegbeschreibungen entstehen schon während des Angebots,
     und ohne Kennung ließe der Vermittler sie fallen. Wer antwortet,
     hat noch keine: Er übernimmt sie aus dem Angebot (siehe unten). */
  let verbindungsKennung = wirt ? neueVerbindungsKennung() : null;

  /* Wegbeschreibungen, die fertig sind, bevor die Kennung da ist. Beim
     Antwortenden ist das der Normalfall in den ersten Millisekunden.
     Ohne diesen Halt gingen sie ungültig hinaus, der Vermittler
     trennte — und die Leitung käme nie zustande. */
  const wartendeSignale = [];

  function schickeSignal(art, inhalt) {
    if (!verbindungsKennung) { wartendeSignale.push([art, inhalt]); return; }
    sendeSignal(art, verpackeSignal(art, inhalt, verbindungsKennung));
  }

  function holeAufgestaute() {
    for (const [art, inhalt] of wartendeSignale.splice(0)) schickeSignal(art, inhalt);
  }

  /* Angebote, die eintreffen, bevor die Gegenseite beschrieben ist,
     müssen warten — sonst wirft `addIceCandidate`. Das passiert
     regelmäßig, weil Wegbeschreibungen oft schneller sind als das
     Angebot selbst. */
  const wartendeWege = [];

  const frist = setTimeout(() => {
    if (fertig) return;
    beiFehler?.(
      "Es kommt keine Verbindung zustande. Das liegt am Netz, nicht am Spiel — " +
      "manche Anschlüsse lassen keine direkte Verbindung zu. Ein anderes " +
      "Netz oder ein Mobilfunk-Hotspot hilft meistens."
    );
    try { gegen.close(); } catch { /* schon zu */ }
  }, FRIST_MS);

  function nimmKanal(neuer) {
    kanal = neuer;
    kanal.addEventListener("open", () => {
      fertig = true;
      clearTimeout(frist);
      beiOffen?.();
    });
    kanal.addEventListener("message", (e) => beiNachricht?.(e.data));
    kanal.addEventListener("close", () => beiZu?.());
  }

  gegen.addEventListener("icecandidate", (e) => {
    /* Der letzte Ruf hat kein Ziel mehr — er sagt nur „ich bin fertig
       mit Suchen" und wird nicht weitergereicht. */
    if (e.candidate) schickeSignal("CANDIDATE", e.candidate.toJSON());
  });

  gegen.addEventListener("connectionstatechange", () => {
    const stand = gegen.connectionState;
    if (stand === "failed") {
      clearTimeout(frist);
      beiFehler?.(
        "Die Verbindung ist abgerissen und kommt nicht wieder. Das liegt " +
        "meistens am Netz eines der beiden."
      );
    } else if (stand === "disconnected" || stand === "closed") {
      beiZu?.();
    }
  });

  if (wirt) {
    /* Der Wirt legt den Kanal an. Der Gast bekommt ihn zugestellt —
       ein zweiter Kanal von seiner Seite wäre ein zweiter, leerer. */
    nimmKanal(gegen.createDataChannel("spiel", {
      ordered: false,
      maxRetransmits: 0
    }));
  } else {
    gegen.addEventListener("datachannel", (e) => nimmKanal(e.channel));
  }

  async function beginne() {
    if (!wirt) return;
    const angebot = await gegen.createOffer();
    await gegen.setLocalDescription(angebot);
    schickeSignal("OFFER", gegen.localDescription.toJSON());
  }

  /* Ein Angebot vom Gegenüber. Alles hier kann werfen — ein Angebot,
     das zur falschen Zeit kommt, ist normal und darf den Aufbau nicht
     abbrechen. */
  async function nimmSignal(art, nutzlast) {
    /* Die Kennung des Anrufers gilt. Wer antwortet, hat keine eigene —
       er spiegelt sie zurück, sonst gehörten Angebot und Antwort beim
       Vermittler zu zwei verschiedenen Leitungen. */
    if (!wirt && !verbindungsKennung) {
      const fremde = kennungAusSignal(nutzlast);
      if (fremde) { verbindungsKennung = fremde; holeAufgestaute(); }
    }

    const inhalt = entpackeSignal(art, nutzlast);
    if (!inhalt) return;

    try {
      if (art === "OFFER") {
        await gegen.setRemoteDescription(new RTCSessionDescription(inhalt));
        const antwort = await gegen.createAnswer();
        await gegen.setLocalDescription(antwort);
        schickeSignal("ANSWER", gegen.localDescription.toJSON());
        for (const weg of wartendeWege.splice(0)) await gegen.addIceCandidate(weg);
      } else if (art === "ANSWER") {
        await gegen.setRemoteDescription(new RTCSessionDescription(inhalt));
        for (const weg of wartendeWege.splice(0)) await gegen.addIceCandidate(weg);
      } else if (art === "CANDIDATE") {
        if (gegen.remoteDescription) await gegen.addIceCandidate(inhalt);
        else wartendeWege.push(inhalt);
      }
    } catch {
      /* Bewusst still: Ein einzelnes verworfenes Angebot ist im Aufbau
         normal. Bleibt die Leitung aus, meldet sich die Frist. */
    }
  }

  return {
    beginne,
    nimmSignal,
    /* Nach außen nur zum Nachsehen — beim Suchen eines Fehlers ist die
       erste Frage, ob beide Seiten dieselbe Leitung meinen. */
    kennung: () => verbindungsKennung,
    sende(text) {
      if (kanal?.readyState !== "open") return false;
      try { kanal.send(text); return true; } catch { return false; }
    },
    offen: () => kanal?.readyState === "open",
    schliesse() {
      clearTimeout(frist);
      try { kanal?.close(); } catch { /* schon zu */ }
      try { gegen.close(); } catch { /* schon zu */ }
    }
  };
}
