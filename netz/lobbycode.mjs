/* [Aufgabe: Koop] Der Lobbycode — sechs Zeichen, die man vorlesen kann.

   ── Warum nicht einfach sechs zufällige Zeichen ─────────────────────

   Der Code wird **vorgelesen**, nicht kopiert: „ich mach auf, der Code
   ist …" über Sprache, Telefon oder quer durchs Zimmer. Damit ist die
   Verwechslungsgefahr der eigentliche Entwurfsgrund, nicht die
   Zufälligkeit.

   Deshalb fehlen im Vorrat **0 und O** sowie **1, I und L**. Das ist
   keine Vorsicht, sondern Rechnung: Wer eine Null hört und ein O tippt,
   landet in einer Lobby, die es nicht gibt — und die Meldung wäre
   „nicht gefunden", also genau die Meldung, die auch bei einem echten
   Tippfehler kommt. Fehlen beide Zeichen ganz, kann diese Verwechslung
   nicht entstehen.

   Übrig bleiben **31** Zeichen. Bei sechs Stellen sind das
   31^6 = 887.503.681 Möglichkeiten. Für eine Handvoll Freunde, die
   gleichzeitig spielen, ist die Wahrscheinlichkeit einer Kollision
   damit nicht der Rede wert — und ein längerer Code wäre schwerer
   vorzulesen, was der teurere Fehler wäre.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/broker.mjs` (macht aus dem Code die Kennung `wsc-<CODE>`),
   `runtime/lobby.js` (zeigt ihn an und nimmt ihn entgegen). */

/* Ohne 0, O, 1, I, L — siehe oben. */
export const VORRAT = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const LAENGE = 6;

/* Ein neuer Code. Nimmt `crypto.getRandomValues`, wo es das gibt: Die
   Codes sollen sich nicht vorhersagen lassen, sonst könnte jemand in
   eine fremde Runde platzen. `Math.random` ist nur der Rückfall für
   Umgebungen ohne Krypto — und ausdrücklich **nicht** der Zufall des
   Spiels: Der Lobbycode gehört nicht zur Simulation und darf deshalb
   auch nicht aus deren gesätem Strom kommen (docs/SPIEL.md 8). */
export function neuerLobbyCode(zufallsQuelle) {
  const zahlen = new Uint32Array(LAENGE);
  if (zufallsQuelle) for (let i = 0; i < LAENGE; i++) zahlen[i] = zufallsQuelle(i);
  else if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(zahlen);
  else for (let i = 0; i < LAENGE; i++) zahlen[i] = Math.floor(Math.random() * 0xffffffff);

  let code = "";
  for (let i = 0; i < LAENGE; i++) code += VORRAT[zahlen[i] % VORRAT.length];
  return code;
}

/* Was jemand tippt, in die Form bringen, in der es vergleichbar ist:
   Kleinbuchstaben hoch, Leerzeichen und Bindestriche weg. Menschen
   schreiben „ab cd-ef", und das soll dieselbe Lobby treffen wie
   „ABCDEF". */
export function raeumeCode(eingabe) {
  return String(eingabe ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/* Ob ein aufgeräumter Code gültig ist. Gibt den Grund mit zurück,
   damit die Oberfläche nicht raten muss, was sie hinschreibt — „zu
   kurz" und „enthält ein Zeichen, das es hier nicht gibt" sind für den
   Tippenden zwei verschiedene Auskünfte. */
export function pruefeCode(eingabe) {
  const code = raeumeCode(eingabe);
  if (code.length === 0) return { gut: false, code, grund: "Kein Code eingegeben." };
  if (code.length !== LAENGE)
    return { gut: false, code, grund: `Ein Code hat ${LAENGE} Zeichen, dieser hat ${code.length}.` };
  for (const zeichen of code)
    if (!VORRAT.includes(zeichen))
      return {
        gut: false, code,
        grund: `Das Zeichen „${zeichen}" kommt in keinem Code vor. In Codes gibt es keine 0, O, 1, I und L.`
      };
  return { gut: true, code, grund: "" };
}

/* Die Kennung, unter der sich der Wirt beim Vermittler meldet. Das
   Vorwort trennt uns von allen anderen, die denselben öffentlichen
   Vermittler benutzen — ohne es wäre „ABCDEF" eine Kennung, die
   irgendein fremdes Programm längst belegt haben könnte. */
export function kennungFuer(code) {
  return `wsc-${raeumeCode(code)}`;
}
