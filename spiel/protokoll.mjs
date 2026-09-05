/* [Aufgabe: Regelkern] Das Auswertungsprotokoll — ein Beobachter, kein Haken.

   ── Die tragende Entscheidung ───────────────────────────────────────

   Diese Datei setzt **keinen einzigen Haken** in `welt.mjs`, `kampf.mjs`
   oder sonst irgendwo im Regelkern. Sie liest nur, was ohnehin auf der
   Welt steht, und tastet nach jedem Schritt von außen ab — deshalb
   `abtasten(welt)`, nicht `hakeEin(welt)`. Ein Beobachter, der
   beobachtet, was er selbst verändert, misst sich selbst.

   Fast jede Zahl aus Janniks Bestellung ist von außen sichtbar, wenn
   man zwei Abtastungen vergleicht: Gegnerzahl, Restzeit, Wellennummer
   stehen in `welt`; ein Gegner, der eben noch stand und jetzt fehlt,
   ist gestorben — seine letzte Position kennt man aus der Abtastung
   davor. Zwei Fallen dabei sind die eigentliche Arbeit dieser Datei:

   1. **Verschwinden heißt nicht sterben.** `beendeWelle()` (`welt.mjs`)
      räumt am Wellenende **alle** Gegner weg, tot oder nicht — ohne das
      wäre jeder Überlebende ein erfundener Toter. Unterschieden wird an
      `g.tot`: Das Objekt bleibt nach dem Entfernen aus `welt.gegner`
      unverändert im Speicher, solange diese Datei es noch referenziert
      (sie tut es, als Schlüssel der eigenen Verfolgungstabelle) — seine
      Felder lassen sich also **nach** dem Herausfallen noch lesen.
   2. **Ein Schlag kann zugleich der erste und der letzte sein.** Stirbt
      ein Gegner in demselben Schritt, in dem er zum ersten Mal
      getroffen wird, gibt es nie eine Abtastung mit „getroffen, aber
      noch da". Bleibt `ersterTrefferZeit` bis zum Verschwinden `null`,
      war genau das der Fall — der Sterbezeitpunkt **ist** dann der
      erste Treffer.

   ── Zwei bewusste Auslassungen, beide begründet ─────────────────────

   - **Schadensmenge je Quelle** wird nicht gemessen, nur die
     **Anzahl** der Treffer je Quelle (Berührung/Fernkampf) — die Menge
     stünde in `welt.zahlen`, aber Einträge daraus einem bestimmten
     Treffer zuzuordnen bräuchte eine eigene Objektverfolgung wie bei
     Gegnern und Beute, und dafür fehlte die Zeit. Steht so in der
     Rückmeldung, nicht stillschweigend als Lücke.
   - **Gold und Wissen** werden mit zwei verschiedenen Verfahren
     rekonstruiert, absichtlich nicht mit demselben: Gold wird während
     einer Welle nur eingesammelt, nie ausgegeben (Einkauf läuft nur in
     der Ladenphase) — deshalb reicht die Summe der **positiven**
     Änderungen von `spieler.gold`. Wissen dagegen wird **im selben
     Schritt** eingesammelt und beim Aufstieg wieder abgezogen
     (`pruefeAufstieg` läuft nach `bewegeBeute` in `welt.mjs schritt()`)
     — eine einfache Differenzsumme würde genau in diesem Moment beides
     verschlucken. Deshalb wird Wissen aus der Aufstiegsformel selbst
     zurückgerechnet: `aufgesammelt = übrig + Σ schwelle(k)` über jede
     erklommene Stufe. Das ist derselbe Fallstrick, vor dem
     `docs/REGELN.md` warnt: eine Messung, die zwei Dinge im selben
     Augenblick zusammenwirft, unterschlägt beide um denselben Betrag.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/welt.mjs` (liest `SCHRITT`, sonst nichts), `spiel/stufen.mjs`
   (liest `schwelle`, für die Wissensrechnung), `werkzeuge/balance.mjs`
   (ruft `abtasten` nach jedem echten Schritt auf),
   `werkzeuge/auswertung.mjs` (formt `auswerten()` in Tabellen um). */

import { SCHRITT } from "./welt.mjs";
import { schwelle } from "./stufen.mjs";

/* Zeitmarken innerhalb einer Welle, als Anteil ihrer Dauer. */
const ZEITMARKEN = [0, 0.25, 0.5, 0.75, 1.0];

function neueWellenAufzeichnung(nummer) {
  return {
    nummer,
    startZeit: null,
    dauerGeplant: 0, zeitZuletzt: 0, ticksZuletzt: 0,
    beendet: false, endeGrund: null,

    proben: 0, gegnerSumme: 0, gegnerHoechststand: 0,
    naechsteMarkeIndex: 0, marken: [],

    lebenSumme: 0, lebenProben: 0, lebenTief: Infinity,

    erschienenAnzahl: 0, erschienenLebenSumme: 0,
    getoetetAnzahl: 0, getoetetLebenSumme: 0, ueberlebtAnzahl: 0,

    goldErschienen: 0, wissenErschienen: 0,
    todeSpieler: 0,

    spielerEndzustand: null
  };
}

function momentaufnahmeSpieler(s) {
  return {
    stufe: s.stufe, gold: s.gold, wissen: s.wissen,
    leben: s.leben, lebenMax: s.lebenMax,
    werte: { ...s.werte },
    waffen: s.waffen.map((w) => `${w.id}${w.stufe}`),
    gegenstaende: s.gegenstaende.length
  };
}

function verteilung(werte) {
  if (werte.length === 0) return null;
  const sortiert = werte.slice().sort((a, b) => a - b);
  const bei = (p) => sortiert[Math.min(sortiert.length - 1, Math.floor(p * sortiert.length))];
  const summe = sortiert.reduce((a, b) => a + b, 0);
  return {
    anzahl: sortiert.length,
    min: sortiert[0], p10: bei(0.10), median: bei(0.50), p90: bei(0.90),
    max: sortiert[sortiert.length - 1], mittel: summe / sortiert.length
  };
}

/* Der nächste Spieler zu einem Punkt — unabhängig vom Zustand, denn
   auch ein liegender Spieler ist noch ein Ort, an dem ein Gegner
   gestorben sein kann. */
function naechsteEntfernung(spieler, x, y) {
  let bester = Infinity;
  for (const s of spieler) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bester) bester = d;
  }
  return bester;
}

export function macheProtokoll() {
  const gegnerVerfolgung = new Map();   // Gegner-Objekt -> Eintrag
  const beuteVerfolgung = new Map();    // Beute-Objekt -> Eintrag
  const spielerZustand = [];            // je Spieler ein Eintrag
  const wellen = new Map();             // Wellennummer -> Aufzeichnung

  const ereignisseGegnerTod = [];
  const zeitenBisAufsammeln = [];
  let beuteAufgesammeltAnzahl = 0, beuteVerlorenAnzahl = 0;
  let nieGetroffenAnzahl = 0;
  const treffer = { beruehrung: 0, fernkampf: 0 };
  let goldVerlorenVorher = 0, goldVerlorenGesamt = 0;

  let welleVorher = null;
  let letzteKampfSchnappschuss = null;

  function wellenDaten(nummer) {
    if (!wellen.has(nummer)) wellen.set(nummer, neueWellenAufzeichnung(nummer));
    return wellen.get(nummer);
  }

  /* Schließt eine Welle ab — beim Wellenwechsel für die vorige, oder
     einmalig am Ende der Messung für die letzte, egal ob sie regulär
     endete oder die Messung mittendrin aufhörte. Ohne die
     Absicherung `beendet` würde ein doppelter Aufruf (Wellenwechsel
     **und** Abschlussruf) den Endzustand ein zweites Mal einfrieren —
     harmlos hier, aber ein Zeichen für einen Aufrufer, der die
     Reihenfolge nicht einhält. */
  function schliesseWelle(nummer) {
    const w = wellen.get(nummer);
    if (!w || w.beendet) return;
    w.beendet = true;
    w.dauerTatsaechlich = w.zeitZuletzt;
    w.restzeit = w.dauerGeplant - w.zeitZuletzt;
    w.spielerEndzustand = letzteKampfSchnappschuss;
  }

  function abtasten(welt) {
    const zeitJetzt = welt.ticks * SCHRITT;
    const w = wellenDaten(welt.welle);
    if (w.startZeit === null) w.startZeit = zeitJetzt;
    /* Immer nachführen, unabhängig von der Phase — so trifft die
       Restzeit auch dann zu, wenn die letzte Welle mitten in einer
       Kartenwahl endet (`pruefeWeiter` kann `beendeWelle` ohne einen
       sichtbaren „welle"-Schritt dazwischen auslösen). */
    w.dauerGeplant = welt.dauer;
    w.zeitZuletzt = welt.zeit;
    w.ticksZuletzt = welt.ticks;

    /* ── Gegner: Erscheinen, erster Treffer, Verschwinden ──────────── */
    const aktuelleGegner = new Set(welt.gegner);
    for (const g of aktuelleGegner) {
      let eintrag = gegnerVerfolgung.get(g);
      if (!eintrag) {
        eintrag = { welle: welt.welle, entstehungsZeit: zeitJetzt, lebenMaxBeiEntstehung: g.lebenMax, ersterTrefferZeit: null };
        gegnerVerfolgung.set(g, eintrag);
        w.erschienenAnzahl++;
        w.erschienenLebenSumme += g.lebenMax;
      } else if (eintrag.ersterTrefferZeit === null && g.leben < eintrag.lebenMaxBeiEntstehung) {
        eintrag.ersterTrefferZeit = zeitJetzt;
      }
    }
    const verschwunden = [];
    for (const [g, eintrag] of gegnerVerfolgung) if (!aktuelleGegner.has(g)) verschwunden.push(g);
    for (const g of verschwunden) {
      const eintrag = gegnerVerfolgung.get(g);
      const wDerWelle = wellenDaten(eintrag.welle);
      if (g.tot === true) {
        const sterbeZeit = zeitJetzt;
        const ersterTreffer = eintrag.ersterTrefferZeit ?? sterbeZeit;
        const eintragEreignis = {
          art: g.art.id, welle: eintrag.welle,
          entstehungsZeit: eintrag.entstehungsZeit, ersterTrefferZeit: ersterTreffer,
          sterbeZeit, zeitBisTod: sterbeZeit - ersterTreffer,
          sofortTot: eintrag.ersterTrefferZeit === null,
          sterbeEntfernung: naechsteEntfernung(welt.spieler, g.x, g.y),
          lebenMax: eintrag.lebenMaxBeiEntstehung
        };
        ereignisseGegnerTod.push(eintragEreignis);
        wDerWelle.getoetetAnzahl++;
        wDerWelle.getoetetLebenSumme += eintrag.lebenMaxBeiEntstehung;
        wDerWelle.goldErschienen += g.art.gold;
        wDerWelle.wissenErschienen += g.art.wissen;
      } else {
        /* Nicht gestorben — vom Wellenende weggeräumt (`beendeWelle`
           leert `welt.gegner` unbedingt). Kein Todesfall, sonst zählte
           jeder Überlebende als erfundener Toter. */
        wDerWelle.ueberlebtAnzahl++;
        if (eintrag.ersterTrefferZeit === null) nieGetroffenAnzahl++;
      }
      gegnerVerfolgung.delete(g);
    }

    /* ── Beute: Erscheinen, Aufsammeln, Verlieren ──────────────────── */
    const aktuelleBeute = new Set(welt.beute);
    for (const b of aktuelleBeute) {
      if (!beuteVerfolgung.has(b)) beuteVerfolgung.set(b, { entstehungsZeit: zeitJetzt });
    }
    const beuteWeg = [];
    for (const [b, eintrag] of beuteVerfolgung) if (!aktuelleBeute.has(b)) beuteWeg.push(b);
    for (const b of beuteWeg) {
      const eintrag = beuteVerfolgung.get(b);
      if (b.weg === true) {
        /* Aufgesammelt (`beute.mjs bewegeBeute`). Ein Stück, das im
           selben Schritt fällt und sofort eingesammelt wird, taucht in
           keiner Abtastung auf — dieselbe Lücke wie beim sofortigen
           Gegnertreffer, hier aber ohne Ausweg: ohne eine sichtbare
           Zwischenabtastung existiert für dieses Stück keine Zeitspanne
           zu messen. Siehe Rückmeldung. */
        zeitenBisAufsammeln.push(zeitJetzt - eintrag.entstehungsZeit);
        beuteAufgesammeltAnzahl++;
      } else {
        /* `raeumeBeute` leert `welt.beute` am Wellenende unbedingt,
           ohne `weg` zu setzen — daran unterscheidet sich Verlust von
           Aufsammeln, genau wie bei Gegnern `g.tot`. */
        beuteVerlorenAnzahl++;
      }
      beuteVerfolgung.delete(b);
    }
    /* `welt.verloreneBeute` zählt in Gold, nicht in Stücken — als
       einzige vom Regelkern selbst geführte Größe hier verwendet, weil
       sie beweist, was die Stückzählung nur schätzen könnte. Nur
       positive Sprünge zählen: Die Größe wird nie kleiner. */
    if (welt.verloreneBeute > goldVerlorenVorher) {
      goldVerlorenGesamt += welt.verloreneBeute - goldVerlorenVorher;
      goldVerlorenVorher = welt.verloreneBeute;
    }

    /* ── Spieler: Tod, Aufhelfen, Schadensquelle, Ressourcen ───────── */
    welt.spieler.forEach((s, i) => {
      let z = spielerZustand[i];
      if (!z) {
        z = {
          zustand: s.zustand, trefferZeitVorher: s.trefferZeit,
          goldVorher: s.gold, goldAufgesammeltGesamt: 0,
          stufeVorher: s.stufe, wissenVerbrauchtGesamt: 0, wissenZuletzt: s.wissen,
          todeGesamt: 0, aufgeholfenAnzahl: 0, zeitAmBodenTicks: 0
        };
        spielerZustand[i] = z;
        return; // erste Sichtung: nur Grundlinie setzen, nichts vergleichen
      }

      if (z.zustand === "lebt" && s.zustand === "liegt") {
        z.todeGesamt++;
        w.todeSpieler++;
      }
      if (z.zustand === "liegt" && s.zustand === "lebt" && welt.phase === "welle") {
        /* Nur mitten in der Welle ist das echtes Aufhelfen
           (`hebeAuf`). Steht ein Spieler am Wellenende automatisch auf
           (Modi mit `stehtAmWellenendeAuf !== false`), ist die aktuelle
           Phase bereits nicht mehr „welle" — das zählt nicht mit. */
        z.aufgeholfenAnzahl++;
      }
      if (welt.phase === "welle" && s.zustand === "liegt") z.zeitAmBodenTicks++;

      /* Schadensquelle: `nimmSchaden` (kampf.mjs) hat genau zwei
         Aufrufer — Berührung und feindliches Geschoss. Ein lebender
         Gegner in Kontaktreichweite *jetzt* beweist Berührung; sonst
         bleibt nur die andere Quelle, auch wenn das treffende Geschoss
         schon im selben Schritt entfernt wurde. */
      if (z.trefferZeitVorher <= 0 && s.trefferZeit > 0) {
        const beruehrt = welt.gegner.some((g) => {
          if (g.tot) return false;
          const r = g.radius + s.radius;
          return (g.x - s.x) ** 2 + (g.y - s.y) ** 2 <= r * r;
        });
        if (beruehrt) treffer.beruehrung++; else treffer.fernkampf++;
      }
      z.trefferZeitVorher = s.trefferZeit;
      z.zustand = s.zustand;

      /* Gold: waehrend einer Welle nur Zugang, nie Abgang (siehe
         Kopfnotiz) — jede positive Aenderung ist eine Aufnahme. */
      const deltaGold = s.gold - z.goldVorher;
      if (deltaGold > 0) z.goldAufgesammeltGesamt += deltaGold;
      z.goldVorher = s.gold;

      /* Wissen: aus der Aufstiegsformel zurückgerechnet statt aus der
         Differenz (siehe Kopfnotiz). */
      for (let k = z.stufeVorher; k < s.stufe; k++) z.wissenVerbrauchtGesamt += schwelle(k);
      z.stufeVorher = s.stufe;
      z.wissenZuletzt = s.wissen;
    });

    /* ── Wellenweite Stichproben: nur, solange die Uhr wirklich läuft ── */
    if (welt.phase === "welle") {
      w.proben++;
      w.gegnerSumme += welt.gegner.length;
      if (welt.gegner.length > w.gegnerHoechststand) w.gegnerHoechststand = welt.gegner.length;

      let lebenSumme = 0, lebenTief = Infinity;
      for (const s of welt.spieler) { lebenSumme += s.leben; if (s.leben < lebenTief) lebenTief = s.leben; }
      w.lebenSumme += lebenSumme;
      w.lebenProben += welt.spieler.length;
      if (lebenTief < w.lebenTief) w.lebenTief = lebenTief;

      const anteil = welt.dauer > 0 ? welt.zeit / welt.dauer : 1;
      while (w.naechsteMarkeIndex < ZEITMARKEN.length && anteil >= ZEITMARKEN[w.naechsteMarkeIndex]) {
        w.marken.push({
          anteil: ZEITMARKEN[w.naechsteMarkeIndex],
          gegnerZahl: welt.gegner.length,
          lebenMittel: welt.spieler.length ? lebenSumme / welt.spieler.length : 0,
          lebenTief
        });
        w.naechsteMarkeIndex++;
      }

      letzteKampfSchnappschuss = welt.spieler.map(momentaufnahmeSpieler);
    }

    /* ── Wellenwechsel: die vorige Welle abschließen ───────────────── */
    if (welleVorher !== null && welt.welle !== welleVorher) schliesseWelle(welleVorher);
    welleVorher = welt.welle;
  }

  function auswerten() {
    if (welleVorher !== null) schliesseWelle(welleVorher);

    const wellenListe = [...wellen.values()].sort((a, b) => a.nummer - b.nummer).map((w) => {
      const dauer = w.dauerTatsaechlich ?? w.zeitZuletzt;
      const bedarfJeSekunde = w.dauerGeplant > 0 ? w.erschienenLebenSumme / w.dauerGeplant : 0;
      const leistungJeSekunde = dauer > 0 ? w.getoetetLebenSumme / dauer : 0;
      return {
        welle: w.nummer, beendet: w.beendet,
        dauerGeplant: w.dauerGeplant, dauerTatsaechlich: dauer,
        restzeit: w.restzeit ?? (w.dauerGeplant - w.zeitZuletzt),
        gegnerHoechststand: w.gegnerHoechststand,
        gegnerMittel: w.proben ? w.gegnerSumme / w.proben : 0,
        marken: w.marken,
        erschienenAnzahl: w.erschienenAnzahl, getoetetAnzahl: w.getoetetAnzahl,
        ueberlebtAnzahl: w.ueberlebtAnzahl,
        erschienenJeSekunde: dauer > 0 ? w.erschienenAnzahl / dauer : 0,
        getoetetJeSekunde: dauer > 0 ? w.getoetetAnzahl / dauer : 0,
        stau: dauer > 0 ? (w.erschienenAnzahl - w.getoetetAnzahl) / dauer : 0,
        lebenMittel: w.lebenProben ? w.lebenSumme / w.lebenProben : 0,
        lebenTief: Number.isFinite(w.lebenTief) ? w.lebenTief : null,
        todeSpieler: w.todeSpieler,
        goldErschienen: w.goldErschienen, wissenErschienen: w.wissenErschienen,
        lebenBedarf: w.erschienenLebenSumme, lebenBedarfJeSekunde: bedarfJeSekunde,
        leistungJeSekunde,
        verhaeltnisLeistungZuBedarf: bedarfJeSekunde > 0 ? leistungJeSekunde / bedarfJeSekunde : null,
        spielerEndzustand: w.spielerEndzustand
      };
    });

    const zeitBisTod = verteilung(ereignisseGegnerTod.map((e) => e.zeitBisTod));
    const sterbeEntfernung = verteilung(ereignisseGegnerTod.map((e) => e.sterbeEntfernung));
    const gestorben = ereignisseGegnerTod.length;
    const sofortTot = ereignisseGegnerTod.filter((e) => e.sofortTot).length;
    const ueberlebtGesamt = wellenListe.reduce((a, w) => a + w.ueberlebtAnzahl, 0);

    const jeArt = new Map();
    for (const e of ereignisseGegnerTod) {
      if (!jeArt.has(e.art)) jeArt.set(e.art, []);
      jeArt.get(e.art).push(e);
    }
    const gegnerJeArt = [...jeArt.entries()].map(([art, liste]) => ({
      art, anzahl: liste.length,
      sofortTotAnteil: liste.filter((e) => e.sofortTot).length / liste.length,
      zeitBisTod: verteilung(liste.map((e) => e.zeitBisTod)),
      sterbeEntfernung: verteilung(liste.map((e) => e.sterbeEntfernung))
    }));

    const goldErschienenGesamt = wellenListe.reduce((a, w) => a + w.goldErschienen, 0);
    const wissenErschienenGesamt = wellenListe.reduce((a, w) => a + w.wissenErschienen, 0);

    return {
      wellen: wellenListe,
      gegner: {
        erschienenGesamt: gestorben + ueberlebtGesamt,
        gestorben, ueberlebtWellenende: ueberlebtGesamt,
        sofortTot, sofortTotAnteil: gestorben ? sofortTot / gestorben : null,
        nieGetroffen: nieGetroffenAnzahl,
        zeitBisTod, sterbeEntfernung,
        jeArt: gegnerJeArt
      },
      spieler: spielerZustand.map((z, i) => ({
        index: i,
        todeGesamt: z.todeGesamt, aufgeholfenAnzahl: z.aufgeholfenAnzahl,
        zeitAmBodenSekunden: z.zeitAmBodenTicks * SCHRITT,
        goldAufgesammeltGesamt: z.goldAufgesammeltGesamt,
        wissenAufgesammeltGesamt: z.wissenZuletzt + z.wissenVerbrauchtGesamt,
        wissenVerbrauchtGesamt: z.wissenVerbrauchtGesamt
      })),
      schadenQuelle: { ...treffer, gesamt: treffer.beruehrung + treffer.fernkampf },
      beute: {
        goldErschienenGesamt, wissenErschienenGesamt,
        goldVerlorenGesamt,
        anteilGoldVerloren: goldErschienenGesamt > 0 ? goldVerlorenGesamt / goldErschienenGesamt : null,
        anzahlAufgesammelt: beuteAufgesammeltAnzahl, anzahlVerloren: beuteVerlorenAnzahl,
        zeitBisAufsammeln: verteilung(zeitenBisAufsammeln)
      },
      gesamtWellen: wellenListe.length
    };
  }

  return { abtasten, auswerten };
}
