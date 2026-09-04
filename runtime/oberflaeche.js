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
   `spiel/laden.mjs` und `spiel/stufen.mjs` (die Vorgänge dahinter). */

import { FARBEN, JAEGER_FARBEN } from "./palette.js";
import { zeichneText, zeichneTextMittig, zeichneTextUmrandet, textBreite, VORSCHUB } from "./schrift.js";
import { BREITE, HOEHE } from "./zeichnen.js";
import { WELLEN_JE_LAUF } from "../spiel/katalog/wellen.mjs";
import { neuwuerfelnPreis, kaufe, wuerfleNeu, ANGEBOTE } from "../spiel/laden.mjs";
import { nimmKarte } from "../spiel/stufen.mjs";

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

/* ── Anzeige während der Welle ───────────────────────────────────── */

export function zeichneAnzeige(c, welt) {
  const rest = Math.max(0, Math.ceil(welt.dauer - welt.zeit));
  const kopf = `NACHT ${welt.welle}/${WELLEN_JE_LAUF}`;
  zeichneTextUmrandet(c, kopf, 4, 4);
  const uhr = `${rest}`;
  zeichneTextMittig(c, uhr, BREITE / 2, 4, rest <= 5 ? FARBEN.flammeHell : FARBEN.schrift, FARBEN.kontur);
  leiste(c, BREITE / 2 - 40, 12, 80, 1 - welt.zeit / welt.dauer, FARBEN.flamme);

  /* Je Spieler eine kleine Tafel unten. Sie stehen nebeneinander,
     damit man den Zustand der Gruppe mit einem Blick erfasst — bei
     verteilten Ecken sucht man im Ernstfall. */
  const breite = Math.min(112, Math.floor(BREITE / welt.spieler.length) - 4);
  const start = Math.round((BREITE - (breite + 4) * welt.spieler.length + 4) / 2);
  welt.spieler.forEach((s, i) => {
    const x = start + i * (breite + 4);
    const y = HOEHE - 26;
    const farbe = JAEGER_FARBEN[s.id % JAEGER_FARBEN.length];
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

/* ── Kartenwahl beim Aufstieg ────────────────────────────────────── */

export function zeichneWahl(c, welt, menue) {
  c.fillStyle = "rgba(6,5,12,0.82)";
  c.fillRect(0, 0, BREITE, HOEHE);
  zeichneTextMittig(c, "DIE NACHT LEHRT DICH ETWAS", BREITE / 2, 10, FARBEN.flammeHell, FARBEN.kontur);

  const offene = welt.spieler.filter((s) => s.offeneWahlen > 0);
  const hoehe = Math.min(58, Math.floor((HOEHE - 30) / Math.max(1, offene.length)));
  offene.forEach((s, reihe) => {
    const y = 24 + reihe * (hoehe + 2);
    const farbe = JAEGER_FARBEN[s.id % JAEGER_FARBEN.length];
    zeichneText(c, `J${s.id + 1}`, 3, y + hoehe / 2 - 3, farbe.hell);
    const karten = s.karten ?? [];
    const kb = Math.floor((BREITE - 22) / karten.length) - 3;
    karten.forEach((k, i) => {
      const x = 18 + i * (kb + 3);
      const gewaehlt = menue.wahlZeiger[s.id] === i;
      kasten(c, x, y, kb, hoehe, gewaehlt ? farbe.hell : FARBEN.rahmen,
        gewaehlt ? "#1a1426" : "#0d0a14");
      zeichneText(c, k.name, x + 4, y + 5, farbe.hell);
      zeichneText(c, `+${k.menge}`, x + 4, y + 14, FARBEN.flammeHell);
      umbrich(c, k.text, x + 4, y + 24, kb - 8, FARBEN.schriftMatt);
    });
  });

  const warten = welt.spieler.filter((s) => s.offeneWahlen === 0);
  if (warten.length > 0 && offene.length > 0) {
    zeichneTextMittig(c, `${warten.map((s) => "J" + (s.id + 1)).join(" ")} WARTET`,
      BREITE / 2, HOEHE - 10, FARBEN.schriftMatt, FARBEN.kontur);
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
  zeichneTextMittig(c, `NACHT ${welt.welle} VON ${WELLEN_JE_LAUF}`, BREITE / 2, 78, FARBEN.schrift);
  welt.spieler.forEach((s, i) => {
    const farbe = JAEGER_FARBEN[s.id % JAEGER_FARBEN.length];
    zeichneTextMittig(c, `J${s.id + 1}  STUFE ${s.stufe}  ${s.getoetet ?? 0} ERSCHLAGEN`,
      BREITE / 2, 100 + i * 12, farbe.hell);
  });
  zeichneTextMittig(c, "KNOPF FÜR EINE NEUE NACHT", BREITE / 2, HOEHE - 26, FARBEN.flammeHell, FARBEN.kontur);
}

/* ── Bedienung der Menüs ─────────────────────────────────────────── */

export const SPERRE_SEKUNDEN = 0.28;

export function macheMenue() {
  return { spielerzahl: 1, sperre: 0, ladenZeiger: [0, 0, 0, 0], wahlZeiger: [0, 0, 0, 0] };
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
  return welt.spieler.every((s) => s.bereit);
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
