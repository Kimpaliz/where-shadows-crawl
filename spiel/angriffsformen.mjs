/* [Aufgabe: Regelkern] Die Formen, in denen ein Angriff in der Welt steht.

   ── Janniks Ansage ─────────────────────────────────────────────────

   *„die angriffe dürfen nicht blos ein treffer effekt sein."* Dazu die
   Liste: *„flammenkegel der langsam ausglüht mit hoher abklingzeit"* ·
   *„zielsuchende geschosse, wenig schaden, kurze abklingzeit"* ·
   *„dauerhafte schadensaura"* · *„normales projektil das an
   geschwindigkeit und schaden verliert"* · *„kettenblitz"* ·
   *„meteoritenschauer"* · *„sichel angriff mittelgross in richtung der
   gegner aber nur als nahkampf (richtige hitbox)"*.

   ── Was vorher war ─────────────────────────────────────────────────

   Genau **zwei** Formen, und beide sind Augenblicke:

   * `nahkampf` — schlägt sofort **alles** in Reichweite, rundum. Es
     gibt keine Richtung; der Schlagbogen im Bild zeigt eine, die die
     Regel gar nicht kennt.
   * `fern` — wirft ein Geschoss, das fliegt und beim Einschlag einmal
     zuschlägt.

   Beide entladen sich in dem Augenblick, in dem sie fallen. Ein
   Angriff, der eine Sekunde lang **dasteht** — ein Kegel, der
   ausglüht, ein Ring, der mitläuft, ein Bogen, der durch die Luft
   fährt —, war im Regelkern nicht ausdrückbar. Genau das ist der
   Unterschied zwischen einem Treffereffekt und einem Angriff.

   ── Die eine neue Sache: ein Feld ──────────────────────────────────

   Ein **Feld** ist eine Fläche, die eine Weile in der Welt steht und
   in ihrem eigenen Takt zuschlägt. Es liegt in `welt.felder`, wird von
   `spiel/kampf.mjs` (`wirkeFelder()`) abgearbeitet und von
   `runtime/zeichnen.js` gemalt. Vier der sieben Formen sind Felder:
   Kegel, Aura, Sichelbogen und Meteoreinschlag.

   **Warum nicht sieben Sonderfälle in der Kampfschleife?** Weil dann
   jede achte Form eine achte Verzweigung an einer Stelle bräuchte, an
   der sie niemand sucht — dieselbe Begründung, aus der eine Meta-Karte
   eine Marke setzt statt einer Sonderbehandlung
   (`spiel/katalog/karten.mjs`). Ein Feld ist ein Datensatz, keine
   Verzweigung.

   ── Warum diese Datei keinen Schaden austeilt ──────────────────────

   Sie **baut** Felder und **rechnet** Geometrie; zugeschlagen wird
   ausschließlich in `spiel/kampf.mjs`. Das ist kein Geschmack,
   sondern hält den Aufrufkreis gerade: `kampf.mjs` → `angriffsformen.mjs`
   und nie zurück. Ein Ringimport zwischen den beiden wäre in ES-Modulen
   erlaubt und würde beim Laden je nach Reihenfolge halb leere Objekte
   liefern — ein Fehler, der nur manchmal auftritt.

   Der zweite Gewinn: Alles hier ist eine **reine Funktion** über Zahlen.
   `werkzeuge/pruefe-angriffsformen.mjs` kann deshalb prüfen, dass ein
   Kegel nach hinten nicht trifft, ohne eine Welt zu bauen.

   ── Kein Zufall außer bei den Meteoren ─────────────────────────────

   `baueMeteore()` ist die **einzige** Funktion hier, die zieht: genau
   **zwei** Ziehungen je Meteor (Winkel und Abstand), also `2 · anzahl`
   je Salve. Die Zahl steht hier, weil jede Ziehung den gesäten Strom
   für alles Spätere verschiebt — Wellenpläne, Beutewürfe, Truhen.
   Ein Muster, das „nur zur Sicherheit" würfelt, ändert still jede
   bisherige Messung (`spiel/salven.mjs` sagt dasselbe über `streu`).

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/kampf.mjs` (ruft alles hier und teilt den Schaden aus),
   `spiel/katalog/waffen.mjs` (jede Waffe nennt ihre `angriffsform`),
   `spiel/welt.mjs` (führt `welt.felder` und `welt.blitze`),
   `runtime/zeichnen.js` (malt Felder und Blitze),
   `werkzeuge/pruefe-angriffsformen.mjs` (misst, dass die Formen tun,
   was sie versprechen). Importiert selbst nichts — reine Rechnung. */

/* Die neun Formen. Die ersten beiden sind der Bestand und heißen
   deshalb nach dem, was sie immer waren; die sieben danach sind
   Janniks Liste, in seiner Reihenfolge. */
export const ANGRIFFSFORMEN = [
  "schlag", "geschoss",
  "kegel", "schwarm", "aura", "erlahmend", "kette", "meteore", "bogen"
];

/* Welche Form eine Waffe hat, wenn sie keine nennt.

   ⚠️ **Diese Zeile ist der Grund, warum keine bestehende Waffe sich
   anders verhält als vorher.** Ohne sie müsste jeder der zwölf
   Katalogeinträge eine `angriffsform` nachtragen, und wer einen
   vergisst, bekommt eine Waffe, die still nichts mehr tut. Der Bestand
   fällt auf genau das zurück, was `art` schon immer bedeutet hat. */
export function angriffsformVon(vorlage) {
  if (vorlage?.angriffsform) return vorlage.angriffsform;
  return vorlage?.art === "nahkampf" ? "schlag" : "geschoss";
}

/* Ob eine Form überhaupt eine ist. Ein Tippfehler in
   `angriffsform: "kegle"` fiele sonst still auf den Zweig „unbekannt"
   und die Waffe täte nichts — die Sorte Fehler, die kein Absturz
   meldet. `werkzeuge/pruefe-katalog.mjs` fragt hier nach. */
export function istAngriffsform(id) {
  return ANGRIFFSFORMEN.includes(id);
}

/* Ob eine Form ein Feld in der Welt hinterlässt. Der Zeichner fragt
   danach, und `pruefe-angriffsformen.mjs` hält beide Listen gegen. */
export const FELDFORMEN = ["kegel", "aura", "bogen", "meteore"];

/* ── Geometrie ────────────────────────────────────────────────────── */

/* Liegt der Punkt (px, py) im Kegel um (fx, fy) mit der Achse (nx, ny)?

   Gerechnet über das **Skalarprodukt**, nicht über `atan2`: Der
   Kosinus des halben Öffnungswinkels steht als `cosHalb` schon am
   Feld, und `dx·nx + dy·ny` ist bei Einheitsvektoren genau der Kosinus
   des Zwischenwinkels mal dem Abstand. Damit kostet der Test eine
   Wurzel statt eines `atan2` je Gegner und Takt — bei dreihundert
   Gegnern ist das der Unterschied zwischen „fällt nicht auf" und
   „ruckelt".

   `radius` schließt den Gegnerradius mit ein: Ein Gegner, dessen Mitte
   knapp außerhalb steht, dessen Leib aber hineinragt, brennt mit. Ohne
   diesen Zuschlag wirkt der Kegel schmaler, als er aussieht — und das
   ist der Fehler, den man beim Spielen für einen Aussetzer hält. */
export function imKegel(fx, fy, nx, ny, cosHalb, reichweite, px, py, dicke = 0) {
  const dx = px - fx, dy = py - fy;
  const q = dx * dx + dy * dy;
  const r = reichweite + dicke;
  if (q > r * r) return false;
  /* Genau in der Spitze gibt es keine Richtung — dort trifft alles.
     Ohne diesen Fall wäre `0/0` eine stille `NaN`, und `NaN >= cosHalb`
     ist `false`: Ein Gegner, der auf dem Spieler steht, bliebe als
     einziger verschont. */
  if (q === 0) return true;
  const d = Math.sqrt(q);
  /* Der Zuschlag für den Leib wird auf den **Winkel** umgerechnet: Ein
     dicker Gegner am Rand des Kegels ragt hinein, ein dünner nicht.
     `dicke / d` ist der Sinus dieses Zuschlags — grob, aber in die
     richtige Richtung und ohne zweite Wurzel. */
  const nachsicht = d > 0 ? Math.min(0.5, dicke / d) : 0;
  return (dx * nx + dy * ny) / d >= cosHalb - nachsicht;
}

/* Zwei Einheitsvektoren um `w` gedreht — dieselbe Rechnung wie
   `drehe()` in `spiel/salven.mjs`. Sie steht hier ein zweites Mal, weil
   `salven.mjs` von Geschossmustern handelt und diese Datei von
   Angriffsformen: Ein gemeinsamer Import wäre eine Abhängigkeit
   zwischen zwei Dingen, die nichts miteinander zu tun haben. Drei
   Zeilen Rechnung sind der billigere Preis. */
export function drehe(nx, ny, w) {
  const c = Math.cos(w), s = Math.sin(w);
  return [nx * c - ny * s, nx * s + ny * c];
}

/* Der Einheitsvektor von (ax, ay) nach (bx, by). Fallen beide
   zusammen, zeigt er nach oben — irgendeine Richtung muss es sein, und
   „oben" ist die, in die jedes Sprite gezeichnet ist
   (`runtime/sprite-daten.js`). */
export function richtungZu(ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.hypot(dx, dy);
  if (!(d > 0)) return [0, -1];
  return [dx / d, dy / d];
}

/* Der nächste aus einer Zielliste.

   ⚠️ **Das ist keine Bequemlichkeit, sondern die Behebung eines
   Fehlers, den `werkzeuge/pruefe-angriffsformen.mjs` gefunden hat.**

   `zieleInReichweite()` in `spiel/kampf.mjs` sortiert nur, **wenn mehr
   gefunden wurden als gefragt**:

       if (gefunden.length > anzahl) gefunden.sort(...)

   Für die beiden alten Formen ist das genau richtig: `schlag` trifft
   ohnehin alle, und `geschoss` mit `ziele: 1` bekommt immer eine
   sortierte Liste. Für die vier **gerichteten** Formen — Kegel, Bogen,
   Meteore, Kette — ist es falsch: Sie richten sich nach `ziele[0]`,
   und der ist bei wenigen Gegnern der **erstbeste aus dem Raster**,
   nicht der nächste.

   Gemessen: Mit einem Gegner 25 Bildpunkte vor und einem 40 dahinter
   schwang die Mondsichel nach hinten. Beim Spielen sähe das aus wie
   eine Waffe, die manchmal in die falsche Richtung haut — also wie
   ein Zufall, nicht wie ein Fehler.

   Bei Gleichstand gewinnt der **frühere** Eintrag. Diese Reihenfolge
   ist auf jedem Rechner dieselbe: Das Raster wird je Schritt aus
   `welt.gegner` in Feldreihenfolge gefüllt (`spiel/bewegung.mjs`) und
   in fester Zellenreihenfolge durchlaufen (`spiel/gitter.mjs`). */
export function naechstesVon(x, y, ziele) {
  let bestes = null, bestQ = Infinity;
  for (const g of ziele) {
    if (!g || g.tot) continue;
    const q = (g.x - x) ** 2 + (g.y - y) ** 2;
    if (q < bestQ) { bestQ = q; bestes = g; }
  }
  return bestes ?? ziele[0] ?? null;
}

/* ── Die Stärke eines Feldes über seine Standzeit ─────────────────── */

/* Ein Kegel **glüht aus**: Er beginnt bei voller Stärke und fällt
   gleichmäßig auf `restStaerke`. Ohne das wäre „langsam ausglühend"
   eine Behauptung des Bildes, die die Regel nicht deckt — der Kegel
   sähe schwächer aus und träfe gleich hart.

   Eine Aura kennt kein Ausglühen (`restStaerke === 1`) und liefert
   deshalb immer 1, ohne Sonderfall. */
export function staerkeDesFeldes(feld) {
  const rest = feld.restStaerke ?? 1;
  if (rest >= 1) return 1;
  if (!(feld.dauer > 0)) return rest;
  const alter = Math.max(0, Math.min(1, 1 - feld.rest / feld.dauer));
  return 1 + (rest - 1) * alter;
}

/* ── Die Felder bauen ─────────────────────────────────────────────── */

/* Was jedes Feld gemeinsam hat. `getroffen` ist ein `Set` und nur bei
   `einmal`-Feldern gefüllt — ein Kegel, der jeden Takt trifft, würde
   sich sonst nach dem ersten Durchgang selbst stilllegen. */
function grundfeld(form, s, schlag, v, waffe, zusatz) {
  return {
    form,
    x: s.x, y: s.y,
    besitzer: s,
    schlag, wirkung: v.wirkung ?? {}, waffe: waffe.id,
    art: schlag.art,
    rest: 0, dauer: 0, takt: 0, taktRest: 0,
    warnRest: 0,
    restStaerke: 1, anteil: 1,
    folgt: false, einmal: false,
    getroffen: new Set(),
    ...zusatz
  };
}

/* ── 1 · Der Flammenkegel ─────────────────────────────────────────

   Ein Kegel, der **steht** und ausglüht. Er hängt nicht am Spieler:
   Wer ihn geworfen hat, kann weglaufen, und die Flamme bleibt liegen.
   Das ist der ganze Reiz — man legt ihn dorthin, wo gleich jemand
   sein wird, statt dorthin, wo man steht.

   Der Takt (`takt`) entscheidet, wie oft er zuschlägt. Der Schaden je
   Takt ist der Grundschaden mal `anteil`; `anteil` ist so gewählt, dass
   die **Summe** über die Standzeit ungefähr einem gewöhnlichen Schlag
   entspricht — sonst wäre ein Kegel, der zwanzigmal trifft, schlicht
   zwanzigfacher Schaden, und das ist genau der Fehler, den
   `spiel/salven.mjs` bei den Geschossen ausdrücklich verbietet. */
export function baueKegel(welt, s, ziel, schlag, v, waffe, reichweite) {
  const k = v.kegel ?? {};
  const [nx, ny] = richtungZu(s.x, s.y, ziel.x, ziel.y);
  const halbWinkel = k.halbWinkel ?? 0.55;
  const dauer = k.dauer ?? 1.6;
  const takt = k.takt ?? 0.22;
  return grundfeld("kegel", s, schlag, v, waffe, {
    nx, ny,
    halbWinkel, cosHalb: Math.cos(halbWinkel),
    radius: reichweite,
    rest: dauer, dauer, takt, taktRest: 0,
    restStaerke: k.restStaerke ?? 0.3,
    anteil: anteilJeTakt(dauer, takt, k.gesamt ?? 1.6),
    leuchtet: k.leuchtet ?? 1
  });
}

/* ── 3 · Die Schadensaura ──────────────────────────────────────────

   Ein Ring, der **mitläuft**. Sie ist die einzige Form ohne eigene
   Auslösung im üblichen Sinn: Die Waffenuhr taktet sie, und solange
   die Waffe getragen wird, ist sie da.

   ⚠️ **Warum die Aura nicht ewig lebt, sondern erneuert wird.** Ein
   Feld mit `rest: Infinity` bliebe nach dem Tod des Spielers stehen und
   träfe weiter — und beim Wellenende räumt `starteWelle()` zwar die
   Listen, aber ein unendliches Feld ist eine Zusage, die niemand mehr
   einlöst. Stattdessen setzt jeder Takt `rest` neu auf ein Vielfaches
   der Abklingzeit: Hört die Waffe auf zu feuern — weil der Spieler
   liegt —, verlischt der Ring von selbst. Dasselbe Muster wie bei
   `g.brand`, das sich erneuert statt zu stapeln (`spiel/kampf.mjs`). */
export function baueAura(welt, s, schlag, v, waffe, reichweite, abkling) {
  const a = v.aura ?? {};
  return grundfeld("aura", s, schlag, v, waffe, {
    nx: 0, ny: -1,
    halbWinkel: Math.PI, cosHalb: -1,
    radius: reichweite,
    rest: abkling * (a.nachhall ?? 2.5), dauer: 0,
    takt: abkling, taktRest: 0,
    folgt: true,
    anteil: a.anteil ?? 1,
    leuchtet: a.leuchtet ?? 0.55
  });
}

/* ── 7 · Der Sichelbogen ───────────────────────────────────────────

   Der einzige Nahkampf mit **echter Trefferfläche**.

   Der Bestand (`schlag`) trifft alles im Umkreis — rundum, ohne
   Richtung. Der Schlagbogen im Bild zeigte seit jeher eine
   Blickrichtung, die die Regel gar nicht kannte: Wer nach oben schaute,
   traf trotzdem den Gegner im Rücken. Das ist der Fall, den Jannik mit
   *„richtige hitbox"* meint.

   Hier fährt stattdessen eine **schmale Schneide** durch einen Bogen:
   Das Feld dreht seine Achse über seine kurze Standzeit von
   `-spanne/2` nach `+spanne/2`, und jeder Gegner wird genau einmal
   getroffen, wenn die Schneide über ihn hinweggeht (`einmal: true`).
   Das ist kein Standbild mit anderem Anstrich, sondern eine
   Trefferfläche, die sich bewegt — man kann ihr ausweichen, indem man
   hinter dem Schwung steht.

   `schneide` ist der halbe Öffnungswinkel der Schneide selbst (schmal),
   `spanne` der Weg, den sie zurücklegt (breit). Beides getrennt, weil
   eine breite Schneide auf kurzem Weg etwas ganz anderes ist als eine
   schmale auf langem — und nur das zweite sieht nach einem Schwung
   aus. */
export function baueBogen(welt, s, ziel, schlag, v, waffe, reichweite) {
  const b = v.bogen ?? {};
  const [zx, zy] = richtungZu(s.x, s.y, ziel.x, ziel.y);
  const spanne = b.spanne ?? 1.9;
  const schneide = b.schneide ?? 0.34;
  const dauer = b.dauer ?? 0.2;
  /* Der Schwung beginnt an einer Seite. Welche, wechselt nicht — ein
     Wechsel bräuchte Zustand am Spieler, und der müsste über den
     Netz-Koop stimmen. Ein Schwung, der immer gleich herum geht, ist
     außerdem lesbar: Man lernt, wo er anfängt. */
  const [nx, ny] = drehe(zx, zy, -spanne / 2);
  return grundfeld("bogen", s, schlag, v, waffe, {
    nx, ny, zielNx: zx, zielNy: zy,
    halbWinkel: schneide, cosHalb: Math.cos(schneide),
    spanne, radius: reichweite,
    rest: dauer, dauer,
    /* Jeden Schritt prüfen: Die Schneide wandert, und ein Takt von
       0,1 s ließe sie über einen ganzen Gegner hinwegspringen. */
    takt: 0, taktRest: 0,
    folgt: true, einmal: true,
    anteil: b.anteil ?? 1,
    leuchtet: 0
  });
}

/* ── 6 · Der Meteoritenschauer ─────────────────────────────────────

   Mehrere Einschläge über eine Zeitspanne, jeder mit **Vorwarnung**.

   Die Vorwarnung ist nicht Zierde, sondern die ganze Mechanik: Ein
   Flächenschaden ohne Ankündigung ist im exakten Top-Down nicht
   ausweichbar und damit nur eine Zahl, die vom Himmel fällt. Mit
   Vorwarnung wird er zu einer Entscheidung — für den Spieler, der
   danebensteht, und gegen den Gegner, der hineinläuft.

   ⚠️ **Genau zwei Ziehungen je Meteor**, Winkel und Abstand, in dieser
   Reihenfolge. Wer eine dritte hinzufügt, verschiebt den gesäten Strom
   und ändert damit jeden späteren Wellenplan, jeden Beutewurf und
   jeden Truhenfall — ohne dass irgendwo etwas rot wird. Deshalb steht
   die Zahl in der Kopfnotiz, in `docs/WEGWEISER.md` und in
   `werkzeuge/pruefe-angriffsformen.mjs`. */
export function baueMeteore(welt, s, ziel, schlag, v, waffe, reichweite, zufall) {
  const m = v.meteore ?? {};
  const anzahl = Math.max(1, m.anzahl ?? 5);
  const streuung = m.streuung ?? 34;
  const felder = [];
  for (let i = 0; i < anzahl; i++) {
    /* Ziehung 1: der Winkel um das Ziel. */
    const w = zufall.zahl() * Math.PI * 2;
    /* Ziehung 2: der Abstand. Die Wurzel verteilt die Einschläge
       gleichmäßig über die **Fläche** statt gehäuft in der Mitte —
       ohne sie läge die Hälfte aller Meteore im inneren Viertel, und
       der Schauer sähe aus wie ein Klumpen. */
    const r = Math.sqrt(zufall.zahl()) * streuung;
    felder.push(grundfeld("meteore", s, schlag, v, waffe, {
      x: ziel.x + Math.cos(w) * r,
      y: ziel.y + Math.sin(w) * r,
      nx: 0, ny: -1,
      halbWinkel: Math.PI, cosHalb: -1,
      radius: m.radius ?? 22,
      /* Die Einschläge kommen nacheinander, sonst wäre der Schauer ein
         einziger Schlag mit fünf Kreisen. */
      warnRest: (m.warnung ?? 0.55) + i * (m.abstand ?? 0.16),
      /* Die volle Warnzeit **dieses** Meteors. `runtime/effekte.js`
         braucht sie, um den zusammenlaufenden Ring zu malen: Ohne den
         Nenner koennte es aus `warnRest` allein nicht ablesen, wie weit
         die Warnung schon fortgeschritten ist — und der fuenfte Meteor
         wartet laenger als der erste. */
      warnDauer: (m.warnung ?? 0.55) + i * (m.abstand ?? 0.16),
      rest: (m.warnung ?? 0.55) + i * (m.abstand ?? 0.16) + (m.glut ?? 0.35),
      dauer: m.glut ?? 0.35,
      takt: 0, taktRest: 0,
      einmal: true,
      anteil: m.anteil ?? (1 / anzahl) * (m.gesamt ?? 2.2),
      leuchtet: 1.2
    }));
  }
  return felder;
}

/* Wie viel Schaden **ein Takt** eines stehenden Feldes trägt.

   `gesamt` ist der Faktor auf einen gewöhnlichen Schlag: 1,6 heißt
   „über seine ganze Standzeit teilt der Kegel das 1,6-fache eines
   Schlages aus". Der Aufschlag über 1 ist derselbe Gedanke wie
   `AUFSCHLAG_JE_FORM` in `spiel/salven.mjs` — ein Feld verfehlt öfter
   als ein Schlag, weil Gegner hinein- und hinauslaufen, und ohne
   Ausgleich nähme es niemand.

   Die Rechnung ist bewusst **nicht** „Schaden je Sekunde": Wer den
   Takt ändert, soll die Gesamtwirkung nicht mitverändern. Sonst wäre
   ein feinerer Takt eine versteckte Verstärkung, und die einzige
   sinnvolle Einstellung wäre der feinste. */
export function anteilJeTakt(dauer, takt, gesamt) {
  const takte = Math.max(1, Math.floor(dauer / Math.max(0.01, takt)));
  return gesamt / takte;
}

/* ── 5 · Der Kettenblitz ──────────────────────────────────────────── */

/* Die Kette: von einem Gegner zum nächsten, jeder höchstens einmal.

   Gibt die getroffenen Gegner **in der Reihenfolge** zurück, in der
   der Blitz sie berührt — `spiel/kampf.mjs` schlägt sie danach der
   Reihe nach, und `runtime/zeichnen.js` malt dieselbe Reihenfolge als
   Linienzug. Zwei Listen wären zwei Wahrheiten: Der Blitz zöge dann
   sichtbar woanders hin, als er wehtut.

   ⚠️ **Gesucht wird über `gegner`, nicht über das Raster.**
   `welt.gitter.umkreis()` liefert die Treffer in der Reihenfolge der
   **Zellen**, und die hängt daran, wo die Gegner gerade stehen. Bei
   zwei genau gleich weit entfernten Zielen entschiede also die
   Zellenlage, welches der Blitz nimmt — auf zwei Rechnern im Netz-Koop
   dieselbe Lage, aber nicht garantiert dieselbe Einfügereihenfolge in
   der Zellenliste. Über das Feld `welt.gegner` zu laufen ist bei einer
   Waffe mit Abklingzeit billig (höchstens `spruenge · Gegnerzahl`
   Vergleiche, also ein paar hundert) und dafür ohne jeden Zweifel
   gleich. */
export function kettenZiele(gegner, start, spruenge, sprungweite) {
  const kette = [start];
  const getroffen = new Set([start]);
  let aktuell = start;

  for (let i = 0; i < spruenge; i++) {
    let bestes = null, bestQ = sprungweite * sprungweite;
    for (const g of gegner) {
      if (g.tot || getroffen.has(g)) continue;
      const q = (g.x - aktuell.x) ** 2 + (g.y - aktuell.y) ** 2;
      /* Echt kleiner: Bei Gleichstand gewinnt der **frühere** Eintrag
         in `welt.gegner`, und diese Reihenfolge ist auf jedem Rechner
         dieselbe (`setzeGegner()` hängt hinten an). */
      if (q < bestQ) { bestQ = q; bestes = g; }
    }
    if (!bestes) break;
    kette.push(bestes);
    getroffen.add(bestes);
    aktuell = bestes;
  }
  return kette;
}

/* Wie stark der Blitz beim `n`-ten Ziel noch ist. Der erste bekommt
   voll, jeder weitere weniger — sonst wäre eine Kette über fünf Ziele
   schlicht fünffacher Schaden, und dieselbe Regel, die
   `spiel/salven.mjs` für Salven aufstellt, wäre hier gebrochen. */
export function kettenAnteil(n, verlust) {
  let a = 1;
  for (let i = 0; i < n; i++) a *= (1 - verlust);
  return a;
}

/* ── 4 · Das erlahmende Geschoss ─────────────────────────────────── */

/* Ein Geschoss, das im Flug langsamer wird und dabei schwächer.

   ⚠️ **Linear gebremst, nicht exponentiell.** Der erste Entwurf stand
   auf `v *= Math.pow(bremse, dt)`, was physikalisch das Richtigere ist.
   `Math.pow` ist in JavaScript aber nicht bitgleich über alle Maschinen
   festgelegt, und der Regelkern muss auf zwei Rechnern **denselben**
   Weltzustand ergeben (`docs/SPIEL.md` 11). Multiplizieren und
   Addieren sind es; also wird abgezogen, was in dieser Zeitscheibe
   abgeht. Der Unterschied ist im Bild nicht zu sehen, im Netz-Koop
   schon.

   `mindest` ist der Boden: Ein Geschoss, das auf null bremst, bliebe
   in der Luft stehen und flöge nie über seine Lebenszeit hinaus davon
   — es wäre nur ein Punkt, der langsam verglimmt. */
export function bremseGeschoss(p, dt) {
  if (!(p.bremse > 0)) return;
  const boden = p.mindestTempo ?? 0.25;
  p.tempoAnteil = Math.max(boden, (p.tempoAnteil ?? 1) - p.bremse * dt);
  const t = p.tempo * p.tempoAnteil;
  const d = Math.hypot(p.vx, p.vy);
  if (!(d > 0)) return;
  p.vx = (p.vx / d) * t;
  p.vy = (p.vy / d) * t;
}

/* Was ein erlahmendes Geschoss beim Einschlag noch austeilt. Ohne
   diese Zeile wäre „verliert an Schaden" eine Behauptung des Textes:
   Es würde langsamer aussehen und gleich hart treffen. */
export function erlahmterAnteil(p) {
  if (!(p.bremse > 0)) return 1;
  return Math.max(p.mindestSchaden ?? 0.3, p.tempoAnteil ?? 1);
}

/* ── 2 · Der Suchschwarm ──────────────────────────────────────────── */

/* Wer das `i`-te Geschoss eines Schwarms jagt.

   Reihum über die gefundenen Ziele, **nicht** alle auf dasselbe. Das
   ist der ganze Unterschied zum Bannstein, der seit jeher `suchend:
   true` trägt: Dort fliegen drei Steine im Ring und holen sich
   denselben Gegner, hier verteilt sich der Schwarm. Beim Spielen sieht
   man das sofort — der Schwarm räumt eine Gruppe ab, der Bannstein
   erledigt einen. */
export function schwarmZiel(ziele, i) {
  if (!ziele || ziele.length === 0) return null;
  return ziele[i % ziele.length];
}

/* Ein neues Ziel für ein suchendes Geschoss, dessen altes gefallen ist.

   Ohne das fliegt ein Sucher, dessen Ziel im selben Augenblick stirbt,
   geradeaus weiter ins Leere — bei kurzer Abklingzeit und vielen
   kleinen Geschossen ist das der Normalfall und nicht die Ausnahme.
   Gesucht wird wie bei der Kette über `welt.gegner` und aus demselben
   Grund: dieselbe Reihenfolge auf jedem Rechner. */
export function neuesSuchziel(gegner, p, reichweite) {
  let bestes = null, bestQ = reichweite * reichweite;
  for (const g of gegner) {
    if (g.tot) continue;
    const q = (g.x - p.x) ** 2 + (g.y - p.y) ** 2;
    if (q < bestQ) { bestQ = q; bestes = g; }
  }
  return bestes;
}
