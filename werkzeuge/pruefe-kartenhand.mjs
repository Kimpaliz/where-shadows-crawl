/* [Aufgabe: Prüfwesen] Die Kartenhand: wo sie liegt, was sie zeigt,
   und was ein Klick auslöst.

       node werkzeuge/pruefe-kartenhand.mjs
       node werkzeuge/pruefe-kartenhand.mjs --statistik

   ── Warum das nicht in `pruefe-karten.mjs` steht ───────────────────

   Weil beide zusammen die Zeilengrenze rissen (1.078 von 1.000), und
   die Regel dazu ist eindeutig: teilen, nicht dulden. Der Schnitt folgt
   dem Thema — dort der **Katalog** (was auf einer Karte steht, wie
   gezogen wird), hier die **Hand** (wo sie liegt, was ein Tipp tut).

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   | Prüfung | was sonst passiert |
   | --- | --- |
   | die Hand liegt unten und ragt nirgends heraus | eine Karte halb ausserhalb des Bildes — auf dem Telefon zuerst |
   | die grosse Karte verdeckt keine andere | der Titel der Nachbarin ist mitten durchgeschnitten; genau er soll „schon zeigen, worum es geht" |
   | der Klickweg ist der kürzeste im Ring | zwei Schritte statt einem, und bei vier Karten landet man daneben |
   | jeder Text bleibt in seiner Karte | Schrift, die über den Rahmen läuft — man sieht es und findet es nicht |
   | die Zahl ist grün, der Titel nicht | Janniks „gruenlich hervorgehoben" wäre eine Behauptung |
   | Klick → Eingabe → Zeiger → Karte | **der ganze Weg**: siehe unten |

   ⚠️ **Der Grund für Abschnitt 7:** Fehlerbuch E8 — der Zeichenpass für
   die Wesen war gebaut, geprüft und gemergt, und **niemand setzte ein
   Wesen in die Welt**. Deshalb wird hier nicht die Zeichenfunktion
   allein geprüft, sondern die ganze Kette, mit **denselben** Bausteinen
   wie im Spiel: `macheKartenhand()`, `macheFlanken()`, `bedieneWahl()`.
   Wäre die Übersetzung eines Tipps in Achsenausschläge falsch, träfe
   der Klick eine andere Karte, ohne dass irgendwo etwas bricht.

   ⚠️ Was sie **nicht** kann: sagen, ob es gut aussieht. Ein Browser
   fehlt hier, und mit ihm alles, was Fehlerbuch E5 meint. Was im
   Browser wirklich geklickt wurde, steht in
   `docs/rueckmeldung/kartenhand.md`.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/karten-hand.js` (das Geprüfte), `runtime/oberflaeche.js`
   (`bedieneWahl` bewegt den Zeiger), `runtime/eingabe.js`
   (`macheFlanken`), `spiel/stufen.mjs` (zieht die Hand),
   `werkzeuge/pruefe-karten.mjs` (die andere Hälfte). */

import { macheMelder } from "./helfer.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { macheWerte, lebenMax } from "../spiel/werte.mjs";
import { KARTEN, ziehbareKarten, istMeta, seltenheitVon } from "../spiel/katalog/karten.mjs";
import { ziehKarten, hatRegel, regelnVon, KARTEN_JE_WAHL } from "../spiel/stufen.mjs";
import { VORSCHUB, ZEILE } from "../runtime/schrift.js";
import { BREITE, HOEHE } from "../runtime/zeichnen.js";
import { macheFlanken } from "../runtime/eingabe.js";
import { FARBEN, JAEGER_FARBEN } from "../runtime/palette.js";
import {
  felderFuer, schritteZu, brich, maleKlein, maleGross, zeichenReihenfolge,
  KARTE_B, KARTE_H, GROSS_B, GROSS_H, SCHRITT_X, ZAHL_FARBE
} from "../runtime/karten-hand.js";

const { melde, ende } = macheMelder({ still: true });
const LAUT = process.argv.includes("--statistik");
const laut = (...t) => { if (LAUT) console.log(...t); };

/* Ein Spieler, wie ihn `ziehKarten` erwartet — ohne die halbe Welt.
   Steht hier **und** in `werkzeuge/pruefe-karten.mjs`: Eine Prüfdatei
   aus einer anderen zu importieren hiesse, deren Prüfungen mitlaufen zu
   lassen. Sieben Zeilen doppelt sind der kleinere Preis. */
function probeSpieler(zusatz = {}, regeln = {}) {
  const werte = macheWerte(zusatz);
  const s = { werte, leben: lebenMax(werte), lebenMax: lebenMax(werte),
    karten: null, offeneWahlen: 0, stufe: 1, wissen: 0 };
  Object.assign(regelnVon(s), regeln);
  return s;
}

laut(`\n── Kartenhand ${"─".repeat(45)}\n`);

/* Ein Zeichner, der nichts malt, sondern mitschreibt. Damit lässt sich
   messen, **wo** etwas landet — und nicht nur, dass es nicht abstürzt. */
function macheAufnahme() {
  return {
    fillStyle: "#000000",
    rechtecke: [],
    fillRect(x, y, b, h) { this.rechtecke.push({ x, y, b, h, farbe: this.fillStyle }); }
  };
}

/* 1 · Wo die Karten liegen */
{
  for (const n of [3, 4]) {
    for (let gewaehlt = 0; gewaehlt < n; gewaehlt++) {
      const felder = felderFuer(n, gewaehlt);
      melde(felder.length === n, `${n} Karten geben ${n} Felder`, `${felder.length}`);

      const raus = felder.filter((f) =>
        f.x < 0 || f.y < 0 || f.x + f.b > BREITE || f.y + f.h > HOEHE);
      melde(raus.length === 0,
        `${n} Karten, ${gewaehlt} gewählt: keine ragt aus dem Bild`,
        raus.map((f) => `#${f.i} ${f.x},${f.y}`).join(" "));

      const gross = felder.filter((f) => f.gross);
      melde(gross.length === 1 && gross[0].i === gewaehlt,
        `${n} Karten: genau die gewählte ist gross`, `${gross.length}`);
      melde(gross[0].b > KARTE_B && gross[0].h > KARTE_H,
        "und wirklich grösser als die anderen",
        `${gross[0].b}x${gross[0].h} gegen ${KARTE_B}x${KARTE_H}`);

      /* Im Browser gemessen: Ohne Versatz deckte die grosse Karte ihre
         Nachbarin bis auf 45 von 88 Bildpunkten zu und schnitt deren
         Titel mitten durch. Genau der soll aber „schon zeigen, worum es
         geht". Die grosse Karte darf keine andere überlagern. */
      const g = gross[0];
      const verdeckt = felder.filter((f) => !f.gross
        && f.x < g.x + g.b && f.x + f.b > g.x && f.y < g.y + g.h && f.y + f.h > g.y);
      melde(verdeckt.length === 0,
        `${n} Karten, ${gewaehlt} gewählt: die grosse verdeckt keine andere`,
        verdeckt.map((f) => `#${f.i}`).join(" "));
    }
  }

  /* Am **unteren** Rand — das ist Janniks Wortlaut, nicht Geschmack. */
  const felder = felderFuer(3, 1);
  const tiefste = Math.max(...felder.map((f) => f.y + f.h));
  melde(HOEHE - tiefste <= 8, "die Hand liegt am unteren Bildrand",
    `${HOEHE - tiefste} Bildpunkte Luft`);

  /* Wie in einer Hand gehalten: die Karten überlappen. */
  melde(SCHRITT_X < KARTE_B, "die Karten überlappen einander",
    `${KARTE_B - SCHRITT_X} Bildpunkte`);

  /* Der Bogen: die mittlere Karte steht höher als die äusseren. Ohne
     ihn wäre es eine Reihe und keine Hand — und genau das sähe man,
     ohne dass eine Prüfung anschlüge. */
  const flach = felderFuer(3, 99);
  melde(flach[1].y < flach[0].y && flach[1].y < flach[2].y,
    "die mittlere Karte steht im Bogen höher",
    `${flach[0].y} · ${flach[1].y} · ${flach[2].y}`);
}

/* 2 · Was man anklickt, ist auch das, was man sieht */
{
  const felder = felderFuer(3, 1);
  /* **Dieselbe** Reihenfolge wie beim Malen — aus dem Modul, nicht hier
     noch einmal getippt. Zwei Kopien waeren zwei Wahrheiten, und man
     klickte genau um den Unterschied daneben. */
  const reihenfolge = zeichenReihenfolge(felder);
  const treffer = (x, y) => {
    for (let i = reihenfolge.length - 1; i >= 0; i--) {
      const f = reihenfolge[i];
      if (x >= f.x && x < f.x + f.b && y >= f.y && y < f.y + f.h) return f.i;
    }
    return null;
  };

  let daneben = 0;
  for (const f of reihenfolge) {
    /* Die Mitte jeder Karte muss ihre eigene Karte treffen — ausser bei
       den kleinen, die unter der grossen liegen können. */
    const mx = Math.floor(f.x + f.b / 2), my = Math.floor(f.y + f.h / 2);
    const t = treffer(mx, my);
    if (t === null) daneben++;
  }
  melde(daneben === 0, "jede Kartenmitte trifft überhaupt eine Karte", `${daneben}`);

  /* Die gewählte Karte wird **zuletzt** gemalt und liegt damit oben.
     Seit dem Versatz überlappen sich grosse und kleine Karten nicht mehr,
     also kann ein Trefferpunkt das nicht mehr belegen — im Rot-Beweis
     genau so aufgefallen: Die Reihenfolge umzudrehen liess die Prüfung
     grün. Zugesichert wird deshalb die Reihenfolge selbst. */
  const gross = felder.find((f) => f.gross);
  melde(reihenfolge[reihenfolge.length - 1].gross === true,
    "die hervorgehobene Karte wird zuletzt gemalt und liegt damit oben",
    `zuletzt: #${reihenfolge[reihenfolge.length - 1].i}`);
  melde(reihenfolge.length === felder.length
    && new Set(reihenfolge.map((f) => f.i)).size === felder.length,
    "und die Reihenfolge enthält jede Karte genau einmal");
  const eck = treffer(gross.x + 2, gross.y + 2);
  melde(eck === gross.i, "ein Punkt auf der grossen Karte trifft auch sie",
    `getroffen: ${eck}, erwartet: ${gross.i}`);

  /* Gegenprobe: Ein Punkt weit über der Hand trifft nichts. Sonst
     schluckte die Hand jeden Tipp im Bild — auch den auf den
     Ausweich-Knopf. */
  melde(treffer(BREITE / 2, 30) === null, "über der Hand trifft man nichts");
  melde(treffer(2, HOEHE - 2) === null, "und in der linken unteren Ecke auch nicht");
}

/* 3 · Der kürzeste Weg im Ring */
{
  let falsch = 0;
  for (const n of [3, 4]) {
    for (let von = 0; von < n; von++) {
      for (let nach = 0; nach < n; nach++) {
        const { richtung, anzahl } = schritteZu(nach, von, n);
        /* Nachgerechnet mit derselben Formel, die `bedieneWahl` benutzt. */
        let z = von;
        for (let s = 0; s < anzahl; s++) z = (z + richtung + n) % n;
        if (z !== nach) { falsch++; console.log(`    ${von} → ${nach} (n=${n}) landet auf ${z}`); }
        if (anzahl > Math.floor(n / 2)) { falsch++; console.log(`    ${von} → ${nach}: ${anzahl} Schritte, das geht kürzer`); }
      }
    }
  }
  melde(falsch === 0, "der Klickweg ist immer der kürzeste im Ring", `${falsch} daneben`);
}

/* 4 · Passt der Text auf die Karte? */
{
  const proKlein = Math.floor((KARTE_B - 8 + 1) / VORSCHUB);
  const proGross = Math.floor((GROSS_B - 8 + 1) / VORSCHUB);

  /* Ein Wort lässt sich nicht umbrechen. Das längste Titelwort muss
     also in **eine** Zeile der kleinen Karte passen — sonst wird es
     stumm gekürzt, und aus „LEICHENFLEDDERER" wird „LEICHENFLEDDERE.". */
  const woerter = KARTEN.flatMap((k) => k.titel.split(" "));
  const laengstes = woerter.reduce((a, b) => (b.length > a.length ? b : a), "");
  melde(laengstes.length <= proKlein,
    "das längste Titelwort passt in eine Zeile der kleinen Karte",
    `„${laengstes}" ${laengstes.length} von ${proKlein}`);

  /* Und jeder Titel in höchstens zwei Zeilen, ohne Kürzungspunkt. */
  const gekuerzt = KARTEN.filter((k) => brich(k.titel, KARTE_B - 8, 2).join(" ") !== k.titel);
  melde(gekuerzt.length === 0, "jeder Titel passt in zwei Zeilen der kleinen Karte",
    gekuerzt.map((k) => k.titel).join(", "));

  /* Die Wertzeile ist der Kern der Karte — sie muss auf der grossen
     Karte in **eine** Zeile passen, sonst ist „besser lesen können"
     eine Behauptung. Geprüft an allen wirklich erzeugten Zeilen. */
  const zufall = macheZufall(4711);
  let zuLang = 0, laengste = "";
  const gesehen = new Set();
  for (let i = 0; i < 3000; i++) {
    for (const k of ziehKarten(zufall, probeSpieler())) {
      gesehen.add(k.id);
      for (const z of k.zeilen) {
        const ganz = `${z.zahl} ${z.text}`;
        if (ganz.length > proGross) { zuLang++; if (ganz.length > laengste.length) laengste = ganz; }
      }
    }
  }
  melde(zuLang === 0, "jede Wertzeile passt in eine Zeile der grossen Karte",
    zuLang ? `${zuLang} mal, am längsten „${laengste}"` : `bis ${proGross} Zeichen`);

  /* Und: in 3.000 Händen ist wirklich **jede** ziehbare Karte einmal
     dabei gewesen. Ohne diese Zusicherung prüften die Zeilen oben nur
     die Karten, die der Würfel zufällig mochte. */
  const fehlend = ziehbareKarten().filter((k) => !gesehen.has(k.id));
  melde(fehlend.length === 0, "in 3.000 Händen kam jede ziehbare Karte mindestens einmal",
    fehlend.map((k) => k.id).join(", "));
  laut(`  ${gesehen.size} verschiedene Karten in 3.000 Händen gesehen`);
}

/* 5 · Nichts läuft aus der Karte heraus */
{
  const zufall = macheZufall(1234);
  const jaeger = JAEGER_FARBEN[0];
  let rausKlein = 0, rausGross = 0, gemalt = 0;
  const gesehen = new Set();

  for (let i = 0; i < 2000 && gesehen.size < ziehbareKarten().length; i++) {
    for (const k of ziehKarten(zufall, probeSpieler({ kartenwert: i % 3 === 0 ? 100 : 0 }))) {
      if (gesehen.has(k.id)) continue;
      gesehen.add(k.id);
      gemalt++;

      /* **Nur Schriftpunkte.** Rahmen und Seltenheitsbalken liegen
         absichtlich am Rand; Buchstaben nicht. `zeichneText` malt jeden
         Bildpunkt einzeln — Kantenlänge 1 ist also genau die Schrift.

         Der innere Rand von 3 Bildpunkten ist der Grund, warum dieser
         Fall überhaupt etwas findet: Ein **nicht** umgebrochener Titel
         mit 17 Zeichen bleibt rechnerisch noch in der Karte (84 von 88),
         klebt aber am Rahmen. Im Rot-Beweis blieb die Prüfung ohne
         diesen Rand grün. */
      const innen = (r, x0, y0, b0, h0) => r.b !== 1 || r.h !== 1
        || (r.x >= x0 + 3 && r.y >= y0 + 3 && r.x + r.b <= x0 + b0 - 3 && r.y + r.h <= y0 + h0 - 3);

      const a = macheAufnahme();
      maleKlein(a, k, 10, 20);
      for (const r of a.rechtecke) {
        if (!innen(r, 10, 20, KARTE_B, KARTE_H)) {
          rausKlein++;
          if (rausKlein === 1) console.log(`    ragt aus der kleinen Karte: ${k.id} bei ${r.x},${r.y}`);
          break;
        }
      }

      const b = macheAufnahme();
      maleGross(b, k, 10, 20, jaeger);
      for (const r of b.rechtecke) {
        if (!innen(r, 10, 20, GROSS_B, GROSS_H)) {
          rausGross++;
          if (rausGross === 1) console.log(`    ragt aus der grossen Karte: ${k.id} bei ${r.x},${r.y}`);
          break;
        }
      }
    }
  }
  /* Die Platzrechnung für den Flavour-Text ist mit den echten Texten
     nicht zu beweisen — sie sind alle kurz genug, und im Rot-Beweis
     blieb die Prüfung deshalb grün, als ich die Rechnung durch eine
     feste Zahl ersetzte. Also ein Text, der die Karte sprengen **will**. */
  {
    const lang = macheAufnahme();
    maleGross(lang, {
      titel: "LANGE REDE", text: ("WORT ").repeat(80).trim(),
      zeilen: [{ zahl: "+9", text: "LEBEN" }],
      seltenheitName: "Gemein", farbe: FARBEN.schriftMatt
    }, 10, 20, jaeger);
    const raus = lang.rechtecke.filter((r) => r.b === 1 && r.h === 1
      && (r.x < 13 || r.y < 23 || r.x + 1 > 10 + GROSS_B - 3 || r.y + 1 > 20 + GROSS_H - 3));
    melde(raus.length === 0, "auch ein masslos langer Text bleibt in der grossen Karte",
      raus.length ? `${raus.length} Bildpunkte draussen, tiefster bei y ${Math.max(...raus.map((r) => r.y))}` : "");
  }

  melde(gemalt >= 20, "es wurden genug verschiedene Karten gemalt", `${gemalt}`);
  melde(rausKlein === 0, "keine kleine Karte malt über ihren Rand hinaus", `${rausKlein}`);
  melde(rausGross === 0, "keine grosse Karte malt über ihren Rand hinaus", `${rausGross}`);
}

/* 6 · Die Zahlen sind grün, der Rest nicht */
{
  const karte = ziehKarten(macheZufall(21), probeSpieler()).find((k) => k.wert);
  const a = macheAufnahme();
  maleKlein(a, karte, 0, 0);
  const gruen = a.rechtecke.filter((r) => r.farbe === ZAHL_FARBE);
  melde(gruen.length > 0, "die Zahl wird grün gemalt",
    `${gruen.length} Bildpunkte in ${ZAHL_FARBE}`);

  /* Der Titel darf **nicht** grün sein — sonst wäre „hervorgehoben"
     kein Unterschied mehr. Der Titel steht in den obersten zwei Zeilen. */
  const imTitel = gruen.filter((r) => r.y < 9 + ZEILE * 2);
  melde(imTitel.length === 0, "und nur die Zahl, nicht der Titel", `${imTitel.length}`);

  /* Gegenprobe: Der Zeilentext daneben ist matt. Ohne sie bestünde die
     Zusicherung auch, wenn die ganze Karte grün wäre. */
  const matt = a.rechtecke.filter((r) => r.farbe === FARBEN.schriftMatt);
  melde(matt.length > 0, "der Name des Werts daneben ist matt", `${matt.length} Bildpunkte`);

  melde(ZAHL_FARBE === FARBEN.seucheHell, "das Grün kommt aus der Palette", ZAHL_FARBE);

  /* Auch eine Meta-Karte trägt eine grüne Zahl — ihre Zeilen kommen aus
     dem Katalog und nicht aus einer Wertrechnung. */
  const meta = ziehbareKarten().find(istMeta);
  const b = macheAufnahme();
  maleGross(b, {
    titel: meta.titel, text: meta.text, zeilen: meta.zeilen,
    seltenheitName: seltenheitVon(meta).name, farbe: seltenheitVon(meta).farbe
  }, 0, 0, JAEGER_FARBEN[0]);
  melde(b.rechtecke.some((r) => r.farbe === ZAHL_FARBE),
    "auch eine Meta-Karte trägt eine grüne Zahl", meta.id);
}

/* 7 · Der ganze Weg: Klick → Eingabe → Zeiger → Karte

   Das ist die eigentliche Prüfung. Sie stellt dieselbe Kette wie
   `runtime/start.js`: Die Hand übersetzt einen Tipp in Achsenausschläge,
   `macheFlanken()` macht daraus Flanken — **dieselbe** Funktion, die
   auch die Eingaben aus dem Netz umformt —, und `bedieneWahl()` bewegt
   den Zeiger. Wäre die Übersetzung falsch, träfe der Klick eine andere
   Karte, ohne dass irgendwo etwas bricht. */
{
  const horcher = [];
  const altesAdd = globalThis.addEventListener;
  globalThis.addEventListener = (art, fn) => horcher.push({ art, fn });

  const { macheKartenhand } = await import("../runtime/karten-hand.js");
  const { macheMenue, bedieneWahl } = await import("../runtime/oberflaeche.js");

  /* Eine Leinwand, die nur ihre Masse kennt — mehr braucht die
     Umrechnung von Bildschirm auf Bild nicht. */
  const leinwand = { getBoundingClientRect: () => ({ left: 0, top: 0, width: BREITE, height: HOEHE }) };
  const hand = macheKartenhand(leinwand);
  globalThis.addEventListener = altesAdd;

  melde(horcher.length === 1 && horcher[0].art === "pointerdown",
    "die Hand horcht auf genau einen Zeiger", horcher.map((h) => h.art).join(","));

  const zeigerDown = horcher[0].fn;
  let angehalten = 0;
  const tippe = (x, y) => {
    angehalten = 0;
    zeigerDown({
      clientX: x, clientY: y, pointerType: "touch", button: 0,
      stopPropagation() { angehalten++; }, preventDefault() {}
    });
  };

  /* Eine Welt, so klein wie möglich — `bedieneWahl` braucht Spieler,
     Karten und den Zeiger, sonst nichts. */
  function probeWelt(regeln = {}) {
    const s = probeSpieler({}, regeln);
    s.id = 0;
    s.offeneWahlen = 1;
    const welt = { phase: "wahl", zufall: macheZufall(2026), gegner: [], spieler: [s] };
    s.karten = ziehKarten(welt.zufall, s);
    return welt;
  }

  /* Ein Bild wie in `start.js`: mischen, Flanken bilden, bedienen,
     quittieren. Der Rückgabewert ist der Zeiger danach. */
  function bild(welt, menue, hand, flanken, rohe = { x: 0, y: 0, ausweichen: false }) {
    const eigene = hand.mische(rohe, welt);
    const eingaben = flanken([eigene]);
    if (welt.phase === "wahl") {
      bedieneWahl(welt, menue, eingaben);
      hand.quittiere();
    }
    return menue.wahlZeiger[0];
  }

  {
    const welt = probeWelt();
    const menue = macheMenue();
    menue.sperre = 0;
    const flanken = macheFlanken();
    hand.zeichne(macheAufnahme(), welt, menue, 0);

    const felder = felderFuer(welt.spieler[0].karten.length, 0);
    const ziel = felder[2];
    tippe(ziel.x + ziel.b / 2, ziel.y + ziel.h / 2);
    melde(angehalten === 1, "ein Tipp auf eine Karte wird abgefangen (sonst frisst ihn der Stick)");

    let bilder = 0;
    while (menue.wahlZeiger[0] !== 2 && bilder++ < 40) bild(welt, menue, hand, flanken);
    melde(menue.wahlZeiger[0] === 2,
      "ein Tipp auf die dritte Karte hebt die dritte Karte hervor",
      `Zeiger ${menue.wahlZeiger[0]} nach ${bilder} Bildern`);
    laut(`  Tipp auf Karte 3: nach ${bilder} Bildern hervorgehoben`);

    /* Der zweite Tipp nimmt sie. Vorher ist die Kette leer — das ist
       die Bedingung, unter der die Hand einen Tipp als „nehmen" liest. */
    const genommen = welt.spieler[0].karten[2];
    const wert = genommen.wert;
    const vorher = wert ? welt.spieler[0].werte[wert] : null;
    tippe(ziel.x + ziel.b / 2, ziel.y + ziel.h / 2);
    bilder = 0;
    while (welt.spieler[0].offeneWahlen > 0 && bilder++ < 40) bild(welt, menue, hand, flanken);
    melde(welt.spieler[0].offeneWahlen === 0,
      "ein zweiter Tipp auf dieselbe Karte nimmt sie", `nach ${bilder} Bildern`);
    if (wert) {
      melde(welt.spieler[0].werte[wert] === vorher + genommen.menge,
        "und der Wert der Karte kommt wirklich an",
        `${vorher} → ${welt.spieler[0].werte[wert]} (+${genommen.menge})`);
    } else {
      melde(hatRegel(welt.spieler[0], genommen.regel), "und ihre Regel wird gesetzt", genommen.regel);
    }
  }

  /* Gegenprobe 1: Ohne Tipp bewegt sich nichts. Sonst bestünde die
     Prüfung oben auch, wenn der Zeiger von allein wanderte. */
  {
    const welt = probeWelt();
    const menue = macheMenue();
    menue.sperre = 0;
    const flanken = macheFlanken();
    hand.zeichne(macheAufnahme(), welt, menue, 0);
    for (let i = 0; i < 40; i++) bild(welt, menue, hand, flanken);
    melde(menue.wahlZeiger[0] === 0 && welt.spieler[0].offeneWahlen === 1,
      "ohne Tipp bleibt der Zeiger stehen und nichts wird genommen",
      `Zeiger ${menue.wahlZeiger[0]}, offen ${welt.spieler[0].offeneWahlen}`);
  }

  /* Gegenprobe 2: Ein Tipp neben die Karten wird nicht abgefangen —
     sonst käme der Ausweich-Knopf auf dem Telefon nie mehr durch. */
  {
    const welt = probeWelt();
    const menue = macheMenue();
    const flanken = macheFlanken();
    hand.zeichne(macheAufnahme(), welt, menue, 0);
    tippe(BREITE / 2, 30);
    melde(angehalten === 0, "ein Tipp neben die Karten läuft weiter zum Stick");
  }

  /* Gegenprobe 3 — die eigentliche Falle: Die Kette darf **nur**
     vorrücken, wenn ein Weltschritt sie wirklich benutzt hat. Auf einem
     144-Hz-Bildschirm rechnet die Welt nicht bei jedem Bild; ein
     Eingabebild ohne Weltschritt wäre sonst verloren, und der Zeiger
     bliebe auf halbem Weg stehen. */
  {
    const welt = probeWelt();
    const menue = macheMenue();
    menue.sperre = 0;
    const flanken = macheFlanken();
    hand.zeichne(macheAufnahme(), welt, menue, 0);
    const felder = felderFuer(welt.spieler[0].karten.length, 0);
    const ziel = felder[2];
    tippe(ziel.x + ziel.b / 2, ziel.y + ziel.h / 2);

    /* Zwanzig Bilder ohne einen einzigen Weltschritt. */
    const vorher = hand.kette().length;
    for (let i = 0; i < 20; i++) hand.mische({ x: 0, y: 0, ausweichen: false }, welt);
    melde(hand.kette().length === vorher,
      "zwanzig Bilder ohne Weltschritt lassen die Klickkette stehen",
      `${vorher} → ${hand.kette().length}`);

    let bilder = 0;
    while (menue.wahlZeiger[0] !== 2 && bilder++ < 40) bild(welt, menue, hand, flanken);
    melde(menue.wahlZeiger[0] === 2, "und danach kommt sie trotzdem an", `Zeiger ${menue.wahlZeiger[0]}`);
  }

  /* Gegenprobe 3b — die Zusicherung, die `ausgegeben` wirklich trägt:
     Laufen in **einem** Bild zwei Weltschritte, ist die Eingabe trotzdem
     nur **einmal** verschickt worden. Die Kette darf dann auch nur um
     eins vorrücken; sonst fiele das Loslassen zwischen zwei Schritten
     heraus, es entstünde keine neue Flanke, und der Zeiger bliebe auf
     halbem Weg stehen.

     ⚠️ Der erste Anlauf prüfte nur `mische()` — das rückt die Kette
     ohnehin nie vor, und im Rot-Beweis blieb die Prüfung grün, als ich
     die Bedingung aus `quittiere()` entfernte. */
  {
    const welt = probeWelt();
    const menue = macheMenue();
    const flanken = macheFlanken();
    hand.zeichne(macheAufnahme(), welt, menue, 0);
    const felder = felderFuer(welt.spieler[0].karten.length, 0);
    tippe(felder[1].x + 4, felder[1].y + 4);
    const vorher = hand.kette().length;
    melde(vorher >= 2, "der Tipp hat wirklich etwas in die Kette gelegt", `${vorher}`);

    hand.mische({ x: 0, y: 0, ausweichen: false }, welt);
    hand.quittiere();
    const nachEinem = hand.kette().length;
    hand.quittiere();
    melde(nachEinem === vorher - 1, "ein Weltschritt nimmt genau eine Eingabe aus der Kette",
      `${vorher} → ${nachEinem}`);
    melde(hand.kette().length === nachEinem,
      "ein zweiter Weltschritt im selben Bild nimmt keine weitere",
      `${nachEinem} → ${hand.kette().length}`);
    /* Aufräumen, damit der Rest nicht auf einer angebrochenen Kette
       weiterprüft. */
    welt.phase = "welle";
    hand.mische({ x: 0, y: 0, ausweichen: false }, welt);
  }

  /* Gegenprobe 4: Verlässt die Welt die Kartenwahl, wird die Kette
     geräumt. Eine Bewegung, die in der nächsten Welle ankäme, wäre ein
     Ruck ohne Ursache. */
  {
    const welt = probeWelt();
    const menue = macheMenue();
    const flanken = macheFlanken();
    hand.zeichne(macheAufnahme(), welt, menue, 0);
    const felder = felderFuer(welt.spieler[0].karten.length, 0);
    tippe(felder[2].x + 4, felder[2].y + 4);
    melde(hand.kette().length > 0, "nach einem Tipp wartet etwas in der Kette",
      `${hand.kette().length}`);
    welt.phase = "welle";
    const raus = hand.mische({ x: 0, y: 0, ausweichen: true }, welt);
    melde(hand.kette().length === 0, "ausserhalb der Kartenwahl ist die Kette leer");
    melde(raus.ausweichen === true, "und die eigene Eingabe kommt unverändert durch");
  }

  /* Gegenprobe 5: Ohne gemalte Hand trifft kein Tipp. Sonst schluckte
     die Hand Zeiger, während sie gar nicht da ist. */
  {
    const welt = probeWelt();
    welt.phase = "welle";
    hand.mische({ x: 0, y: 0, ausweichen: false }, welt);
    tippe(BREITE / 2, HOEHE - 40);
    melde(angehalten === 0, "ist keine Hand gemalt, wird kein Tipp abgefangen");
  }

  /* 8 · Vier Karten: `weitsicht` darf die Hand nicht sprengen */
  {
    const welt = probeWelt({ weitsicht: true });
    const menue = macheMenue();
    menue.sperre = 0;
    const flanken = macheFlanken();
    const n = welt.spieler[0].karten.length;
    melde(n === KARTEN_JE_WAHL + 1, "mit weitsicht liegen vier Karten in der Hand", `${n}`);
    hand.zeichne(macheAufnahme(), welt, menue, 0);
    const felder = felderFuer(n, 0);
    const ziel = felder[3];
    tippe(ziel.x + ziel.b / 2, ziel.y + ziel.h / 2);
    let bilder = 0;
    while (menue.wahlZeiger[0] !== 3 && bilder++ < 40) bild(welt, menue, hand, flanken);
    melde(menue.wahlZeiger[0] === 3, "und die vierte Karte lässt sich antippen",
      `Zeiger ${menue.wahlZeiger[0]} nach ${bilder} Bildern`);
    laut(`  vier Karten: Tipp auf die vierte nach ${bilder} Bildern angekommen`);
  }
}

if (LAUT) console.log("");
ende();
