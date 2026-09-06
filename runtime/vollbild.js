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

/* Läuft das Spiel als installierte App? Dann ist die Adressleiste schon
   weg — genau Janniks Wortlaut. */
export function alsAppGestartet() {
  return randlosGestartet()
    || matchMedia("(display-mode: standalone)").matches
    /* Der Weg, den Safari als einziger kennt. */
    || navigator.standalone === true;
}

/* Und läuft sie wirklich **randlos**? Das ist nicht dasselbe.

   Das Manifest bittet mit `display_override` zuerst um `fullscreen` und
   nimmt `standalone` als Rückfall. Landet die App im Rückfall — ein
   anderer Browser, ein älterer Starter —, ist zwar die Adressleiste
   weg, aber die Statusleiste mit Uhr und Akku bleibt oben stehen.
   Vorher galt beides als „schon geregelt", und dann versuchte niemand
   mehr etwas dagegen. */
export function randlosGestartet() {
  return matchMedia("(display-mode: fullscreen)").matches;
}

/* Wie lange auf das Vollbild gewartet wird, bevor das Querformat
   trotzdem versucht wird.

   ⚠️ **Gemessen am 05.09.2026, und der Grund für diese ganze
   Konstruktion:** `requestFullscreen()` löst sein Versprechen nicht
   immer auf. Ohne Nutzergeste lehnt es in **0 ms** ab — mit Geste, aber
   von einer Richtlinie gesperrt, **hängt es** (nach 2.503 ms noch kein
   Ergebnis, im eingebetteten Browser dieser Werkstatt). Ein `await`
   davor bleibt dann für immer stehen, und die Zeile darunter läuft nie.

   Genau das hat hier die halbe Ansage verschluckt: Das Vollbild war
   „in Arbeit", und das **Querformat wurde nie festgelegt** — ohne
   Fehlermeldung, ohne dass irgendetwas rot wird. Ein echtes Vollbild
   ist ein Layoutvorgang von wenigen Bildern; 1200 ms sind großzügig
   und trotzdem kein spürbares Warten. */
const VOLLBILD_FRIST = 1200;

/* Das Querformat festnageln. Geht **nur** im Vollbild oder in der
   installierten App — außerhalb wirft es, und das ist in Ordnung.
   Deshalb steht der Aufruf an zwei Stellen: einmal gleich (falls das
   Vollbild schnell da war) und einmal, sobald der Browser den Wechsel
   wirklich meldet. */
async function legeQuerFest() {
  try {
    await screen.orientation.lock("landscape");
    return "quer festgelegt";
  } catch {
    return "nicht möglich";
  }
}

/* Der zweite Anlauf. Kommt das Vollbild später als die Frist — oder
   geht der Spieler von Hand hinein —, ist **hier** der Moment, in dem
   das Querformat erlaubt ist. Ohne diesen Horcher wäre die Frist oben
   eine Wette darauf, dass der Browser schnell genug ist. */
if (typeof document !== "undefined") {
  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement) legeQuerFest();
  });
}

/* Beim Spielstart aufgerufen — im selben Zug wie der Knopfdruck, sonst
   lehnt der Browser ab. Gibt zurück, was wirklich passiert ist; der
   Aufrufer darf es ignorieren, aber eine Prüfung kann es lesen. */
export async function gehInsVollbild() {
  /* ⚠️ Gefragt wird nach **randlos**, nicht nach „als App gestartet".
     Wer im Rückfall `standalone` läuft, hat die Adressleiste los, aber
     nicht die Statusleiste — dort ist ein `requestFullscreen` an der
     Geste genau richtig und kostet nichts, wenn der Browser ohnehin
     schon randlos zeigt. */
  const bericht = { alsApp: randlosGestartet(), vollbild: null, lage: null };

  if (!bericht.alsApp && document.fullscreenElement === null) {
    /* Auf dem Wurzelelement, nicht auf der Leinwand: Der Daumen-Stick
       und der Ausweichknopf liegen **neben** der Leinwand im DOM. Wer
       nur die Leinwand ins Vollbild schickt, verliert genau die
       Bedienung, um die es hier geht. */
    let ausgang = "haengt";
    const anfrage = (async () => {
      try {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
        ausgang = "an";
      } catch {
        /* Safari auf dem iPhone kann es nicht, und manche Browser
           lehnen ab, wenn die Geste zu alt ist. Beides ist kein
           Fehler. */
        ausgang = "abgelehnt";
      }
    })();

    /* Nicht `await anfrage`, sondern ein Wettlauf gegen die Frist —
       siehe die Messung an `VOLLBILD_FRIST`. Das Versprechen läuft
       weiter; wird es später erfüllt, holt der Horcher oben das
       Querformat nach. */
    await Promise.race([anfrage, new Promise((r) => setTimeout(r, VOLLBILD_FRIST))]);
    bericht.vollbild = ausgang;
  } else {
    bericht.vollbild = bericht.alsApp ? "durch die App" : "schon an";
  }

  bericht.lage = await legeQuerFest();
  return bericht;
}

/* Wie lange nach einem Anlauf nicht wieder gefragt wird. Ohne diese
   Sperre stellte jede Berührung des Daumen-Sticks eine neue Anfrage —
   sechzigmal in der Sekunde, während man ausweicht. */
const NACHHOL_SPERRE = 3000;
let zuletztVersucht = -Infinity;

/* Der Nachzügler an der Berührung.

   ── Zwei Fälle, die ohne ihn verloren gehen ────────────────────────

   **1 · Der Gast bekommt nie ein Vollbild.** `gehInsVollbild()` hängt
   am Spielstart, und das trägt für „ALLEIN SPIELEN" und für das
   „ANFANGEN" des Wirts — beides sind Klicks. Beim **Gast** kommt der
   Start aus einer Netznachricht (`netz/sitzung.mjs`), also aus keiner
   Geste: Sein letzter Klick war „BEITRETEN", und dann hat er im
   Warteraum gewartet. Chrome gibt einer Geste rund fünf Sekunden; die
   war längst abgelaufen. Er spielte die ganze Nacht mit Adressleiste
   und in der Lage, in der er das Telefon gerade hielt.

   **2 · Wer aus dem Vollbild fällt, kommt nicht zurück.** Ein
   versehentlicher Wisch vom Rand — die Zurück-Geste von Android —
   beendet das Vollbild. Der `fullscreenchange`-Horcher oben prüft
   `if (document.fullscreenElement)` und tut beim **Verlassen** nichts.
   Adressleiste zurück, Lagensperre weg, und mitten in der Welle legt
   sich „BITTE QUER HALTEN" über das Bild.

   Beide Male ist die nächste Berührung des Daumen-Sticks eine echte
   Nutzergeste — und damit der Moment, in dem der Browser es erlaubt.
   Deshalb hängt es dort und braucht keinen zusätzlichen Knopf im Bild.

   ⚠️ Absichtlich **ohne `await`** aufgerufen: Es darf die Eingabe
   nicht um ein einziges Bild aufhalten. */
export function vollbildNachholen(jetzt) {
  if (randlosGestartet()) return "schon randlos";
  if (document.fullscreenElement) return "schon an";
  if (jetzt - zuletztVersucht < NACHHOL_SPERRE) return "zu früh";
  zuletztVersucht = jetzt;
  gehInsVollbild();
  return "versucht";
}
