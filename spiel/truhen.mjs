/* [Aufgabe: Regelkern] Die Truhe — ein Fund, der erst am Wellenende
   spricht.

   Anders als Grabgold (spiel/beute.mjs) wird eine Truhe nicht sofort
   verwertet: Sie fällt selten von einem Gegner, wird wie Gold
   aufgehoben und wartet dann im Gürtel des Trägers, bis die Welle
   vorbei ist. Erst `beendeWelle()` öffnet sie — als eigener Moment
   (`welt.phase === "truhen"`), nicht als Zeile im Ladenbildschirm.

   ── Der eigene Zufallsstrom ─────────────────────────────────────────

   Truhenfall und -inhalt werden **nicht** aus `welt.zufall` gezogen,
   sondern aus `welt.truhenZufall` — einem zweiten, unabhängigen Strom
   aus `abgeleitet(saat, "truhen")` (spiel/zufall.mjs, bisher ungenutzt
   vorbereitet). Der Grund: `welt.zufall` ist die Balance selbst
   (docs/SPIEL.md 8, spiel/werte.mjs Kopfnotiz). Jede zusätzliche
   Ziehung dort würde ab dem ersten Kill jede spätere Ziehung im
   ganzen Lauf verschieben — Wellenpläne eingeschlossen, die schon vor
   diesem Umbau feststanden. Mit einem eigenen Strom bleibt
   `welt.zufall` bitgleich zu vorher, solange keine Truhe fällt, und
   auch danach unverändert an jeder Stelle, an der ohnehin nicht
   gewürfelt wird. Was sich ändert, ist ausschließlich die Wirkung der
   Beute selbst (mehr Gold, eine Waffe mehr) — das ist eine gewollte
   Folge des Features, kein Nebeneffekt der Messmethode. Nachgerechnet
   in `werkzeuge/pruefe-truhen.mjs`.

   ── Der Moment als Zeit, nicht als Spielerwahl ──────────────────────

   Anders als „wahl" (Kartenaufstieg) braucht das Öffnen keine
   Spielerentscheidung — der Inhalt steht in dem Moment fest, in dem
   die Welle endet. Die Phase „truhen" ist deshalb rein zeitgesteuert:
   `fortschreiteTruhen()` zählt `welt.truhenZeit` herunter und wechselt
   danach von selbst weiter. Das ist bewusst so gebaut, damit
   `spiel/lauf.mjs`, `werkzeuge/balance.mjs` und `runtime/start.js`
   **ohne eine einzige Zeile Änderung** durch die neue Phase
   hindurchlaufen: `schrittImLauf()` ruft für jede Phase außer „wahl"
   `schritt()` auf, und `schritt()` behandelt „truhen" jetzt selbst
   (spiel/welt.mjs). Nur `runtime/start.js`s Zeichen- und
   Eingabedispatch kennt die Phase noch nicht — das ist Sache der
   Anzeige, siehe docs/rueckmeldung/truhen.md.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/beute.mjs` (ruft `pruefeTruhenfall` bei jedem Kill auf),
   `spiel/welt.mjs` (hält Truhen-Zustand auf `welt`, ruft
   `bewegeTruhen`/`oeffneTruhen`/`fortschreiteTruhen`),
   `spiel/laden.mjs` (`nimmWaffe`, `wendeGegenstandAn`,
   `preisAufschlag`, `VERKAUFS_ANTEIL` — dieselbe Anwendung wie beim
   Kauf, damit ein Fundstück aus einer Truhe sich nicht anders anfühlt
   als eines aus dem Laden), `spiel/katalog/waffen.mjs` und
   `…/gegenstaende.mjs` (die Ware), `spiel/werte.mjs` (Glück). */

import { wert, aufsammelReichweite } from "./werte.mjs";
import { nimmWaffe, wendeGegenstandAn, preisAufschlag, VERKAUFS_ANTEIL } from "./laden.mjs";
import { WAFFEN, WAFFE_NACH_ID, preisDerWaffe } from "./katalog/waffen.mjs";
import { GEGENSTAENDE, SELTEN_AB_WELLE } from "./katalog/gegenstaende.mjs";

/* Wie oft ein Kill eine Truhe fallen lässt. Gemessen an einem echten
   Lauf (werkzeuge/balance.mjs, 05.09.2026): Ein einzelner Spieler
   tötet im Mittel rund 1.000 Gegner je Lauf, von 51 (Tod in Welle 1)
   bis über 6.000 (langer Notbremsen-Lauf). Bei 0,5 % ergibt das im
   Mittel eine niedrige einstellige Zahl Truhen je Lauf — „ein Fund",
   kein Dauerregen. Nachgerechnet in `werkzeuge/pruefe-truhen.mjs`
   („wie viele fallen"). */
export const TRUHEN_CHANCE_JE_TOD = 0.0025;

/* Wie lange der Öffnen-Moment die Welt anhält. Genug für den
   Zwei-Bilder-Lichtpuls von `runtime/sprite-daten.js` `truheAuf` (ein
   Wechsel reicht nicht, mehrere sollen zu sehen sein), kurz genug, um
   bei mehreren Truhen in einer Welle nicht zu ziehen. Eine feste
   Sekundenzahl statt „ein Bildwechsel je Truhe": Die Anzeige soll frei
   entscheiden können, ob sie mehrere Truhen nacheinander oder
   nebeneinander zeigt — das Spiel garantiert nur die Zeit dafür. */
export const TRUHEN_ANZEIGE_SEKUNDEN = 1.4;

/* Wie schwer eine Truhe „fliegt", sobald sie in Reichweite ist —
   spürbar träger als Gold (SOG 320 in spiel/beute.mjs): Eine Truhe ist
   kein Staubkorn, das man einatmet, sondern etwas, das man trägt. */
const TRUHEN_SOG = 250;
const TRUHEN_AUFHEBEN_ABSTAND = 7;

/* ── Fallen ──────────────────────────────────────────────────────────

   Aufgerufen aus `spiel/beute.mjs` `lassBeuteFallen()`, also bei
   jedem Kill — unabhängig davon, wer oder was getötet hat (`g` reicht,
   `toeter` wird hier nicht gebraucht: Wessen Glück den Fall begünstigt,
   entscheidet sich erst beim Öffnen, an der Truhe, die tatsächlich
   getragen wurde). */
export function pruefeTruhenfall(welt, g) {
  const z = welt.truhenZufall;
  if (!z || !z.trifft(TRUHEN_CHANCE_JE_TOD)) return;
  const winkel = z.zwischen(0, Math.PI * 2);
  const wucht = z.zwischen(6, 22);
  welt.truhen.push({
    x: g.x, y: g.y,
    vx: Math.cos(winkel) * wucht, vy: Math.sin(winkel) * wucht,
    hupf: z.zwischen(0, Math.PI * 2)
  });
  welt.truhenGefallen++;
}

/* ── Liegen und Aufheben ─────────────────────────────────────────────

   Dieselbe Grundidee wie `bewegeBeute()`: In Reichweite wird sie
   angezogen, nah genug wird sie aufgenommen. Zwei Unterschiede: keine
   Wertgutschrift (`spieler.truhen` zählt nur, wie viele ungeöffnet
   getragen werden) und eine eigene, trägere Sog-Stärke. */
export function bewegeTruhen(welt, dt) {
  for (const t of welt.truhen) {
    const abfall = Math.exp(-4 * dt);
    t.vx *= abfall; t.vy *= abfall;
    t.hupf += dt * 3;

    let zieher = null, bestes = Infinity;
    for (const s of welt.spieler) {
      if (s.zustand !== "lebt") continue;
      const r = aufsammelReichweite(s.werte);
      const q = (s.x - t.x) ** 2 + (s.y - t.y) ** 2;
      if (q <= r * r && q < bestes) { bestes = q; zieher = s; }
    }

    if (zieher) {
      const dx = zieher.x - t.x, dy = zieher.y - t.y;
      const d = Math.hypot(dx, dy) || 1;
      t.vx = (dx / d) * TRUHEN_SOG; t.vy = (dy / d) * TRUHEN_SOG;
      if (d <= TRUHEN_AUFHEBEN_ABSTAND) {
        zieher.truhen = (zieher.truhen ?? 0) + 1;
        welt.truhenAngekommen++;
        t.weg = true;
        continue;
      }
    }
    t.x += t.vx * dt; t.y += t.vy * dt;
  }
  welt.truhen = welt.truhen.filter((t) => !t.weg);
}

/* Am Wellenende ist verloren, was noch am Boden liegt — genau wie bei
   `raeumeBeute()`. Gibt die Zahl zurück, der Aufrufer (spiel/welt.mjs)
   führt sie in `welt.truhenVerloren`. */
export function raeumeTruhen(welt) {
  const verloren = welt.truhen.length;
  welt.truhen = [];
  return verloren;
}

/* ── Was drin ist ────────────────────────────────────────────────────

   Vier Sorten, gewichtet gezogen. Glück verschiebt das Gewicht von
   „Gold" hin zu „Fundstück" und „Waffe" — dieselbe Idee wie beim
   Krämer (spiel/laden.mjs zieheAngebot: Glück verbessert nicht den
   Betrag, sondern die Art des Fundes). Eine feste Obergrenze
   (`Math.min`) verhindert, dass ein extrem glücklicher Bau Gold aus
   dem Topf verdrängt, bis er gar nicht mehr vorkommt — Gold bleibt
   immer möglich. */
const GRUND_GEWICHT = { gold: 35, wissen: 20, gegenstand: 25, waffe: 20 };

function kategorieGewichte(glueck) {
  const schub = Math.max(0, Math.min(25, glueck / 4));
  return {
    gold: Math.max(8, GRUND_GEWICHT.gold - schub),
    wissen: GRUND_GEWICHT.wissen,
    gegenstand: GRUND_GEWICHT.gegenstand + schub * 0.6,
    waffe: GRUND_GEWICHT.waffe + schub * 0.4
  };
}

function zieheKategorie(zufall, glueck) {
  const g = kategorieGewichte(glueck);
  const eintraege = Object.entries(g);
  const gesamt = eintraege.reduce((s, [, w]) => s + w, 0);
  let r = zufall.zwischen(0, gesamt);
  for (const [name, w] of eintraege) {
    if (r < w) return name;
    r -= w;
  }
  return "gold";
}

/* Eine Truhe ist ein geschenkter Fund und darf sich großzügiger
   anfühlen als ein Kauf — deshalb die höhere Grundmenge gegenüber
   Grabgold, und deshalb starten Fundstückzüge bei zwei statt bei
   einem (spiel/laden.mjs zieheAngebot vergleicht standardmäßig nur
   einen). */
function truhenGold(zufall, welle) {
  return Math.round(zufall.zwischen(30, 55) * preisAufschlag(welle));
}

function truhenWissen(zufall, welle) {
  return Math.round(zufall.zwischen(6, 14) * preisAufschlag(welle));
}

function ziehGegenstand(zufall, welle, glueck) {
  const erlaubt = GEGENSTAENDE.filter((g) => (SELTEN_AB_WELLE[g.selten] ?? 1) <= welle);
  const zuege = 2 + (zufall.trifft(Math.min(0.5, glueck / 200)) ? 1 : 0);
  let bester = null;
  for (let i = 0; i < zuege; i++) {
    const g = zufall.ausListe(erlaubt);
    if (!bester || g.selten > bester.selten) bester = g;
  }
  return bester;
}

function ziehWaffe(zufall, glueck) {
  const w = zufall.ausListe(WAFFEN);
  /* 10 % Grundchance plus Glück, gedeckelt bei 45 % — etwas großzügiger
     als der Krämer (dort 0 % Grundchance, Deckel 35 %): Eine Truhe darf
     öfter die bessere Stufe geben, weil sie nichts kostet. */
  const stufe = zufall.trifft(Math.min(0.45, 0.10 + glueck / 250)) ? 2 : 1;
  return { id: w.id, stufe };
}

/* Eine Truhe für einen bestimmten Spieler öffnen. Wendet den Fund
   sofort an (dieselben Funktionen wie beim Kauf) und liefert den
   Beschreibungssatz für die Anzeige — siehe docs/rueckmeldung/truhen.md
   für die genaue Feldliste. */
function oeffneEineTruhe(welt, spieler) {
  const z = welt.truhenZufall;
  const glueck = wert(spieler.werte, "glueck");
  const kategorie = zieheKategorie(z, glueck);

  if (kategorie === "gold") {
    const menge = truhenGold(z, welt.welle);
    spieler.gold += menge;
    return {
      spielerId: spieler.id, sorte: "gold",
      name: "Goldhaufen", text: "Klimpert vielversprechend.", menge
    };
  }

  if (kategorie === "wissen") {
    const menge = truhenWissen(z, welt.welle);
    spieler.wissen += menge;
    return {
      spielerId: spieler.id, sorte: "wissen",
      name: "Wissensplitter", text: "Erinnerung an etwas, das hier starb.", menge
    };
  }

  if (kategorie === "gegenstand") {
    const g = ziehGegenstand(z, welt.welle, glueck);
    wendeGegenstandAn(spieler, g.id);
    return {
      spielerId: spieler.id, sorte: "gegenstand",
      id: g.id, name: g.name, text: g.text, selten: g.selten, menge: 1
    };
  }

  /* kategorie === "waffe" */
  const { id, stufe } = ziehWaffe(z, glueck);
  const vorlage = WAFFE_NACH_ID.get(id);
  if (!nimmWaffe(spieler, id, stufe)) {
    /* Gürtel voll und nichts zum Verschmelzen da: Der Fund darf nicht
       stillschweigend verschwinden. Er wird eingeschmolzen — dieselbe
       Umrechnung wie `verkaufe()` in spiel/laden.mjs. */
    const menge = Math.round(preisDerWaffe(id, stufe) * preisAufschlag(welt.welle) * VERKAUFS_ANTEIL);
    spieler.gold += menge;
    return {
      spielerId: spieler.id, sorte: "gold", voll: true,
      name: "Goldhaufen",
      text: `Der Gürtel war voll — die ${vorlage.name} wurde eingeschmolzen.`,
      menge
    };
  }
  return {
    spielerId: spieler.id, sorte: "waffe",
    id, name: vorlage.name, text: vorlage.text, stufe, menge: 1
  };
}

/* ── Öffnen am Wellenende ────────────────────────────────────────────

   Aufgerufen aus `beendeWelle()`, nachdem feststeht, wohin die Welt
   als Nächstes wollte (`naechstePhase`: „laden" oder „gewonnen"). Trägt
   niemand eine Truhe, passiert nichts — kein Moment ohne Inhalt. Trägt
   jemand eine, werden **alle** getragenen Truhen aller Spieler auf
   einmal geöffnet, das Ergebnis liegt in `welt.truhenErgebnis`, und die
   Welt hält für `TRUHEN_ANZEIGE_SEKUNDEN` in Phase „truhen" an, bevor
   sie zu `naechstePhase` weiterzieht (`fortschreiteTruhen`). */
export function oeffneTruhen(welt, naechstePhase) {
  const ergebnisse = [];
  for (const s of welt.spieler) {
    const anzahl = s.truhen ?? 0;
    for (let i = 0; i < anzahl; i++) ergebnisse.push(oeffneEineTruhe(welt, s));
    s.truhen = 0;
  }
  if (ergebnisse.length === 0) return false;
  welt.truhenErgebnis = ergebnisse;
  welt.truhenZeit = TRUHEN_ANZEIGE_SEKUNDEN;
  welt.truhenWeiter = naechstePhase;
  return true;
}

/* ── Der Moment vergeht ──────────────────────────────────────────────

   Aufgerufen aus `spiel/welt.mjs` `schritt()`, solange
   `welt.phase === "truhen"` — mit demselben festen Schritt wie jede
   andere Sekunde des Spiels (spiel/welt.mjs SCHRITT), nicht mit einer
   Wanduhr. Läuft die Zeit ab, wechselt die Welt von selbst weiter und
   räumt ihre eigenen Spuren auf. Kein Spieler muss etwas drücken —
   anders als bei „wahl" (spiel/stufen.mjs `alleGewaehlt`). */
export function fortschreiteTruhen(welt, dt) {
  /* Ohne diese Wache würde ein Aufruf **nach** dem Wechsel
     `welt.truhenWeiter` (dann schon `null`) über `welt.phase` bügeln —
     `schritt()` ruft hier nie ein zweites Mal auf, sobald die Phase
     gewechselt hat, aber die Funktion soll sich auch dann richtig
     verhalten, wenn sie es doch würde. Gefunden über
     `werkzeuge/pruefe-truhen.mjs`, das genau diesen Fall stellt. */
  if (welt.phase !== "truhen") return welt.phase;
  welt.truhenZeit -= dt;
  if (welt.truhenZeit <= 0) {
    welt.phase = welt.truhenWeiter;
    welt.truhenErgebnis = null;
    welt.truhenWeiter = null;
    welt.truhenZeit = 0;
  }
  return welt.phase;
}
