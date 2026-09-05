/* [Aufgabe: Regelkern] Aufstieg mitten in der Welle und die Hand voll Karten.

   ── Die Koop-Anpassung, die hier drinsteckt ────────────────────────

   In Brotato hält der Aufstieg das Spiel an; man wählt und es geht
   weiter (Bauteil 6). Zu viert wäre das viermal Warten hintereinander
   — der sichere Weg, den Abend zäh zu machen.

   Deshalb: **Alle wählen gleichzeitig.** Steigt einer auf, hält die
   Welt an; steigt in derselben Sekunde ein zweiter auf, wählen beide
   nebeneinander. Weiter geht es erst, wenn niemand mehr offen hat.
   Der Machtschub mitten in der Welle bleibt, das Warten fällt weg.

   Ein Spieler kann dabei **mehrere** Aufstiege offen haben (wer ein
   großes Beutefeld auf einmal einsammelt, steigt zweimal). Sie werden
   nacheinander abgearbeitet, nicht zusammengefasst — sonst verschenkt
   man eine Wahl.

   ── Was diese Datei nicht mehr tut ─────────────────────────────────

   Vorher standen hier zwei Tabellen (`KARTEN_MENGE`, `GEWICHT`), und
   damit war eine Karte dasselbe wie ein Wert. Beide sind nach
   `spiel/katalog/karten.mjs` gewandert. Hier steht nur noch, **wie**
   gezogen und **wie** angewendet wird.

   ── Drei Karten, nicht vier ────────────────────────────────────────

   Janniks Ansage vom 05.09.2026: „immer 3 zur auswahl". Weniger
   Auswahl ist mehr Entscheidung — bei vier lag fast immer etwas
   dabei, das offensichtlich passte.

   ── Warum `spieler.regeln` und nicht 55 weitere Werte ──────────────

   Eine Meta-Karte ändert eine Regel, keine Zahl („vier Karten statt
   drei"). Als Wert ginge das nicht: Ein Wert wird addiert und
   verrechnet, eine Regel gilt oder gilt nicht. `spieler.regeln` ist
   deshalb ein flaches Objekt aus Marken, und wer eine Regel ausführt,
   **fragt** mit `hatRegel()` danach.

   Das Feld wird hier faul angelegt und nicht in `macheSpieler()` —
   dieselbe Entscheidung wie beim Sprung, dessen Felder
   `spiel/ausweichen.mjs` selbst setzt. Zwei Listen wären zwei
   Wahrheiten, von denen eine irgendwann eine weniger hat.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/katalog/karten.mjs` (was auf den Karten steht),
   `spiel/welt.mjs` (hält an und läuft weiter), `spiel/beute.mjs`
   (liefert das Wissen), `spiel/werte.mjs` (die Werte und die drei
   Kartenregler), `runtime/karten-hand.js` (malt die Hand). */

import {
  WERT_NACH_ID, lebenMax,
  kartenWertFaktor, kartenSeltenheitChance, kartenNeigung
} from "./werte.mjs";
import {
  ziehbareKarten, kartenGruppe, istMeta, seltenheitVon, KARTE_NACH_ID
} from "./katalog/karten.mjs";

/* Wie viel Wissen die nächste Stufe kostet. Wächst überlinear: Sonst
   steigt man in Welle 12 im Sekundentakt auf und das Spiel besteht
   aus Kartenwählen. */
export function schwelle(stufe) {
  return Math.round(4 + stufe * 3 + Math.pow(stufe, 1.6));
}

/* Drei Karten. Mit der Regel `weitsicht` vier — siehe Kopfnotiz. */
export const KARTEN_JE_WAHL = 3;

/* Wie stark `ketzerei` Meta-Karten bevorzugt. Dreimal ist gemessen der
   Punkt, an dem man den Unterschied merkt, ohne dass Wertkarten
   verschwinden (siehe die Ziehstatistik in
   `werkzeuge/pruefe-karten.mjs`). */
export const META_SCHUB = 3;

/* ── Die Regeln eines Spielers ───────────────────────────────────── */

/* Faul angelegt, damit ein Spielstand ohne das Feld nicht bricht. Wer
   `spieler.regeln.x` direkt läse, bekäme bei einem alten Spieler einen
   Absturz statt eines `false` — genau der stille Bruch, gegen den
   `wert()` in `spiel/werte.mjs` gebaut ist. */
export function regelnVon(spieler) {
  if (!spieler.regeln) spieler.regeln = {};
  return spieler.regeln;
}

/* Die eine Frage, die der Rest des Spiels stellt. Als Funktion und
   nicht als Feldzugriff, damit ein vertippter Regelname an **einer**
   Stelle gegen den Katalog gehalten werden kann
   (`werkzeuge/pruefe-karten.mjs`). */
export function hatRegel(spieler, id) {
  return spieler?.regeln?.[id] === true;
}

/* ── Was eine Karte gibt ─────────────────────────────────────────── */

/* Seltenheit **und** `kartenwert` multiplizieren die Grundmenge. Nie
   unter eins: Eine Karte, die nichts gibt, ist ein verschenkter
   Aufstieg und liest sich als Fehler. */
export function mengeVon(karte, werte) {
  if (karte.wirkung.art !== "wert") return 0;
  const roh = karte.wirkung.menge
    * seltenheitVon(karte).wertFaktor
    * kartenWertFaktor(werte);
  return Math.max(1, Math.round(roh));
}

/* Die Zeilen unter dem Titel. `zahl` wird grün gemalt, `text` nicht
   (Janniks Ansage: „ihre werte auf der karte sind dynamisch und
   grünlich hervorgehoben"). Meta-Karten bringen ihre Zeilen aus dem
   Katalog mit, weil sich aus einer Regel keine Zahl ableiten lässt. */
function zeilenVon(karte, menge) {
  if (karte.zeilen) return karte.zeilen.map((z) => ({ ...z }));
  const e = WERT_NACH_ID.get(karte.wirkung.wert);
  /* `flach` ist eine eigene Einheit, alles andere ein Prozentsatz.
     Ohne die Unterscheidung stünde „+12 REICHWEITE" da, wo „+12 %"
     gemeint ist — dieselbe Zahl, eine andere Aussage. */
  const einheit = e && e.form !== "flach" ? " %" : "";
  const name = (e ? e.name : karte.wirkung.wert).toUpperCase().replace(/ %$/, "");
  return [{ zahl: `+${menge}${einheit}`, text: name }];
}

/* Was die Anzeige bekommt: flache Daten, keine Verweise in den
   Katalog. So lässt sich eine Hand später auch über die Leitung
   schicken oder in einen Spielstand schreiben. */
function macheKarte(vorlage, werte) {
  const s = seltenheitVon(vorlage);
  const menge = mengeVon(vorlage, werte);
  return {
    id: vorlage.id,
    titel: vorlage.titel,
    text: vorlage.text,
    seltenheit: s.id,
    seltenheitName: s.name,
    stufe: s.stufe,
    farbe: s.farbe,
    gruppe: kartenGruppe(vorlage),
    meta: istMeta(vorlage),
    /* `wert` und `menge` bleiben für Prüfstand und Kunstspieler
       lesbar — `werkzeuge/balance.mjs` gewichtet danach. */
    wert: vorlage.wirkung.art === "wert" ? vorlage.wirkung.wert : null,
    menge,
    regel: vorlage.wirkung.art === "regel" ? vorlage.wirkung.regel : null,
    zeilen: zeilenVon(vorlage, menge)
  };
}

/* ── Ziehen ──────────────────────────────────────────────────────── */

/* Das Gewicht einer Karte. Drei Hebel greifen hier, und alle drei sind
   Werte aus Phase 12, die vorher **nichts** messen konnten:

   | Wert | wirkt auf |
   | --- | --- |
   | `kartenseltenheit` | je Stufe verschieden stark (`seltenheitsSchub`) |
   | `neigung_<gruppe>` | alle Karten einer Gruppe |
   | — | `ketzerei` hebt Meta-Karten, das ist eine Regel, kein Wert |

   Der Seltenheitsschub muss **je Stufe verschieden** sein. Ein
   gemeinsamer Faktor kürzte sich aus jeder Verhältnisrechnung wieder
   heraus und täte messbar gar nichts. */
function gewichtVon(vorlage, werte, regeln) {
  const s = seltenheitVon(vorlage);
  let g = s.gewicht * (1 + kartenSeltenheitChance(werte) * s.seltenheitsSchub);
  g *= kartenNeigung(werte, kartenGruppe(vorlage));
  if (regeln.ketzerei && istMeta(vorlage)) g *= META_SCHUB;
  return g;
}

/* Gewichtet ziehen, ohne Zurücklegen. **Genau ein** Griff in den
   Zufallsstrom je Karte.

   Vorher lief das über Verwerfen: Ein Topf aus wiederholten Einträgen,
   daraus blind greifen, Doppelte wegwerfen und noch einmal. Das kostet
   je Hand eine unbekannte Zahl von Griffen — und damit hängt jede
   spätere Ziehung im Lauf daran, wie oft zufällig ein Doppel kam. Für
   Netz-Koop ist das kein Problem (alle rechnen dasselbe), für das
   Nachstellen eines Fehlers schon. */
function ziehEine(zufall, kandidaten, werte, regeln) {
  let summe = 0;
  for (const k of kandidaten) summe += gewichtVon(k, werte, regeln);
  if (summe <= 0) return kandidaten[0];
  let r = zufall.zahl() * summe;
  for (const k of kandidaten) {
    r -= gewichtVon(k, werte, regeln);
    if (r <= 0) return k;
  }
  return kandidaten[kandidaten.length - 1];
}

/* Verschiedene Karten. „Verschieden" heißt hier **verschiedener
   Wert**, nicht nur verschiedene Karte: „Zähes Fleisch" und „Herz aus
   Stein" geben beide Leben, und nebeneinander wäre das eine Wahl, die
   keine ist — die grössere Zahl gewinnt immer. */
export function ziehKarten(zufall, spieler) {
  const werte = spieler.werte;
  const regeln = regelnVon(spieler);
  const anzahl = KARTEN_JE_WAHL + (regeln.weitsicht ? 1 : 0);

  const gemieden = regeln.gedaechtnis && Array.isArray(spieler.abgelehnt)
    ? new Set(spieler.abgelehnt)
    : null;

  let vorrat = ziehbareKarten().filter((k) => !gemieden || !gemieden.has(k.id));
  /* Das Gedächtnis darf den Vorrat nicht leerräumen. Bleiben zu wenige
     übrig, gilt es für diese eine Hand nicht — lieber eine Wiederholung
     als eine leere Hand. */
  if (vorrat.length < anzahl) vorrat = ziehbareKarten();

  const karten = [];
  const belegteWerte = new Set();
  const genommeneIds = new Set();

  /* `nachhall`: Die zuletzt genommene Karte liegt wieder da. Sie wird
     **vor** dem Ziehen gesetzt, sonst könnte sie der Zufall verdrängen
     und die Regel wäre manchmal wirkungslos. */
  if (regeln.nachhall && spieler.letzteKarte) {
    const v = KARTE_NACH_ID.get(spieler.letzteKarte);
    if (v && v.gebaut !== false) {
      karten.push(macheKarte(v, werte));
      genommeneIds.add(v.id);
      if (v.wirkung.art === "wert") belegteWerte.add(v.wirkung.wert);
    }
  }

  while (karten.length < anzahl) {
    const kandidaten = vorrat.filter((k) =>
      !genommeneIds.has(k.id)
      && !(k.wirkung.art === "wert" && belegteWerte.has(k.wirkung.wert)));
    if (kandidaten.length === 0) break;
    const gewaehlt = ziehEine(zufall, kandidaten, werte, regeln);
    karten.push(macheKarte(gewaehlt, werte));
    genommeneIds.add(gewaehlt.id);
    if (gewaehlt.wirkung.art === "wert") belegteWerte.add(gewaehlt.wirkung.wert);
  }

  return karten;
}

/* ── Aufstieg ────────────────────────────────────────────────────── */

/* Prüft alle Spieler auf fällige Aufstiege. Gibt zurück, ob die Welt
   deswegen anhalten muss. */
export function pruefeAufstieg(welt) {
  let anhalten = false;
  for (const s of welt.spieler) {
    while (s.wissen >= schwelle(s.stufe)) {
      s.wissen -= schwelle(s.stufe);
      s.stufe++;
      s.offeneWahlen++;
    }
    if (s.offeneWahlen > 0) {
      if (!s.karten) s.karten = ziehKarten(welt.zufall, s);
      anhalten = true;
    }
  }
  return anhalten;
}

/* Wie viel Leben `blutzoll` einem Gegner nimmt. Ein Fünftel — und nie
   den letzten Punkt: Ein Gegner, der hier auf null fiele, wäre nicht
   tot, sondern ein Untoter. Der Tod läuft über `toete()` in
   `spiel/kampf.mjs` (Beute, Funken, Zählung), und den von hier aus
   aufzurufen hiesse, den Kampf in den Aufstieg zu holen. */
const BLUTZOLL_ANTEIL = 0.2;

/* Eine Karte annehmen. Liegt danach noch ein Aufstieg an, werden
   sofort neue Karten gezogen. */
export function nimmKarte(welt, spieler, index) {
  if (!spieler.karten || spieler.offeneWahlen <= 0) return false;
  const karte = spieler.karten[index];
  if (!karte) return false;
  const regeln = regelnVon(spieler);

  if (karte.wert) {
    spieler.werte[karte.wert] += karte.menge;
    /* Mehr Leben heilt auch — sonst wäre die Lebenskarte mitten in einer
       Welle wertlos, genau wenn man sie braucht. */
    if (karte.wert === "leben") {
      spieler.lebenMax = lebenMax(spieler.werte);
      spieler.leben += karte.menge;
    }
  } else if (karte.regel) {
    regeln[karte.regel] = true;
  }

  /* `gedaechtnis`: Was liegen blieb, bleibt liegen. Erst **nach** der
     Anwendung gemerkt, damit die Regel schon für ihre eigene Hand
     gilt, wenn man sie gerade genommen hat. */
  if (regeln.gedaechtnis) {
    if (!Array.isArray(spieler.abgelehnt)) spieler.abgelehnt = [];
    for (const k of spieler.karten) if (k !== karte) spieler.abgelehnt.push(k.id);
  }
  if (regeln.nachhall) spieler.letzteKarte = karte.id;

  /* `aderlass`: Jeder Aufstieg macht dich wieder ganz. Nach der
     Wertanwendung, damit ein frisch gewachsenes Lebensmaximum
     mitzählt. */
  if (regeln.aderlass) spieler.leben = spieler.lebenMax;

  /* `blutzoll`: Der Kreis nimmt sich seinen Anteil. */
  if (regeln.blutzoll) {
    for (const g of welt.gegner) {
      if (g.tot) continue;
      g.leben = Math.max(1, g.leben - g.leben * BLUTZOLL_ANTEIL);
    }
  }

  spieler.offeneWahlen--;
  spieler.karten = spieler.offeneWahlen > 0
    ? ziehKarten(welt.zufall, spieler)
    : null;
  return true;
}

export function alleGewaehlt(welt) {
  return welt.spieler.every((s) => s.offeneWahlen === 0);
}
