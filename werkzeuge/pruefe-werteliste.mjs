/* [Aufgabe: Prüfwesen] Die Werteübersicht: stimmt die Vorschau, und passt sie hin?

       node werkzeuge/pruefe-werteliste.mjs

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   | was still kaputtgeht | wie es sich anfühlt |
   | --- | --- |
   | die Vorschau zeigt etwas anderes, als die Karte wirklich tut | man wählt nach einer Zahl, die es nicht gibt — und merkt es nie |
   | die Vorschau **verändert** den Spieler | jede Mausbewegung über eine Karte gibt Werte, die niemand genommen hat |
   | die Vorschau zieht aus `welt.zufall` | im Netz-Koop laufen zwei Rechner auseinander, sobald einer die Maus bewegt |
   | die Liste überlappt die Kartenhand | Schrift auf Karte — man sieht es und findet es nicht |
   | ein Name hat kein Zeichen in der Schrift | die Zeile wird still zu Fragezeichen |
   | die Pausenfläche liegt unter dem Ausweichknopf | auf dem Telefon weicht man aus, statt anzuhalten |

   ── Der Kern: zweimal derselbe Weg ─────────────────────────────────

   Die wichtigste Zusicherung der Datei rechnet **nicht nach**, sondern
   **geht beide Wege**: Dieselbe Karte wird einmal über
   `vorschauWerte()` angesehen und einmal über `nimmKarte()` wirklich
   genommen. Kommt nicht dasselbe heraus, ist die Vorschau eine
   Behauptung.

   Das ist Absicht und der einzige Weg, der trägt: Eine Vorschau, die
   `nimmKarte()` **nachbaut**, veraltet in dem Augenblick, in dem dort
   eine Zeile dazukommt — und zwar lautlos.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/werteliste.js` (das Geprüfte), `spiel/stufen.mjs`
   (`nimmKarte()`, die Wahrheit), `runtime/karten-hand.js` (wo die
   Liste bei der Kartenwahl steht), `runtime/oberflaeche.js`
   (die Pause), `runtime/schrift.js` (die Zeichen). */

import { macheMelder, liesDatei } from "./helfer.mjs";
import {
  KOPFZEILEN, ZEILENHOEHE, vorschauWerte, zeilenFuer, breiteFuer,
  zeichneWerteliste, metaHinweis
} from "../runtime/werteliste.js";
import {
  WERTE_X, WERTE_Y, WERTE_HOEHE, WERTE_MINDESTBREITE,
  felderFuer, GROSS_H, GRUND_Y
} from "../runtime/karten-hand.js";
import { PAUSE_FELD } from "../runtime/oberflaeche.js";
import { BREITE, HOEHE } from "../runtime/zeichnen.js";
import { bekannteZeichen, VORSCHUB } from "../runtime/schrift.js";
import { macheWerte, WERT_NACH_ID, WERTE, schadensminderung } from "../spiel/werte.mjs";
import { macheWelt, starteWelle } from "../spiel/welt.mjs";
import { pruefeAufstieg, nimmKarte, ziehKarten, mengeVon, regelnVon } from "../spiel/stufen.mjs";
import { KARTEN, ziehbareKarten } from "../spiel/katalog/karten.mjs";

const { melde, ende } = macheMelder({ still: true });

/* Ein Zeichner, der nichts malt, sondern mitschreibt — übernommen aus
   `werkzeuge/pruefe-kartenhand.mjs`. Damit lässt sich messen, **wo**
   etwas landet, und nicht nur, dass es nicht abstürzt. */
function macheAufnahme() {
  return {
    fillStyle: "#000000",
    rechtecke: [],
    fillRect(x, y, b, h) { this.rechtecke.push({ x, y, b, h, farbe: this.fillStyle }); }
  };
}

/* Eine Welt mit einem Spieler, der gleich wählen darf. */
function probeWelt(saat = 4, zusatz = {}) {
  const welt = macheWelt({ spielerzahl: 1, saat });
  starteWelle(welt, 1);
  const s = welt.spieler[0];
  Object.assign(s.werte, zusatz);
  s.wissen = 9999;
  pruefeAufstieg(welt);
  return welt;
}

/* ── 1 · Die Vorschau ist dieselbe Rechnung wie das Nehmen ───────────

   Beide Wege wirklich gehen, statt die eine Formel gegen die andere zu
   halten. Über **alle** ziehbaren Karten, nicht über eine Handvoll:
   Der Fehler säße sonst genau in der, die nicht dran war. */
{
  let geprueft = 0, abweichungen = [];

  /* ⚠️ **Der erste Anlauf nahm nur die Karten, die zufällig in der Hand
     lagen** — gemessen drei von sechsunddreissig. Damit hätte ein
     Fehler in einer seltenen Karte fünfunddreissig Läufe lang
     unentdeckt bleiben können, und die Zusicherung „über alle Karten"
     wäre eine gewesen, die ihre eigene Stichprobe nicht deckt
     (`docs/FEHLERBUCH.md` E4).

     Jetzt wird die Hand **gesetzt**: Zu jedem Katalogeintrag entsteht
     genau die Karte, die `macheKarte()` daraus machen würde — dieselbe
     `mengeVon()`, die auch `ziehKarten()` benutzt. `nimmKarte()` liest
     von einer Karte nur `wert`, `menge` und `regel`; mehr braucht es
     hier nicht. */
  for (const vorlage of ziehbareKarten()) {
    const welt = probeWelt(7);
    const s = welt.spieler[0];
    const karte = {
      id: vorlage.id,
      wert: vorlage.wirkung.art === "wert" ? vorlage.wirkung.wert : null,
      menge: mengeVon(vorlage, s.werte),
      regel: vorlage.wirkung.art === "regel" ? vorlage.wirkung.regel : null,
      zeilen: []
    };
    s.karten = [karte];
    s.offeneWahlen = 1;

    const vorher = { ...s.werte };
    const vorschau = vorschauWerte(vorher, karte);

    /* Die Vorschau darf den Spieler nicht anfassen. */
    if (!WERTE.every((id) => s.werte[id] === vorher[id])) {
      abweichungen.push(`${karte.id}: Vorschau hat den Spieler verändert`);
    }

    const genommen = nimmKarte(welt, s, 0);
    if (!genommen) { abweichungen.push(`${karte.id}: liess sich gar nicht nehmen`); continue; }

    for (const id of WERTE) {
      if (vorschau[id] !== s.werte[id]) {
        abweichungen.push(`${karte.id}/${id}: ${vorschau[id]} statt ${s.werte[id]}`);
      }
    }
    geprueft++;
  }

  melde(geprueft === ziehbareKarten().length,
    "**jede** ziehbare Karte wirklich einmal genommen und verglichen",
    `${geprueft} von ${ziehbareKarten().length}`);
  melde(abweichungen.length === 0,
    "die Vorschau stimmt mit dem überein, was `nimmKarte()` wirklich tut",
    abweichungen.slice(0, 3).join(" | "));
}

/* ── 2 · Die Vorschau zieht nicht aus dem Zufallsstrom ───────────────

   ⚠️ **Der teuerste Fehler, den diese Datei verhindert.** `nimmKarte()`
   zieht eine neue Hand, sobald noch ein Aufstieg offen ist — jede
   Ziehung verschiebt den gesäten Strom für alles Spätere. Eine
   Vorschau, die `nimmKarte()` „nur zum Ausrechnen" riefe, ließe im
   Netz-Koop zwei Rechner auseinanderlaufen, sobald einer die Maus über
   eine Karte bewegt. Man merkt es erst Minuten später, wenn die Gegner
   woanders stehen. */
{
  const welt = probeWelt(9);
  const s = welt.spieler[0];
  let zuege = 0;
  const echt = welt.zufall.zahl;
  welt.zufall.zahl = () => { zuege++; return echt.call(welt.zufall); };

  for (const k of s.karten) {
    vorschauWerte(s.werte, k);
    zeilenFuer(s.werte, k);
    zeilenFuer(s.werte, k, true);
  }
  melde(zuege === 0, "die Vorschau zieht kein einziges Mal aus `welt.zufall`",
    `${zuege} Züge`);

  /* Gegenprobe: Der echte Griff zieht sehr wohl — sonst prüfte die
     Zeile oben eine Selbstverständlichkeit an einem Strom, den
     niemand anfasst. */
  zuege = 0;
  s.offeneWahlen = 2;
  nimmKarte(welt, s, 0);
  melde(zuege > 0, "und `nimmKarte()` mit offener Wahl sehr wohl", `${zuege} Züge`);
}

/* ── 3 · Die Liste zeigt etwas, auch wenn alles null ist ─────────────

   Der erste Entwurf blendete Nullwerte aus. Am Anfang eines Laufs sind
   **alle** null — die Übersicht war leer, und die Vorschau hatte
   nichts, woran sie sich hätte zeigen können. Eine Übersicht, die erst
   hilft, wenn man schon etwas hat, hilft genau dann nicht, wenn man sie
   braucht. */
{
  const frisch = macheWerte();
  const zeilen = zeilenFuer(frisch, null);
  melde(zeilen.length === KOPFZEILEN.length,
    "eine frische Figur bekommt die volle Kopfgruppe zu sehen",
    `${zeilen.length} von ${KOPFZEILEN.length}`);
  melde(zeilen.every((z) => !z.geaendert), "und ohne Karte ändert sich nichts");
  melde(zeilen.every((z) => z.jetzt.length > 0), "jede Zeile trägt eine Zahl");

  /* Leben und Tempo sind **nicht** null, obwohl der Wert null ist —
     sie sind abgeleitet. Genau das ist der Grund, warum es die
     Kopfgruppe gibt. */
  /* ── Janniks Ansage: „alle werte … sollen genommen werden" ──────

     Die volle Liste muss **jeden** der 55 Werte zeigen, auch die auf
     null — sonst ist es eine Auswahl und keine Übersicht. Gezählt wird
     gegen `WERTE`, nicht gegen eine Zahl im Text: Eine Prosazahl neben
     einer Liste ist ein Fehler in Wartestellung (`FEHLERBUCH.md` E2). */
  const voll = zeilenFuer(frisch, null, true);
  const gezeigt = new Set();
  for (const z of voll) {
    if (z.ueberschrift) continue;
    gezeigt.add(z.name);
  }
  const kopfNamen = new Set(KOPFZEILEN.map((z) => z.name));
  const fehlendeWerte = WERTE.filter((id) => {
    const e = WERT_NACH_ID.get(id);
    const name = (e?.name ?? id).toUpperCase().replace(/ %$/, "");
    return !gezeigt.has(name) && !KOPFZEILEN.some((z) => z.id === id);
  });
  melde(fehlendeWerte.length === 0,
    "die volle Liste zeigt jeden der 55 Werte",
    `${fehlendeWerte.length} fehlen: ${fehlendeWerte.slice(0, 4).join(" ")}`);
  melde(voll.some((z) => z.ueberschrift),
    "und gliedert sie nach Bereichen, statt eine Wand aus Zeilen zu sein",
    `${voll.filter((z) => z.ueberschrift).length} Überschriften`);
  melde(voll.filter((z) => !z.ueberschrift).every((z) => z.symbol && z.symbol.raster),
    "jede Zeile trägt ein Zeichen");

  const leben = zeilen.find((z) => z.name === "LEBEN");
  const tempo = zeilen.find((z) => z.name === "TEMPO");
  melde(leben && Number(leben.jetzt) > 0, "LEBEN zeigt das Grundleben, nicht die Null",
    leben?.jetzt);
  melde(tempo && Number(tempo.jetzt) > 0, "TEMPO zeigt das Grundtempo", tempo?.jetzt);
}

/* ── 4 · Die Vorschau zeigt die **Wirkung**, nicht die Kartenzahl ────

   Bei Rüstung ist das der ganze Punkt: Sie wirkt gedeckelt. „+12
   Rüstung" heißt bei 0 etwas anderes als bei 60, und wer nur die Zahl
   der Karte sieht, kann das nicht wissen. */
{
  const werte = macheWerte();
  const karte = { wert: "ruestung", menge: 30 };
  const zeilen = zeilenFuer(werte, karte);
  const schutz = zeilen.find((z) => z.name === "SCHUTZ");

  melde(schutz && schutz.geaendert, "eine Rüstungskarte ändert die Schutzzeile");
  melde(schutz && schutz.jetzt === "0%", "von null aus", schutz?.jetzt);
  melde(schutz && schutz.dann === "50%", "auf die Hälfte", schutz?.dann);

  /* Und dieselbe Karte auf einer schon gepanzerten Figur bringt
     **weniger** — der Beweis, dass wirklich die Ableitung gezeigt wird
     und nicht die Summe. */
  const gepanzert = macheWerte({ ruestung: 60 });
  const z2 = zeilenFuer(gepanzert, karte).find((z) => z.name === "SCHUTZ");
  const zuwachs1 = 50 - 0;
  const zuwachs2 = Number(z2.dann.replace("%", "")) - Number(z2.jetzt.replace("%", ""));
  melde(zuwachs2 < zuwachs1,
    "dieselbe Karte bringt einer gepanzerten Figur weniger — die Vorschau zeigt die Wirkung",
    `${zuwachs1} gegen ${zuwachs2} Punkte`);
  /* Gegenprobe an der Quelle: Das ist wirklich so und keine
     Eigenheit der Anzeige. */
  melde(schadensminderung(macheWerte({ ruestung: 90 }))
    - schadensminderung(macheWerte({ ruestung: 60 }))
    < schadensminderung(macheWerte({ ruestung: 30 })),
    "und die Rüstungsformel deckelt wirklich");
}

/* ── 5 · Nur die betroffene Zeile leuchtet ───────────────────────────

   Wären alle als „geändert" gemalt, wäre die Hervorhebung wertlos —
   und wäre keine, sähe man die Vorschau nicht. */
{
  const werte = macheWerte();
  const zeilen = zeilenFuer(werte, { wert: "schaden", menge: 5 });
  const geaendert = zeilen.filter((z) => z.geaendert);
  melde(geaendert.length >= 1, "eine Schadenskarte hebt mindestens eine Zeile hervor");
  melde(geaendert.every((z) => z.name === "SCHADEN"),
    "und genau die, um die es geht", geaendert.map((z) => z.name).join(" "));

  /* ⚠️ **Und sie bleibt sichtbar, auch wenn der Platz knapp wird.**
     Im Browser gemessen: Die Kopfgruppe hat 13 Zeilen, neben die
     Kartenhand passen 14. Eine Karte auf „Flächenschaden" — einen
     Wert, der nicht in der Kopfgruppe steht — machte daraus 15, und
     mit dem Hinweis „+N weitere" fiel ausgerechnet die eine Zeile
     heraus, um die es ging.

     Geprüft wird über **jede** ziehbare Karte und mit dem Platz, den
     die Kartenhand wirklich hat. */
  {
    const platz = Math.floor((WERTE_HOEHE - ZEILENHOEHE - 2) / ZEILENHOEHE);
    melde(platz >= 10, "neben die Kartenhand passen genug Zeilen", `${platz}`);

    const unsichtbar = [];
    for (const vorlage of ziehbareKarten()) {
      if (vorlage.wirkung.art !== "wert") continue;
      const probe = macheWerte();
      const karte = { id: vorlage.id, wert: vorlage.wirkung.wert,
        menge: mengeVon(vorlage, probe), regel: null, zeilen: [] };
      const gekuerzt = zeilenFuer(probe, karte, false, platz);
      const sichtbar = gekuerzt.slice(0, platz);
      if (!sichtbar.some((z) => z.geaendert)) unsichtbar.push(vorlage.id);
      if (gekuerzt.length > platz) unsichtbar.push(`${vorlage.id}(zu lang)`);
    }
    melde(unsichtbar.length === 0,
      "bei jeder Karte ist die geänderte Zeile wirklich zu sehen",
      unsichtbar.slice(0, 4).join(" "));

    /* Gegenprobe: Ohne den Platzhinweis wäre die Liste länger — sonst
       prüfte die Zeile oben eine Kürzung, die gar nicht stattfindet. */
    const probe = macheWerte();
    const lang = zeilenFuer(probe, { wert: "flaechenschaden", menge: 17 }, false, 0);
    const kurz = zeilenFuer(probe, { wert: "flaechenschaden", menge: 17 }, false, platz);
    melde(lang.length > kurz.length,
      "und ohne Platzangabe wäre sie zu lang gewesen",
      `${lang.length} auf ${kurz.length}`);
    melde(kurz.some((z) => z.geaendert && z.name.startsWith("FL")),
      "die Flächenschadenzeile überlebt die Kürzung");
  }

  /* Ein Wert ohne eigene Kopfzeile taucht trotzdem auf, sobald die
     Karte ihn anfasst — sonst zeigte die Vorschau bei zwei Dritteln
     aller Karten gar nichts. */
  const selten = zeilenFuer(werte, { wert: "widerstand_feuer", menge: 12 });
  const treffer = selten.filter((z) => z.geaendert);
  melde(treffer.length === 1, "auch ein Wert ohne Kopfzeile wird eingeblendet",
    treffer.map((z) => z.name).join(" "));

  /* Und eine Meta-Karte bekommt einen Text statt einer leeren
     Vorschau, in der sich nichts rührt. */
  const meta = KARTEN.find((k) => k.wirkung.art === "regel");
  melde(!!meta, "es gibt Meta-Karten im Katalog");
  melde(metaHinweis({ regel: "x", zeilen: [{ text: "VIER STATT DREI" }] }) === "VIER STATT DREI",
    "eine Meta-Karte bekommt ihren Text als Hinweis");
  melde(metaHinweis({ wert: "leben", menge: 5 }) === null,
    "eine Wertkarte nicht — dort spricht die Vorschau für sich");
}

/* ── 6 · Sie passt dorthin, wo sie hingemalt wird ────────────────────

   Nicht „ungefähr links oben", sondern gegen die **echten** Felder der
   Kartenhand gerechnet, bei jeder Kartenzahl und jeder Auswahl. */
{
  melde(WERTE_X >= 0 && WERTE_Y >= 0, "die Liste beginnt im Bild");
  melde(WERTE_Y + WERTE_HOEHE <= GRUND_Y - GROSS_H,
    "und endet über der hervorgehobenen Karte",
    `${WERTE_Y + WERTE_HOEHE} gegen ${GRUND_Y - GROSS_H}`);
  melde(WERTE_HOEHE >= ZEILENHOEHE * 10,
    "es passen mindestens zehn Zeilen hinein",
    `${Math.floor(WERTE_HOEHE / ZEILENHOEHE)} Zeilen`);

  /* Die schlimmste Breite, die je vorkommen kann: eine Figur mit
     lauter dreistelligen Werten. */
  const dick = macheWerte();
  for (const id of WERTE) dick[id] = 999;
  const breit = Math.max(WERTE_MINDESTBREITE, breiteFuer(zeilenFuer(dick, null)));
  melde(WERTE_X + breit <= BREITE, "auch im schlimmsten Fall ragt sie nicht aus dem Bild",
    `${WERTE_X + breit} von ${BREITE}`);

  /* Und sie überlappt keine Karte — geprüft gegen `felderFuer()`,
     dieselbe Funktion, die die Hand malt. Zwei Rechnungen wären zwei
     Wahrheiten. */
  let ueberlappt = [];
  for (const n of [3, 4]) {
    for (let g = 0; g < n; g++) {
      for (const f of felderFuer(n, g)) {
        const schneidetX = WERTE_X < f.x + f.b && WERTE_X + breit > f.x;
        const schneidetY = WERTE_Y < f.y + f.h && WERTE_Y + WERTE_HOEHE > f.y;
        if (schneidetX && schneidetY) ueberlappt.push(`${n}/${g}/#${f.i}`);
      }
    }
  }
  melde(ueberlappt.length === 0, "die Liste überlappt keine Karte",
    ueberlappt.slice(0, 4).join(" "));
}

/* ── 7 · Gemalt wird wirklich, und innerhalb des Kastens ─────────── */
{
  const werte = macheWerte({ leben: 40, ruestung: 12, krit_chance: 7 });
  const zeilen = zeilenFuer(werte, { wert: "leben", menge: 10 });
  const breite = Math.max(WERTE_MINDESTBREITE, breiteFuer(zeilen));
  const c = macheAufnahme();
  zeichneWerteliste(c, zeilen, WERTE_X, WERTE_Y, breite, WERTE_HOEHE);

  melde(c.rechtecke.length > 0, "die Liste malt überhaupt etwas",
    `${c.rechtecke.length} Bildpunkte`);
  const raus = c.rechtecke.filter((r) =>
    r.x < WERTE_X || r.y < WERTE_Y
    || r.x + r.b > WERTE_X + breite + 1 || r.y + r.h > WERTE_Y + WERTE_HOEHE + 1);
  melde(raus.length === 0, "und bleibt dabei in ihrem Kasten",
    raus.slice(0, 3).map((r) => `${r.x},${r.y}`).join(" "));

  /* Grün für den neuen Wert — Janniks „grünlich hervorgehoben", in
     derselben Farbe wie die Zahlen auf den Karten. */
  const gruen = c.rechtecke.filter((r) => r.farbe === "#9ccc55");
  melde(gruen.length > 0, "der Wert nach der Karte steht in Grün",
    `${gruen.length} Bildpunkte`);

  /* Passt nicht alles hinein, wird es **gesagt**. Eine Liste, die
     stillschweigend endet, liest sich wie eine vollständige. */
  const viele = zeilenFuer(werte, null, true);
  const eng = macheAufnahme();
  const hoehe = zeichneWerteliste(eng, viele, WERTE_X, WERTE_Y, breite, ZEILENHOEHE * 4);
  melde(hoehe <= ZEILENHOEHE * 4, "in einem engen Kasten wird nicht überschrieben",
    `${hoehe} von ${ZEILENHOEHE * 4}`);
  melde(eng.rechtecke.every((r) => r.y < WERTE_Y + ZEILENHOEHE * 4 + 1),
    "und nichts ragt unten heraus");
}

/* ── 8 · Jeder Name lässt sich wirklich malen ────────────────────────

   Ein Zeichen ohne Glyph wird still zu einem Fragezeichen und sieht aus
   wie ein Fehler im Text — dieselbe Sorge wie in
   `werkzeuge/pruefe-schrift.mjs`, hier nur für die Namen, die diese
   Datei erfindet. */
{
  const { glyphen, umlaute } = bekannteZeichen();
  const kennt = (z) => z === " " || glyphen[z] !== undefined || umlaute[z] !== undefined;

  const alles = macheWerte();
  for (const id of WERTE) alles[id] = 5;
  const zeilen = zeilenFuer(alles, { wert: "leben", menge: 3 }, true);

  const fehlend = new Set();
  for (const z of zeilen) {
    const texte = z.ueberschrift
      ? [z.ueberschrift]
      : [z.name, z.jetzt, z.dann, `${z.jetzt} > ${z.dann}`];
    for (const t of texte) {
      for (const c of t) if (!kennt(c)) fehlend.add(c);
    }
  }
  melde(fehlend.size === 0, "jedes Zeichen der Liste hat einen Glyphen",
    [...fehlend].join(" "));
  melde(zeilen.length > KOPFZEILEN.length,
    "und mit allen Werten gesetzt zeigt sie mehr als die Kopfgruppe",
    `${zeilen.length}`);
}

/* ── 9 · Die Pause ──────────────────────────────────────────────────

   Sie ist **örtlich** und keine Weltphase. Wäre sie eine, hielte im
   Netz-Koop ein Einzelner die Runde für alle an, sobald er nachsehen
   will. Geprüft am Quelltext, weil es genau um die Abwesenheit einer
   Zeile geht. */
{
  const kern = liesDatei("spiel/welt.mjs");
  melde(!/phase\s*=\s*"pause"/.test(kern),
    "der Regelkern kennt keine Pausenphase — die Pause gehört dem Bildschirm");

  const start = liesDatei("runtime/start.js");
  melde(/function schaltePause\(\)/.test(start), "es gibt einen Pausenschalter");
  melde(/pause && !gleichschritt/.test(start),
    "und er hält die Welt nur an, wenn niemand mitspielt");
  melde(/Escape|KeyP/.test(start), "die Tastatur kann ihn erreichen");
  /* ⚠️ Nur dort, wo die Uhr läuft. Bei „wahl" und „laden" wartet die
     Welt ohnehin auf den Spieler; im Browser gemessen lagen dort zwei
     Bildschirme übereinander, von denen keiner mehr zu lesen war. */
  melde(/const PAUSE_PHASEN = \["welle", "truhen"\]/.test(start),
    "und er greift nur in den Phasen, in denen die Uhr läuft");
  melde(/PAUSE_PHASEN\.includes\(welt\.phase\)/.test(start),
    "gefragt wird das auch wirklich, nicht nur aufgeschrieben");
  melde(/pause = false/.test(start),
    "und ein Phasenwechsel beendet die Pause von selbst");

  /* Die Fläche zum Antippen liegt im Bild, ist groß genug für einen
     Finger und liegt **nicht** dort, wo schon etwas anderes liegt. */
  melde(PAUSE_FELD.x >= 0 && PAUSE_FELD.y >= 0
    && PAUSE_FELD.x + PAUSE_FELD.b <= BREITE
    && PAUSE_FELD.y + PAUSE_FELD.h <= HOEHE,
    "die Pausenfläche liegt im Bild",
    `${PAUSE_FELD.x},${PAUSE_FELD.y} ${PAUSE_FELD.b}x${PAUSE_FELD.h}`);
  melde(PAUSE_FELD.b >= 16 && PAUSE_FELD.h >= 9,
    "und ist groß genug, um sie zu treffen",
    `${PAUSE_FELD.b}x${PAUSE_FELD.h}`);

  /* Nicht über der Kartenhand — dort wäre ein Tipp zweideutig. */
  let ueber = [];
  for (const n of [3, 4]) {
    for (let g = 0; g < n; g++) {
      for (const f of felderFuer(n, g)) {
        if (PAUSE_FELD.x < f.x + f.b && PAUSE_FELD.x + PAUSE_FELD.b > f.x
          && PAUSE_FELD.y < f.y + f.h && PAUSE_FELD.y + PAUSE_FELD.h > f.y) {
          ueber.push(`${n}/${g}/#${f.i}`);
        }
      }
    }
  }
  melde(ueber.length === 0, "und liegt über keiner Karte", ueber.slice(0, 3).join(" "));

  /* Und nicht über der Werteliste. */
  melde(!(PAUSE_FELD.x < WERTE_X + WERTE_MINDESTBREITE
    && PAUSE_FELD.x + PAUSE_FELD.b > WERTE_X
    && PAUSE_FELD.y < WERTE_Y + WERTE_HOEHE
    && PAUSE_FELD.y + PAUSE_FELD.h > WERTE_Y),
    "und nicht über der Werteübersicht");

  /* In der oberen Hälfte: Unten ist auf dem Telefon alles belegt —
     links der Daumen-Stick, rechts der Ausweichknopf. */
  melde(PAUSE_FELD.y + PAUSE_FELD.h < HOEHE / 3,
    "sie liegt oben, wo auf dem Telefon nichts anderes liegt",
    `unterkante ${PAUSE_FELD.y + PAUSE_FELD.h} von ${HOEHE}`);
}

/* ── 10 · Die Kartenhand fragt wirklich nach dem Schweben ────────────

   `docs/FEHLERBUCH.md` E1: Was gebaut ist und von niemandem gerufen
   wird, geht still kaputt. Die Zeile prüft, dass die Hand die Liste
   überhaupt malt und dabei nach dem schwebenden Zeiger fragt. */
{
  const hand = liesDatei("runtime/karten-hand.js");
  melde(/zeichneWerteliste\(/.test(hand), "die Kartenhand malt die Werteliste");
  melde(/schwebtAuf/.test(hand) && /pointermove/.test(hand),
    "und hört auf die Zeigerbewegung");
  melde(/schwebtAuf !== null[\s\S]{0,120}: zeiger/.test(hand),
    "mit der angewählten Karte als Rückfall — sonst gäbe es für Tastatur und Gamepad keine Vorschau");

  const flaeche = liesDatei("runtime/oberflaeche.js");
  melde(/zeichneWerteliste\(/.test(flaeche), "und der Pausenbildschirm ebenfalls");
}

ende();
