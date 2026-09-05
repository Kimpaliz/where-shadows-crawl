/* [Aufgabe: Bedienung] Alles, was Text ist: Anzeige, Krämer, Karten.

   ── Warum die Anzeige nicht im Licht liegt ─────────────────────────

   Sie wird **nach** dem Licht gemalt. Eine Lebensanzeige, die im
   Schatten liegt, ist keine Stimmung, sondern ein Fehler: Man muss sie
   in dem Moment lesen können, in dem es dunkel und eng wird.

   ── Vier Leute, ein Bildschirm, eine Achse und ein Knopf ───────────

   Laden und Kartenwahl bekommen je Spieler eine eigene Spalte oder
   Zeile und eine eigene Auswahlmarke. Bedient wird alles mit derselben
   Achse und demselben Knopf wie das Laufen (`runtime/eingabe.js`) —
   nichts hier braucht eine Maus. Das ist der Grund, warum man zu viert
   an einem Rechner spielen kann, ohne sich zu verrenken.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/schrift.js` (die Bildpunktschrift), `runtime/palette.js`,
   `runtime/start.js` (ruft und reicht die Eingaben durch),
   `spiel/laden.mjs` und `spiel/stufen.mjs` (die Vorgänge dahinter),
   `spiel/werte.mjs` (die Abklingzeit hinter der Angriffsleiste),
   `spiel/schadensarten.mjs` (ihre Farbe),
   `werkzeuge/pruefe-anzeige.mjs` (misst die reinen Funktionen hier). */

import { FARBEN, JAEGER_FARBEN } from "./palette.js";
import { zeichneText, zeichneTextMittig, zeichneTextUmrandet, textBreite, VORSCHUB } from "./schrift.js";
import { BREITE, HOEHE } from "./zeichnen.js";
import { WELLEN_JE_LAUF } from "../spiel/katalog/wellen.mjs";
import { neuwuerfelnPreis, kaufe, wuerfleNeu, ANGEBOTE } from "../spiel/laden.mjs";
import { nimmKarte } from "../spiel/stufen.mjs";
import { abklingzeit } from "../spiel/werte.mjs";
import { ART_NACH_ID, STANDARD_ART } from "../spiel/schadensarten.mjs";
import { SCHRITT } from "../spiel/welt.mjs";

/* Der Laden hat je Spieler sechs Felder: vier Angebote, neu würfeln,
   bereit. Eine Reihe statt eines Rasters — mit einer Achse ist eine
   Reihe immer eindeutig, ein Raster nicht. */
export const LADEN_FELDER = ANGEBOTE + 2;
const NEU_WUERFELN = ANGEBOTE;
const BEREIT = ANGEBOTE + 1;

function kasten(c, x, y, b, h, rahmen = FARBEN.rahmen, fuellung = "#0d0a14") {
  c.fillStyle = fuellung;
  c.fillRect(x, y, b, h);
  c.fillStyle = rahmen;
  c.fillRect(x, y, b, 1); c.fillRect(x, y + h - 1, b, 1);
  c.fillRect(x, y, 1, h); c.fillRect(x + b - 1, y, 1, h);
}

function leiste(c, x, y, b, anteil, farbe, grund = FARBEN.kontur) {
  c.fillStyle = grund;
  c.fillRect(x, y, b, 3);
  c.fillStyle = farbe;
  c.fillRect(x, y, Math.max(0, Math.round(b * Math.min(1, anteil))), 3);
}

/* ── Die Angriffsleiste ──────────────────────────────────────────────

   Wie voll die Leiste einer Waffe steht: 1 heißt schlagbereit.

   Der Nenner kommt aus **derselben** Funktion, mit der der Regelkern
   die Abklingzeit setzt (`spiel/kampf.mjs` ruft `abklingzeit(s.werte,
   v.abklingzeit)`). Eine eigene Formel hier wäre bei Hast still falsch:
   Der Kern rechnete kürzer, die Leiste liefe weiter über die alte
   Strecke, und niemand bekäme eine Meldung.

   `bereitIn` läuft im Kern kurz ins Negative, bevor es auf 0 gesetzt
   wird — deshalb wird nach oben geklemmt. Ohne das ragte die Leiste
   für einzelne Bilder über ihren Kasten hinaus. */
export function bereitAnteil(waffe, werte) {
  const voll = abklingzeit(werte, waffe.vorlage.abklingzeit);
  if (!(voll > 0)) return 1;
  return Math.max(0, Math.min(1, 1 - waffe.bereitIn / voll));
}

/* Die Leiste trägt die Farbe der Schadensart — dieselbe, in der gleich
   das Trefferzeichen und die Schadenszahl erscheinen
   (`runtime/zeichnen.js`). Das ist der eigentliche Gewinn: Man lernt
   „der orange Balken ist gleich voll" und sieht danach das orange
   Feuerzeichen. Ein eigener Farbsatz für die Leisten wäre ein zweites
   Vokabular für dieselbe Sache. */
function waffenFarbe(waffe) {
  const art = waffe.vorlage.schadensart ?? STANDARD_ART;
  return (ART_NACH_ID.get(art) ?? ART_NACH_ID.get(STANDARD_ART)).farbe;
}

/* ── Wo die Leisten liegen und warum dort ────────────────────────────

   **Über** der Spielertafel, nicht unter ihr und nicht am Rand.

   Der untere Bildrand ist der umkämpfteste Streifen des Spiels: unten
   links liegt auf dem Handy der Daumen, unten rechts der
   Ausweichknopf, und die Kartenhand kommt ebenfalls dorthin. Nach oben
   ist der einzige Weg, der niemandem etwas wegnimmt.

   An der **Tafel** und nicht in einer Ecke, weil Waffen jemandem
   gehören: Bei vier Jägern muss jeder seine eigenen sehen, und eine
   feste Ecke kann nur einen bedienen. So wächst die Anzeige von selbst
   mit der Spielerzahl mit.

   Nicht **an der Figur** in der Welt: Dort läge sie unter dem Licht
   und wäre am dunklen Rand des Bannkreises nicht zu lesen — und sie
   liefe mit, während man sie zu lesen versucht. */
const LEISTE_HOEHE = 3;
const LEISTE_ABSTAND = 1;

function zeichneAngriffsleisten(c, s, x, y, breite) {
  const waffen = s.waffen ?? [];
  if (waffen.length === 0) return;
  /* Ein Feld je Waffe, nebeneinander. Bei sechs Waffen auf 112
     Bildpunkten bleiben je 17 — schmal, aber die Leiste beantwortet
     eine Ja-Nein-Frage („gleich soweit?"), keine Zahl. */
  const luecke = 1;
  const feld = Math.max(3, Math.floor((breite - (waffen.length - 1) * luecke) / waffen.length));
  waffen.forEach((w, i) => {
    const fx = x + i * (feld + luecke);
    /* Durchgehend die Artfarbe, auch wenn die Waffe bereit ist. Ein
       eigener Ton für „voll" war der erste Entwurf und wurde
       verworfen: Er hätte die Zugehörigkeit ausgerechnet in dem
       Augenblick gelöscht, in dem gleich das Trefferzeichen derselben
       Farbe erscheint. Das sichtbare Ereignis ist ohnehin nicht das
       Vollwerden, sondern das Zurückschnellen beim Zuschlagen. */
    leiste(c, fx, y, feld, bereitAnteil(w, s.werte), waffenFarbe(w));
  });
}

/* ── Anzeige während der Welle ───────────────────────────────────── */

export function zeichneAnzeige(c, welt) {
  /* Bei einer Bosswelle laeuft keine Uhr — sie endet, wenn er faellt. */
  const bossWelle = welt.endet === "elite";
  const rest = Math.max(0, Math.ceil(welt.dauer - welt.zeit));
  /* Ein endloser Modus hat keinen Nenner. „NACHT 3/12" waere dort
     eine Zahl, die etwas verspricht, das es nicht gibt. */
  const kopf = welt.modus.endlos
    ? `NACHT ${welt.welle}`
    : `NACHT ${welt.welle}/${welt.modus.wellenJeLauf ?? WELLEN_JE_LAUF}`;
  zeichneTextUmrandet(c, kopf, 4, 4);
  if (bossWelle) {
    const boss = welt.gegner.find((g) => g.art.elite && !g.tot);
    zeichneTextMittig(c, "HAUPTMANN", BREITE / 2, 4, FARBEN.blutHell, FARBEN.kontur);
    leiste(c, BREITE / 2 - 40, 12, 80, boss ? boss.leben / boss.lebenMax : 0, FARBEN.blutHell);
  } else {
    zeichneTextMittig(c, `${rest}`, BREITE / 2, 4,
      rest <= 5 ? FARBEN.flammeHell : FARBEN.schrift, FARBEN.kontur);
    leiste(c, BREITE / 2 - 40, 12, 80, 1 - welt.zeit / welt.dauer, FARBEN.flamme);
  }

  /* Je Spieler eine kleine Tafel unten. Sie stehen nebeneinander,
     damit man den Zustand der Gruppe mit einem Blick erfasst — bei
     verteilten Ecken sucht man im Ernstfall. */
  const breite = Math.min(112, Math.floor(BREITE / welt.spieler.length) - 4);
  const start = Math.round((BREITE - (breite + 4) * welt.spieler.length + 4) / 2);
  welt.spieler.forEach((s, i) => {
    const x = start + i * (breite + 4);
    const y = HOEHE - 26;
    const farbe = JAEGER_FARBEN[s.id % JAEGER_FARBEN.length];
    /* Die Angriffsleisten sitzen dicht über der Tafel — siehe die
       Begründung bei `zeichneAngriffsleisten`. Wer liegt, schlägt
       nicht zu; dann wäre eine Reihe voller Balken eine Falschaussage. */
    if (s.zustand === "lebt") {
      zeichneAngriffsleisten(c, s, x + 3, y - LEISTE_HOEHE - LEISTE_ABSTAND, breite - 6);
    }
    kasten(c, x, y, breite, 22, s.zustand === "liegt" ? FARBEN.blut : FARBEN.rahmen);
    zeichneText(c, `J${s.id + 1}`, x + 3, y + 4, farbe.hell);
    zeichneText(c, `${Math.ceil(s.leben)}`, x + 16, y + 4,
      s.leben / s.lebenMax < 0.3 ? FARBEN.blutHell : FARBEN.schrift);
    zeichneText(c, `${Math.floor(s.gold)}`, x + breite - 3 - textBreite(`${Math.floor(s.gold)}`), y + 4, FARBEN.goldHell);
    leiste(c, x + 3, y + 12, breite - 6, s.leben / s.lebenMax, FARBEN.blutHell);
    leiste(c, x + 3, y + 16, breite - 6, s.wissen / Math.max(1, schwelleFuer(s)), farbe.mittel);
    if (s.zustand === "liegt") {
      zeichneTextMittig(c, "GEFALLEN", x + breite / 2, y + 4, FARBEN.blutHell, FARBEN.kontur);
    }
  });
}

/* Doppelt gerechnet wäre hier ein Fehler in Wartestellung — deshalb
   kommt die Schwelle aus dem Regelkern und nicht aus einer Formel,
   die hier noch einmal steht. */
import { schwelle } from "../spiel/stufen.mjs";
function schwelleFuer(s) { return schwelle(s.stufe); }

/* ── Der Truhen-Moment am Wellenende ─────────────────────────────── */

/* Hier stand bis zum 05.09.2026 `zeichneWahl()` — die alte Kartenwahl
   als Kastenreihe. Sie ist seit der Kartenhand (#69) durch
   `runtime/karten-hand.js` ersetzt und wurde von **keiner Zeile** mehr
   gerufen; ihre Felder `k.name`/`k.menge` gibt es an einer gezogenen
   Karte gar nicht mehr. Wer sie wieder aufgerufen hätte, bekäme
   „undefined" auf die Karte — deshalb entfernt statt liegen gelassen.

   An ihre Stelle tritt der Moment, für den die Phase „truhen" gebaut
   ist: Am Wellenende springen alle getragenen Truhen auf einmal auf,
   und die Welt hält dafür 1,4 Sekunden an. Ohne diese Anzeige liefe
   der Moment unsichtbar durch — die Funde wären im Gürtel, ohne dass
   irgendjemand sie gesehen hätte. */

/* Ein Fund je Zeile, nach Sorte eingefärbt. Die Farbe trägt hier
   Bedeutung und ist nicht Schmuck: Gold und Wissen sind die beiden
   Ströme, die es ohnehin gibt, und ein Fundstück leuchtet in der Farbe
   seiner Seltenheit — dieselbe Sprache wie beim Krämer. */
const TRUHEN_FARBE = {
  gold: FARBEN.gold,
  wissen: FARBEN.seucheHell,
  gegenstand: FARBEN.flammeHell,
  waffe: FARBEN.eisenHell
};

export function zeichneTruhen(c, welt) {
  const funde = welt.truhenErgebnis ?? [];
  if (funde.length === 0) return;

  c.fillStyle = "rgba(6,5,12,0.72)";
  c.fillRect(0, 0, BREITE, HOEHE);
  zeichneTextMittig(c, funde.length === 1 ? "EINE TRUHE SPRINGT AUF" : `${funde.length} TRUHEN SPRINGEN AUF`,
    BREITE / 2, 10, FARBEN.flammeHell, FARBEN.kontur);

  /* Höchstens so viele Zeilen, wie zwischen Titel und Unterkante
     passen. Mehr Truhen als Platz ist selten (gemessen 4,18 je **Lauf**),
     aber „selten" ist kein Grund, den Rest über den Bildrand zu
     schieben — die übrigen werden gezählt statt gemalt. */
  const oben = 26;
  const zeileHoch = 11;
  const passen = Math.max(1, Math.floor((HOEHE - oben - 14) / zeileHoch));
  const gezeigt = funde.slice(0, passen);

  gezeigt.forEach((f, i) => {
    const y = oben + i * zeileHoch;
    const farbe = TRUHEN_FARBE[f.sorte] ?? TRUHEN_FARBE.gegenstand;
    const s = welt.spieler.find((p) => p.id === f.spielerId);
    const jaeger = JAEGER_FARBEN[(s?.id ?? 0) % JAEGER_FARBEN.length];
    zeichneText(c, `J${(f.spielerId ?? 0) + 1}`, 6, y, jaeger.hell);

    /* Bei Gold und Wissen ist die Menge die Nachricht, bei Fundstück
       und Waffe der Name — deshalb zwei Formen statt einer, die für
       beides halb passt. */
    const text = (f.sorte === "gold" || f.sorte === "wissen")
      ? `${f.name} · ${f.menge}`
      : f.name;
    zeichneText(c, text, 24, y, farbe);

    /* `voll` heißt: Eine Waffe fand keinen Platz im Gürtel und wurde zu
       Gold. Das muss dastehen — sonst sieht der Spieler Gold und hält
       die Truhe für mager, obwohl sie eine Waffe hergegeben hat. */
    if (f.voll) zeichneText(c, "(GÜRTEL VOLL)", 24 + textBreite(text) + 6, y, FARBEN.schriftMatt);
  });

  if (funde.length > gezeigt.length) {
    zeichneTextMittig(c, `UND ${funde.length - gezeigt.length} WEITERE`,
      BREITE / 2, oben + gezeigt.length * zeileHoch + 2, FARBEN.schriftMatt, FARBEN.kontur);
  }
}

/* ── Der Krämer ──────────────────────────────────────────────────── */

export function zeichneLaden(c, welt, menue) {
  c.fillStyle = "#07060c";
  c.fillRect(0, 0, BREITE, HOEHE);
  zeichneTextMittig(c, `DER KRÄMER — VOR NACHT ${welt.welle + 1}`, BREITE / 2, 5, FARBEN.flammeHell, FARBEN.kontur);

  const n = welt.spieler.length;
  /* Bei einem Spieler waere eine bildschirmbreite Spalte lauter Luft.
     Die Breite wird gedeckelt und der Block mittig gesetzt. */
  const sb = Math.min(150, Math.floor((BREITE - 6) / n) - 3);
  const links = Math.round((BREITE - (sb + 3) * n + 3) / 2);
  welt.spieler.forEach((s, i) => {
    const x = links + i * (sb + 3);
    const farbe = JAEGER_FARBEN[s.id % JAEGER_FARBEN.length];
    zeichneText(c, `J${s.id + 1}`, x, 16, farbe.hell);
    zeichneText(c, `${Math.floor(s.gold)} GOLD`, x + 14, 16, FARBEN.goldHell);

    const zeiger = menue.ladenZeiger[s.id];
    let y = 26;
    (s.angebote ?? []).forEach((a, k) => {
      const gewaehlt = zeiger === k && !s.bereit;
      const bezahlbar = !a.gekauft && a.preis <= s.gold;
      kasten(c, x, y, sb, 30, gewaehlt ? farbe.hell : FARBEN.rahmen,
        a.gekauft ? "#0a1a0e" : (gewaehlt ? "#1a1426" : "#0d0a14"));
      const titel = a.gekauft ? "GEKAUFT" : a.name;
      zeichneText(c, kuerze(titel, Math.floor((sb - 8) / VORSCHUB)), x + 3, y + 4,
        a.gekauft ? FARBEN.seucheHell : (bezahlbar ? FARBEN.schrift : FARBEN.schriftMatt));
      if (!a.gekauft) {
        zeichneText(c, `${a.preis}`, x + 3, y + 13, bezahlbar ? FARBEN.goldHell : FARBEN.blut);
        const zusatz = a.sorte === "waffe"
          ? `WAFFE ST${a.stufe}`
          : Object.entries(a.werte).map(([w, v]) => `${v > 0 ? "+" : ""}${v} ${w.slice(0, 3).toUpperCase()}`).join(" ");
        zeichneText(c, kuerze(zusatz, Math.floor((sb - 8) / VORSCHUB)), x + 3, y + 22, FARBEN.schriftMatt);
      }
      y += 32;
    });

    const wp = neuwuerfelnPreis(welt.welle + 1, s.malGewuerfelt);
    const wGewaehlt = zeiger === NEU_WUERFELN && !s.bereit;
    kasten(c, x, y, sb, 12, wGewaehlt ? farbe.hell : FARBEN.rahmen, wGewaehlt ? "#1a1426" : "#0d0a14");
    zeichneText(c, kuerze(`NEU ${wp}`, Math.floor((sb - 6) / VORSCHUB)), x + 3, y + 4,
      s.gold >= wp ? FARBEN.schrift : FARBEN.schriftMatt);
    y += 14;

    const bGewaehlt = zeiger === BEREIT && !s.bereit;
    kasten(c, x, y, sb, 12, s.bereit ? FARBEN.seucheHell : (bGewaehlt ? farbe.hell : FARBEN.rahmen),
      s.bereit ? "#0a1a0e" : (bGewaehlt ? "#1a1426" : "#0d0a14"));
    zeichneText(c, s.bereit ? "BEREIT" : "LOS", x + 3, y + 4,
      s.bereit ? FARBEN.seucheHell : FARBEN.schrift);

    /* Der Zähler erscheint erst in den letzten Sekunden. Von Anfang an
       mitzulaufen hieße, jemanden zu drängen, der nur überlegt — und
       ein Zähler, der immer da ist, wird nicht mehr gelesen. */
    const rest = fristRest(welt, menue, s);
    if (rest !== null && !s.bereit) {
      zeichneText(c, `${Math.ceil(rest)}`, x + sb - 3 - textBreite(`${Math.ceil(rest)}`), y + 4,
        FARBEN.blutHell);
    }
    y += 16;

    zeichneText(c, `LEBEN ${Math.ceil(s.leben)}/${s.lebenMax}`, x, y, FARBEN.schriftMatt);
    y += 8;
    const waffen = s.waffen.map((w) => `${w.vorlage.name.slice(0, 4)}${w.stufe}`).join(" ");
    umbrich(c, waffen.toUpperCase(), x, y, sb, farbe.mittel);
  });

  zeichneTextMittig(c, "ACHSE WÄHLEN · KNOPF NEHMEN", BREITE / 2, HOEHE - 9, FARBEN.schriftMatt, FARBEN.kontur);
}

/* ── Vorspiel und Ende ───────────────────────────────────────────── */

export function zeichneVorspiel(c, menue, padZahl) {
  c.fillStyle = "#07060c";
  c.fillRect(0, 0, BREITE, HOEHE);
  zeichneTextMittig(c, "WHERE SHADOWS CRAWL", BREITE / 2, 46, FARBEN.flammeHell, FARBEN.kontur);
  zeichneTextMittig(c, "EIN BANNKREIS · EINE FACKEL · KEIN MORGEN", BREITE / 2, 60, FARBEN.schriftMatt);

  zeichneTextMittig(c, "WIE VIELE JÄGER?", BREITE / 2, 96, FARBEN.schrift);
  for (let i = 1; i <= 4; i++) {
    const b = 48, x = Math.round(BREITE / 2 - (b * 4 + 18) / 2 + (i - 1) * (b + 6));
    const gewaehlt = menue.spielerzahl === i;
    const farbe = JAEGER_FARBEN[i - 1];
    kasten(c, x, 110, b, 34, gewaehlt ? farbe.hell : FARBEN.rahmen, gewaehlt ? "#1a1426" : "#0d0a14");
    zeichneTextMittig(c, `${i}`, x + b / 2, 120, gewaehlt ? farbe.hell : FARBEN.schriftMatt);
  }

  const zeilen = [
    "J1 WASD · LEERTASTE",
    "J2 PFEILE · ENTER",
    "J3 IJKL · U",
    "J4 ZIFFERNBLOCK 8456 · 0"
  ];
  zeilen.slice(0, menue.spielerzahl).forEach((t, i) => {
    zeichneTextMittig(c, t, BREITE / 2, 156 + i * 10, JAEGER_FARBEN[i].mittel);
  });
  if (padZahl > 0) {
    zeichneTextMittig(c, `${padZahl} GAMEPAD${padZahl > 1 ? "S" : ""} ERKANNT`, BREITE / 2, 156 + menue.spielerzahl * 10 + 6, FARBEN.seucheHell);
  }
  zeichneTextMittig(c, "KNOPF DRÜCKEN ZUM ANFANGEN", BREITE / 2, HOEHE - 20, FARBEN.flammeHell, FARBEN.kontur);
}

export function zeichneEnde(c, welt) {
  c.fillStyle = "rgba(6,5,12,0.85)";
  c.fillRect(0, 0, BREITE, HOEHE);
  const gewonnen = welt.phase === "gewonnen";
  zeichneTextMittig(c, gewonnen ? "DER MORGEN KOMMT" : "DIE NACHT BEHÄLT EUCH",
    BREITE / 2, 60, gewonnen ? FARBEN.flammeHell : FARBEN.blutHell, FARBEN.kontur);
  zeichneTextMittig(c, welt.modus.endlos
    ? `BIS NACHT ${welt.welle}`
    : `NACHT ${welt.welle} VON ${welt.modus.wellenJeLauf ?? WELLEN_JE_LAUF}`,
    BREITE / 2, 78, FARBEN.schrift);
  welt.spieler.forEach((s, i) => {
    const farbe = JAEGER_FARBEN[s.id % JAEGER_FARBEN.length];
    zeichneTextMittig(c, `J${s.id + 1}  STUFE ${s.stufe}  ${s.getoetet ?? 0} ERSCHLAGEN`,
      BREITE / 2, 100 + i * 12, farbe.hell);
  });
  zeichneTextMittig(c, "KNOPF FÜR EINE NEUE NACHT", BREITE / 2, HOEHE - 26, FARBEN.flammeHell, FARBEN.kontur);
}

/* ── Bedienung der Menüs ─────────────────────────────────────────── */

export const SPERRE_SEKUNDEN = 0.28;

/* ── Wenn im Krämer jemand wegbricht (#93) ───────────────────────────

   `bedieneLaden` wartete auf `jeder ist bereit`. Wer die Verbindung
   verliert, wird nie bereit — die Runde stand still, und zwar für
   alle. Der Fehler ist **älter als das Netz-Koop** und war nur nie
   sichtbar: An einer Tastatur kann kein Spieler verschwinden.

   ── Warum eine Frist und keine Abfrage beim Netz ────────────────────

   Naheliegend wäre, `netz/lockstep.mjs` zu fragen, wer weggebrochen
   ist. Das geht hier aus zwei Gründen nicht — und der zweite ist der
   eigentliche:

   1. Der Gleichschritt liegt in `runtime/start.js` und wird nicht
      hierher gereicht.
   2. **Es ist von hier aus gar nicht unterscheidbar.** Ein
      weggebrochener Platz sendet `ruhendeEingabe()` — x 0, y 0, kein
      Knopf. Genau dasselbe sendet jemand, der die Hände im Schoß hat.
      Beide sehen identisch aus, und das ist kein Mangel: In beiden
      Fällen soll es weitergehen.

   Deshalb zählt hier **Stille**, nicht Verbindung. Wer sich rührt,
   setzt den Zähler zurück; wer zwanzig Sekunden lang gar nichts tut,
   wird übergangen. Ein sichtbarer Zähler warnt vorher, und jeder
   Tastendruck nimmt ihn wieder weg — auch das Blättern durch die
   Angebote.

   ── Warum der Verbindungszustand nicht in den Regelkern gehört ─────

   `s.zustand` ist eine Kette ohne Rückweg (`lebt` → `liegt`). Wer weg
   ist, ist eine Frage der **Verbindung** und keine Spielregel; ein
   Wiedereinstieg wäre über den Zustand für immer verbaut. Der Zähler
   liegt deshalb am Menü — das ist Laufzeitzustand — und `spiel/` weiß
   von alldem nichts.

   ── Warum zwanzig Sekunden ──────────────────────────────────────────

   Ein Abbruch ist meistens ein Aussetzer und kein Weggang. Zu kurz
   übergeht jemanden, der noch überlegt; zu lang steht die Runde. Die
   letzten zehn Sekunden sind sichtbar, sodass ein Anwesender die Frist
   mit einem Tastendruck abwenden kann, bevor sie ihn erwischt. */
export const FRIST_SEKUNDEN = 20;
export const FRIST_ZEIGEN_AB = 10;
const FRIST_TICKS = Math.round(FRIST_SEKUNDEN / SCHRITT);

/* Rührt sich dieser Platz? Gehaltene Achse und gehaltener Knopf zählen
   mit, nicht nur die Flanken — sonst liefe die Frist bei jemandem ab,
   der nur lange auf eine Richtung drückt.

   Die Totzone ist Absicht: Ein zitternder Analogstick soll die Frist
   am Leben halten dürfen (sichere Richtung), ein weggebrochener Platz
   sendet exakte Nullen und wird davon nicht gerettet. */
const TOTZONE = 0.2;
export function istRegung(e) {
  if (!e) return false;
  if (e.knopf || e.ausweichen || e.knopfFlanke) return true;
  if (e.xFlanke || e.yFlanke) return true;
  return Math.abs(e.x ?? 0) > TOTZONE || Math.abs(e.y ?? 0) > TOTZONE;
}

/* Allein wartet niemand — dort ist eine Pause einfach eine Pause, und
   der Krämer soll in Ruhe zu lesen sein. */
export function verstummt(stilleTicks, spielerzahl) {
  return spielerzahl > 1 && stilleTicks >= FRIST_TICKS;
}

/* Wie viele Sekunden dieser Platz noch hat — oder `null`, wenn nichts
   anzuzeigen ist. Getrennt von `verstummt`, weil Anzeigen und
   Entscheiden zwei Fragen sind: Angezeigt wird früher, damit man noch
   eingreifen kann. */
export function fristRest(welt, menue, s) {
  if (welt.spieler.length <= 1) return null;
  const still = menue.stille?.[s.id] ?? 0;
  const rest = (FRIST_TICKS - still) * SCHRITT;
  if (rest > FRIST_ZEIGEN_AB) return null;
  return Math.max(0, rest);
}

export function macheMenue() {
  return {
    spielerzahl: 1, sperre: 0, ladenZeiger: [0, 0, 0, 0], wahlZeiger: [0, 0, 0, 0],
    /* Wie viele Ticks ein Platz im Krämer schon still ist. Ticks und
       nicht Sekunden: `bedieneLaden` wird genau einmal je
       Simulationsschritt gerufen, eine Uhr gehört hier nicht her und
       wäre auf zwei Rechnern verschieden. */
    stille: [0, 0, 0, 0], ladenWelle: -1
  };
}

export function bedieneWahl(welt, menue, eingaben) {
  for (const s of welt.spieler) {
    if (s.offeneWahlen <= 0) continue;
    const e = eingaben[s.id];
    if (!e) continue;
    const anzahl = s.karten?.length ?? 0;
    if (anzahl === 0) continue;
    if (e.xFlanke) menue.wahlZeiger[s.id] = (menue.wahlZeiger[s.id] + e.xFlanke + anzahl) % anzahl;
    if (e.knopfFlanke && menue.sperre <= 0) {
      nimmKarte(welt, s, menue.wahlZeiger[s.id]);
      menue.wahlZeiger[s.id] = 0;
    }
  }
}

export function bedieneLaden(welt, menue, eingaben) {
  /* Jeder Krämer fängt mit frischen Zählern an. Erkannt an der Welle,
     damit es ohne eine Änderung an `runtime/start.js` auskommt —
     dieser Aufruf ist die einzige Stelle, die den Laden bedient. */
  if (menue.ladenWelle !== welt.welle) {
    menue.ladenWelle = welt.welle;
    menue.stille = welt.spieler.map(() => 0);
  }

  for (const s of welt.spieler) {
    const e = eingaben[s.id];
    /* Zuerst zählen, dann bedienen: Auch wer schon bereit ist, wird
       weitergezählt — sonst stünde sein Zähler fest und die Anzeige
       behauptete später, er sei gerade noch da gewesen. */
    if (istRegung(e)) menue.stille[s.id] = 0;
    else menue.stille[s.id] = (menue.stille[s.id] ?? 0) + 1;
  }

  for (const s of welt.spieler) {
    const e = eingaben[s.id];
    if (!e || s.bereit) continue;
    if (e.xFlanke) {
      menue.ladenZeiger[s.id] = (menue.ladenZeiger[s.id] + e.xFlanke + LADEN_FELDER) % LADEN_FELDER;
    }
    if (e.yFlanke) {
      menue.ladenZeiger[s.id] = (menue.ladenZeiger[s.id] + e.yFlanke + LADEN_FELDER) % LADEN_FELDER;
    }
    if (!e.knopfFlanke || menue.sperre > 0) continue;
    const z = menue.ladenZeiger[s.id];
    if (z === BEREIT) s.bereit = true;
    else if (z === NEU_WUERFELN) wuerfleNeu(welt, s, welt.welle + 1);
    else kaufe(s, z);
  }
  /* Weiter, sobald jeder entweder bereit ist **oder** verstummt. Ohne
     das zweite Wort wartet die Runde ewig auf jemanden, der nicht mehr
     da ist (#93). */
  return welt.spieler.every((s) => s.bereit || verstummt(menue.stille[s.id] ?? 0, welt.spieler.length));
}

/* ── Kleinkram ───────────────────────────────────────────────────── */

function kuerze(text, zeichen) {
  return text.length <= zeichen ? text : text.slice(0, Math.max(1, zeichen - 1)) + ".";
}

function umbrich(c, text, x, y, breite, farbe) {
  const proZeile = Math.max(1, Math.floor(breite / VORSCHUB));
  const worte = String(text).split(" ");
  let zeile = "", zy = y;
  for (const w of worte) {
    const probe = zeile ? zeile + " " + w : w;
    if (probe.length > proZeile && zeile) {
      zeichneText(c, zeile, x, zy, farbe);
      zy += 7;
      zeile = w;
    } else zeile = probe;
  }
  if (zeile) zeichneText(c, zeile, x, zy, farbe);
}
