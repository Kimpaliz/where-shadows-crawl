/* [Aufgabe: Bedienung] Die Kartenhand am unteren Bildschirmrand.

   Janniks Ansage vom 05.09.2026, woertlich: „Die level up Karten
   werden auch angezeigt wie in einer hand gehalten am unteren
   bildschirmrand und wenn man sie anklickt werden sie hervorgehoben um
   sie besser lesen zu koennen, auf der karte steht der Title der schon
   zeigt worum es geht und darunter dann die werte … ihre werte auf der
   karte sind dynamisch und gruenlich hervorgehoben".

   ── Warum die Hand ausserhalb des Fackellichts liegt ───────────────

   `runtime/zeichnen.js` legt das Licht **multiplikativ** ueber die
   Szene; alles danach Gemalte ist davon unberuehrt. Diese Datei wird
   deshalb nach `zeichne()` gerufen — wie die Anzeige. Eine Karte, die
   man im Schatten nicht lesen kann, waere keine Stimmung, sondern ein
   Fehler: Man haelt sie genau in dem Moment in der Hand, in dem man
   eine Entscheidung treffen soll.

   ── Warum die Karten nicht gedreht sind ────────────────────────────

   Eine echte Hand faechert mit Drehung. Eine gedrehte Bildpunktschrift
   ist aber verwaschene Schrift — genau der eine Fleck, an dem man
   sieht, dass die Pixelgrafik unecht ist (`runtime/schrift.js`).
   Gefaechert wird deshalb ueber einen **Bogen aus Hoehenversatz** plus
   Ueberlappung: Die mittlere Karte steht am hoechsten, die aeusseren
   tiefer. Das liest sich als Hand, ohne einen einzigen schraegen
   Bildpunkt.

   ── Warum ein Klick nicht direkt `nimmKarte` ruft ──────────────────

   Ueber die Leitung gehen **rohe** Eingaben: zwei Achsen und ein Knopf
   (`runtime/eingabe.js`, `netz/lockstep.mjs`). Jeder Rechner rechnet
   daraus dieselbe Welt — auch `menue.wahlZeiger`, denn `bedieneWahl()`
   laeuft auf **allen** Rechnern fuer **alle** Spieler. Wuerde ein Klick
   den Zeiger nur oertlich verschieben, naehme derselbe Knopfdruck bei
   zwei Leuten verschiedene Karten, und die Welten liefen auseinander,
   ohne dass irgendwo ein Fehler erschiene.

   Deshalb speist der Zeigefinger **denselben Weg wie die Tastatur** —
   dieselbe Entscheidung wie beim Daumen-Stick. Ein Klick legt kleine
   Eingabeschritte in eine Warteschlange (`{x:+1}`, dann `{x:0}` zum
   Loslassen, sonst gibt es keine neue Flanke), und die gehen als ganz
   gewoehnliche Achsenausschlaege ueber die Leitung.

   ⚠️ **Eine Kette darf nur so schnell abfliessen, wie sie wirklich
   verschickt wird.** Ein Bildschirm mit 144 Hz rechnet die Welt nicht
   144-mal je Sekunde; ein Eingabebild, das kein Weltschritt abholt,
   waere verloren. Deshalb ruecken die Schritte nicht je Bild vor,
   sondern erst, wenn `quittiere()` meldet, dass ein Weltschritt sie
   benutzt hat — und `mische()` merkt sich mit `ausgegeben`, dass es
   ueberhaupt eine Ausgabe gab.

   ── Der Zeigefinger muss den Daumen-Stick ueberholen ───────────────

   Auf dem Telefon liegt `#stickfeld` als unsichtbare Flaeche ueber der
   **ganzen linken Haelfte** (`index.html`). Ein Tipp auf die linke
   Karte kaeme dort an und nicht hier. Deshalb horcht diese Datei in
   der **Einfangphase** am Fenster und haelt das Ereignis nur dann an,
   wenn es wirklich eine Karte trifft — sonst bleibt der Stick, was er
   ist.

   ⚠️ **Unten ist es eng:** links der Daumen-Stick, rechts der
   Ausweich-Knopf, dazu die Abklingzeit-Leiste einer anderen Baustelle.
   Die Hand steht deshalb nur waehrend der Phase „wahl" da, in der die
   Welt ohnehin haelt — und sie faengt Zeiger nur dann ab, wenn sie
   selbst gerade gemalt ist.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/start.js` (ruft, mischt und quittiert), `runtime/schrift.js`
   (die Bildpunktschrift), `runtime/palette.js` (die Farben),
   `spiel/stufen.mjs` (zieht die Hand), `spiel/katalog/karten.mjs`
   (was auf einer Karte steht), `runtime/oberflaeche.js`
   (`bedieneWahl()` bewegt den Zeiger und nimmt die Karte). */

import { FARBEN, JAEGER_FARBEN } from "./palette.js";
import { zeichneText, zeichneTextMittig, zeichneTextUmrandet, textBreite, VORSCHUB, ZEILE } from "./schrift.js";
import { BREITE, HOEHE } from "./zeichnen.js";

/* ── Masse ───────────────────────────────────────────────────────────

   `KARTE_B` ist nicht frei gewaehlt: Der laengste Titel im Katalog ist
   ein einzelnes Wort mit 16 Zeichen („LEICHENFLEDDERER"), und ein Wort
   laesst sich nicht umbrechen. 16 Zeichen sind 16 · 5 − 1 = 79
   Bildpunkte, dazu je 4 Rand — gemessen, nicht geschaetzt.

   `GROSS_B` folgt derselben Rechnung fuer die laengste Wertzeile. Auf
   der hervorgehobenen Karte soll Zahl **und** Name in **eine** Zeile
   passen, sonst waere „besser lesen koennen" eine Behauptung. Ueber
   4.000 Ziehungen gemessen ist die laengste „0 ABGELEHNTES KEHRT
   WIEDER" — 26 Zeichen, 129 Bildpunkte, dazu je 4 Rand.

   ⚠️ Der erste Anlauf stand auf 128 und rechnete nur mit dem **Namen**
   (24 Zeichen). Die Zahl davor war vergessen; 220 von 9.000 gemessenen
   Zeilen fielen durch. Die Zahl kam von der Pruefung, nicht vom
   Augenmass — und genau deshalb steht sie hier. */
export const KARTE_B = 88;
export const KARTE_H = 88;
export const GROSS_B = 140;
export const GROSS_H = 132;

/* Ueberlappung: 88 − 72 = 16 Bildpunkte. Weniger sieht aus wie eine
   Reihe, mehr verdeckt den Titel der Nachbarkarte. */
export const SCHRITT_X = 72;

/* Unterkante der Hand. Fuenf Bildpunkte Luft, damit die Karten am Rand
   liegen und nicht daran kleben. */
export const GRUND_Y = HOEHE - 5;

/* Der Bogen: die mittlere Karte steht am hoechsten. */
const BOGEN = 8;

/* Wie weit die uebrigen Karten zur Seite ruecken, wenn eine
   hervorgehoben wird.

   ⚠️ **Im Browser gemessen und deshalb ueberhaupt da:** Ohne Versatz
   deckte die grosse Karte ihre linke Nachbarin bis auf 45 von 88
   Bildpunkten zu — ihr Titel war in der Mitte durchgeschnitten. Genau
   der soll aber „schon zeigen, worum es geht".

   Die Zahl ist gerechnet, nicht geraten: halbe Breitendifferenz
   (70 − 44) plus die Ueberlappung (88 − 72). Damit stoesst die grosse
   Karte genau an ihre Nachbarn, statt sie zu verschlucken — und die
   ungewaehlten ueberlappen einander weiter wie zuvor. */
const VERSATZ = GROSS_B / 2 - KARTE_B / 2 + (KARTE_B - SCHRITT_X);

/* Gruen fuer die Zahlen — Janniks „gruenlich hervorgehoben". Aus der
   Palette, nicht frei gemischt. */
export const ZAHL_FARBE = FARBEN.seucheHell;

const RUECKEN = "#151021";
const RUECKEN_HELL = "#221a33";

/* ── Kleinkram ───────────────────────────────────────────────────── */

function kasten(c, x, y, b, h, rahmen, fuellung) {
  c.fillStyle = fuellung;
  c.fillRect(x, y, b, h);
  c.fillStyle = rahmen;
  c.fillRect(x, y, b, 1); c.fillRect(x, y + h - 1, b, 1);
  c.fillRect(x, y, 1, h); c.fillRect(x + b - 1, y, 1, h);
}

/* Text in Zeilen brechen, ohne zu malen. Getrennt vom Malen, damit die
   Hoehe vorher bekannt ist — sonst laeuft die Flavour-Zeile unten aus
   der Karte heraus, und man sieht es erst im Bild. */
export function brich(text, breite, maxZeilen = 99) {
  const proZeile = Math.max(1, Math.floor((breite + 1) / VORSCHUB));
  const zeilen = [];
  let zeile = "";
  for (const wort of String(text ?? "").split(" ")) {
    const probe = zeile ? zeile + " " + wort : wort;
    if (probe.length > proZeile && zeile) {
      zeilen.push(zeile);
      zeile = wort;
      if (zeilen.length === maxZeilen) break;
    } else zeile = probe;
  }
  if (zeilen.length < maxZeilen && zeile) zeilen.push(zeile);
  /* Was nicht mehr passt, wird gekuerzt statt abgeschnitten — ein Wort,
     das mitten im Bild endet, sieht aus wie ein Fehler. */
  if (zeilen.length === maxZeilen && maxZeilen > 0) {
    const letzte = zeilen[maxZeilen - 1];
    if (letzte.length > proZeile) zeilen[maxZeilen - 1] = letzte.slice(0, Math.max(1, proZeile - 1)) + ".";
  }
  return zeilen;
}

function trenner(c, x, y, b, farbe) {
  c.fillStyle = farbe;
  c.fillRect(x + 4, y, b - 8, 1);
}

/* ── Eine Karte malen ────────────────────────────────────────────── */

/* Die kleine, ungewaehlte Karte: Titel und Wertzeile. Der
   Flavour-Text fehlt hier mit Absicht — er ist Stimmung, und Stimmung
   in 5 Bildpunkten hoher Schrift auf 88 Bildpunkten Breite ist eine
   graue Flaeche, kein Text. */
export function maleKlein(c, karte, x, y) {
  kasten(c, x, y, KARTE_B, KARTE_H, FARBEN.rahmen, RUECKEN);
  c.fillStyle = karte.farbe ?? FARBEN.schriftMatt;
  c.fillRect(x + 1, y + 1, KARTE_B - 2, 3);

  const mitte = x + KARTE_B / 2;
  const titel = brich(karte.titel, KARTE_B - 8, 2);
  titel.forEach((z, i) => zeichneTextMittig(c, z, mitte, y + 9 + i * ZEILE, FARBEN.schrift));

  trenner(c, x, y + 27, KARTE_B, FARBEN.rahmen);

  let zy = y + 33;
  for (const zeile of karte.zeilen ?? []) {
    zeichneTextMittig(c, zeile.zahl, mitte, zy, ZAHL_FARBE);
    zy += ZEILE;
    for (const t of brich(zeile.text, KARTE_B - 8, 2)) {
      zeichneTextMittig(c, t, mitte, zy, FARBEN.schriftMatt);
      zy += ZEILE;
    }
    zy += 3;
  }
}

/* Die hervorgehobene Karte: groesser, hoeher, mit Seltenheit, allen
   Wertzeilen und dem Flavour-Text. Sie wird zuletzt gemalt und liegt
   deshalb ueber ihren Nachbarn — das ist der ganze Trick, warum es
   aussieht, als zoege man sie aus der Hand. */
export function maleGross(c, karte, x, y, jaegerFarbe) {
  const rand = karte.farbe ?? jaegerFarbe.hell;
  kasten(c, x, y, GROSS_B, GROSS_H, rand, RUECKEN_HELL);
  c.fillStyle = rand;
  c.fillRect(x + 1, y + 1, GROSS_B - 2, 4);

  const mitte = x + GROSS_B / 2;
  zeichneTextMittig(c, (karte.seltenheitName ?? "").toUpperCase(), mitte, y + 8, rand);

  let zy = y + 18;
  for (const z of brich(karte.titel, GROSS_B - 8, 2)) {
    zeichneTextMittig(c, z, mitte, zy, FARBEN.schrift);
    zy += ZEILE;
  }

  zy += 3;
  trenner(c, x, zy, GROSS_B, rand);
  zy += 5;

  /* Zahl und Name in **einer** Zeile, die Zahl gruen. Zusammen mittig
     gesetzt statt jede fuer sich — sonst stuenden „+10" und „LEBEN"
     untereinander zentriert und saehen aus wie zwei Angaben. */
  for (const zeile of karte.zeilen ?? []) {
    const bZahl = textBreite(zeile.zahl);
    const bText = textBreite(zeile.text);
    if (bZahl + VORSCHUB + bText <= GROSS_B - 8) {
      const links = Math.round(mitte - (bZahl + VORSCHUB + bText) / 2);
      zeichneText(c, zeile.zahl, links, zy, ZAHL_FARBE);
      zeichneText(c, zeile.text, links + bZahl + VORSCHUB, zy, FARBEN.schrift);
      zy += ZEILE + 1;
    } else {
      zeichneTextMittig(c, zeile.zahl, mitte, zy, ZAHL_FARBE);
      zy += ZEILE;
      for (const t of brich(zeile.text, GROSS_B - 8, 2)) {
        zeichneTextMittig(c, t, mitte, zy, FARBEN.schrift);
        zy += ZEILE;
      }
      zy += 1;
    }
  }

  zy += 2;
  trenner(c, x, zy, GROSS_B, FARBEN.rahmen);
  zy += 5;

  /* Wie viele Flavour-Zeilen noch passen, wird **gerechnet** und nicht
     geraten: unten bleiben zwoelf Bildpunkte fuer den Hinweis frei. */
  const platz = Math.max(0, Math.floor((y + GROSS_H - 12 - zy) / ZEILE));
  for (const z of brich(karte.text, GROSS_B - 8, platz)) {
    zeichneTextMittig(c, z, mitte, zy, FARBEN.schriftMatt);
    zy += ZEILE;
  }

  zeichneTextMittig(c, "NOCHMAL TIPPEN ODER KNOPF", mitte, y + GROSS_H - 9, jaegerFarbe.mittel);
}

/* ── Wo die Karten liegen ────────────────────────────────────────── */

/* Die Felder einmal rechnen und beim Malen **und** beim Treffen
   benutzen. Zwei Rechnungen waeren zwei Wahrheiten: Man klickt dann
   irgendwann daneben, und zwar genau um den Betrag, um den sich die
   beiden unterscheiden. */
export function felderFuer(anzahl, gewaehlt) {
  const felder = [];
  const gesamt = KARTE_B + (anzahl - 1) * SCHRITT_X;
  const links = Math.round((BREITE - gesamt) / 2);
  const mitteI = (anzahl - 1) / 2;
  for (let i = 0; i < anzahl; i++) {
    const spanne = mitteI === 0 ? 0 : (i - mitteI) / mitteI;
    const bogen = Math.round(BOGEN * (1 - spanne * spanne));
    const slotX = links + i * SCHRITT_X;
    if (i === gewaehlt) {
      const x = Math.max(4, Math.min(BREITE - 4 - GROSS_B,
        Math.round(slotX + KARTE_B / 2 - GROSS_B / 2)));
      felder.push({ i, x, y: GRUND_Y - GROSS_H, b: GROSS_B, h: GROSS_H, gross: true });
    } else {
      /* Nach aussen ruecken, damit die grosse Karte niemanden
         verschluckt. Ist gar keine gewaehlt (`gewaehlt` ausserhalb),
         bleibt die Reihe, wie sie ist. */
      const versatz = gewaehlt < 0 || gewaehlt >= anzahl ? 0
        : (i < gewaehlt ? -VERSATZ : VERSATZ);
      felder.push({
        i, x: Math.round(slotX + versatz), y: GRUND_Y - bogen - KARTE_H,
        b: KARTE_B, h: KARTE_H, gross: false
      });
    }
  }
  return felder;
}

/* In welcher Reihenfolge gemalt wird — und damit, was oben liegt.
   Steht als eigene Funktion da, weil die Pruefung dieselbe Reihenfolge
   braucht: Zwei Kopien waeren zwei Wahrheiten, und man klickte
   irgendwann genau um den Unterschied daneben. */
export function zeichenReihenfolge(felder) {
  return [...felder.filter((f) => !f.gross), ...felder.filter((f) => f.gross)];
}

/* Der kuerzeste Weg im Ring. `bedieneWahl()` rechnet
   `(z + xFlanke + n) % n` — der Zeiger laeuft also im Kreis, und ueber
   den Rand ist es manchmal naeher. */
export function schritteZu(ziel, jetzt, n) {
  const vor = (ziel - jetzt + n) % n;
  const zurueck = (jetzt - ziel + n) % n;
  return vor <= zurueck ? { richtung: 1, anzahl: vor } : { richtung: -1, anzahl: zurueck };
}

/* ── Die Hand ────────────────────────────────────────────────────── */

export function macheKartenhand(leinwand) {
  /* Was zuletzt gemalt wurde. Der Zeiger trifft **nur**, was auch zu
     sehen ist — sonst faengt die Hand Tipps ab, waehrend gar keine
     Karten daliegen. */
  let sicht = null;

  /* Die Eingabeschritte, die ein Klick ausloest. Siehe Kopfnotiz. */
  const kette = [];
  let ausgegeben = false;
  /* Wo der Zeiger nach allen wartenden Schritten stehen wird. Oertliche
     Vorausrechnung: Im Netzspiel hinkt `menue.wahlZeiger` um den
     Eingabeverzug hinterher, und danach zu zielen ergaebe zu viele
     Schritte. */
  let geplant = null;

  function ortAufLeinwand(e) {
    const r = leinwand.getBoundingClientRect();
    /* Ohne Groesse waere das eine Division durch null und der Ort still
       `NaN` — der Klick ginge ins Leere, ohne dass etwas meldet. */
    if (!(r.width > 0) || !(r.height > 0)) return null;
    return {
      x: (e.clientX - r.left) / r.width * BREITE,
      y: (e.clientY - r.top) / r.height * HOEHE
    };
  }

  function getroffen(ort) {
    if (!sicht || !ort) return null;
    /* Rueckwaerts: Die zuletzt gemalte Karte liegt oben, also trifft
       man sie zuerst. */
    for (let i = sicht.reihenfolge.length - 1; i >= 0; i--) {
      const f = sicht.reihenfolge[i];
      if (ort.x >= f.x && ort.x < f.x + f.b && ort.y >= f.y && ort.y < f.y + f.h) return f;
    }
    return null;
  }

  function tippe(feld) {
    const n = sicht.anzahl;
    if (kette.length === 0 || geplant === null) geplant = sicht.zeiger;

    /* Zweiter Tipp auf dieselbe Karte nimmt sie. Angehaengt wird der
       Knopf auch, wenn noch Bewegung wartet: Alles, was in der Kette
       steht, fuehrt bereits auf `geplant` zu — der Knopf kommt danach
       und trifft deshalb dieselbe Karte.

       ⚠️ **Der erste Anlauf verlangte eine leere Kette**, und das war
       gemessen falsch: Nach einer Bewegung liegt noch das Loslassen
       (`{x:0}`) darin, waehrend der Zeiger schon am Ziel steht. Der
       zweite Tipp fiel dann in den Bewegungszweig, rechnete null
       Schritte und tat **nichts** — 41 Bilder lang. */
    if (geplant === feld.i) {
      /* Aber nie zwei Knoepfe uebereinander: Der erste nimmt die Karte,
         `nimmKarte()` setzt den Zeiger auf 0 und legt eine neue Hand
         hin — der zweite naehme dann blind deren erste Karte. */
      if (kette.some((e) => e.knopf === true)) return;
      kette.push({ knopf: true }, { knopf: false });
      /* Nach dem Nehmen steht der Zeiger wieder auf 0 (`bedieneWahl`).
         `null` heisst: beim naechsten Tipp neu vom Bild ablesen. */
      geplant = null;
      return;
    }
    const { richtung, anzahl } = schritteZu(feld.i, geplant, n);
    for (let s = 0; s < anzahl; s++) kette.push({ x: richtung }, { x: 0 });
    geplant = feld.i;
  }

  /* In der Einfangphase am Fenster: sonst faengt `#stickfeld` den Tipp
     auf der linken Bildhaelfte ab (siehe Kopfnotiz). Angehalten wird
     das Ereignis nur, wenn es wirklich eine Karte trifft. */
  addEventListener("pointerdown", (e) => {
    /* Nur die linke Maustaste. Ob ueberhaupt eine Hand daliegt, klaert
       `getroffen()` — die Frage zweimal zu stellen hiesse, dass eine der
       beiden Stellen unbemerkt falsch werden kann (im Rot-Beweis genau
       so aufgefallen: Die eine Wache liess sich entfernen, ohne dass
       eine Pruefung anschlug). */
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const feld = getroffen(ortAufLeinwand(e));
    if (!feld) return;
    e.stopPropagation();
    e.preventDefault();
    tippe(feld);
  }, true);

  return {
    /* Die eigene Eingabe, ueberlagert von dem, was der Zeigefinger
       will. Ausserhalb der Kartenwahl wird die Kette geraeumt — eine
       Bewegung, die in der naechsten Welle ankaeme, waere ein Ruck ohne
       Ursache. */
    mische(eigene, welt) {
      if (!welt || welt.phase !== "wahl") {
        kette.length = 0;
        geplant = null;
        ausgegeben = false;
        sicht = null;
        return eigene;
      }
      const kopf = kette[0];
      if (!kopf) return eigene;
      ausgegeben = true;
      return {
        x: kopf.x ?? 0,
        y: 0,
        ausweichen: kopf.knopf === true || eigene.ausweichen
      };
    },

    /* Ein Weltschritt hat die Eingabe benutzt — erst jetzt darf der
       naechste Schritt nachruecken. */
    quittiere() {
      if (ausgegeben && kette.length > 0) kette.shift();
      ausgegeben = false;
    },

    /* Nur zum Nachsehen und Pruefen: was gerade wartet und was zu
       sehen ist. */
    kette: () => kette.slice(),
    sicht: () => sicht,

    zeichne(c, welt, menue, platz) {
      c.fillStyle = "rgba(6,5,12,0.82)";
      c.fillRect(0, 0, BREITE, HOEHE);
      zeichneTextMittig(c, "DIE NACHT LEHRT DICH ETWAS", BREITE / 2, 8, FARBEN.flammeHell, FARBEN.kontur);

      const eigener = welt.spieler.find((s) => s.id === platz) ?? welt.spieler[0];
      const fremde = welt.spieler.filter((s) => s !== eigener && s.offeneWahlen > 0);
      const warten = welt.spieler.filter((s) => s !== eigener && s.offeneWahlen === 0);

      if (fremde.length > 0) {
        zeichneTextMittig(c, `${fremde.map((s) => "J" + (s.id + 1)).join(" ")} WÄHLT NOCH`,
          BREITE / 2, 20, FARBEN.schriftMatt, FARBEN.kontur);
      } else if (warten.length > 0) {
        zeichneTextMittig(c, `${warten.map((s) => "J" + (s.id + 1)).join(" ")} WARTET`,
          BREITE / 2, 20, FARBEN.schriftMatt, FARBEN.kontur);
      }

      const karten = (eigener.offeneWahlen > 0 ? eigener.karten : null) ?? [];
      if (karten.length === 0) {
        sicht = null;
        zeichneTextMittig(c, "DIE ANDEREN WÄHLEN NOCH", BREITE / 2, HOEHE / 2 - 3,
          FARBEN.schriftMatt, FARBEN.kontur);
        return;
      }

      const zeiger = Math.min(Math.max(0, menue.wahlZeiger[eigener.id] ?? 0), karten.length - 1);
      const jaeger = JAEGER_FARBEN[eigener.id % JAEGER_FARBEN.length];
      const felder = felderFuer(karten.length, zeiger);

      /* Erst alle kleinen, dann die grosse — die Reihenfolge **ist** die
         Ueberlappung. */
      const reihenfolge = zeichenReihenfolge(felder);
      for (const f of reihenfolge) {
        if (f.gross) maleGross(c, karten[f.i], f.x, f.y, jaeger);
        else maleKlein(c, karten[f.i], f.x, f.y);
      }

      /* Wer waehlt, steht links neben seiner Hand. */
      zeichneTextUmrandet(c, `J${eigener.id + 1}`, 4, GRUND_Y - 14, jaeger.hell);
      if (eigener.offeneWahlen > 1) {
        zeichneTextUmrandet(c, `NOCH ${eigener.offeneWahlen}`, 4, GRUND_Y - 6, FARBEN.schriftMatt);
      }

      sicht = { reihenfolge, anzahl: karten.length, zeiger };
    }
  };
}
