/* [Aufgabe: Bedienung] Das Spiel bietet seine Installation selbst an.

   ── Janniks Ansage, wörtlich ────────────────────────────────────────

   „mach es auch zu einer app die msn aus dem browser installieren kann
   auf Android. vollbild"

   ── Was vorher fehlte, obwohl alles gebaut war ──────────────────────

   Installierbar **war** das Spiel schon (`manifest.webmanifest`,
   `sw.js`, Fassung 0.9.5). Nur: Es hat es nie gesagt. Wer die App
   wollte, musste in Chrome das Drei-Punkte-Menü öffnen und dort „App
   installieren" finden — ein Weg, den außer Jannik niemand geht, und
   nach dem niemand sucht, dem man nicht vorher gesagt hat, dass es ihn
   gibt.

   Genau dafür gibt es `beforeinstallprompt`: Chrome auf Android meldet
   damit „diese Seite erfüllt alle Bedingungen, ich **könnte** sie jetzt
   anbieten". Wer das Ereignis abfängt, darf den Moment selbst
   bestimmen — und ein Knopf im Vorspiel ist der Moment, in dem ohnehin
   jeder hinsieht.

   ── Die eine Regel, ohne die es nicht funktioniert ──────────────────

   **`preventDefault()` sofort, sonst ist das Ereignis verbraucht.**
   Ohne den Aufruf zeigt der Browser seinen eigenen Hinweisbalken und
   verwirft die Zusage; ein späteres `prompt()` läuft dann ins Leere.
   Und `prompt()` selbst verlangt eine **echte Nutzergeste** — dieselbe
   Regel wie beim Vollbild (`runtime/vollbild.js`). Deshalb steht der
   Aufruf im Klick auf den Knopf und nirgends sonst.

   Ein Angebot gilt **einmal**. Nach `prompt()` ist es aufgebraucht,
   egal wie der Spieler sich entscheidet; lehnt er ab, schickt der
   Browser beim nächsten Besuch von selbst ein neues.

   ── Was hier absichtlich nicht passiert ─────────────────────────────

   **Kein Drängen und keine Fehlermeldung.** Wer kein
   `beforeinstallprompt` schickt — Firefox, Safari auf dem iPhone, ein
   Rechner ohne Installationsweg —, bekommt schlicht keinen Knopf zu
   sehen. Ein Knopf, der nichts tut, wäre schlimmer als keiner.

   **Kein eigener Merker im Speicher.** Ob die App installiert ist, weiß
   der Browser besser als wir: Er schickt das Ereignis dann gar nicht
   erst.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/lobby.js` (zeigt den Knopf im Vorspiel),
   `runtime/vollbild.js` (`alsAppGestartet()`),
   `manifest.webmanifest` und `sw.js` (sie machen die Installation
   überhaupt erst möglich), `index.html` (die Gestalt des Knopfs). */

import { alsAppGestartet } from "./vollbild.js";

/* Die aufgehobene Zusage des Browsers. `null`, solange keine da ist —
   und das ist der Normalfall auf allem außer Chrome-artigen Browsern. */
let angebot = null;

/* Wer wissen will, wenn sich das ändert. Die Lobby steht schon auf dem
   Bildschirm, wenn das Ereignis eintrifft: Ohne diese Liste bliebe der
   Knopf bis zum nächsten Bildwechsel verborgen. */
const horcher = new Set();

function sageBescheid() {
  for (const fn of horcher) {
    try { fn(installierbar()); } catch { /* ein Horcher darf den nächsten nicht mitreißen */ }
  }
}

/* Läuft das Spiel schon als App? Dann gibt es nichts zu installieren.
   In Node — also in der Prüfung ohne Attrappe — kennt niemand
   `matchMedia`; dort gilt „kein Vollbildmodus". */
function schonInstalliert() {
  try { return alsAppGestartet(); } catch { return false; }
}

if (typeof addEventListener !== "undefined") {
  addEventListener("beforeinstallprompt", (e) => {
    /* Muss als Erstes kommen — siehe die Regel oben. */
    e.preventDefault();
    angebot = e;
    sageBescheid();
  });

  /* Ist die App installiert, verschwindet der Knopf sofort, ohne dass
     jemand die Seite neu laden muss. */
  addEventListener("appinstalled", () => {
    angebot = null;
    sageBescheid();
  });
}

/* Darf der Knopf zu sehen sein? */
export function installierbar() {
  return angebot !== null && !schonInstalliert();
}

/* Anmelden, um bei jeder Änderung gerufen zu werden. Gibt zurück, womit
   man sich wieder abmeldet — ein Bildschirm, der geht, nimmt seinen
   Horcher mit, sonst wächst die Liste mit jedem Hin und Her. */
export function beiAenderung(fn) {
  horcher.add(fn);
  return () => horcher.delete(fn);
}

/* Den Browser fragen. **Nur aus einem Klick heraus aufrufen.**
   Gibt zurück, was wirklich passiert ist; der Aufrufer darf es
   ignorieren, aber eine Prüfung kann es lesen. */
export async function biteInstallieren() {
  if (!angebot) return "kein Angebot";

  const zusage = angebot;
  /* Vor dem `await` aus der Hand geben: Ein Angebot ist einmalig, und
     ein zweiter Klick während des offenen Dialogs würde sonst ein
     bereits verbrauchtes `prompt()` rufen. */
  angebot = null;
  sageBescheid();

  try {
    await zusage.prompt();
    const wahl = await zusage.userChoice;
    return wahl?.outcome === "accepted" ? "angenommen" : "abgelehnt";
  } catch {
    /* Ein Browser, der die Zusage inzwischen zurückgezogen hat. Kein
       Fehler, den jemand sehen müsste. */
    return "abgelehnt";
  }
}
