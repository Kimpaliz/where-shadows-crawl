/* [Aufgabe: Prüfwesen] Was Netz-Koop tragen muss — ohne einen Browser zu brauchen.

       node werkzeuge/pruefe-netz.mjs
       node werkzeuge/pruefe-netz.mjs --nur-pfade   (nur Teil 1, für den Pages-Ablauf)

   ── Teil 1 · Relative Pfade ─────────────────────────────────────────

   Unter `https://kimpaliz.github.io/where-shadows-crawl/` liegt die
   Seite in einem **Unterordner**. Ein `/runtime/start.js` zeigte dort
   auf `kimpaliz.github.io/runtime/start.js` und damit ins Leere —
   daheim unter `127.0.0.1:8144/` fiele das nie auf, weil dort die
   Wurzel das Projekt ist. Das ist der häufigste Grund, warum ein Spiel
   daheim läuft und im Netz weiß bleibt, und er lässt sich nur hier
   fangen: Im Browser sieht man eine leere Seite und keinen Grund.

   ── Teil 2 · Gleichlauf ─────────────────────────────────────────────

   Über die Leitung gehen **nur Eingaben**, nie Weltzustand
   (docs/SPIEL.md 8). Das trägt genau so lange, wie zwei Rechner aus
   derselben Saat und denselben Eingaben dieselbe Welt rechnen. Diese
   Prüfung belegt das in **beide** Richtungen:

   1. Gleiche Saat, gleiche Eingabefolgen → nach 3600 Schritten
      derselbe Zustand, Zahl für Zahl.
   2. Eine **um einen Tick verschobene** Eingabefolge → ein *anderer*
      Zustand.

   Ohne die zweite Hälfte beweist die erste nichts. Ein Vergleich, der
   die Eingaben gar nicht durchreicht, wäre in Richtung 1 immer grün —
   und genau dann grün, wenn der Gleichlauf kaputt ist. Eine Prüfung,
   die auch beim Fehler bestanden meldet, ist schlimmer als keine.

   ── Teil 3 · Der Lockstep-Puffer ────────────────────────────────────

   `netz/lockstep.mjs` entscheidet, wann ein Tick gerechnet werden
   darf. Er ist reine Rechnung ohne Netz und ohne Uhr, also hier
   prüfbar: dass ein Tick ohne alle Eingaben **nicht** losläuft, dass
   er mit ihnen losläuft, und dass ein weggebrochener Spieler
   übersprungen wird, statt alle anzuhalten.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `helfer.mjs`, `spiel/lauf.mjs` (der Ablauf, den beide Welten
   rechnen), `netz/lockstep.mjs`, `netz/nachrichten.mjs`, und
   `.github/workflows/pages.yml`, das Teil 1 vor jeder Veröffentlichung
   mit `--nur-pfade` aufruft. */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { macheMelder, liesDatei, WURZEL } from "./helfer.mjs";

const { melde, ende } = macheMelder({ still: true });
const NUR_PFADE = process.argv.includes("--nur-pfade");

/* ── Teil 1 · Relative Pfade ─────────────────────────────────────── */

/* Ein absoluter Pfad in einem `import`, einem `src=` oder einem
   `href=` auf eine eigene Datei. Fremde Adressen (`https://…`,
   `//host/…`) sind ausgenommen: Die sind absichtlich absolut. */
const ABSOLUT = /\b(?:from|import)\s+["']\/[^"']*["']|\b(?:src|href)\s*=\s*["']\/(?!\/)[^"']*["']/g;

const AUSNAHMEN = new Set(["node_modules", ".git", "vendor", "dist", "build"]);
const ENDUNGEN = [".js", ".mjs", ".html"];

const quellen = [];
const sammle = (rel) => {
  for (const name of readdirSync(join(WURZEL, rel))) {
    const kind = rel === "." ? name : rel + "/" + name;
    if (AUSNAHMEN.has(name)) continue;
    if (statSync(join(WURZEL, kind)).isDirectory()) sammle(kind);
    else if (ENDUNGEN.some((e) => name.endsWith(e))) quellen.push(kind);
  }
};
sammle(".");

let absolute = 0;
for (const d of quellen) {
  for (const t of liesDatei(d).matchAll(ABSOLUT)) {
    absolute++;
    console.log(`    absoluter Pfad: ${d}  ·  ${t[0].trim()}`);
  }
}
console.log(`  ${quellen.length} Quelldateien auf absolute Pfade geprüft`);
melde(absolute === 0, "jeder eigene Pfad ist relativ (`./`, `../`)",
  `${absolute} absolute(r) Pfad(e) — die Seite bliebe unter einem Unterordner weiß`);

/* `.nojekyll` fehlt geräuschlos: Jekyll schluckt dann jeden Ordner mit
   führendem Unterstrich, ohne dass irgendwo ein Fehler erschiene. */
melde(existsSync(join(WURZEL, ".nojekyll")),
  "`.nojekyll` liegt im Wurzelverzeichnis",
  "ohne sie schiebt Pages die Auslieferung durch Jekyll");

if (NUR_PFADE) {
  console.log("\n  (--nur-pfade: Gleichlauf und Lockstep übersprungen)");
  ende();
}

const { starteLauf, naechsteWelle, oeffneKraemer, schrittImLauf } = await import("../spiel/lauf.mjs");
const { nimmKarte } = await import("../spiel/stufen.mjs");
const { macheLockstep } = await import("../netz/lockstep.mjs");
const { packeEingabe, entpackeEingabe, packe, entpacke, ruhendeEingabe } =
  await import("../netz/nachrichten.mjs");

/* ── Teil 2 · Gleichlauf ─────────────────────────────────────────── */

const SAAT = 20260905;
const SPIELERZAHL = 2;
const SCHRITTE = 3600;

/* Eine Eingabefolge, die sich wie ein Mensch bewegt: Sie wechselt die
   Richtung, statt konstant zu drücken. Eine konstante Folge wäre der
   schlechteste Prüffall — bei ihr ist eine Verschiebung um einen Tick
   gar nicht zu erkennen, und Teil 2b bliebe grün, obwohl er nichts
   misst (docs/FEHLERBUCH.md: die Messung, die nichts misst). */
function macheFolge(anzahl, versatz) {
  const folge = [];
  for (let t = 0; t < anzahl; t++) {
    const eingaben = [];
    for (let i = 0; i < SPIELERZAHL; i++) {
      const p = t + versatz + i * 37;
      eingaben.push({
        x: Math.sin(p / 23.5 + i) > 0 ? 1 : -1,
        y: Math.cos(p / 17.25 + i * 2) > 0 ? 1 : -1,
        ausweichen: p % 97 === 0
      });
    }
    folge.push(eingaben);
  }
  return folge;
}

/* Der Abdruck einer Welt: alle Zahlen, die den Zustand ausmachen.
   Funktionen (`zufall`, `modus`) fallen heraus — sie sind Bauteile,
   kein Zustand. Der Zufallszustand selbst kommt als Zahl mit hinein,
   denn er ist der eigentliche Prüfstein: Läuft er auseinander, laufen
   ab dem nächsten Gegner auch die Welten auseinander. */
function abdruck(welt) {
  const z = (n) => Math.round(n * 1e6) / 1e6;
  const teile = [
    welt.phase, welt.welle, welt.ticks, z(welt.zeit), z(welt.dauer),
    welt.planIndex, welt.zufall.zustand(), welt.verloreneBeute,
    welt.gegner.length, welt.geschosse.length, welt.beute.length
  ];
  for (const s of welt.spieler)
    teile.push(s.id, z(s.x), z(s.y), z(s.vx), z(s.vy), s.leben, s.lebenMax,
      s.gold, s.wissen, s.stufe, s.zustand, s.getoetet, z(s.aufheben));
  for (const g of welt.gegner)
    teile.push(g.art.id, z(g.x), z(g.y), z(g.leben), z(g.bereitIn));
  for (const p of welt.geschosse) teile.push(z(p.x), z(p.y));
  for (const b of welt.beute) teile.push(z(b.x), z(b.y), b.art ?? "");
  return teile.join("|");
}

/* Ein Lauf endet nicht von selbst: Bei einem Aufstieg geht die Welt in
   die Phase `wahl` und **bleibt dort stehen**, bis jemand eine Karte
   nimmt; nach einer Welle wartet sie im Laden. Im Spiel tut das
   `runtime/oberflaeche.js`, das hier nichts zu suchen hat (es braucht
   einen Browser).

   ⚠️ **Das war der Fehler, den die eigene Gegenprobe gefunden hat:**
   Ohne dieses Weiterschalten stand die Welt ab Tick 1391 in `wahl` —
   die Marken bei 1799 und 3599 waren zeichengleich, und die
   Gleichlauf-Prüfung verglich **zweimal dieselbe eingefrorene Welt**.
   Sie wäre grün gewesen, ganz gleich was der Gleichlauf tut: 61 % der
   3600 Schritte haben nichts gemessen.

   Gewählt wird immer die **erste** Karte und im Laden nichts gekauft —
   beides ohne Zufall, damit die Entscheidung selbst keine neue Quelle
   von Unterschieden ist. */
/* ⚠️ **Warum hier ein Zähler steht, obwohl die Bedingung reicht.**

   Diese Schleife endet nur, wenn `nimmKarte()` die Wahl auch wirklich
   abräumt. Nimmt sie die Karte **nicht** an — weil ein Katalogschlüssel
   fehlt, weil ein Wächter beim Rot-Beweis abgeschaltet ist, weil sich
   der Kartenkatalog ändert —, sinkt `offeneWahlen` nie, und die
   Prüfung läuft **endlos bei voller Last**.

   Das ist kein erfundener Fall: Am 05.09.2026 hing genau dieser Aufruf
   **297 Minuten** mit 17.791 Sekunden Rechenzeit auf einem Kern, weil
   ein Rot-Beweis den Kartenweg unterbrochen hatte. Niemand hat es
   gemerkt — ein hängender Prozess meldet nichts.

   `werkzeuge/balance.mjs` hat denselben Zähler seit jeher
   (`schutz++ < 40`); beim Übernehmen der Schleife ging er verloren.

   **Der Zähler bricht nicht still ab, er macht die Prüfung rot.** Eine
   Prüfung, die hängt, ist schlimmer als eine, die fehlschlägt: Die eine
   sieht aus wie Arbeit, die andere wie ein Fehler. */
const WAHL_SCHUTZ = 40;
let wahlenHaengengeblieben = 0;

function schalteWeiter(welt) {
  if (welt.phase === "wahl") {
    for (const s of welt.spieler) {
      let schutz = 0;
      while (s.offeneWahlen > 0 && s.karten?.length && schutz++ < WAHL_SCHUTZ) {
        nimmKarte(welt, s, 0);
      }
      if (s.offeneWahlen > 0 && s.karten?.length) wahlenHaengengeblieben++;
    }
    return;
  }
  if (welt.phase === "laden") {
    if (!welt.spieler[0].angebote) oeffneKraemer(welt);
    naechsteWelle(welt);
  }
}

function spieleDurch(folge) {
  const welt = starteLauf({ spielerzahl: SPIELERZAHL, saat: SAAT });
  naechsteWelle(welt);
  const marken = [];
  for (let t = 0; t < folge.length; t++) {
    schrittImLauf(welt, folge[t]);
    schalteWeiter(welt);
    /* Zwischenmarken: Läuft es erst spät auseinander, will man den
       Tick wissen und nicht bloß „am Ende verschieden". */
    if (t === 599 || t === 1799 || t === folge.length - 1) marken.push(abdruck(welt));
  }
  return marken;
}

const laufA = spieleDurch(macheFolge(SCHRITTE, 0));
const laufB = spieleDurch(macheFolge(SCHRITTE, 0));
const laufVerschoben = spieleDurch(macheFolge(SCHRITTE, 1));

let ersteAbweichung = -1;
for (let i = 0; i < laufA.length; i++) if (laufA[i] !== laufB[i]) { ersteAbweichung = i; break; }

console.log(`  ${SCHRITTE} Schritte, ${SPIELERZAHL} Spieler, Saat ${SAAT}`);
console.log(`  Abdruck am Ende: ${laufA[laufA.length - 1].length} Zeichen`);

melde(ersteAbweichung === -1,
  `gleiche Saat und gleiche Eingaben ergeben nach ${SCHRITTE} Schritten denselben Zustand`,
  `ab Marke ${ersteAbweichung} verschieden`);

/* Die andere Richtung. Ohne sie wäre die Prüfung auch dann grün, wenn
   die Eingaben gar nicht ankommen. */
melde(laufA[laufA.length - 1] !== laufVerschoben[laufVerschoben.length - 1],
  "eine um einen Tick verschobene Eingabefolge ergibt einen anderen Zustand",
  "die Eingaben wirken nicht — der Vergleich oben bewiese dann nichts");

/* Und die Gegenprobe zur Gegenprobe: Der Abdruck muss überhaupt
   unterscheiden können. Ein Abdruck, der immer dieselbe Zeichenkette
   liefert, bestünde Prüfung 1 mühelos und Prüfung 2 nie. */
melde(new Set([laufA[0], laufA[1], laufA[2]]).size === 3,
  "der Abdruck unterscheidet drei Zeitpunkte desselben Laufs",
  "er misst nichts — dann sagen die beiden Prüfungen oben nichts aus");

/* ── Teil 3 · Der Lockstep-Puffer ────────────────────────────────── */

const VERZUG = 3;
const macheProbe = () => macheLockstep({ eigenerPlatz: 0, plaetze: [0, 1], verzug: VERZUG });

/* Die ersten `verzug` Ticks sind vorgefüllt — für sie kann niemand
   rechtzeitig etwas geschickt haben. Ohne sie stünde der Gleichschritt
   sofort still und wartete auf Post, die es nie geben wird. */
{
  const l = macheProbe();
  let gelaufen = 0;
  while (l.holeTick() && gelaufen < 50) gelaufen++;
  melde(gelaufen === VERZUG, `die ersten ${VERZUG} Ticks laufen ohne Post`,
    `${gelaufen} statt ${VERZUG} — der Lauf bliebe im ersten Bild stehen`);
}

/* Ohne die Eingabe des anderen darf kein Tick laufen — sonst rechnen
   die beiden Rechner verschiedene Welten, und man merkt es erst
   Minuten später an einem Gegner, der nur bei einem steht. */
{
  const l = macheProbe();
  for (let i = 0; i < VERZUG; i++) l.holeTick();
  l.setzeEigene(VERZUG, { x: 1, y: 0, ausweichen: false });
  melde(l.holeTick() === null, "ohne die Eingabe des anderen läuft kein Tick",
    "der Puffer gibt einen Tick frei, für den ihm eine Eingabe fehlt");
  melde(l.fehlendePlaetze().join() === "1", "der Puffer sagt, wessen Eingabe fehlt",
    `meldet [${l.fehlendePlaetze().join()}] statt [1]`);

  l.setzeFremde(1, VERZUG, { x: -1, y: 0, ausweichen: false });
  const tick = l.holeTick();
  melde(tick !== null && tick.tick === VERZUG, "mit allen Eingaben läuft der Tick",
    `bekam ${tick === null ? "null" : tick.tick}`);
  melde(tick !== null && tick.eingaben[1].x === -1,
    "die fremde Eingabe kommt an dem Platz an, an den sie gehört");
}

/* Wer wegbricht, hält die anderen nicht auf. Seine Figur bleibt stehen
   und verschwindet nicht — ein Jäger, der sich auflöst, wäre für die
   anderen eine Falschaussage über die Welt. */
{
  const l = macheProbe();
  for (let i = 0; i < VERZUG; i++) l.holeTick();
  l.setzeEigene(VERZUG, { x: 1, y: 0, ausweichen: false });
  melde(l.holeTick() === null, "vor dem Wegbrechen steht der Tick still");
  l.meldeWeg(1);
  const tick = l.holeTick();
  melde(tick !== null, "ein weggebrochener Spieler hält den Tick nicht auf",
    "der Puffer wartet weiter auf jemanden, der nicht mehr da ist");
  melde(tick !== null && tick.eingaben[1].x === 0 && tick.eingaben[1].y === 0,
    "die Figur des Weggebrochenen bleibt stehen, statt weiterzulaufen");
  melde(tick !== null && tick.eingaben.length === 2,
    "der weggebrochene Platz bleibt in der Liste",
    "die Plätze verrutschen — Spieler 2 bekäme die Figur von Spieler 3");
}

/* Das erste Wort gilt. Käme dieselbe Eingabe zweimal verschieden an,
   dürfte nicht das zuletzt eingetroffene Paket entscheiden — sonst
   hinge die Welt an der Reihenfolge der Post. */
{
  const l = macheProbe();
  for (let i = 0; i < VERZUG; i++) l.holeTick();
  l.setzeEigene(VERZUG, { x: 1, y: 0, ausweichen: false });
  l.setzeFremde(1, VERZUG, { x: -1, y: 0, ausweichen: false });
  l.setzeFremde(1, VERZUG, { x: 0.5, y: 0, ausweichen: true });   /* Nachhall */
  const tick = l.holeTick();
  melde(tick.eingaben[1].x === -1, "ein zweites Mal dieselbe Eingabe ändert nichts",
    `bekam x=${tick.eingaben[1].x} statt -1`);
}

/* ── Teil 4 · Die Nachrichten überstehen den Umlauf ──────────────── */
{
  const original = { x: -0.734, y: 0.912, ausweichen: true };
  const zurueck = entpackeEingabe(packeEingabe(original));
  /* Gepackt wird auf eine Stufe von 1/127. Verglichen wird deshalb
     gegen das **gepackte** Original, nicht gegen die rohe Zahl. */
  const nochmal = entpackeEingabe(packeEingabe(zurueck));
  melde(zurueck.x === nochmal.x && zurueck.y === nochmal.y,
    "eine gepackte Eingabe bleibt beim zweiten Umlauf gleich",
    "das Packen ist nicht stabil — die Rechner liefen langsam auseinander");
  melde(zurueck.ausweichen === true, "der Ausweich-Knopf übersteht den Umlauf");
  melde(Math.abs(zurueck.x - original.x) < 0.02 && Math.abs(zurueck.y - original.y) < 0.02,
    "die gepackte Achse weicht um weniger als 1/50 ab",
    `x ${original.x} → ${zurueck.x}`);

  const ruht = ruhendeEingabe();
  melde(ruht.x === 0 && ruht.y === 0 && ruht.ausweichen === false,
    "die ruhende Eingabe drückt nichts");

  const raus = entpacke(packe({ art: "eingaben", tick: 42, platz: 1, folge: [packeEingabe(original)] }));
  melde(raus !== null && raus.art === "eingaben" && raus.tick === 42,
    "eine Nachricht übersteht Packen und Entpacken");
  melde(entpacke("kein JSON") === null,
    "kaputte Daten von außen geben null statt zu werfen",
    "ein Zeichenfehler auf der Leitung risse sonst das ganze Spiel ab");
  melde(entpacke('{"ohne":"art"}') === null,
    "eine Nachricht ohne Art gilt als kaputt",
    "sonst liefe sie als leere Nachricht durch die Verteilung");
}

/* ── Teil 5 · Die Hülle für den Vermittler ───────────────────────── */

/* Am 05.09.2026 am echten Dienst gemessen (vier Runden, jeder Fall
   mindestens zweimal, die Arten verzahnt): Der öffentliche Vermittler
   verwirft ein Angebot, dessen Hülle nicht stimmt — und zwar
   **stillschweigend**, mit einem Auflegen, das wie ein normales Ende
   aussieht. Ein OFFER ohne `label`, ohne `serialization` oder ohne
   `connectionId` kam in keinem einzigen Lauf an.

   Die Zahlen kann diese Prüfung nicht nachstellen; dafür bräuchte sie
   den fremden Dienst, und eine Prüfkette, die von einem fremden Dienst
   abhängt, ist ab dessen nächster Störung rot. Was sie prüfen kann und
   muss: dass die Hülle die gemessenen Pflichtfelder **trägt**. Fällt
   eines wieder heraus, ist die Verbindung wieder tot — und das würde
   man sonst erst im Browser merken, an einem Wartebild ohne Grund. */
{
  const { verpackeSignal, entpackeSignal, kennungAusSignal, neueVerbindungsKennung } =
    await import("../netz/vermittler-format.mjs");

  /* Gemessen am 05.09.2026, je Art. OFFER ist die strengste. */
  const PFLICHT = {
    OFFER: ["sdp", "type", "connectionId", "label", "serialization"],
    ANSWER: ["sdp", "type", "connectionId"],
    CANDIDATE: ["candidate", "type", "connectionId"]
  };

  const kennung = neueVerbindungsKennung();
  const sdp = { type: "offer", sdp: "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n" };
  const weg = { candidate: "candidate:1 1 udp 2113937151 127.0.0.1 50000 typ host",
                sdpMid: "0", sdpMLineIndex: 0 };

  for (const art of ["OFFER", "ANSWER", "CANDIDATE"]) {
    const huelle = verpackeSignal(art, art === "CANDIDATE" ? weg : sdp, kennung);
    const fehlend = PFLICHT[art].filter((f) => huelle[f] === undefined);
    melde(fehlend.length === 0,
      `die Hülle für ${art} trägt alle gemessenen Pflichtfelder (${PFLICHT[art].join(", ")})`,
      `es fehlt: ${fehlend.join(", ")} — der Vermittler verwirft die Nachricht wortlos`);
  }

  /* `type` meint die Verbindungsart, nicht die Nachrichtenart. Wer dort
     den Wert `offer` hineinschreibt, baut genau den Fehler nach, der
     die Leitung tot gemacht hat: Das SDP-Objekt trägt selbst ein
     `type`, und die beiden sind leicht zu verwechseln. */
  melde(verpackeSignal("OFFER", sdp, kennung).type === "data",
    "`type` in der Hülle ist die Verbindungsart data, nicht die Nachrichtenart offer",
    "die Hülle trägt die Nachrichtenart — genau die Verwechslung, an der es lag");

  melde(verpackeSignal("OFFER", sdp, kennung).sdp === sdp,
    "die Beschreibung steht unter `sdp` und nicht in der Hülle selbst",
    "der Vermittler fände kein SDP");
  melde(verpackeSignal("CANDIDATE", weg, kennung).candidate === weg,
    "eine Wegbeschreibung steht unter `candidate`");
  melde(verpackeSignal("CANDIDATE", weg, kennung).sdp === undefined,
    "eine Wegbeschreibung trägt kein `sdp`");

  /* Der Umlauf. Was hineingeht, muss unverändert wieder herauskommen —
     sonst bekäme `setRemoteDescription` etwas anderes, als der Browser
     der Gegenseite gebaut hat. */
  for (const art of ["OFFER", "ANSWER"]) {
    const zurueck = entpackeSignal(art, verpackeSignal(art, sdp, kennung));
    melde(zurueck?.sdp === sdp.sdp && zurueck?.type === sdp.type,
      `eine ${art}-Beschreibung übersteht Ein- und Auspacken unverändert`,
      "die Gegenseite bekäme eine andere Beschreibung als die gebaute");
  }
  {
    const zurueck = entpackeSignal("CANDIDATE", verpackeSignal("CANDIDATE", weg, kennung));
    melde(zurueck?.candidate === weg.candidate && zurueck?.sdpMid === weg.sdpMid,
      "eine Wegbeschreibung übersteht Ein- und Auspacken unverändert");
  }

  /* Streng beim Senden, nachsichtig beim Empfangen: Die nackte Form
     ist genau das, was der alte Code verschickt hat. Sie abzulehnen
     wäre nur eine zweite Art zu scheitern. */
  melde(entpackeSignal("OFFER", { type: "offer", sdp: "v=0\r\n" })?.sdp === "v=0\r\n",
    "auch die nackte Form `{type,sdp}` wird noch angenommen",
    "eine Gegenstelle in der alten Form käme gar nicht mehr durch");
  melde(entpackeSignal("CANDIDATE", weg)?.candidate === weg.candidate,
    "auch eine nackte Wegbeschreibung wird angenommen");

  /* Und was gar nichts Brauchbares ist, gibt `null` statt zu werfen. */
  melde(entpackeSignal("OFFER", null) === null && entpackeSignal("OFFER", {}) === null &&
        entpackeSignal("CANDIDATE", {}) === null,
    "eine leere oder kaputte Nutzlast gibt null, statt zu werfen",
    "ein verhagelter Umschlag risse den Verbindungsaufbau ab");

  /* Die Kennung. Beide Seiten müssen dieselbe meinen — sonst sieht der
     Vermittler zwei Leitungen, und die Antwort gehört zu keinem
     Angebot. */
  melde(kennungAusSignal(verpackeSignal("OFFER", sdp, kennung)) === kennung,
    "der Antwortende liest die Kennung des Anrufers aus dem Angebot",
    "er erfände eine eigene — Angebot und Antwort gehörten dann nicht zusammen");
  melde(kennungAusSignal({}) === null && kennungAusSignal(null) === null,
    "ohne Kennung im Angebot gibt es keine erfundene zurück");

  /* Je Leitung eine eigene. Der Wirt hält bis zu drei Gäste
     gleichzeitig; zwei gleiche Kennungen wären für den Vermittler
     dieselbe Leitung. */
  const viele = new Set();
  for (let i = 0; i < 500; i++) viele.add(neueVerbindungsKennung());
  melde(viele.size === 500, "500 frische Verbindungskennungen sind alle verschieden",
    `nur ${viele.size} verschiedene — zwei Gäste teilten sich eine Leitung`);
}

/* Die Notbremse aus `schalteWeiter()` meldet sich hier — und nur hier.
   Ein Zähler, den niemand abfragt, ist kein Schutz, sondern eine
   Ausrede: Die Prüfung liefe dann zwar zu Ende, aber mit einer Welt,
   die nie über die Kartenwahl hinausgekommen ist, und wäre grün. */
melde(wahlenHaengengeblieben === 0,
  "die Kartenwahl räumt sich ab, ohne in die Notbremse zu laufen",
  `${wahlenHaengengeblieben}-mal blieben nach ${WAHL_SCHUTZ} Versuchen`
  + " offene Wahlen stehen — vorher hing dieser Aufruf hier endlos");

ende();
