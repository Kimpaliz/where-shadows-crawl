/* [Aufgabe: Katalog] Die Aufstiegskarten — Daten, kein Verhalten.

   ── Warum es diesen Katalog gibt ───────────────────────────────────

   Vorher entstand eine Karte in `spiel/stufen.mjs` aus zwei Tabellen:
   `KARTEN_MENGE` sagte, wie viel ein Wert gibt, `GEWICHT`, wie oft er
   kommt. Damit war eine Karte **dasselbe wie ein Wert**. Zwei Karten
   auf Leben mit verschiedenen Namen, verschiedenen Zahlen und
   verschiedener Seltenheit waren nicht möglich, und eine Karte, die
   gar keinen Wert gibt, erst recht nicht.

   Jetzt ist eine Karte ein Eintrag. Eine neue Karte ist eine Zeile
   hier und keine Zeile Programm — das ist das Fertig-Kriterium von
   Schritt 13.1.

   ⚠️ **Die stille Falle, gemessen am 05.09.2026:** Vorher waren nur
   **8** der 55 Werte überhaupt ziehbar, und niemand sah das. Der Topf
   entstand mit `for (const w of WERTE) for (let i = 0; i < GEWICHT[w]; i++)`
   — und `0 < undefined` ist `false`. Die 47 Werte ohne Eintrag in
   `GEWICHT` fielen still aus dem Spiel. Kein Fehler, keine Meldung,
   keine rote Prüfung. Deshalb prüft `werkzeuge/pruefe-karten.mjs`
   heute nach, dass jeder Wert, den eine Karte nennt, wirklich
   existiert — und zählt, wie viele Werte über Karten erreichbar sind.

   ── Die vier Seltenheiten ──────────────────────────────────────────

   Sie tun **zwei** Dinge, und beide stehen in derselben Zeile:

   1. `gewicht` — wie oft die Stufe überhaupt angeboten wird.
   2. `wertFaktor` — womit die Zahl auf der Karte malgenommen wird.

   Deshalb trägt eine Wertkarte ihre Menge **immer als Gemein-Menge**.
   „Zähes Fleisch" (gemein, 10) gibt 10 Leben, „Herz aus Stein"
   (verflucht, dieselbe Zahl 14 als Grundlage) gibt 56. Stünde auf
   jeder Karte die fertige Zahl, wäre die Seltenheit bloß ein Etikett
   und keine Regel — und zwei Karten derselben Stufe könnten
   unbemerkt weit auseinanderliegen.

   `seltenheitsSchub` ist der zweite Hebel: Der Wert
   `kartenseltenheit` verschiebt die Ziehchance, und zwar je Stufe
   verschieden stark. Bei 100 wird „verflucht" zehnmal so
   wahrscheinlich, „gemein" gar nicht. Ein einziger gemeinsamer
   Faktor täte nichts — er kürzte sich aus jeder Verhältnisrechnung
   wieder heraus.

   ── Wert- und Meta-Karten ──────────────────────────────────────────

   | `wirkung.art` | ändert | Beispiel |
   | --- | --- | --- |
   | `wert` | eine Zahl im Werteobjekt | +10 Leben |
   | `regel` | ein Feld unter `spieler.regeln` | „vier Karten statt drei" |

   Eine Meta-Karte gibt **nie** eine Zahl. Sie setzt eine Marke, und
   wer die Regel ausführt, **fragt** danach (`hatRegel`). Der andere
   Weg — eine Sonderbehandlung mitten in der Kampfschleife — hätte für
   jede weitere Meta-Karte eine weitere Verzweigung an einer Stelle
   gebraucht, an der niemand sie sucht.

   ── Warum vier Meta-Karten hier stehen und trotzdem nicht kommen ───

   `gebaut: false` heißt: Die Karte ist entworfen, aber die Stelle, die
   ihre Regel **abfragen** müsste, liegt in einer Datei, die dieser
   Zweig nicht anfassen darf (`spiel/kampf.mjs`, `spiel/ausweichen.mjs`
   — siehe `WORKCLAIM.md`). `wartetAuf` nennt Datei und Funktion.

   Sie werden **nicht angeboten** (`ziehbareKarten()` filtert sie
   heraus). Eine Karte, die man wählen kann und die nichts tut, ist
   schlimmer als eine fehlende: Der Spieler hat seinen Aufstieg
   ausgegeben und merkt nie, wofür. Derselbe Umgang wie beim
   Karawanen-Modus in `spiel/katalog/modi.mjs`.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/stufen.mjs` (zieht daraus und wendet an), `spiel/werte.mjs`
   (liefert Gruppen, Formen und Anzeigenamen der Werte),
   `runtime/karten-hand.js` (malt sie), `werkzeuge/pruefe-karten.mjs`
   (rechnet nach). */

import { WERT_NACH_ID, GRUPPEN_IDS } from "../werte.mjs";

/* ── Die Seltenheiten ────────────────────────────────────────────────

   `farbe` steht als Hexwert hier und nicht als Name aus
   `runtime/palette.js`: `spiel/` kennt den Browser nicht und soll ihn
   auch nicht über einen Umweg kennenlernen. Dieselbe Entscheidung wie
   bei den Schadensarten. Die vier Töne sind aus der Palette
   abgeschrieben (schriftMatt, frostHell, bannHell, flammeHell) und
   werden von `werkzeuge/pruefe-karten.mjs` gegen sie gehalten. */
export const SELTENHEITEN = [
  {
    id: "gemein", name: "Gemein", stufe: 0,
    gewicht: 100, wertFaktor: 1.0, seltenheitsSchub: 0,
    farbe: "#8a8296"
  },
  {
    id: "selten", name: "Selten", stufe: 1,
    gewicht: 40, wertFaktor: 1.7, seltenheitsSchub: 2,
    farbe: "#a8d6ec"
  },
  {
    id: "grausig", name: "Grausig", stufe: 2,
    gewicht: 14, wertFaktor: 2.6, seltenheitsSchub: 5,
    farbe: "#bfa4f0"
  },
  {
    id: "verflucht", name: "Verflucht", stufe: 3,
    gewicht: 4, wertFaktor: 4.0, seltenheitsSchub: 10,
    farbe: "#ffe0a8"
  }
];

export const SELTENHEIT_NACH_ID = new Map(SELTENHEITEN.map((s) => [s.id, s]));

/* ── Die Regeln, die eine Meta-Karte setzen kann ─────────────────────

   Eine eigene Liste, damit ein vertippter Regelname auffällt. Ohne sie
   setzte `regeln.weitsciht = true` still eine Marke, nach der nie
   jemand fragt — genau die Sorte Fehler, die kein Absturz meldet.

   `wo` ist die Stelle, die fragt. Steht dort ein fremder Pfad, gehört
   die Regel zu einer Karte mit `gebaut: false`. */
export const REGELN = [
  { id: "weitsicht", wo: "spiel/stufen.mjs ziehKarten()" },
  { id: "ketzerei", wo: "spiel/stufen.mjs ziehKarten()" },
  { id: "nachhall", wo: "spiel/stufen.mjs ziehKarten()" },
  { id: "gedaechtnis", wo: "spiel/stufen.mjs ziehKarten()" },
  { id: "aderlass", wo: "spiel/stufen.mjs nimmKarte()" },
  { id: "blutzoll", wo: "spiel/stufen.mjs nimmKarte()" },

  /* Wartend — die fragende Stelle liegt in fremden Dateien. */
  { id: "abpraller", wo: "spiel/kampf.mjs bewegeGeschosse()" },
  { id: "erstschlag", wo: "spiel/kampf.mjs schlageZu()" },
  { id: "flaechenbrand", wo: "spiel/kampf.mjs wirkeZeitschaden()" },
  { id: "hetzjagd", wo: "spiel/ausweichen.mjs starteSprung()" }
];

export const REGEL_IDS = new Set(REGELN.map((r) => r.id));

/* ── Kleine Helfer beim Tippen des Katalogs ──────────────────────── */

const w = (wert, menge) => ({ art: "wert", wert, menge });
const r = (regel) => ({ art: "regel", regel });

/* ── Der Katalog ─────────────────────────────────────────────────────

   `gruppe` steht bei Wertkarten **nicht** dabei: Sie kommt aus
   `spiel/werte.mjs`. Zwei Stellen wären zwei Wahrheiten, und die
   Kartenneigung („mehr Angriffskarten") liest genau diese Gruppe —
   eine falsch getippte Gruppe hier machte den Regler still wirkungslos.
   Meta-Karten tragen ihre Gruppe selbst, weil sie keinen Wert haben,
   aus dem man sie ableiten könnte. */
export const KARTEN = [

  /* ── Gemein: die acht des ersten Entwurfs ───────────────────────────
     Ihre Mengen sind **zeichengleich** mit der alten Tabelle
     `KARTEN_MENGE` aus `spiel/stufen.mjs`. Eine gemeine Karte gibt
     heute genau so viel wie vor dem Umbau; was sich ändert, ist, was
     daneben liegen kann. */
  { id: "zaehes_fleisch", titel: "ZÄHES FLEISCH", seltenheit: "gemein",
    wirkung: w("leben", 10),
    text: "Der Leib gewöhnt sich an das, was ihm angetan wird." },
  { id: "scharfe_kante", titel: "SCHARFE KANTE", seltenheit: "gemein",
    wirkung: w("schaden", 2),
    text: "Am Wetzstein wird aus Eisen eine Frage." },
  { id: "flinke_hand", titel: "FLINKE HAND", seltenheit: "gemein",
    wirkung: w("hast", 5),
    text: "Zwischen zwei Schlägen liegt jetzt weniger Nacht." },
  { id: "leichter_schritt", titel: "LEICHTER SCHRITT", seltenheit: "gemein",
    wirkung: w("tempo", 4),
    text: "Wer schneller läuft, stirbt später." },
  { id: "eisenhaut", titel: "EISENHAUT", seltenheit: "gemein",
    wirkung: w("ruestung", 3),
    text: "Es tut noch weh. Nur weniger." },
  { id: "gutes_omen", titel: "GUTES OMEN", seltenheit: "gemein",
    wirkung: w("glueck", 6),
    text: "Der Krämer holt bessere Ware hervor." },
  { id: "gierige_finger", titel: "GIERIGE FINGER", seltenheit: "gemein",
    wirkung: w("gier", 7),
    text: "Das Grabgold kommt dir entgegen." },
  { id: "stille_heilung", titel: "STILLE HEILUNG", seltenheit: "gemein",
    wirkung: w("genesung", 2),
    text: "Nach der Nacht schliesst sich etwas." },

  /* ── Selten: die Werte aus Phase 12, die bisher nie kamen ───────── */
  { id: "offene_wunde", titel: "OFFENE WUNDE", seltenheit: "selten",
    wirkung: w("lebensregeneration", 1),
    text: "Sie heilt und heilt und heilt und hört nicht auf." },
  { id: "langer_arm", titel: "LANGER ARM", seltenheit: "selten",
    wirkung: w("reichweite", 8),
    text: "Deine Waffen finden, was sich für weit weg hält." },
  { id: "breiter_schwung", titel: "BREITER SCHWUNG", seltenheit: "selten",
    wirkung: w("flaechenschaden", 10),
    text: "Ein Schlag für mehrere, und für jeden ein harter." },
  { id: "weiter_bogen", titel: "WEITER BOGEN", seltenheit: "selten",
    wirkung: w("flaechenreichweite", 10),
    text: "Der Schwung nimmt mehr mit, als er sollte." },
  { id: "geuebtes_auge", titel: "GEÜBTES AUGE", seltenheit: "selten",
    wirkung: w("krit_chance", 4),
    text: "Du siehst, wo der Knochen dünn ist." },
  { id: "grausamer_stoss", titel: "GRAUSAMER STOSS", seltenheit: "selten",
    wirkung: w("krit_schaden", 14),
    text: "Wenn es trifft, dann richtig." },
  { id: "weiter_satz", titel: "WEITER SATZ", seltenheit: "selten",
    wirkung: w("ausweichweite", 8),
    text: "Der Sprung trägt dich aus dem Ring der Zähne." },
  { id: "kurzer_atem", titel: "KURZER ATEM", seltenheit: "selten",
    wirkung: w("ausweichhast", 12),
    text: "Du bist wieder bereit, bevor du gelandet bist." },
  { id: "schweres_gold", titel: "SCHWERES GOLD", seltenheit: "selten",
    wirkung: w("goldfund", 12),
    text: "Dieselben Münzen, mehr wert." },
  { id: "kluger_kopf", titel: "KLUGER KOPF", seltenheit: "selten",
    wirkung: w("erfahrung", 10),
    text: "Jede Nacht lehrt dich mehr als die davor." },
  { id: "narbengewebe", titel: "NARBENGEWEBE", seltenheit: "selten",
    wirkung: w("leben", 9),
    text: "Wo es einmal aufgerissen wurde, hält es besser." },
  { id: "hass", titel: "HASS", seltenheit: "selten",
    wirkung: w("schaden", 2),
    text: "Er ist kein guter Ratgeber, aber ein guter Schmied." },

  /* ── Selten, Gruppe „arten": Schaden einer bestimmten Sorte ────────

     ⚠️ Diese fünf standen im ersten Entwurf **nicht** drin, und
     `werkzeuge/pruefe-karten.mjs` hat es gemeldet: Die Gruppe `arten`
     war über Karten gar nicht erreichbar. Damit hätte der Wert
     `neigung_arten` aus Phase 12 nichts zu verschieben gehabt — ein
     Regler ohne Regelweg, und wieder einer, den nichts rot macht.

     Sie sind bewusst **bedingt**: Wer keine Feuerwaffe trägt, dem
     nützt „Brandmal" nichts. Genau das ist die Aufgabe der Gruppe —
     erst mit `neigung_arten` und einem passenden Gürtel wird daraus
     ein Bau. */
  { id: "brandmal", titel: "BRANDMAL", seltenheit: "selten",
    wirkung: w("schaden_feuer_flach", 3),
    text: "Was einmal gebrannt hat, brennt leichter wieder." },
  { id: "frostbiss", titel: "FROSTBISS", seltenheit: "selten",
    wirkung: w("schaden_frost_flach", 3),
    text: "Die Kälte findet den Weg zwischen die Rippen." },
  { id: "schnittfuehrung", titel: "SCHNITTFÜHRUNG", seltenheit: "selten",
    wirkung: w("schaden_schnitt_prozent", 12),
    text: "Nicht fester zuschlagen. Besser." },
  { id: "wuchtschlag", titel: "WUCHTSCHLAG", seltenheit: "selten",
    wirkung: w("schaden_wucht_prozent", 12),
    text: "Knochen sind nur Knochen." },
  { id: "fluchklinge", titel: "FLUCHKLINGE", seltenheit: "grausig",
    wirkung: w("schaden_fluch_prozent", 12),
    text: "Sie fragt nicht nach der Rüstung." },

  /* ── Grausig: was den Bau umstellt statt ihn zu stärken ─────────── */
  { id: "zweiter_schlag", titel: "ZWEITER SCHLAG", seltenheit: "grausig",
    wirkung: w("zusatzangriffe", 1),
    text: "Jede Waffe holt ein zweites Mal aus." },
  { id: "gespaltener_wurf", titel: "GESPALTENER WURF", seltenheit: "grausig",
    wirkung: w("zusatzgeschosse", 1),
    text: "Was du wirfst, fliegt gefächert." },
  { id: "durchschlag", titel: "DURCHSCHLAG", seltenheit: "grausig",
    wirkung: w("durchdringung", 1),
    text: "Der erste Körper hält es nicht auf." },
  { id: "gluecksrune", titel: "GLÜCKSRUNE", seltenheit: "grausig",
    wirkung: w("kartenwert", 10),
    text: "Was die Nacht dich lehrt, lehrt sie dich gründlicher." },
  { id: "dunkle_gunst", titel: "DUNKLE GUNST", seltenheit: "grausig",
    wirkung: w("kartenseltenheit", 10),
    text: "Seltenes findet dich, nicht umgekehrt." },
  { id: "blutdurst", titel: "BLUTDURST", seltenheit: "grausig",
    wirkung: w("neigung_angriff", 40),
    text: "Du denkst nur noch an das Zuschlagen." },
  { id: "turmwache", titel: "TURMWACHE", seltenheit: "grausig",
    wirkung: w("neigung_wehr", 40),
    text: "Du denkst nur noch an das Stehenbleiben." },
  { id: "leichenfledderer", titel: "LEICHENFLEDDERER", seltenheit: "grausig",
    wirkung: w("neigung_beute", 40),
    text: "Du denkst nur noch an das, was sie bei sich tragen." },

  /* ── Verflucht: selten, gross, und man erzählt davon ────────────── */
  { id: "herz_aus_stein", titel: "HERZ AUS STEIN", seltenheit: "verflucht",
    wirkung: w("leben", 14),
    text: "Es schlägt nicht mehr richtig. Dafür bricht es nicht." },
  { id: "zorn", titel: "ZORN", seltenheit: "verflucht",
    wirkung: w("schaden", 3),
    text: "Er sieht das Ziel und sonst nichts." },
  { id: "rasende_hand", titel: "RASENDE HAND", seltenheit: "verflucht",
    wirkung: w("hast", 6),
    text: "Sie gehorcht dir nicht mehr ganz." },
  { id: "wolfsfuss", titel: "WOLFSFUSS", seltenheit: "verflucht",
    wirkung: w("tempo", 5),
    text: "Die Nacht kann nicht so schnell laufen wie du." },
  { id: "henkersblick", titel: "HENKERSBLICK", seltenheit: "verflucht",
    wirkung: w("krit_chance", 4),
    text: "Du siehst jedem an, wo er endet." },

  /* ══ Meta-Karten ══════════════════════════════════════════════════

     Sie ändern eine Regel, keine Zahl. `zeilen` steht hier, weil sich
     aus einer Regel keine Zahl ableiten lässt — die Karte muss selbst
     sagen, was auf ihr steht. Die grün hervorgehobene Stelle ist
     `zahl`, der Rest ist Text (siehe `runtime/karten-hand.js`). */

  { id: "weitsicht", titel: "WEITSICHT", seltenheit: "grausig",
    gruppe: "karten", wirkung: r("weitsicht"),
    zeilen: [{ zahl: "4", text: "KARTEN JE AUFSTIEG" }],
    text: "Du siehst eine Möglichkeit mehr, als dir zusteht." },

  { id: "ketzerei", titel: "KETZEREI", seltenheit: "grausig",
    gruppe: "karten", wirkung: r("ketzerei"),
    zeilen: [{ zahl: "×3", text: "META-KARTEN" }],
    text: "Die Regeln der Nacht werden verhandelbar." },

  { id: "nachhall", titel: "NACHHALL", seltenheit: "selten",
    gruppe: "karten", wirkung: r("nachhall"),
    zeilen: [{ zahl: "1", text: "KARTE KEHRT WIEDER" }],
    text: "Was du genommen hast, liegt beim nächsten Mal wieder da." },

  { id: "gedaechtnis", titel: "KALTES GEDÄCHTNIS", seltenheit: "selten",
    gruppe: "karten", wirkung: r("gedaechtnis"),
    zeilen: [{ zahl: "0", text: "ABGELEHNTES KEHRT WIEDER" }],
    text: "Was du liegen liesst, bietet dir niemand ein zweites Mal an." },

  { id: "aderlass", titel: "ADERLASS", seltenheit: "verflucht",
    gruppe: "wehr", wirkung: r("aderlass"),
    zeilen: [{ zahl: "VOLL", text: "LEBEN JE AUFSTIEG" }],
    text: "Die Nacht nimmt dir etwas ab und gibt dir alles zurück." },

  { id: "blutzoll", titel: "BLUTZOLL", seltenheit: "verflucht",
    gruppe: "angriff", wirkung: r("blutzoll"),
    zeilen: [{ zahl: "1/5", text: "LEBEN ALLER IM KREIS" }],
    text: "Dein Aufstieg kostet sie. Töten tut er nicht." },

  /* ── Entworfen, wartet auf eine Zeile in fremdem Besitz ────────────
     Werden nicht angeboten. Siehe die Kopfnotiz. */

  { id: "abpraller", titel: "ABPRALLER", seltenheit: "grausig",
    gruppe: "angriff", wirkung: r("abpraller"), gebaut: false,
    wartetAuf: "spiel/kampf.mjs, bewegeGeschosse(): wenn ein Geschoss "
      + "einen Gegner erledigt und hatRegel(p.besitzer, \"abpraller\") gilt, "
      + "statt p.weg = true ein neues Ziel in der Nähe suchen.",
    zeilen: [{ zahl: "1", text: "NEUES ZIEL JE TOTEM" }],
    text: "Das Geschoss ist noch nicht fertig." },

  { id: "erstschlag", titel: "ERSTSCHLAG", seltenheit: "grausig",
    gruppe: "krit", wirkung: r("erstschlag"), gebaut: false,
    wartetAuf: "spiel/kampf.mjs, schlageZu(): bei g.leben === g.lebenMax "
      + "und hatRegel(spieler, \"erstschlag\") den Treffer als Volltreffer "
      + "werten, ohne die Kritchance zu würfeln.",
    zeilen: [{ zahl: "100 %", text: "KRIT AUF UNVERLETZTE" }],
    text: "Der erste Schnitt sitzt immer." },

  { id: "flaechenbrand", titel: "FLÄCHENBRAND", seltenheit: "grausig",
    gruppe: "arten", wirkung: r("flaechenbrand"), gebaut: false,
    wartetAuf: "spiel/kampf.mjs, wirkeZeitschaden(): brennt ein Gegner und "
      + "hatRegel(sein Anzünder, \"flaechenbrand\"), den Brand einmal auf "
      + "den nächsten Nachbarn im Gitter übertragen.",
    zeilen: [{ zahl: "1", text: "NACHBAR FÄNGT FEUER" }],
    text: "Feuer fragt nicht, wem es gilt." },

  { id: "hetzjagd", titel: "HETZJAGD", seltenheit: "grausig",
    gruppe: "beweglichkeit", wirkung: r("hetzjagd"), gebaut: false,
    wartetAuf: "spiel/ausweichen.mjs, starteSprung(): bei "
      + "hatRegel(spieler, \"hetzjagd\") die Abklingzeit der am weitesten "
      + "entfernten Waffe auf 0 setzen.",
    zeilen: [{ zahl: "1", text: "WAFFE SOFORT BEREIT" }],
    text: "Der Sprung ist der Anlauf." }
];

export const KARTE_NACH_ID = new Map(KARTEN.map((k) => [k.id, k]));

/* Nur, was man wirklich ziehen kann. Ein einziger Ort — sonst
   vergisst irgendwann eine Stelle den Filter und bietet eine Karte an,
   die nichts tut. */
export function ziehbareKarten() {
  return KARTEN.filter((k) => k.gebaut !== false);
}

/* Die Gruppe einer Karte. Bei Wertkarten aus `spiel/werte.mjs`
   abgeleitet, bei Meta-Karten getippt — die Begründung steht über
   `KARTEN`. */
export function kartenGruppe(karte) {
  if (karte.gruppe) return karte.gruppe;
  const e = WERT_NACH_ID.get(karte.wirkung.wert);
  return e ? e.gruppe : "karten";
}

/* Ob eine Karte eine Regel ändert statt einer Zahl. Eine Funktion und
   kein Feld: Ein Feld `meta: true` liesse sich vergessen, während die
   Wirkung schon eine Regel wäre. */
export function istMeta(karte) {
  return karte.wirkung.art === "regel";
}

export function seltenheitVon(karte) {
  return SELTENHEIT_NACH_ID.get(karte.seltenheit) ?? SELTENHEITEN[0];
}

/* Für Prüfungen und Anzeigen: die Gruppen, die es überhaupt gibt. */
export const KARTEN_GRUPPEN = GRUPPEN_IDS;
