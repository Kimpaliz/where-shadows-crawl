/* [Aufgabe: Bedienung] Vollbild und Querformat, sobald das Spiel beginnt.

   ── Janniks Ansage, wörtlich ────────────────────────────────────────

   „wenn ich dies spiel aus dem browser im handy installiere dann mus
   die webbrowser leiste komplett weg. und es muss von anfang an voll
   bild horizontal fix sein."

   ── Warum das zwei verschiedene Wege sind ──────────────────────────

   **In der installierten App** erledigt das Manifest alles:
   `display: fullscreen` lässt keine Adressleiste zu,
   `orientation: landscape` legt die Lage fest. Da ist nichts zu tun.

   **Im gewöhnlichen Browser-Tab** wirkt beides **nicht**. Die
   Adressleiste bleibt, und die Lage folgt dem Telefon. Vollbild gibt es
   dort ausschließlich über `requestFullscreen()`, und das verlangt eine
   **echte Nutzergeste** — ein Aufruf beim Laden wird abgelehnt.

   Deshalb hängt es hier am **Spielstart**: Wer „Allein spielen" oder
   „Lobby aufmachen" drückt, hat gerade die Geste gemacht, die der
   Browser verlangt. Ein eigener Vollbildknopf wäre ein zweiter Knopf
   für etwas, das man ohnehin in dem Moment will.

   ── Was hier absichtlich nicht passiert ────────────────────────────

   **Kein Zwang und keine Fehlermeldung.** Safari auf dem iPhone kann
   `requestFullscreen` bis heute nicht, und `orientation.lock` gibt es
   dort ebenfalls nicht. Beides scheitert still und das Spiel läuft
   weiter — es sähe sonst so aus, als wäre etwas kaputt, obwohl nur ein
   Browser nicht mitmacht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `manifest.webmanifest` (der Weg für die installierte App),
   `runtime/start.js` (ruft `gehInsVollbild()` beim Spielstart),
   `index.html` (`#querhinweis`, wenn es hochkant bleibt). */

/* Läuft das Spiel als installierte App? Dann ist alles schon geregelt,
   und ein `requestFullscreen` obendrauf wäre bestenfalls wirkungslos. */
export function alsAppGestartet() {
  return matchMedia("(display-mode: fullscreen)").matches
    || matchMedia("(display-mode: standalone)").matches
    /* Der Weg, den Safari als einziger kennt. */
    || navigator.standalone === true;
}

/* Beim Spielstart aufgerufen — im selben Zug wie der Knopfdruck, sonst
   lehnt der Browser ab. Gibt zurück, was wirklich passiert ist; der
   Aufrufer darf es ignorieren, aber eine Prüfung kann es lesen. */
export async function gehInsVollbild() {
  const bericht = { alsApp: alsAppGestartet(), vollbild: null, lage: null };

  if (!bericht.alsApp && document.fullscreenElement === null) {
    try {
      /* Auf dem Wurzelelement, nicht auf der Leinwand: Der Daumen-Stick
         und der Ausweichknopf liegen **neben** der Leinwand im DOM.
         Wer nur die Leinwand ins Vollbild schickt, verliert genau die
         Bedienung, um die es hier geht. */
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      bericht.vollbild = "an";
    } catch {
      /* Safari auf dem iPhone kann es nicht, und manche Browser lehnen
         ab, wenn die Geste zu alt ist. Beides ist kein Fehler. */
      bericht.vollbild = "abgelehnt";
    }
  } else {
    bericht.vollbild = bericht.alsApp ? "durch die App" : "schon an";
  }

  /* Querformat festnageln. Geht nur im Vollbild oder in der
     installierten App — außerhalb wirft es, und das ist in Ordnung. */
  try {
    await screen.orientation.lock("landscape");
    bericht.lage = "quer festgelegt";
  } catch {
    bericht.lage = "nicht möglich";
  }
  return bericht;
}
