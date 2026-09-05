/* [Aufgabe: Koop] Die Hülle, in der ein Angebot beim Vermittler ankommt.

   ── Der Fehler, den dieses Modul verhindert ─────────────────────────

   Der öffentliche PeerJS-Vermittler reicht ein Angebot **nur dann**
   weiter, wenn es aussieht wie das einer echten PeerJS-Gegenstelle.
   Passt die Form nicht, schickt er keine Fehlermeldung — er schließt
   die Verbindung des Absenders mit Code **1000**. Und 1000 heißt in
   WebSocket-Sprache „normal geschlossen": Es sieht aus wie ein
   ordentliches Auflegen, nicht wie eine Ablehnung.

   Genau daran ist die erste Diagnose gescheitert. `verbindung.mjs`
   schickte, was der Browser liefert:

       gegen.localDescription.toJSON()   →   { type, sdp }

   Das ist die Beschreibung selbst — aber nicht die **Hülle**, in der
   der Vermittler sie erwartet. Der Absender wurde getrennt, beim
   Empfänger kam nichts an, und weil ein Code 1000 wie ein normales
   Auflegen aussieht, meldete niemand einen Fehler. Der Gast stand vor
   „Suche die Lobby …", bis seine Frist ablief.

   ── Was gemessen wurde (05.09.2026, gegen den echten Dienst) ────────

   Vier Runden mit nackten WebSockets, ohne eine Zeile Spielcode: je
   zwei frische Anmeldungen, eine Nachricht, dann zuhören. Jeder Fall
   mindestens zweimal, die Runden verzahnt — sonst könnte Schwanken des
   Dienstes ein Muster vortäuschen.

   | Art       | verlangt wird                                      |
   | --------- | -------------------------------------------------- |
   | OFFER     | `sdp`, `type`, `connectionId`, `label`, `serialization` |
   | ANSWER    | `sdp`, `type`, `connectionId`                      |
   | CANDIDATE | `candidate`, `type`, `connectionId`                |

   **OFFER ist die strengste Art**, und das ist der Grund, warum die
   Sache so schwer zu finden war: Wer nur eine Antwort oder eine
   Wegbeschreibung prüft, hält die schmale Form für ausreichend.
   Entbehrlich sind gemessen `reliable` und `browser`; ohne `label`
   oder ohne `serialization` fiel das Angebot in **allen** drei Läufen
   durch, ohne `connectionId` ebenfalls.

   Geschickt wird trotzdem die **volle** Hülle, für alle drei Arten
   dieselbe. Zwei Gründe: Sie ist genau das, was eine echte
   PeerJS-Gegenstelle sendet und kam in jedem einzelnen Lauf durch —
   und eine Form für alle drei Arten ist eine Stelle, an der man sich
   irren kann, statt dreier. Der Vermittler ist ein fremder Dienst; an
   der Stelle sparsam zu sein bringt nichts und kann kippen.

   ⚠️ Gemessen ist, dass die Felder **da sein** müssen — nicht, dass
   ihr Wert eine Rolle spielt. Deshalb stehen hier die Werte, die
   nachweislich durchkamen, und keine selbst ausgedachten.

   ── Streng beim Senden, nachsichtig beim Empfangen ──────────────────

   `entpackeSignal` nimmt auch die nackte Form an. Das ist kein
   Aufweichen: Beim Senden bestimmt die Form, ob die Nachricht
   überhaupt ankommt — beim Empfangen wäre eine Ablehnung nur eine
   zweite Art zu scheitern.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/verbindung.mjs` (packt ein und aus), `netz/broker.mjs`
   (schickt die Hülle als `payload`), `werkzeuge/pruefe-netz.mjs`
   (prüft den Umlauf ohne Browser und ohne Netz). */

/* Der Vermittler unterscheidet Daten- von Medienverbindungen. Wir
   führen ausschließlich einen Datenkanal. */
const VERBINDUNGSART = "data";

/* Nur die Anwesenheit dieses Feldes ist gemessen, nicht sein Wert —
   deshalb der Wert, der nachweislich durchkam. */
const SERIALISIERUNG = "binary";

/* Unser Datenkanal ist bewusst unzuverlässig (`maxRetransmits: 0`,
   siehe `netz/verbindung.mjs`). Der Vermittler braucht das Feld nicht;
   es steht hier, weil es die Wahrheit über den Kanal sagt. */
const ZUVERLAESSIG = false;

/* Eine Kennung für **eine** Leitung.

   Sie muss auf beiden Seiten dieselbe sein und sich von jeder anderen
   Leitung unterscheiden: Der Wirt hält bis zu drei Gäste gleichzeitig,
   und zwei Leitungen mit derselben Kennung wären für den Vermittler
   dieselbe.

   `Math.random` ist hier ausdrücklich erlaubt und anderswo verboten.
   Der gesäte Strom aus `spiel/zufall.mjs` gehört der **Simulation**:
   Zwei Rechner müssen daraus dieselben Zahlen ziehen, sonst laufen die
   Welten auseinander. Eine Verbindungskennung ist das Gegenteil davon
   — sie soll auf jedem Rechner **verschieden** sein. Käme sie aus dem
   gesäten Strom, bekämen zwei Gäste derselben Runde dieselbe Kennung,
   und der Strom stünde obendrein nicht mehr im Gleichschritt. */
export function neueVerbindungsKennung() {
  return "dc_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4);
}

/* Ein Angebot in die Hülle, die der Vermittler durchlässt.

   `art` ist "OFFER", "ANSWER" oder "CANDIDATE"; `inhalt` das, was der
   Browser geliefert hat (`localDescription.toJSON()` beziehungsweise
   `candidate.toJSON()`). */
export function verpackeSignal(art, inhalt, verbindungsKennung) {
  const huelle = {
    type: VERBINDUNGSART,
    connectionId: verbindungsKennung,
    label: verbindungsKennung,
    reliable: ZUVERLAESSIG,
    serialization: SERIALISIERUNG,
    browser: "chrome"
  };
  if (art === "CANDIDATE") huelle.candidate = inhalt;
  else huelle.sdp = inhalt;
  return huelle;
}

/* Und wieder heraus. Gibt `null`, wenn nichts Brauchbares drinsteht —
   eine kaputte Nachricht von außen darf den Aufbau nicht abreißen. */
export function entpackeSignal(art, nutzlast) {
  if (!nutzlast || typeof nutzlast !== "object") return null;

  if (art === "CANDIDATE") {
    /* Volle Hülle, sonst die nackte Form (die trägt `candidate` als
       Zeichenkette, nicht als Objekt). */
    if (nutzlast.candidate && typeof nutzlast.candidate === "object") return nutzlast.candidate;
    return typeof nutzlast.candidate === "string" ? nutzlast : null;
  }

  if (nutzlast.sdp && typeof nutzlast.sdp === "object") return nutzlast.sdp;
  /* Die nackte Form: `{ type: "offer"|"answer", sdp: "v=0…" }`. */
  return typeof nutzlast.sdp === "string" ? nutzlast : null;
}

/* Die Kennung aus einem eingegangenen Angebot — der Antwortende
   spiegelt sie zurück, statt eine eigene zu erfinden. Täte er das,
   sähe der Vermittler zwei verschiedene Leitungen, und die Antwort
   gehörte zu keinem Angebot. */
export function kennungAusSignal(nutzlast) {
  const k = nutzlast?.connectionId;
  return typeof k === "string" && k.length > 0 ? k : null;
}
