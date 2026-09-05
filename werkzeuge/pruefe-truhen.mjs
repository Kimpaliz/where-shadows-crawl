/* [Aufgabe: Prüfwesen] Die Truhe: eigener Zufallsstrom, eigener Moment,
   und vor allem — hängt die Runde nicht.

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   | Prüfung | was sonst passiert |
   | --- | --- |
   | `truhenZufall` unabhängig von `zufall` | jeder Truhenfall verschiebt Wellenpläne und Kritwürfe im ganzen restlichen Lauf, ohne dass es eine Fehlermeldung gäbe |
   | die Phase „truhen" endet von selbst | ein Balancelauf oder das echte Spiel bleibt in der Phase stehen — genau die Falle aus spiel/welt.mjs „STILLE FALLEN" |
   | ein voller Gürtel schluckt keinen Fund | eine Waffe aus einer Truhe verschwindet stillschweigend, wenn der Gürtel voll ist |
   | Glück wirkt auf den Inhalt | die Kopfnotiz behauptet „Glück wirkt spürbar", ohne dass es je nachgerechnet wird |

   Der wichtigste Abschnitt ist unten „Kein Hängenbleiben" — er spielt
   einen echten Lauf über `spiel/lauf.mjs`, mit erzwungenen Kills, bis
   mindestens eine Truhe fällt, und verlangt, dass er trotzdem in
   „gewonnen" oder „verloren" endet.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/truhen.mjs` (wird geprüft), `spiel/beute.mjs` (ruft den Fall
   aus), `spiel/welt.mjs` (die Phase „truhen"), `spiel/laden.mjs`
   (`nimmWaffe`, `wendeGegenstandAn` — dieselbe Anwendung). */

import { macheMelder } from "./helfer.mjs";
import {
  pruefeTruhenfall, bewegeTruhen, raeumeTruhen, oeffneTruhen, fortschreiteTruhen,
  TRUHEN_CHANCE_JE_TOD, TRUHEN_ANZEIGE_SEKUNDEN
} from "../spiel/truhen.mjs";
import { macheWelt, starteWelle, schritt, beendeWelle, SCHRITT } from "../spiel/welt.mjs";
import { macheZufall, abgeleitet } from "../spiel/zufall.mjs";
import { starteLauf, naechsteWelle, oeffneKraemer, schrittImLauf } from "../spiel/lauf.mjs";
import { nimmKarte } from "../spiel/stufen.mjs";
import { WAFFEN_PLAETZE, kaufe } from "../spiel/laden.mjs";
import { botEingabe } from "./balance.mjs";

const { melde, ende } = macheMelder({ still: true });
const BEKANNTE_SORTEN = ["gold", "wissen", "gegenstand", "waffe"];

/* ── Der eigene Zufallsstrom ─────────────────────────────────────────

   Das ist der Kern der ganzen Konstruktion: `welt.zufall` muss nach
   beliebig vielen Truhenfällen exakt so dastehen wie ohne sie. */
{
  const a = macheWelt({ saat: 77 });
  const b = macheWelt({ saat: 77 });
  const zustandVorher = a.zufall.zustand();
  melde(a.zufall.zustand() === b.zufall.zustand(), "zwei Welten mit derselben Saat starten gleich");

  for (let i = 0; i < 5000; i++) pruefeTruhenfall(a, { x: i, y: -i });
  melde(a.zufall.zustand() === zustandVorher,
    "5000 Truhenfall-Versuche verschieben welt.zufall nicht", `${a.zufall.zustand()} gegen ${zustandVorher}`);
  melde(a.zufall.zustand() === b.zufall.zustand(),
    "…und a bleibt darin gleich mit b, das nie gefragt wurde");
  melde(a.truhen.length > 0, "bei 5000 Versuchen ist mindestens eine Truhe gefallen", `${a.truhen.length}`);

  /* Gegenprobe: Der Strom, der wirklich benutzt wird, bewegt sich sehr
     wohl — sonst wäre die Prüfung oben auch dann grün, wenn niemand
     überhaupt würfelt. */
  melde(a.truhenZufall.zustand() !== abgeleitet(77, "truhen").zustand(),
    "der benutzte Strom selbst hat sich bewegt");
}

/* ── Wiederholbarkeit ────────────────────────────────────────────────

   Gleiche Saat, gleiche Kill-Reihenfolge → dieselben Truhen, an
   denselben Orten. Andere Saat → eine andere Nacht (Gegenprobe). */
{
  const lauf = (saat) => {
    const w = macheWelt({ saat });
    for (let i = 0; i < 3000; i++) pruefeTruhenfall(w, { x: i % 40, y: (i * 3) % 40 });
    return w;
  };
  const a = lauf(21), b = lauf(21), c = lauf(22);
  melde(a.truhenGefallen === b.truhenGefallen, "gleiche Saat: gleich viele Truhen gefallen",
    `${a.truhenGefallen} / ${b.truhenGefallen}`);
  const orteA = a.truhen.map((t) => `${t.x.toFixed(2)},${t.y.toFixed(2)}`).join("|");
  const orteB = b.truhen.map((t) => `${t.x.toFixed(2)},${t.y.toFixed(2)}`).join("|");
  melde(orteA === orteB, "…und an denselben Orten");
  melde(a.truhenGefallen !== c.truhenGefallen || orteA !== c.truhen.map((t) => `${t.x.toFixed(2)},${t.y.toFixed(2)}`).join("|"),
    "andere Saat gibt eine andere Nacht");
}

/* ── Formel gegen Wirklichkeit: die Fallquote ────────────────────────

   20.000 „Kills" auf einmal — die gemessene Quote muss nah an
   `TRUHEN_CHANCE_JE_TOD` liegen. Toleranz über die Binomialstreuung
   grob abgeschätzt (±3 Standardabweichungen wäre streng; hier reichen
   30 % relative Abweichung, damit die Prüfung bei einer bewussten
   Änderung der Konstante nicht bei jeder Gelegenheit rot wird). */
{
  const w = macheWelt({ saat: 555 });
  const N = 20000;
  for (let i = 0; i < N; i++) pruefeTruhenfall(w, { x: i, y: 0 });
  const quote = w.truhenGefallen / N;
  const abweichung = Math.abs(quote - TRUHEN_CHANCE_JE_TOD) / TRUHEN_CHANCE_JE_TOD;
  melde(abweichung < 0.3, "gemessene Fallquote liegt nah an der Konstante",
    `${(quote * 100).toFixed(3)} % gegen ${(TRUHEN_CHANCE_JE_TOD * 100).toFixed(3)} %`);
}

/* ── Liegen, Anziehen, Aufheben ──────────────────────────────────────

   Eine Truhe in Reichweite wird binnen weniger Ticks aufgenommen; eine
   Truhe weit weg bleibt liegen, bis `raeumeTruhen` sie als verloren
   zählt. */
{
  const w = macheWelt({ saat: 9 });
  starteWelle(w, 1);
  w.spieler[0].x = 0; w.spieler[0].y = 0;
  w.truhen.push({ x: 4, y: 0, vx: 0, vy: 0, hupf: 0 });
  let aufgenommen = false;
  for (let i = 0; i < 300 && !aufgenommen; i++) {
    bewegeTruhen(w, SCHRITT);
    if (w.spieler[0].truhen > 0) aufgenommen = true;
  }
  melde(aufgenommen, "eine nahe Truhe wird aufgenommen", `nach Versuch ${w.ticks}`);
  melde(w.truhen.length === 0, "…und verschwindet danach vom Boden");
  melde(w.truhenAngekommen === 1, "…und wird als angekommen gezählt");

  const w2 = macheWelt({ saat: 9 });
  starteWelle(w2, 1);
  w2.spieler[0].x = 0; w2.spieler[0].y = 0;
  w2.truhen.push({ x: 4000, y: 0, vx: 0, vy: 0, hupf: 0 });
  for (let i = 0; i < 300; i++) bewegeTruhen(w2, SCHRITT);
  melde(w2.spieler[0].truhen === 0 && w2.truhen.length === 1,
    "eine weit entfernte Truhe bleibt liegen");
  const verloren = raeumeTruhen(w2);
  melde(verloren === 1 && w2.truhen.length === 0,
    "…und `raeumeTruhen` zählt sie als verloren und räumt sie weg");
}

/* ── Öffnen: ohne Fund passiert nichts ──────────────────────────────── */
{
  const w = macheWelt({ saat: 3 });
  starteWelle(w, 4);
  melde(oeffneTruhen(w, "laden") === false, "niemand trägt eine Truhe: kein Moment entsteht");
  melde(w.truhenErgebnis === null, "…und `truhenErgebnis` bleibt leer");
}

/* ── Öffnen: jede Sorte wendet wirklich etwas an ─────────────────────

   500 Öffnungen bei glueck=0 — jede beobachtete Sorte muss zu genau
   einer bekannten Wirkung führen, kein Fund darf spurlos bleiben. */
{
  const w = macheWelt({ saat: 44 });
  starteWelle(w, 5);
  const s = w.spieler[0];
  let gesehen = new Set();
  let goldGesehen = false, wissenGesehen = false, gegenstandGesehen = false, waffeGesehen = false, vollGesehen = false;

  for (let i = 0; i < 500; i++) {
    const goldVorher = s.gold, wissenVorher = s.wissen;
    const waffenVorher = s.waffen.length, gegenstaendeVorher = s.gegenstaende.length;
    s.truhen = 1;
    oeffneTruhen(w, "laden");
    const e = w.truhenErgebnis[0];
    gesehen.add(e.sorte);
    melde(BEKANNTE_SORTEN.includes(e.sorte), `Öffnung ${i}: bekannte Sorte`, e.sorte);
    melde(typeof e.name === "string" && e.name.length > 0, `Öffnung ${i}: hat einen Namen`);
    melde(typeof e.text === "string" && e.text.length > 0, `Öffnung ${i}: hat einen Text`);
    melde(e.spielerId === s.id, `Öffnung ${i}: die richtige Figur trägt sie`);

    if (e.sorte === "gold") {
      goldGesehen = true;
      if (e.voll) vollGesehen = true;
      melde(s.gold > goldVorher, `Öffnung ${i}: Gold ist gestiegen`);
      melde(typeof e.menge === "number" && e.menge > 0, `Öffnung ${i}: Gold-Menge ist positiv`);
    } else if (e.sorte === "wissen") {
      wissenGesehen = true;
      melde(s.wissen > wissenVorher, `Öffnung ${i}: Wissen ist gestiegen`);
    } else if (e.sorte === "gegenstand") {
      gegenstandGesehen = true;
      melde(s.gegenstaende.length === gegenstaendeVorher + 1, `Öffnung ${i}: ein Fundstück kam dazu`);
      melde(typeof e.id === "string" && typeof e.selten === "number", `Öffnung ${i}: Fundstück trägt Kennung und Seltenheit`);
    } else if (e.sorte === "waffe") {
      waffeGesehen = true;
      melde(s.waffen.length > waffenVorher || s.waffen.some((wa) => wa.id === e.id && wa.stufe > 1),
        `Öffnung ${i}: eine Waffe kam dazu oder verschmolz`);
      melde(s.waffen.length <= WAFFEN_PLAETZE, `Öffnung ${i}: der Gürtel wächst nie über sein Limit`);
      melde(e.stufe === 1 || e.stufe === 2, `Öffnung ${i}: Waffenstufe ist 1 oder 2`, `${e.stufe}`);
    }
    melde(w.truhenErgebnis.length === 1, `Öffnung ${i}: genau ein Ergebnis für eine getragene Truhe`);
    melde(s.truhen === 0, `Öffnung ${i}: die getragene Truhe ist danach 0`);
  }

  melde(goldGesehen && wissenGesehen && gegenstandGesehen,
    "über 500 Öffnungen: Gold, Wissen und Fundstück kommen alle drei vor",
    [...gesehen].sort().join(","));
  /* Waffe **oder** ihr Ersatzgold — beides ist derselbe Zweig
     (voller Gürtel schmilzt statt zu verlieren), deshalb reicht hier
     einer von beiden, damit der Pfad wirklich durchlaufen wurde. */
  melde(waffeGesehen || vollGesehen, "…und der Waffenzweig wurde erreicht (Waffe oder voller Gürtel)",
    `Waffe direkt: ${waffeGesehen}, Ersatzgold: ${vollGesehen}`);
}

/* ── Glück wirkt spürbar auf den Inhalt ──────────────────────────────

   Dieselbe Messmethode wie oben, zweimal — einmal mit Glück 0, einmal
   mit Glück 200. Ohne Glück muss der Anteil „Gold" **klar höher**
   liegen als mit viel Glück (Kopfnotiz spiel/truhen.mjs). */
{
  function goldAnteil(glueck, saat) {
    const w = macheWelt({ saat });
    starteWelle(w, 5);
    const s = w.spieler[0];
    let gold = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      /* Glück **jedes Mal neu setzen**: Ein Fundstück wie „Grabkerze"
         ändert selbst Glück (spiel/katalog/gegenstaende.mjs). Ohne den
         Reset würde die glueck=0-Messreihe über 400 Öffnungen langsam
         nach oben driften und am Ende beide Reihen angleichen — genau
         das ist beim ersten Lauf passiert (38,0 % gegen 37,0 % statt
         eines klaren Unterschieds), bis dieser Reset den Fehler
         behoben hat. */
      s.werte.glueck = glueck;
      s.truhen = 1;
      oeffneTruhen(w, "laden");
      if (w.truhenErgebnis[0].sorte === "gold") gold++;
    }
    return gold / N;
  }
  const ohneGlueck = goldAnteil(0, 61);
  const mitGlueck = goldAnteil(200, 61);
  melde(mitGlueck < ohneGlueck - 0.1,
    "viel Glück senkt den Gold-Anteil klar messbar",
    `${(ohneGlueck * 100).toFixed(1)} % gegen ${(mitGlueck * 100).toFixed(1)} %`);
}

/* ── Der Moment vergeht — und nur dann ───────────────────────────────

   `fortschreiteTruhen` darf die Phase nicht vor Ablauf der Zeit
   wechseln, muss danach aber wirklich wechseln — mit derselben festen
   Schrittweite wie jede andere Sekunde des Spiels. */
{
  const w = macheWelt({ saat: 5 });
  w.phase = "truhen";
  w.truhenErgebnis = [{ spielerId: 0, sorte: "gold", name: "x", text: "y", menge: 1 }];
  w.truhenZeit = TRUHEN_ANZEIGE_SEKUNDEN;
  w.truhenWeiter = "laden";

  const tickeVoraus = Math.floor(TRUHEN_ANZEIGE_SEKUNDEN / SCHRITT) - 3;
  for (let i = 0; i < tickeVoraus; i++) fortschreiteTruhen(w, SCHRITT);
  melde(w.phase === "truhen", 'kurz vor Ablauf ist die Phase noch „truhen"', `nach ${tickeVoraus} Schritten`);
  melde(w.truhenErgebnis !== null, "…und das Ergebnis steht noch für die Anzeige bereit");

  for (let i = 0; i < 10; i++) fortschreiteTruhen(w, SCHRITT);
  melde(w.phase === "laden", "nach Ablauf wechselt die Phase zum vorgemerkten Ziel");
  melde(w.truhenErgebnis === null && w.truhenWeiter === null,
    "…und räumt ihre eigenen Spuren auf");
}

/* ── Zusammenspiel mit `schritt()` (spiel/welt.mjs) ──────────────────

   Der eigentliche Vertrag: `schritt()` behandelt „truhen" selbst, ohne
   dass `spiel/lauf.mjs` etwas davon wissen muss. */
{
  const w = macheWelt({ saat: 12, spielerzahl: 1 });
  starteWelle(w, 1);
  w.spieler[0].truhen = 1;
  beendeWelle(w);
  melde(w.phase === "truhen", 'eine getragene Truhe löst die Phase „truhen" aus');
  melde(Array.isArray(w.truhenErgebnis) && w.truhenErgebnis.length === 1, "…mit genau einem Ergebnis");

  let schritte = 0;
  while (w.phase === "truhen" && schritte < 10000) { schritt(w, [{ x: 0, y: 0 }]); schritte++; }
  melde(w.phase === "laden", "…und `schritt()` bringt die Phase von allein weiter", `nach ${schritte} Schritten`);
  melde(schritte > 1 && schritte < 200, "…in einer plausiblen, kurzen Zeit", `${schritte} Schritte`);

  /* Gegenprobe: ohne getragene Truhe ändert `beendeWelle` gar nichts
     am bisherigen Verhalten — genau die Fälle, die vorher schon liefen. */
  const w2 = macheWelt({ saat: 12, spielerzahl: 1 });
  starteWelle(w2, 1);
  beendeWelle(w2);
  melde(w2.phase === "laden", 'ohne getragene Truhe bleibt „laden" sofort erreichbar, wie vorher');
}

/* ── Kein Hängenbleiben: ein echter Lauf über spiel/lauf.mjs ─────────

   Das ist der Fall aus spiel/welt.mjs „STILLE FALLEN": eine neue Phase
   einzufügen kann die Runde hängen lassen, ohne dass irgendetwas rot
   wird — bis man es merkt, weil man selbst zusieht. Gespielt wird mit
   demselben Kunstspieler wie `werkzeuge/balance.mjs` (`botEingabe`,
   überlebt lange genug für echte Kills), bei einer Saat, die vorher
   mit `spieleLauf` durchsucht wurde und nachweislich mindestens eine
   Truhe hervorbringt (`node`-Suche über 60 Saaten, siehe
   docs/rueckmeldung/truhen.md). Verlangt wird, dass der Lauf trotzdem
   in „gewonnen" oder „verloren" endet. */
{
  const welt = starteLauf({ spielerzahl: 1, saat: 1955 });
  naechsteWelle(welt);
  let n = 0, sahTruhenPhase = false;
  const GRENZE = 60 * 60 * 20; /* 20 simulierte Minuten reichen weit — die
    echte Notbremse des Balance-Prüfstands liegt bei vier Stunden. Wird
    diese Grenze hier gerissen, ist das der Beweis für ein Hängenbleiben,
    nicht nur ein langer Lauf. */

  while (!["gewonnen", "verloren"].includes(welt.phase) && n < GRENZE) {
    if (welt.phase === "truhen") sahTruhenPhase = true;
    if (welt.phase === "laden" || welt.phase === "vorspiel") {
      if (welt.phase === "laden") {
        if (!welt.spieler[0].angebote) oeffneKraemer(welt);
        for (const s of welt.spieler) {
          let idx;
          while ((idx = s.angebote?.findIndex((a) => !a.gekauft && a.preis <= s.gold)) >= 0) {
            if (!kaufe(s, idx)) break;
          }
        }
      }
      naechsteWelle(welt);
    } else if (welt.phase === "wahl") {
      for (const s of welt.spieler) {
        let schutz = 0;
        while (s.offeneWahlen > 0 && schutz++ < 20) nimmKarte(welt, s, 0);
      }
      schrittImLauf(welt, welt.spieler.map((s) => botEingabe(welt, s)));
    } else {
      schrittImLauf(welt, welt.spieler.map((s) => botEingabe(welt, s)));
    }
    n++;
  }

  melde(["gewonnen", "verloren"].includes(welt.phase),
    'ein echter Lauf endet regulär, auch wenn er durch „truhen" läuft',
    `Endphase ${welt.phase} nach ${n} Schritten`);
  melde(sahTruhenPhase, "…und dabei wurde wirklich mindestens eine Truhe geöffnet",
    `truhenGefallen ${welt.truhenGefallen}, truhenAngekommen ${welt.truhenAngekommen}`);
}

ende();
