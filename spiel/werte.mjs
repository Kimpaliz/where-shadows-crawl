/* [Aufgabe: Regelkern] Die Werte eines Spielers, als Tabelle — und ihre Wirkung.

   Hier steht die Rechnung — **einmal**, für alle. Wer wissen will, was
   „+10 Ruestung" wirklich bringt, liest diese Datei und nicht drei
   Stellen im Kampf.

   Die Formeln folgen einer Regel: **Jeder Wert muss auf dem Bildschirm
   spürbar sein** (docs/SPIEL.md 5.1). Ein Wert, dessen erste zehn
   Punkte nichts ändern, ist kein Wert, sondern eine Falle für den
   Spieler.

   ── Warum eine Tabelle und keine 55 Felder ─────────────────────────

   Aus acht Werten sind 55 geworden. Als 55 einzeln getippte Felder
   wären sie nicht wartbar: Jede Anzeige, jeder Kartenkatalog und jede
   Prüfung müsste sie aufzählen, und wer einen vergisst, merkt es nie —
   der Wert stünde im Objekt, gäbe Punkte aus und täte nichts.

   Deshalb ist `WERTE_TABELLE` die Quelle. Ein Eintrag trägt
   `{ id, name, text, grund, gruppe, form }`, und **32 der 55 Einträge
   werden erzeugt**, nicht getippt: die fünf Schadensarten mal ihre
   vier Achsen, die Widerstände, und je Gruppe eine Kartenneigung. Eine
   sechste Schadensart wäre ein Eintrag in `spiel/schadensarten.mjs`
   und keine Zeile hier.

   `form` sagt, wie eine Zahl zu lesen ist — die Anzeige braucht das,
   und die Prüfung auch:

   | `form` | heißt | Beispiel |
   | --- | --- | --- |
   | `flach` | wird addiert, in eigener Einheit | +10 Leben, +2 Geschosse |
   | `prozent` | **ist** ein Prozentsatz, 0 bis 100 | 15 % Kritchance |
   | `multiplikator` | Prozentpunkte, die als `1 + x/100` malnehmen | +20 % Tempo |

   ── Warum `WERTE` weiterhin nur die Kennungen sind ─────────────────

   Der naheliegende Weg wäre, `WERTE` selbst zur Tabelle zu machen.
   Gemessen am 05.09.2026 bricht das `spiel/stufen.mjs`, ohne dass eine
   Prüfung anschlägt: Dort steht `for (const w of WERTE) ... GEWICHT[w]`,
   und `GEWICHT[<Objekt>]` ist `undefined`. Die Schleife liefe null Mal,
   der Kartentopf bliebe leer, und der erste Aufstieg stürbe an
   `WERT_TEXT[undefined][0]`. Die Tabelle ist die Quelle, `WERTE` ist
   die daraus abgeleitete Kennungsliste — jeder, der bisher `WERTE`
   gelesen hat, liest weiter dasselbe.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/schadensarten.mjs` (liefert die fünf Arten, aus denen die
   Werte je Art entstehen), `spiel/kampf.mjs` (Schaden hin und zurück),
   `spiel/bewegung.mjs` (Tempo), `spiel/ausweichen.mjs` (Sprung),
   `spiel/beute.mjs` (Gier, Goldfund), `spiel/laden.mjs` (Glück),
   `spiel/stufen.mjs` (verteilt Punkte darauf). */

import { SCHADENSARTEN, ART_NACH_ID, STANDARD_ART } from "./schadensarten.mjs";

/* ── Die Gruppen ─────────────────────────────────────────────────────

   Eine Gruppe ist kein Schmuck: An ihr hängt die Kartenneigung („mehr
   Angriffskarten anbieten"). Ohne Gruppen bräuchte so ein Wunsch einen
   eigenen Wert je Wert — 55 Neigungen statt sieben. */
export const GRUPPEN = [
  ["wehr", "Wehr"],
  ["angriff", "Angriff"],
  ["krit", "Krit"],
  ["arten", "Schadensarten"],
  ["beweglichkeit", "Beweglichkeit"],
  ["beute", "Beute"],
  ["karten", "Karten"]
];

export const GRUPPEN_IDS = GRUPPEN.map(([id]) => id);

/* ── Die getippten Werte ─────────────────────────────────────────── */

/* ⚠️ **Die Reihenfolge der ersten acht ist Balance, kein Geschmack.**
   `spiel/stufen.mjs` baut seinen Kartentopf mit `for (const w of WERTE)`
   und zieht daraus mit dem gesäten Strom. Wer die Reihenfolge ändert,
   ändert jede gezogene Karte in jedem Lauf. Gemessen am 05.09.2026: Mit
   den acht an anderer Stelle stand der Vier-Spieler-Lauf bei
   welleMittel 201 statt 103 und riss die Sperrklinke in
   `pruefe-balance.mjs` — bei bitgleicher Simulation im Übrigen.
   Nachrechnen: `node werkzeuge/pruefe-werte.mjs`. */
const GETIPPT = [
  /* Die acht des ersten Entwurfs, in ihrer ursprünglichen Reihenfolge. */
  { id: "leben", name: "Leben", gruppe: "wehr", form: "flach", grund: 0,
    text: "Wie viel du aushältst." },
  { id: "schaden", name: "Schaden", gruppe: "angriff", form: "flach", grund: 0,
    text: "Jeder Treffer haut härter zu." },
  { id: "hast", name: "Hast", gruppe: "angriff", form: "multiplikator", grund: 0,
    text: "Deine Waffen schlagen öfter zu - die Abklingzeit sinkt." },
  { id: "tempo", name: "Tempo", gruppe: "beweglichkeit", form: "multiplikator", grund: 0,
    text: "Du läufst schneller." },
  { id: "ruestung", name: "Rüstung", gruppe: "wehr", form: "flach", grund: 0,
    text: "Treffer kosten dich weniger." },
  { id: "glueck", name: "Glück", gruppe: "beute", form: "flach", grund: 0,
    text: "Bessere Angebote, mehr Beute." },
  { id: "gier", name: "Gier", gruppe: "beute", form: "flach", grund: 0,
    text: "Du ziehst Grabgold an und es ist mehr wert." },
  { id: "genesung", name: "Genesung", gruppe: "wehr", form: "flach", grund: 0,
    text: "Nach jeder Welle kommt Leben zurück." },

  /* Wehr */
  { id: "lebensregeneration", name: "Regeneration", gruppe: "wehr", form: "flach", grund: 0,
    text: "Leben kommt zurück, Sekunde für Sekunde." },

  /* Angriff */
  { id: "reichweite", name: "Reichweite", gruppe: "angriff", form: "multiplikator", grund: 0,
    text: "Deine Waffen finden Ziele weiter weg." },
  { id: "flaechenschaden", name: "Flächenschaden", gruppe: "angriff", form: "multiplikator", grund: 0,
    text: "Waffen, die mehrere auf einmal treffen, hauen härter zu." },
  { id: "flaechenreichweite", name: "Flächenweite", gruppe: "angriff", form: "multiplikator", grund: 0,
    text: "Waffen, die mehrere auf einmal treffen, greifen weiter." },
  { id: "zusatzangriffe", name: "Zusatzangriffe", gruppe: "angriff", form: "flach", grund: 0,
    text: "Jede Waffe schlägt je Abklingzeit ein zusätzliches Mal zu." },
  { id: "zusatzgeschosse", name: "Zusatzgeschosse", gruppe: "angriff", form: "flach", grund: 0,
    text: "Fernwaffen werfen mehr auf einmal, gefächert." },
  { id: "durchdringung", name: "Durchdringung", gruppe: "angriff", form: "flach", grund: 0,
    text: "Geschosse fliegen durch mehr Gegner hindurch." },

  /* Krit */
  { id: "krit_chance", name: "Kritchance", gruppe: "krit", form: "prozent", grund: 0,
    text: "Wie oft ein Treffer ein Volltreffer wird." },
  { id: "krit_schaden", name: "Kritschaden", gruppe: "krit", form: "prozent", grund: 0,
    text: "Wie viel härter ein Volltreffer zuschlägt." },

  /* Beweglichkeit */
  { id: "ausweichweite", name: "Ausweichweite", gruppe: "beweglichkeit", form: "flach", grund: 0,
    text: "Dein Sprung trägt weiter." },
  { id: "ausweichhast", name: "Ausweichhast", gruppe: "beweglichkeit", form: "multiplikator", grund: 0,
    text: "Der Sprung ist schneller wieder bereit." },

  /* Beute */
  { id: "goldfund", name: "Goldfund", gruppe: "beute", form: "multiplikator", grund: 0,
    text: "Jedes aufgesammelte Grabgold ist mehr wert." },
  { id: "erfahrung", name: "Erfahrung", gruppe: "beute", form: "multiplikator", grund: 0,
    text: "Jedes Bruchstück Wissen zählt mehr." },

  /* Karten */
  { id: "kartenwert", name: "Kartenwert", gruppe: "karten", form: "multiplikator", grund: 0,
    text: "Jede Aufstiegskarte gibt mehr - oder weniger." },
  { id: "kartenseltenheit", name: "Kartenseltenheit", gruppe: "karten", form: "prozent", grund: 0,
    text: "Wie oft eine seltene Aufstiegskarte auftaucht." }
];

/* ── Die erzeugten Werte ─────────────────────────────────────────────

   Vier Achsen je Schadensart plus ihr Widerstand. Getippt wären das
   25 Einträge, von denen einer irgendwann fehlt oder falsch geschrieben
   ist — und genau der wäre der, den niemand findet. */
function erzeugeArtWerte() {
  const raus = [];
  for (const art of SCHADENSARTEN) {
    raus.push({
      id: `schaden_${art.id}_flach`, name: `${art.name}schaden`,
      gruppe: "arten", form: "flach", grund: 0,
      text: `Jeder Treffer der Art ${art.name} haut um diesen Wert härter zu.`
    });
    raus.push({
      id: `schaden_${art.id}_prozent`, name: `${art.name}schaden %`,
      gruppe: "arten", form: "multiplikator", grund: 0,
      text: `Alle Treffer der Art ${art.name} werden um diesen Anteil stärker.`
    });
    raus.push({
      id: `krit_chance_${art.id}`, name: `Kritchance ${art.name}`,
      gruppe: "krit", form: "prozent", grund: 0,
      text: `Nur Treffer der Art ${art.name} werden öfter zu Volltreffern.`
    });
    raus.push({
      id: `krit_schaden_${art.id}`, name: `Kritschaden ${art.name}`,
      gruppe: "krit", form: "prozent", grund: 0,
      text: `Volltreffer der Art ${art.name} hauen härter zu.`
    });
    raus.push({
      id: `widerstand_${art.id}`, name: `Widerstand ${art.name}`,
      gruppe: "wehr", form: "prozent", grund: 0,
      text: `Treffer der Art ${art.name} nehmen dir weniger Leben.`
    });
  }
  return raus;
}

/* Je Gruppe eine Neigung. Damit lässt sich „mehr Angriffskarten"
   ausdrücken, ohne für jeden einzelnen Wert einen eigenen Regler zu
   bauen. */
function erzeugeNeigungen() {
  return GRUPPEN.map(([id, name]) => ({
    id: `neigung_${id}`, name: `Neigung ${name}`,
    gruppe: "karten", form: "multiplikator", grund: 0,
    text: `Aufstiegskarten aus dem Bereich ${name} werden öfter angeboten.`
  }));
}

export const WERTE_TABELLE = [...GETIPPT, ...erzeugeArtWerte(), ...erzeugeNeigungen()];

export const WERT_NACH_ID = new Map(WERTE_TABELLE.map((w) => [w.id, w]));

/* Die Kennungsliste. Alles, was bisher `WERTE` gelesen hat, liest sie
   weiter — siehe die Begründung in der Kopfnotiz. */
export const WERTE = WERTE_TABELLE.map((w) => w.id);

/* Was jeder Wert in normaler Sprache bedeutet — dieselbe Quelle für
   die Anzeige im Spiel und für die Prüfung, dass keiner fehlt.
   Abgeleitet, nicht gepflegt: Eine zweite Liste von Hand wäre die
   Stelle, an der Name und Wert auseinanderlaufen. */
export const WERT_TEXT = Object.fromEntries(
  WERTE_TABELLE.map((w) => [w.id, [w.name, w.text]])
);

export const GRUND_LEBEN = 50;
export const GRUND_TEMPO = 78;

/* Ein flaches Objekt mit allen Kennungen auf ihrem Grundwert. Flach
   und nicht verschachtelt, damit `werte.schaden` bleibt, was es war —
   der ganze Rest des Spiels liest es unverändert weiter. */
export function macheWerte(zusatz = {}) {
  const w = {};
  for (const e of WERTE_TABELLE) w[e.id] = zusatz[e.id] ?? e.grund;
  return w;
}

/* Ein Wert, der auch dann eine Zahl liefert, wenn ein altes gespeichertes
   Werteobjekt die Kennung noch nicht kennt. Ohne das würde ein
   nachgerüsteter Wert als `undefined` in jede Rechnung laufen und alles
   dahinter zu `NaN` machen — der klassische stille Bruch. */
export function wert(werte, id) {
  const v = werte?.[id];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/* ── Die einfachen Rechnungen ────────────────────────────────────── */

export function lebenMax(werte) {
  return GRUND_LEBEN + wert(werte, "leben");
}

export function laufTempo(werte) {
  return GRUND_TEMPO * (1 + wert(werte, "tempo") / 100);
}

/* Hast verkürzt die Abklingzeit, aber nur asymptotisch: Bei 100 Hast
   schlägt eine Waffe doppelt so oft zu, bei 300 viermal. Ein direkter
   Abzug würde bei genug Hast **null** ergeben — unendlich viele Schläge
   je Sekunde, und das Spiel wäre vorbei. */
export function abklingzeit(werte, grund) {
  return grund / (1 + wert(werte, "hast") / 100);
}

/* ── Warum Rüstung nicht linear ist ─────────────────────────────────

   `ruestung / (ruestung + 30)` sättigt: 10 Rüstung nehmen 25 % weg,
   30 nehmen die Hälfte, 90 nehmen drei Viertel. Linear abgezogen wäre
   Rüstung ab einem Punkt Unverwundbarkeit — und jede Zahl danach
   wertlos. Gesättigt bleibt jeder weitere Punkt etwas wert und keiner
   beendet das Spiel. */
export function schadensminderung(werte) {
  const r = Math.max(0, wert(werte, "ruestung"));
  return r / (r + 30);
}

/* Aufsammelreichweite. Der Grundwert ist bewusst klein: Beute muss man
   holen, das ist der Motor des Spiels (docs/SPIEL.md 1). */
export const GRUND_AUFSAMMELN = 16;

export function aufsammelReichweite(werte) {
  return GRUND_AUFSAMMELN + wert(werte, "gier") * 1.4;
}

/* Gier **und** Goldfund. Gier tut zwei Dinge (Anziehung und Wert),
   Goldfund nur eines — deshalb kann eine Karte gezielt nur den Wert
   heben, ohne die Reichweite mitzuziehen. */
export function goldFaktor(werte) {
  return 1 + wert(werte, "gier") / 100 + wert(werte, "goldfund") / 100;
}

export function erfahrungsFaktor(werte) {
  return Math.max(0, 1 + wert(werte, "erfahrung") / 100);
}

export function genesungJeWelle(werte) {
  return wert(werte, "genesung");
}

export function regenerationJeSekunde(werte) {
  return wert(werte, "lebensregeneration");
}

/* ── Karten ──────────────────────────────────────────────────────── */

/* Der Kartenwert darf einen Wert **verringern** — er ist ausdrücklich
   plus und minus. Bei null bleibt trotzdem etwas übrig: Eine Karte, die
   nichts gibt, ist ein verschenkter Aufstieg und liest sich als Fehler. */
export function kartenWertFaktor(werte) {
  return Math.max(0.1, 1 + wert(werte, "kartenwert") / 100);
}

export function kartenSeltenheitChance(werte) {
  return Math.max(0, Math.min(1, wert(werte, "kartenseltenheit") / 100));
}

/* Wie stark eine Gruppe im Kartentopf gewichtet wird. Nie unter null —
   eine negative Neigung würde die Gruppe nicht seltener machen, sondern
   den Topf verderben. */
export function kartenNeigung(werte, gruppe) {
  return Math.max(0, 1 + wert(werte, `neigung_${gruppe}`) / 100);
}

/* ── Der Gruppenbonus ────────────────────────────────────────────── */

/* Wer vier Waffen desselben Merkmals trägt, bekommt für dieses Merkmal
   einen Aufschlag. Vier statt zwei ist Absicht — bei zwei wäre der
   Bonus ein Nebeneffekt, bei vier ist er eine Entscheidung gegen die
   beste Einzelwaffe. */
export const GRUPPE_AB = 4;
export const GRUPPE_BONUS = 0.30;

export function merkmalZaehlung(waffen) {
  const zahl = new Map();
  for (const w of waffen) {
    for (const m of w.vorlage.merkmale) zahl.set(m, (zahl.get(m) ?? 0) + 1);
  }
  return zahl;
}

/* Der Aufschlag für **eine** Waffe: Sie bekommt ihn, wenn eines ihrer
   Merkmale die Schwelle erreicht. Mehrere erfüllte Merkmale zählen
   nicht doppelt — sonst wäre die Sense mit zwei Merkmalen automatisch
   die beste Waffe des Spiels, ohne dass jemand das entschieden hätte. */
export function gruppenAufschlag(waffe, zaehlung) {
  for (const m of waffe.vorlage.merkmale) {
    if ((zaehlung.get(m) ?? 0) >= GRUPPE_AB) return GRUPPE_BONUS;
  }
  return 0;
}

/* ── Waffe und Werte ─────────────────────────────────────────────── */

/* Reichweite: `reichweite` gilt für jede Waffe, `flaechenreichweite`
   nur für die, die mehrere auf einmal trifft. Getrennt, damit sich ein
   Sensen-Bau anders bauen lässt als ein Armbrust-Bau. */
export function waffenReichweite(werte, vorlage) {
  const flaeche = vorlage.ziele > 1 ? wert(werte, "flaechenreichweite") : 0;
  return vorlage.reichweite * Math.max(0.1, 1 + (wert(werte, "reichweite") + flaeche) / 100);
}

/* Wie oft eine Waffe je Abklingzeit zuschlägt. Ganze Zahl und
   mindestens eins: Ein halber Angriff ist keiner, und null Angriffe
   wären eine Waffe, die stumm im Gürtel hängt. */
export function angriffeJeSchlag(werte) {
  return 1 + Math.max(0, Math.floor(wert(werte, "zusatzangriffe")));
}

export function geschosseJeAngriff(werte) {
  return 1 + Math.max(0, Math.floor(wert(werte, "zusatzgeschosse")));
}

export function durchschlaege(werte, vorlage) {
  return (vorlage.wirkung.durchschlag ?? 0) + 1
    + Math.max(0, Math.floor(wert(werte, "durchdringung")));
}

/* ── Krit ────────────────────────────────────────────────────────── */

/* Ein Volltreffer haut anderthalbmal so hart zu, bevor irgendein Wert
   dazukommt. Wäre der Grundwert 1,0, dann wären die ersten Punkte
   Kritchance wirkungslos — genau die Falle aus docs/SPIEL.md 5.1. */
export const KRIT_GRUND = 1.5;

export function kritChance(werte, art = STANDARD_ART) {
  const roh = wert(werte, "krit_chance") + wert(werte, `krit_chance_${art}`);
  return Math.max(0, Math.min(1, roh / 100));
}

export function kritFaktor(werte, art = STANDARD_ART) {
  const roh = wert(werte, "krit_schaden") + wert(werte, `krit_schaden_${art}`);
  return Math.max(1, KRIT_GRUND + roh / 100);
}

/* ── Widerstand ──────────────────────────────────────────────────── */

/* Der Widerstand eines Ziels gegen eine Art, als Anteil 0…1. Fehlt die
   Tabelle ganz, gilt „alles null" — `spiel/katalog/gegner.mjs` trägt
   das Feld `widerstaende` noch nicht, und bis dahin soll die Rechnung
   nicht raten, sondern nichts abziehen. */
export function widerstandAus(tabelle, art) {
  if (!tabelle) return 0;
  const v = tabelle[art];
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  /* Gedeckelt bei 90 %: Ein Ziel, das eine Art vollständig schluckt,
     ist gegen einen ganzen Bau unverwundbar — und der Spieler erfährt
     nie, warum seine Waffen nichts tun. */
  return Math.max(-1, Math.min(0.9, v / 100));
}

export function widerstandDesSpielers(werte, art) {
  return widerstandAus({ [art]: wert(werte, `widerstand_${art}`) }, art);
}

/* Was ein Treffer dem Spieler wirklich nimmt: erst Rüstung, dann der
   Widerstand gegen diese Art. `fluch` geht an der Rüstung vorbei — der
   Widerstand greift trotzdem, sonst wäre gegen Fluch überhaupt nichts
   zu machen. */
export function schadenAmSpieler(werte, menge, art = STANDARD_ART) {
  const eintrag = ART_NACH_ID.get(art);
  const nachRuestung = eintrag?.ignoriertRuestung
    ? menge
    : menge * (1 - schadensminderung(werte));
  return Math.max(1, nachRuestung * (1 - widerstandDesSpielers(werte, art)));
}

/* ── Die eine Schadensrechnung ───────────────────────────────────────

   **Die Reihenfolge ist Balance, nicht Geschmack.** Sie steht hier, und
   sie steht nur hier:

     1. Grundschaden           Waffe auf ihrer Stufe plus `schaden`
     2. + flacher Zuschlag     `schaden_<art>_flach`
     3. x Prozentmodifier      `schaden_<art>_prozent` und was der
                               Aufrufer beisteuert (Fläche)
     4. x Gruppenbonus         vier gleiche Merkmale
     5. Kritwurf               Chance und Faktor, global plus Art
     6. x (1 - Widerstand)     des Ziels, gegen diese Art
     7. mindestens 1

   Was passiert, wenn man 2 und 3 vertauscht: Bei Grundschaden 10,
   `+5 flach` und `+100 %` sind es richtig `(10 + 5) * 2 = 30`,
   vertauscht `10 * 2 + 5 = 25` — **20 % daneben**, und nichts wird rot.
   Nachrechnen: `node werkzeuge/pruefe-werte.mjs`.

   Die Schritte 3 bis 6 sind für sich genommen malnehmen und damit
   untereinander vertauschbar; **Schritt 7 ist es nicht.** Stünde die
   Untergrenze vor dem Widerstand, könnte ein Widerstand sie wieder
   unterschreiten, und ein Treffer täte gar nichts. */
export function berechneSchaden({
  grund, art = STANDARD_ART, werte, gruppenBonus = 0,
  zusatzProzent = 0, widerstaende = null, zufall = null
}) {
  let menge = grund + wert(werte, `schaden_${art}_flach`);

  const prozent = wert(werte, `schaden_${art}_prozent`) + zusatzProzent;
  if (prozent !== 0) menge *= Math.max(0, 1 + prozent / 100);

  if (gruppenBonus !== 0) menge *= 1 + gruppenBonus;

  /* Gewürfelt wird **nur**, wenn es etwas zu würfeln gibt. Das ist
     keine Sparsamkeit, sondern Wiederholbarkeit: Ein Wurf ohne Chance
     würde den gesäten Strom verschieben und damit jede bisherige
     Messung ungültig machen, obwohl sich am Spiel nichts geändert hat. */
  let krit = false;
  const chance = kritChance(werte, art);
  if (chance > 0 && zufall) {
    krit = zufall.trifft(chance);
    if (krit) menge *= kritFaktor(werte, art);
  }

  const w = widerstandAus(widerstaende, art);
  if (w !== 0) menge *= 1 - w;

  return { menge: Math.max(1, menge), krit, art };
}
