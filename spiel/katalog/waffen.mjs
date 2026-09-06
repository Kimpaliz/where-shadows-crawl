/* [Aufgabe: Katalog] Die Waffen — Daten, kein Verhalten.

   Eine Waffe sucht sich ihr Ziel selbst und schlägt zu, sobald sie
   bereit ist; der Spieler tut dabei nichts (docs/SPIEL.md, Bauteil 2).
   Deshalb steht hier **nur**, was eine Waffe *ist* — wie sie zuschlägt,
   steht in `spiel/kampf.mjs`. Diese Trennung ist der Grund, warum eine
   neue Waffe ein Eintrag ist und keine Zeile Programm.

   ── Die Felder ─────────────────────────────────────────────────────

   `art`          ob die Waffe **etwas fliegen lässt**: `fern` wirft ein
                  Geschoss, `nahkampf` nicht. Achtung, der Name ist
                  älter als die Sache: Ein Kettenblitz und ein
                  Meteoritenschauer reichen weit und tragen trotzdem
                  `nahkampf`, weil kein Geschoss durch die Welt fliegt.
                  An `art` hängen zwei Prüfungen — eine Fernwaffe
                  braucht `geschosstempo` und ein Salvenmuster, eine
                  Nahkampfwaffe darf keines haben
                  (`werkzeuge/pruefe-angriffe.mjs`).
   `angriffsform` **wie** sie zuschlägt, aus `spiel/angriffsformen.mjs`.
                  Fehlt sie, gilt der Bestand: `schlag` bzw. `geschoss`.
                  Das ist der Grund, warum keine der zwölf alten Waffen
                  eine Zeile brauchte, als es die Formen gab.
   `reichweite`   in Bildpunkten; darüber hinaus sucht sie kein Ziel
   `abklingzeit`  Sekunden zwischen zwei Schlägen, vor der Hast
   `schaden`      Grundschaden auf Stufe 1
   `mitschaden`   Anteil des Spieler-Schadens, der dazukommt (0…1,5)
   `ziele`        wie viele Gegner ein Schlag trifft
   `wirkung`      was der Treffer zusätzlich tut, siehe unten
   `merkmale`     die Fraktionen aus docs/SPIEL.md 3; vier gleiche
                  geben den Gruppenbonus
   `schadensart`  eine der fünf aus `spiel/schadensarten.mjs`
   `preis`        Grundpreis beim Krämer, Stufe 1

   ── Merkmal und Schadensart sind zweierlei ─────────────────────────

   Ein `merkmal` ist eine **Fraktion** und dient dem Gruppenbonus; die
   `schadensart` sagt, *wie* ein Treffer wehtut, und daran hängen
   Modifier, Kritwerte und Widerstände. Die Zuordnung ist trotzdem
   nicht frei: Sie folgt dem **ersten** Merkmal, nach der Tabelle
   `MERKMAL_ART` in `spiel/schadensarten.mjs`. Nachgerechnet wird das in
   `werkzeuge/pruefe-werte.mjs` — sonst wäre eine Feuerwaffe mit der Art
   `frost` ein stiller Fehler: Der Bau des Spielers ginge ins Leere, und
   niemand fände heraus, warum.

   ── Die Wirkungen ──────────────────────────────────────────────────

   `brand`        Schaden über 3 s, stapelt nicht, erneuert sich
   `gift`         Schaden über 5 s, unabhängig von Rüstung
   `frost`        bremst das Ziel um den Anteil, 1,5 s lang
   `lebensraub`   heilt den Träger je Treffer
   `wucht`        stößt das Ziel zurück, in Bildpunkten

   ── Die Angriffsformen und ihre eigenen Felder ─────────────────────

   Jede Form bringt einen eigenen Unterblock mit; er heißt wie die Form
   und steht nur bei den Waffen, die sie benutzen. Was darin steht und
   welche Vorgabe gilt, wenn ein Feld fehlt, steht bei der jeweiligen
   `baue…()` in `spiel/angriffsformen.mjs` — hier stünde es zum zweiten
   Mal und liefe irgendwann auseinander.

   | Form | Block | was sie ist |
   | --- | --- | --- |
   | `kegel` | `kegel` | ein Flammenkegel, der steht und ausglüht |
   | `schwarm` | `schwarm` | viele kleine Sucher mit **eigenen** Zielen |
   | `aura` | `aura` | ein Ring, der mitläuft und dauernd wirkt |
   | `erlahmend` | `erlahmt` | ein Geschoss, das langsamer und schwächer wird |
   | `kette` | `kette` | ein Blitz, der von Ziel zu Ziel springt |
   | `meteore` | `meteore` | Einschläge mit Vorwarnung |
   | `bogen` | `bogen` | ein Schwung mit echter Trefferfläche |

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/kampf.mjs` (führt sie aus), `spiel/angriffsformen.mjs` (die
   Formen), `spiel/laden.mjs` (bietet sie an),
   `spiel/werte.mjs` (Stufe und Gruppenbonus). Importiert selbst
   nichts — ein Katalog hängt an niemandem. */

/* Der Schaden einer Waffe wächst mit ihrer Stufe. Eine Stufe ist kein
   kleiner Bonus, sondern der Grund, zwei gleiche Waffen zu
   verschmelzen (Bauteil 7): Stufe 4 schlägt zweieinhalbmal so hart wie
   Stufe 1. */
export const STUFEN_FAKTOR = [1, 1.5, 2.0, 2.5];

/* Der Preis wächst schneller als die Wirkung — sonst wäre Verschmelzen
   nie besser als Nachkaufen. */
export const STUFEN_PREIS = [1, 2.2, 4.8, 10];

export const MERKMALE = [
  "Schnitt", "Wucht", "Feuer", "Frost", "Bann", "Seuche", "Blut", "Segen"
];

export const WAFFEN = [
  {
    id: "sichel", name: "Sichel", merkmale: ["Schnitt"], schadensart: "schnitt",
    art: "nahkampf", reichweite: 34, abklingzeit: 0.42,
    schaden: 5, mitschaden: 0.8, ziele: 1, wirkung: {},
    preis: 12,
    text: "Kurz und schnell. Wer nichts anderes hat, hat das."
  },
  {
    id: "sense", name: "Sense", merkmale: ["Schnitt", "Wucht"], schadensart: "schnitt",
    art: "nahkampf", reichweite: 46, abklingzeit: 1.0,
    schaden: 11, mitschaden: 1.0, ziele: 3, wirkung: { wucht: 8 },
    preis: 28,
    text: "Trifft drei auf einmal. Dafür muss man sie erst schwingen."
  },
  {
    id: "richtschwert", name: "Richtschwert", merkmale: ["Schnitt"], schadensart: "schnitt",
    art: "nahkampf", reichweite: 40, abklingzeit: 1.35,
    schaden: 22, mitschaden: 1.3, ziele: 1, wirkung: {},
    preis: 40,
    text: "Ein Schlag, ein Toter. Wenn er sitzt."
  },
  {
    id: "morgenstern", name: "Morgenstern", merkmale: ["Wucht"], schadensart: "wucht",
    art: "nahkampf", reichweite: 32, abklingzeit: 1.1,
    schaden: 16, mitschaden: 1.1, ziele: 2, wirkung: { wucht: 24 },
    preis: 34,
    text: "Schlägt zurück, was zu nah kommt."
  },
  {
    id: "wurfmesser", name: "Wurfmesser", merkmale: ["Schnitt"], schadensart: "schnitt",
    art: "fern", reichweite: 88, abklingzeit: 0.5,
    schaden: 6, mitschaden: 0.7, ziele: 1, wirkung: {},
    preis: 18, geschosstempo: 190,
    /* Ein Messerwerfer wirft nach — zwei Klingen hintereinander, beide
       geradeaus. Die schnellste Waffe im Spiel bekommt das Muster, bei
       dem man am wenigsten zielen muss. */
    salve: { form: "folge", geschosse: 2, abstand: 7 },
    text: "Zwei Klingen, kurz hintereinander."
  },
  {
    id: "armbrust", name: "Armbrust", merkmale: ["Wucht"], schadensart: "wucht",
    art: "fern", reichweite: 140, abklingzeit: 1.6,
    schaden: 26, mitschaden: 1.4, ziele: 1, wirkung: { durchschlag: 2 },
    preis: 45, geschosstempo: 260,
    /* Zwei Läufe nebeneinander, beide Bolzen parallel. Nicht gefächert:
       Eine Armbrust streut nicht, sie trifft, wohin sie zeigt — und
       zusammen mit `durchschlag: 2` ist das die Waffe für eine Reihe,
       die auf einen zuläuft. */
    salve: { form: "parallel", geschosse: 2, abstand: 5 },
    text: "Zwei Bolzen nebeneinander. Lädt dafür eine Ewigkeit."
  },
  {
    id: "pechfackel", name: "Pechfackel", merkmale: ["Feuer"], schadensart: "feuer",
    art: "nahkampf", reichweite: 40, abklingzeit: 0.8,
    schaden: 6, mitschaden: 0.5, ziele: 3, wirkung: { brand: 9 },
    preis: 30,
    text: "Der Schlag ist schwach. Das Feuer danach nicht."
  },
  {
    id: "frostrune", name: "Frostrune", merkmale: ["Frost", "Bann"], schadensart: "frost",
    art: "fern", reichweite: 96, abklingzeit: 1.2,
    schaden: 9, mitschaden: 0.6, ziele: 1, wirkung: { frost: 0.45 },
    preis: 32, geschosstempo: 150,
    /* Drei Splitter, gefächert. Frost wirkt über `frost: 0.45` auf
       jeden Getroffenen einzeln — in der Breite zu treffen ist hier
       mehr wert als hart zu treffen. */
    salve: { form: "faecher", geschosse: 3, winkel: 0.2 },
    text: "Drei Splitter. Was steht, beißt nicht."
  },
  {
    id: "seuchenglas", name: "Seuchenglas", merkmale: ["Seuche"], schadensart: "fluch",
    art: "fern", reichweite: 80, abklingzeit: 1.5,
    schaden: 4, mitschaden: 0.3, ziele: 4, wirkung: { gift: 16 },
    preis: 36, geschosstempo: 130,
    /* Vier Scherben, ungleichmäßig gestreut. Der Text sagt seit jeher
       „zerspringt" — bis heute flog trotzdem ein einzelnes Glas
       geradeaus. Streuung statt Fächer, weil Scherben keine gleichen
       Abstände haben; das ist die einzige Waffe, die dafür aus
       `welt.zufall` zieht. */
    salve: { form: "streu", geschosse: 4, streuung: 0.38 },
    text: "Zerspringt in vier. Was danach kommt, fragt nicht nach Rüstung."
  },
  {
    id: "blutdorn", name: "Blutdorn", merkmale: ["Blut", "Schnitt"], schadensart: "schnitt",
    art: "nahkampf", reichweite: 30, abklingzeit: 0.55,
    schaden: 7, mitschaden: 0.9, ziele: 1, wirkung: { lebensraub: 1 },
    preis: 38,
    text: "Nimmt sich, was es braucht."
  },
  {
    id: "weihkessel", name: "Weihwasserkessel", merkmale: ["Segen", "Bann"], schadensart: "fluch",
    art: "nahkampf", reichweite: 52, abklingzeit: 1.8,
    schaden: 13, mitschaden: 0.9, ziele: 8, wirkung: { wucht: 14 },
    preis: 42,
    text: "Trifft alles im Umkreis. Auch das hinter dir."
  },
  {
    id: "bannstein", name: "Bannstein", merkmale: ["Bann"], schadensart: "fluch",
    art: "fern", reichweite: 120, abklingzeit: 0.95,
    schaden: 12, mitschaden: 1.0, ziele: 1, wirkung: {},
    preis: 34, geschosstempo: 210, suchend: true,
    /* Drei Steine, rundum entlassen. Ein Ring wäre bei jeder anderen
       Waffe Unsinn — hier nicht: `suchend: true` holt jeden Stein zum
       Ziel zurück, und der Umweg ist genau das, was man sieht. */
    salve: { form: "ring", geschosse: 3 },
    text: "Drei Steine, und jeder findet sein Ziel allein."
  },

  /* ── Janniks sieben Angriffe (06.09.2026) ─────────────────────────

     *„die angriffe dürfen nicht blos ein treffer effekt sein."* Jede
     der sieben trägt eine `angriffsform`, und keine von ihnen entlädt
     sich im Augenblick des Auslösens — sie stehen, wandern, springen
     oder fallen. Die Zahlen sind so gewählt, dass ihr Schaden über die
     Zeit ungefähr im Feld der zwölf bestehenden Waffen liegt
     (11 bis 17 je Sekunde); nachgemessen wird das nicht hier, sondern
     über ganze Läufe in `werkzeuge/pruefe-balance.mjs`. */
  {
    id: "flammenatem", name: "Flammenatem", merkmale: ["Feuer"], schadensart: "feuer",
    art: "nahkampf", reichweite: 62, abklingzeit: 2.6,
    schaden: 9, mitschaden: 0.6, ziele: 3, wirkung: { brand: 6 },
    preis: 38,
    angriffsform: "kegel",
    /* „hohe abklingzeit" ist Janniks Wort und hier die eigentliche
       Entscheidung: 2,6 s ist die längste im Katalog. Dafür steht der
       Kegel 1,8 s lang da und schlägt achtmal zu — wer ihn wirft, wirft
       ihn dorthin, wo gleich jemand sein wird, nicht dorthin, wo gerade
       jemand ist. `restStaerke: 0.28` ist das Ausglühen: Der letzte
       Takt trägt gut ein Viertel des ersten. */
    kegel: { halbWinkel: 0.6, dauer: 1.8, takt: 0.22, restStaerke: 0.28, gesamt: 2.4 },
    text: "Ein langer Atemzug Feuer. Er bleibt liegen und glüht aus."
  },
  {
    id: "irrlichter", name: "Irrlichter", merkmale: ["Bann"], schadensart: "fluch",
    art: "fern", reichweite: 100, abklingzeit: 0.38,
    schaden: 5, mitschaden: 0.35, ziele: 4, wirkung: {},
    preis: 30, geschosstempo: 120, suchend: true,
    angriffsform: "schwarm",
    /* Vier Lichter, die als Wolke starten und sich dann **verteilen**:
       `schwarmZiel()` gibt jedem ein eigenes Ziel. Genau das trennt sie
       vom Bannstein, der seine drei suchenden Steine auf denselben
       Gegner schickt. „wenig schaden, kurze abklingzeit" wörtlich:
       5 Grundschaden ist der zweitniedrigste Wert im Katalog, 0,38 s
       die kürzeste Abklingzeit. */
    salve: { form: "schwarm", geschosse: 4, radius: 6 },
    schwarm: { lenkung: 12, suchweite: 110 },
    text: "Vier kalte Lichter. Jedes sucht sich seinen eigenen Toten."
  },
  {
    id: "moderkranz", name: "Moderkranz", merkmale: ["Seuche"], schadensart: "fluch",
    art: "nahkampf", reichweite: 40, abklingzeit: 0.5,
    schaden: 3, mitschaden: 0.25, ziele: 8, wirkung: {},
    preis: 40,
    angriffsform: "aura",
    /* Die einzige Waffe, die **auch ohne Ziel** auslöst
       (`spiel/kampf.mjs`, `feuereWaffen`). Ohne diese Ausnahme wäre
       „dauerhaft" gelogen: Der Ring erschiene erst, wenn jemand
       hineinläuft, und verschwände, sobald der letzte fällt.
       `nachhall: 2.5` heißt, dass er zweieinhalb Takte überlebt —
       lange genug, dass er zwischen zwei Takten nicht flackert, kurz
       genug, dass er beim Tod des Trägers verglimmt. */
    aura: { anteil: 1, nachhall: 2.5 },
    text: "Ein Ring aus Fäulnis, der mit dir geht. Er fragt nicht nach Rüstung."
  },
  {
    id: "bleischleuder", name: "Bleischleuder", merkmale: ["Wucht"], schadensart: "wucht",
    art: "fern", reichweite: 120, abklingzeit: 1.15,
    schaden: 24, mitschaden: 1.2, ziele: 1, wirkung: { wucht: 16 },
    preis: 36, geschosstempo: 240,
    angriffsform: "erlahmend",
    /* Die einzige Waffe mit `einzeln` — und das ist kein Rest, sondern
       der Sinn: „normales projektil das an geschwindigkeit und schaden
       verliert". Ein Muster daneben würde von der einen Sache
       ablenken, um die es geht. Nah trifft sie am härtesten; auf voller
       Reichweite bleiben ein Viertel Tempo und 30 % Schaden. */
    salve: { form: "einzeln", geschosse: 1 },
    erlahmt: { bremse: 0.9, mindestTempo: 0.25, mindestSchaden: 0.3 },
    text: "Nah zerschlägt sie einen Schädel. Weit weg wirft sie Steine."
  },
  {
    id: "gewitterrune", name: "Gewitterrune", merkmale: ["Bann"], schadensart: "fluch",
    art: "nahkampf", reichweite: 96, abklingzeit: 1.3,
    schaden: 14, mitschaden: 0.9, ziele: 1, wirkung: {},
    preis: 44,
    angriffsform: "kette",
    /* `nahkampf` bei 96 Bildpunkten Reichweite sieht falsch aus und ist
       richtig: Es fliegt nichts. Der Blitz steht in dem Augenblick, in
       dem er fällt (`schlageKette()` in `spiel/kampf.mjs`); was danach
       0,16 s lang zu sehen ist, ist nur noch sein Bild.
       Vier Ziele bei drei Sprüngen, jedes 22 % schwächer als das
       davor — zusammen das 2,9-fache eines Schlages, verteilt. */
    kette: { spruenge: 3, sprungweite: 56, verlust: 0.22 },
    text: "Einer wird getroffen. Die drei daneben auch."
  },
  {
    id: "sternenfall", name: "Sternenfall", merkmale: ["Feuer"], schadensart: "feuer",
    art: "nahkampf", reichweite: 130, abklingzeit: 3.4,
    schaden: 10, mitschaden: 0.7, ziele: 3, wirkung: { brand: 4 },
    preis: 48,
    angriffsform: "meteore",
    /* Fünf Einschläge, jeder mit 0,55 s **Vorwarnung** am Boden. Die
       Vorwarnung ist nicht Zierde: Ein Flächenschaden, der ohne
       Ankündigung vom Himmel fällt, ist im exakten Top-Down nicht
       ausweichbar und damit nur eine Zahl. Mit ihr wird er zu einer
       Entscheidung — auch für den Spieler, der danebensteht.
       ⚠️ Zieht **zehnmal** aus `welt.zufall` (zwei je Meteor). */
    meteore: {
      anzahl: 5, streuung: 34, radius: 22,
      warnung: 0.55, abstand: 0.16, glut: 0.35, gesamt: 2.6
    },
    text: "Der Himmel merkt sich, wo du hingezeigt hast."
  },
  {
    id: "mondsichel", name: "Mondsichel", merkmale: ["Schnitt"], schadensart: "schnitt",
    art: "nahkampf", reichweite: 52, abklingzeit: 0.88,
    schaden: 12, mitschaden: 1.0, ziele: 4, wirkung: { wucht: 6 },
    preis: 38,
    angriffsform: "bogen",
    /* Die einzige Waffe mit einer **gerichteten** Trefferfläche.
       Janniks Ansage: „sichel angriff mittelgross in richtung der
       gegner aber nur als nahkampf (richtige hitbox)". Jede andere
       Nahkampfwaffe trifft rundum — wer nach oben schaut, erwischt auch
       den im Rücken. Hier fährt eine schmale Schneide (`schneide`) über
       einen weiten Bogen (`spanne`, gut 120 Grad) und trifft jeden
       genau einmal. Man kann ihr ausweichen, indem man hinter dem
       Schwung steht; das kann man bei keiner anderen. */
    bogen: { spanne: 2.1, schneide: 0.36, dauer: 0.22, anteil: 1 },
    text: "Ein weiter Schwung. Was dahinter steht, bleibt heil."
  }
];

/* Nachschlagen nach Kennung — einmal gebaut, nicht bei jedem Zugriff.
   Ein `find()` in einer Schleife über 300 Gegner wäre der klassische
   stille Leistungsfresser. */
export const WAFFE_NACH_ID = new Map(WAFFEN.map((w) => [w.id, w]));

/* Eine Waffe im Besitz eines Spielers: Katalogeintrag plus Stufe plus
   die eigene Abklingzeit. Die Kopie ist Absicht — zwei Sicheln im
   Gürtel schlagen zu verschiedenen Zeitpunkten zu. */
export function macheWaffe(id, stufe = 1) {
  const vorlage = WAFFE_NACH_ID.get(id);
  if (!vorlage) throw new Error(`Unbekannte Waffe: ${id}`);
  return { id, stufe, bereitIn: 0, vorlage };
}

/* Was eine Waffe auf ihrer Stufe wirklich austeilt, bevor die Werte
   des Spielers dazukommen. */
export function schadenDerWaffe(waffe) {
  return waffe.vorlage.schaden * STUFEN_FAKTOR[waffe.stufe - 1];
}

export function preisDerWaffe(id, stufe = 1) {
  return Math.round(WAFFE_NACH_ID.get(id).preis * STUFEN_PREIS[stufe - 1]);
}
