/* [Aufgabe: Prüfwesen] Die Zeichen und Warenbilder: da, heil, unterscheidbar.

       node werkzeuge/pruefe-bilder.mjs

   ── Was hier geprüft wird und was in `pruefe-sprites.mjs` ──────────

   Dort die **Welt**: Jäger, Gegner, Geschosse, Trefferzeichen — alles,
   was gedreht wird und im Bild steht. Hier die **Anzeige**: die 55
   Wertzeichen (`runtime/wertsymbole.js`) und die 33 Warenbilder
   (`runtime/ladenbilder.js`). Sie werden nie gedreht, dürfen deshalb
   punktsymmetrisch sein, und ihre Regeln sind andere.

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   | was still kaputtgeht | wie es sich anfühlt |
   | --- | --- |
   | eine neue Waffe hat kein Bild | eine leere Kachel im Laden, mitten zwischen vierunddreissig vollen |
   | ein neuer Wert hat kein Zeichen | eine Lücke in der Liste, an der alle anderen eines haben — das liest sich als Fehler |
   | zwei Bilder haben dieselbe Silhouette | man kauft das Falsche, weil man auf die Form geschaut hat |
   | ein Zeichen zeigt auf eine Farbe, die es nicht gibt | ein Loch im Bild, ohne Meldung |
   | ein Raster ist eine Zeile zu kurz | man sieht es und findet es nicht |
   | ein Zeichen ragt aus seiner Zeile | die Nachbarzeile bekommt Bildpunkte, die ihr nicht gehören |

   ── Warum die Zeichen nicht auf 55 Raster gezählt werden ──────────

   32 der 55 Werte sind **erzeugt** (fünf Achsen je Schadensart, eine
   Neigung je Gruppe). Sie teilen sich sechs Raster und unterscheiden
   sich über die **Farbe**. Geprüft wird deshalb nicht „55 verschiedene
   Bilder", sondern: jeder Wert bekommt eines, und zwei Werte, die
   dasselbe Raster teilen, haben verschiedene Farben.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/wertsymbole.js`, `runtime/ladenbilder.js` (das Geprüfte),
   `runtime/oberflaeche.js` (`wareFarbe`, `wareWirkung`),
   `runtime/palette.js`, `spiel/werte.mjs`,
   `spiel/katalog/waffen.mjs`, `spiel/katalog/gegenstaende.mjs`. */

import { macheMelder } from "./helfer.mjs";
import {
  RASTER, RASTER_IDS, WERT_SYMBOL, SYMBOL_KANTE, symbolFuerWert, maleSymbol,
  GRUPPEN_MIT_FARBE
} from "../runtime/wertsymbole.js";
import {
  WAFFEN_BILDER, GEGENSTAND_BILDER, ZEICHEN, WARE_KANTE, bildFuerWare, maleWare
} from "../runtime/ladenbilder.js";
import { wareFarbe, wareWirkung } from "../runtime/oberflaeche.js";
import { FARBEN } from "../runtime/palette.js";
import { WERTE, WERT_NACH_ID, GRUPPEN } from "../spiel/werte.mjs";
import { ART_IDS, ART_NACH_ID } from "../spiel/schadensarten.mjs";
import { WAFFEN } from "../spiel/katalog/waffen.mjs";
import { GEGENSTAENDE } from "../spiel/katalog/gegenstaende.mjs";

const { melde, ende } = macheMelder({ still: true });

/* Ein Zeichner, der nichts malt, sondern mitschreibt. */
function macheAufnahme() {
  return {
    fillStyle: "#000000",
    rechtecke: [],
    fillRect(x, y, b, h) { this.rechtecke.push({ x, y, b, h, farbe: this.fillStyle }); }
  };
}

const silhouette = (r) => r.join("").replace(/[^.]/g, "#");
const flaeche = (r) => r.join("").split("").filter((z) => z !== ".").length;

function pruefeRaster(name, raster, kante, mindestFlaeche, zeichenTabelle) {
  melde(Array.isArray(raster) && raster.length === kante,
    `${name}: ${kante} Zeilen`, `${raster?.length}`);
  if (!Array.isArray(raster)) return;
  const schief = raster.filter((z) => z.length !== kante).length;
  melde(schief === 0, `${name}: jede Zeile ${kante} breit`, `${schief} schief`);
  melde(flaeche(raster) >= mindestFlaeche,
    `${name}: genug gesetzte Punkte, um eine Gestalt zu sein`, `${flaeche(raster)}`);
  if (zeichenTabelle) {
    const fremd = [...new Set(raster.join("").split(""))]
      .filter((z) => z !== "." && !zeichenTabelle[z]);
    melde(fremd.length === 0, `${name}: jedes Zeichen ist bekannt`, fremd.join(" "));
  }
}

/* ── 1 · Die Wertzeichen ────────────────────────────────────────── */
{
  melde(SYMBOL_KANTE === 7, "ein Wertzeichen ist sieben Bildpunkte breit", `${SYMBOL_KANTE}`);
  melde(SYMBOL_KANTE % 2 === 1, "und ungerade, hat also eine echte Mitte");

  for (const [name, raster] of Object.entries(RASTER)) {
    /* Kein Zeichentabelle-Argument: Die Wertzeichen kennen nur `#`,
       `+` und `.`, die Farbe kommt von außen. */
    pruefeRaster(`wert/${name}`, raster, SYMBOL_KANTE, 8, null);
    const fremd = [...new Set(raster.join("").split(""))].filter((z) => !".#+".includes(z));
    melde(fremd.length === 0, `wert/${name}: nur . # und +`, fremd.join(" "));
  }

  /* Keine zwei Raster dürfen dieselbe Silhouette haben — sonst sind es
     zwei Namen für dasselbe Bild. */
  const formen = {};
  for (const [name, raster] of Object.entries(RASTER)) {
    (formen[silhouette(raster)] ??= []).push(name);
  }
  const doppelt = Object.values(formen).filter((l) => l.length > 1);
  melde(doppelt.length === 0, "keine zwei Wertzeichen sehen gleich aus",
    doppelt.map((l) => l.join("=")).join(" · "));

  /* ⚠️ **Jeder** der 55 Werte bekommt eines, und keiner fällt auf den
     Rückfall. Der Rückfall muss es geben (eine leere Stelle in der
     Liste läse sich als Fehler), aber er darf nie gebraucht werden —
     sonst hätte ein neuer Wert still das Zeichen eines anderen. */
  const ohne = [];
  const rueckfall = [];
  for (const id of WERTE) {
    const s = symbolFuerWert(id);
    if (!s || !s.raster) { ohne.push(id); continue; }
    const fest = WERT_SYMBOL[id];
    const abgeleitet = /^(schaden_|krit_chance_|krit_schaden_|widerstand_|neigung_)/.test(id);
    if (!fest && !abgeleitet) rueckfall.push(id);
  }
  melde(ohne.length === 0, "jeder der 55 Werte hat ein Zeichen", ohne.slice(0, 4).join(" "));
  melde(rueckfall.length === 0,
    "und keiner davon nimmt den Rückfall", rueckfall.slice(0, 4).join(" "));
  melde(WERTE.length === Object.keys(WERT_SYMBOL).length + 32,
    "23 getippte Zeichen plus 32 erzeugte Werte ergeben die 55",
    `${Object.keys(WERT_SYMBOL).length} + 32 gegen ${WERTE.length}`);

  /* Jede Farbe muss es geben. Ein Tippfehler in der Tabelle wäre sonst
     still `undefined` und das Zeichen unsichtbar. */
  const falscheFarbe = Object.entries(WERT_SYMBOL)
    .filter(([, [, farbe]]) => !(farbe in FARBEN)).map(([id]) => id);
  melde(falscheFarbe.length === 0, "jede genannte Farbe steht in der Palette",
    falscheFarbe.join(" "));
  const falschesRaster = Object.entries(WERT_SYMBOL)
    .filter(([, [name]]) => !RASTER[name]).map(([id]) => id);
  melde(falschesRaster.length === 0, "und jedes genannte Raster gibt es",
    falschesRaster.join(" "));

  /* Die erzeugten Werte tragen die Farbe **ihrer** Art. Ohne diese
     Zeile könnten alle fünfundzwanzig dieselbe haben, und die Form
     allein müsste fünf Arten tragen, die sie nicht unterscheidet. */
  for (const art of ART_IDS) {
    const farbe = ART_NACH_ID.get(art).farbe;
    const meine = WERTE.filter((id) => id.endsWith(`_${art}`) || id.includes(`_${art}_`));
    melde(meine.length === 5, `${art}: fünf Werte tragen diese Art`, `${meine.length}`);
    const falsch = meine.filter((id) => symbolFuerWert(id).farbe !== farbe);
    melde(falsch.length === 0, `${art}: alle fünf in der Farbe ihrer Art`, falsch.join(" "));
    /* Und ihre fünf Formen sind fünf verschiedene. */
    const formenDerArt = new Set(meine.map((id) => symbolFuerWert(id).name));
    melde(formenDerArt.size === 5, `${art}: fünf verschiedene Formen`, `${formenDerArt.size}`);
  }

  /* Die sieben Neigungen teilen ein Raster und trennen sich über die
     Farbe — also müssen es sieben verschiedene sein. */
  const neigungsFarben = new Set(GRUPPEN.map(([g]) => symbolFuerWert(`neigung_${g}`).farbe));
  melde(neigungsFarben.size === GRUPPEN.length,
    "die sieben Neigungen haben sieben verschiedene Farben", `${neigungsFarben.size}`);
  melde(GRUPPEN_MIT_FARBE.length === GRUPPEN.length
    && GRUPPEN_MIT_FARBE.every(([, , f]) => typeof f === "string" && f.startsWith("#")),
    "jede Kartengruppe hat eine gültige Farbe");
}

/* ── 2 · Ein Wertzeichen bleibt in seiner Zeile ──────────────────── */
{
  const c = macheAufnahme();
  maleSymbol(c, symbolFuerWert("leben"), 10, 20);
  melde(c.rechtecke.length > 0, "ein Zeichen malt überhaupt etwas", `${c.rechtecke.length}`);
  const raus = c.rechtecke.filter((r) =>
    r.x < 10 || r.y < 20 || r.x >= 10 + SYMBOL_KANTE || r.y >= 20 + SYMBOL_KANTE);
  melde(raus.length === 0, "und bleibt in seinen sieben mal sieben Bildpunkten",
    raus.slice(0, 3).map((r) => `${r.x},${r.y}`).join(" "));
  melde(c.rechtecke.every((r) => Number.isInteger(r.x) && Number.isInteger(r.y)
    && r.b === 1 && r.h === 1),
    "auf ganze Bildpunkte, einer je Punkt");

  /* Die überschriebene Farbe greift wirklich — sonst wäre das Dämpfen
     einer Zeile eine Behauptung. */
  const gedaempft = macheAufnahme();
  maleSymbol(gedaempft, symbolFuerWert("leben"), 0, 0, FARBEN.rahmen);
  melde(gedaempft.rechtecke.every((r) => r.farbe === FARBEN.rahmen),
    "eine übergebene Farbe überschreibt die eigene");
}

/* ── 3 · Die Warenbilder ────────────────────────────────────────── */
{
  melde(WARE_KANTE === 11, "ein Warenbild ist elf Bildpunkte breit", `${WARE_KANTE}`);
  melde(WARE_KANTE % 2 === 1, "und ungerade");

  const fremdeFarbe = Object.entries(ZEICHEN).filter(([, f]) => !(f in FARBEN));
  melde(fremdeFarbe.length === 0, "jede Farbe der Zeichentabelle steht in der Palette",
    fremdeFarbe.map(([z, f]) => `${z}=${f}`).join(" "));

  for (const [name, raster] of Object.entries(WAFFEN_BILDER)) {
    pruefeRaster(`waffe/${name}`, raster, WARE_KANTE, 12, ZEICHEN);
  }
  for (const [name, raster] of Object.entries(GEGENSTAND_BILDER)) {
    pruefeRaster(`ding/${name}`, raster, WARE_KANTE, 12, ZEICHEN);
  }

  /* ⚠️ **Jede Ware hat ein Bild.** Der Fall, für den diese Datei
     überhaupt existiert: Wer eine Waffe in den Katalog schreibt und das
     Bild vergisst, bekommt eine leere Kachel — und merkt es erst, wenn
     sie zufällig im Laden auftaucht. */
  const waffenOhne = WAFFEN.filter((w) => !bildFuerWare("waffe", w.id)).map((w) => w.id);
  const dingeOhne = GEGENSTAENDE.filter((g) => !bildFuerWare("gegenstand", g.id)).map((g) => g.id);
  melde(waffenOhne.length === 0, `alle ${WAFFEN.length} Waffen haben ein Bild`, waffenOhne.join(" "));
  melde(dingeOhne.length === 0, `alle ${GEGENSTAENDE.length} Fundstücke haben eines`, dingeOhne.join(" "));

  /* Und umgekehrt: kein Bild ohne Ware. Ein Bild, zu dem es nichts
     gibt, ist toter Ballast, den niemand bemerkt. */
  const waffenIds = new Set(WAFFEN.map((w) => w.id));
  const dingIds = new Set(GEGENSTAENDE.map((g) => g.id));
  const verwaist = [
    ...Object.keys(WAFFEN_BILDER).filter((id) => !waffenIds.has(id)).map((id) => `waffe/${id}`),
    ...Object.keys(GEGENSTAND_BILDER).filter((id) => !dingIds.has(id)).map((id) => `ding/${id}`)
  ];
  melde(verwaist.length === 0, "und kein Bild ohne Ware", verwaist.join(" "));

  /* Keine zwei Waren sehen gleich aus. */
  const alle = { ...WAFFEN_BILDER, ...GEGENSTAND_BILDER };
  const formen = {};
  for (const [name, raster] of Object.entries(alle)) {
    (formen[silhouette(raster)] ??= []).push(name);
  }
  const doppelt = Object.values(formen).filter((l) => l.length > 1);
  melde(doppelt.length === 0, "keine zwei Warenbilder haben dieselbe Silhouette",
    doppelt.map((l) => l.join("=")).join(" · "));

  /* Jedes malt mit mindestens zwei Farben — ein einfarbiger Fleck ist
     keine Ware, sondern ein Fleck. */
  const einfarbig = Object.entries(alle)
    .filter(([, r]) => new Set(r.join("").split("").filter((z) => z !== ".")).size < 2)
    .map(([n]) => n);
  melde(einfarbig.length === 0, "jedes Warenbild malt mit mindestens zwei Farben",
    einfarbig.join(" "));

  const c = macheAufnahme();
  maleWare(c, WAFFEN_BILDER.sichel, 5, 7);
  const raus = c.rechtecke.filter((r) =>
    r.x < 5 || r.y < 7 || r.x >= 5 + WARE_KANTE || r.y >= 7 + WARE_KANTE);
  melde(raus.length === 0, "ein Warenbild bleibt in seinen elf mal elf Bildpunkten",
    raus.slice(0, 3).map((r) => `${r.x},${r.y}`).join(" "));
  melde(c.rechtecke.every((r) => Number.isInteger(r.x) && Number.isInteger(r.y)),
    "und liegt auf ganzen Bildpunkten");

  const grau = macheAufnahme();
  maleWare(grau, WAFFEN_BILDER.sichel, 0, 0, true);
  melde(grau.rechtecke.every((r) => r.farbe === FARBEN.steinHell),
    "gedämpft wird es wirklich grau — so sieht man, was man nicht bezahlen kann");
}

/* ── 4 · Was der Laden über eine Ware sagt ──────────────────────── */
{
  for (const w of WAFFEN) {
    const angebot = { sorte: "waffe", id: w.id, stufe: 1, name: w.name, preis: 10 };
    const farbe = wareFarbe(angebot);
    melde(/^#[0-9a-f]{6}$/i.test(farbe), `${w.id}: hat eine gültige Kachelfarbe`, farbe);
    melde(farbe === ART_NACH_ID.get(w.schadensart).farbe,
      `${w.id}: die Kachel trägt die Farbe ihrer Schadensart`, farbe);
    melde(wareWirkung(angebot).length > 0, `${w.id}: die Kachel sagt, was sie ist`);
  }

  for (const g of GEGENSTAENDE) {
    const angebot = { sorte: "gegenstand", id: g.id, name: g.name, werte: g.werte, selten: g.selten, preis: 10 };
    melde(/^#[0-9a-f]{6}$/i.test(wareFarbe(angebot)),
      `${g.id}: hat eine gültige Kachelfarbe`, wareFarbe(angebot));
    const text = wareWirkung(angebot);
    melde(text.length > 0, `${g.id}: die Kachel nennt seine Wirkung`, text);
    /* Und sie nennt sie mit dem **Namen** des Wertes, nicht mit der
       Kennung. „+12 LEBEN" ist eine Auskunft, „+12 leben" ein Blick in
       den Quelltext. */
    melde(text === text.toUpperCase(), `${g.id}: in Großbuchstaben wie alles hier`, text);
  }

  /* Die vier Seltenheiten geben vier verschiedene Farben — sonst wäre
     der Streifen oben auf der Kachel keine Auskunft. */
  const seltenFarben = new Set([0, 1, 2, 3].map((s) =>
    wareFarbe({ sorte: "gegenstand", selten: s })));
  melde(seltenFarben.size === 4, "die vier Seltenheiten haben vier Farben",
    `${seltenFarben.size}`);
}

ende();
