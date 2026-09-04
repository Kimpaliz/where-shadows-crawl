/* [Aufgabe: Regelkern] Ein Lauf: zwölf Wellen, dazwischen der Krämer.

   Diese Datei ist die **einzige**, die den Ablauf kennt. `welt.mjs`
   rechnet eine Welle, `laden.mjs` verkauft — was wann drankommt, steht
   hier. Der Grund ist der Balancelauf: Er will einen ganzen Lauf
   durchspielen, ohne einen Bildschirm zu kennen, und braucht dafür
   genau diese eine Schnittstelle.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/welt.mjs`, `spiel/laden.mjs`, `spiel/katalog/wellen.mjs`.
   `werkzeuge/balance.mjs` und `runtime/start.js` benutzen beide nur
   diese Datei — der Prüfstand und das Spiel laufen dadurch garantiert
   denselben Ablauf. */

import { macheWelt, starteWelle, schritt, pruefeWeiter, SCHRITT } from "./welt.mjs";
import { oeffneLaden } from "./laden.mjs";
import { WELLEN_JE_LAUF } from "./katalog/wellen.mjs";

export { SCHRITT, WELLEN_JE_LAUF };

export function starteLauf({ spielerzahl = 1, saat = 1, modusId } = {}) {
  const welt = macheWelt({ spielerzahl, saat, modusId });
  welt.phase = "vorspiel";
  return welt;
}

/* Aus dem Vorspiel oder aus dem Laden in die nächste Welle. */
export function naechsteWelle(welt) {
  if (welt.phase !== "laden" && welt.phase !== "vorspiel") return false;
  starteWelle(welt, welt.welle + 1);
  return true;
}

/* Nach einer Welle den Laden öffnen. Getrennt von `beendeWelle`, weil
   die Welle auch auf einem Bildschirm enden kann, auf dem gerade eine
   Siegmeldung steht — der Laden gehört an den Anfang der Pause und
   nicht ans Ende des Kampfes. */
export function oeffneKraemer(welt) {
  if (welt.phase !== "laden") return false;
  oeffneLaden(welt, welt.welle + 1);
  return true;
}

/* Ein Schritt der Welt, mit der Wahl-Pause. Der Bildschirm ruft das je
   Bild so oft, wie Zeit vergangen ist; der Prüfstand ruft es in einer
   Schleife. Beide bekommen dieselbe Welt. */
export function schrittImLauf(welt, eingaben) {
  if (welt.phase === "wahl") return pruefeWeiter(welt);
  return schritt(welt, eingaben);
}

/* Ob der Lauf vorbei ist — gewonnen oder verloren. */
export function vorbei(welt) {
  return welt.phase === "gewonnen" || welt.phase === "verloren";
}
