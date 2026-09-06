/* [Aufgabe: Katalog] Fundstücke — was man beim Krämer kauft, ohne dass
   es zuschlägt.

   Ein Gegenstand ist reine Wertänderung. Er belegt **keinen** der sechs
   Waffenplätze, deshalb ist er nie eine Wahl gegen eine Waffe, sondern
   immer eine gegen Gold.

   ── Der Nachteil ist der Inhalt ────────────────────────────────────

   Die Hälfte der Fundstücke gibt und nimmt zugleich. Ein Katalog aus
   lauter reinen Boni ist keine Entscheidung, sondern eine Reihenfolge:
   Man kauft, was man sich leisten kann, und liegt nie falsch. Erst der
   Nachteil macht aus „mehr" ein „wofür".

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/laden.mjs` (bietet an), `spiel/werte.mjs` (die Werte, auf die
   sie wirken). Importiert selbst nichts. */

export const GEGENSTAENDE = [
  {
    id: "amulett", name: "Grabamulett", preis: 22, selten: 0,
    werte: { leben: 12 },
    text: "Es hat schon einmal jemanden nicht gerettet."
  },
  {
    id: "eisenhemd", name: "Eisenhemd", preis: 26, selten: 0,
    werte: { ruestung: 8, tempo: -6 },
    text: "Hält viel aus. Wiegt viel."
  },
  {
    id: "wolfsblut", name: "Wolfsblut", preis: 24, selten: 0,
    werte: { tempo: 12, leben: -5 },
    text: "Schneller, dünner."
  },
  {
    id: "zehrstein", name: "Zehrstein", preis: 30, selten: 0,
    werte: { schaden: 6 },
    text: "Er zieht etwas aus dir heraus und gibt es der Klinge."
  },
  {
    id: "bannring", name: "Bannring", preis: 32, selten: 1,
    werte: { hast: 14 },
    text: "Die Hand wird schneller als der Gedanke."
  },
  {
    id: "diebesfinger", name: "Diebesfinger", preis: 20, selten: 0,
    werte: { gier: 18 },
    text: "Gold kommt zu dir. Frag nicht, wessen."
  },
  {
    id: "wurzelbrot", name: "Wurzelbrot", preis: 18, selten: 0,
    werte: { genesung: 4 },
    text: "Schmeckt nach Erde. Hilft trotzdem."
  },
  {
    id: "grabkerze", name: "Grabkerze", preis: 26, selten: 1,
    werte: { glueck: 20 },
    text: "Wer sie trägt, findet Besseres."
  },
  {
    /* Die **Kennung** bleibt ohne Umlaut — sie steht in Spielstaenden
       und in `runtime/ladenbilder.js`. Der **Name** ist das, was ein
       Spieler liest, und das Spiel ist deutsch: Seit die Waren im Laden
       gross und mit Bild dastehen, faellt „LAEUFERSCH." auf. */
    id: "laeuferschuh", name: "Läuferschuh", preis: 28, selten: 1,
    werte: { tempo: 18, ruestung: -5 },
    text: "Man rennt. Man hält nichts aus."
  },
  {
    id: "bleigewicht", name: "Bleigewicht", preis: 30, selten: 1,
    werte: { schaden: 10, tempo: -12 },
    text: "Jeder Schritt kostet. Jeder Schlag zahlt."
  },
  {
    id: "blutkelch", name: "Blutkelch", preis: 44, selten: 2,
    werte: { schaden: 5, genesung: 6, leben: -8 },
    text: "Er gibt zurück, was er vorher genommen hat."
  },
  {
    id: "totenlicht", name: "Totenlicht", preis: 38, selten: 2,
    werte: { glueck: 15, hast: 8, leben: -6 },
    text: "Es zeigt den Weg. Es zeigt dich auch."
  },
  {
    id: "knochenpanzer", name: "Knochenpanzer", preis: 48, selten: 2,
    werte: { ruestung: 18, leben: 10, tempo: -10, hast: -8 },
    text: "Nichts kommt durch. Du auch nicht schnell weg."
  },
  {
    id: "reliquie", name: "Reliquie", preis: 75, selten: 3,
    werte: { leben: 15, schaden: 8, hast: 10, ruestung: 6, glueck: 10 },
    text: "Was auch immer darin liegt, es hilft."
  }
];

export const GEGENSTAND_NACH_ID = new Map(GEGENSTAENDE.map((g) => [g.id, g]));

/* Ab welcher Welle eine Seltenheitsstufe überhaupt angeboten wird.
   Ohne diese Schwelle könnte die Reliquie in Welle 1 fallen — und wer
   sie dann nicht bekommt, hat Pech statt einer Entscheidung gehabt. */
export const SELTEN_AB_WELLE = [1, 3, 6, 9];
