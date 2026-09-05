/* [Aufgabe: Prüfwesen] Alle Prüfungen, plus die Syntaxprüfung jeder Datei.

       node werkzeuge/pruefe-alles.mjs
       node werkzeuge/pruefe-alles.mjs --nacheinander    (ohne Parallelität)

   ── Wegweiser: welche Prüfung sichert welche Zusicherung ────────────

   Diese Datei öffnet man zuerst, also steht die Landkarte hier. Die
   dritte Spalte ist die wichtigste: **Eine Prüfung, die keinen Fehler
   verhindert, der sonst durchkäme, ist Zierde.**

   | Prüfung | hält fest | was ohne sie still durchkäme |
   | --- | --- | --- |
   | Syntax (hier) | jede `.js`/`.mjs` lässt sich laden | ein Tippfehler in einer Datei, die keine andere importiert |
   | `pruefe-tags.mjs` | jede Quelldatei trägt ihr `[Aufgabe: …]` aus der Systemtabelle | die Datei, von der niemand mehr weiß, wozu sie da ist |
   | `pruefe-verweise.mjs` | kein Markdown-Verweis zeigt ins Leere | ein Wegweiser auf eine Datei, die es nicht mehr gibt — er wird geglaubt |
   | `pruefe-workclaim.mjs` | WORKCLAIM.md ist da, lesbar, jeder Anspruch vollständig | zwei Sitzungen im selben Checkout, Konfliktmarker in sieben Dateien |
   | `pruefe-geheimnisse.mjs` | kein verbotenes Format, kein Geheimnismuster im Arbeitsstand | der Schlüssel, der „nur kurz zum Testen" eingetragen wurde |
   | `pruefe-altlasten.mjs` | neue Dateien unter der Zeilengrenze; geführte Altlasten wachsen nie | die Altlast, die „nur diesmal" um dreißig Zeilen wächst |
   | `pruefe-doku-status.mjs` | kein Dokument behauptet einen Zustand | das „noch offen", das seit vier Monaten falsch ist und das jeder glaubt |
   | `pruefe-sprache.mjs` | die gewählte Sprachtrennung, über eine Wortliste | der eine deutsche Bezeichner zwischen 300 englischen |
   | `pruefe-vorgaenge.mjs` | jede Phase und jeder Schritt hat einen Vorgang, keine Nummer doppelt | die Vorgangsnummer, die beim Umschreiben der Roadmap unter die falsche Phase gerutscht ist |
   | `pruefe-arbeitsweise.mjs` | nie auf dem Hauptzweig, nichts ohne Changelog-Eintrag | genau die zwei Regeln, die man beim Arbeiten vergisst |

   ── Die Fachprüfungen dieses Spiels ─────────────────────────────────

   | Prüfung | hält fest | was ohne sie still durchkäme |
   | --- | --- | --- |
   | `pruefe-kern.mjs` | `spiel/` ist gesät, browserfrei und wiederholbar | ein `Math.random` im Kern — nichts bricht, aber jede Messung ist wertlos und Netz-Koop später unmöglich |
   | `pruefe-katalog.mjs` | Waffen, Gegner, Fundstücke und Wellen sind in sich stimmig | ein verschriebener Merkmalsname: der Gruppenbonus dieser Fraktion ist unerreichbar, und niemand merkt es |
   | `pruefe-sprites.mjs` | Bildpunktraster heil, Farben gültig, Figuren drehbar erkennbar | eine Zeile einen Bildpunkt zu kurz — man sieht es und findet es nicht |
   | `pruefe-schrift.mjs` | jeder Anzeigetext lässt sich malen | ein Zeichen ohne Glyph wird still zu `?` und sieht aus wie ein Fehler im Text |
   | `pruefe-anzeige.mjs` | die fünf Trefferzeichen sind voneinander unterscheidbar, Angriffsleiste und Krämer-Frist rechnen richtig, und keine Lebensdauer läuft zwischen Kern und Zeichner auseinander | fünf Zeichen, die einzeln tadellos sind und alle gleich aussehen — und eine Leiste, die bei Hast still die falsche Strecke läuft |
   | `pruefe-werte.mjs` | Werte-Tabelle, Schadensarten, die eine Schadensrechnung und der Sprung | ein Umlaut in einer Wertkennung, eine vertauschte Rechenreihenfolge (20 % Schaden daneben) oder ein Kritwurf ohne Chance, der den gesäten Strom verschiebt — alles drei ohne eine einzige Fehlermeldung |
   | `pruefe-karten.mjs` + `pruefe-kartenhand.mjs` | dort Katalog, Seltenheit, Meta-Regeln und Ziehstatistik; hier Ort, Bild und der Weg vom Klick bis zur genommenen Karte | ein Wert ohne Ziehweg (vor Phase 13 waren es **47 von 55**), eine Regel, die niemand fragt, oder eine Karte, die man sieht und danebentrifft |
   | `pruefe-balance.mjs` | man kann gewinnen, man kann verlieren, es gibt keine Wand | „ich habe eine Waffe stärker gemacht, und jetzt gewinnt man immer" |
   | `pruefe-protokoll.mjs` | das Auswertungsprotokoll misst wirklich, nicht nur bequem | ein Gegner, der am Wellenende überlebt, wird zum erfundenen Toten; eine Zahl, die sich nicht bewegt, wenn das Gemessene sich bewegt |
   | `pruefe-netz.mjs` | jeder Pfad relativ; gleiche Eingaben ergeben dieselbe Welt, verschobene eine andere | der absolute Pfad, der die Seite im Netz weiß lässt — und der Gleichlauf, der erst nach Minuten sichtbar auseinanderläuft |
   | `pruefe-truhen.mjs` | Truhenfall hat einen eigenen Zufallsstrom, „truhen" endet immer von selbst, ein voller Gürtel schluckt keinen Fund, Glück wirkt auf den Inhalt | eine Truhen-Ziehung, die `welt.zufall` verschiebt und jeden späteren Wellenplan ändert — oder eine Phase, in der ein echter Lauf hängen bleibt |

   **Nicht in der Kette:** `pruefe-freigabe.mjs` — die Freigabeliste
   vor einer Veröffentlichung. Während der Entwicklung ist ein
   Vorlagenzustand normal; sie läuft von Hand, bevor etwas öffentlich
   wird, und durchsucht dabei auch die ganze Git-Historie.

   **Neue Fachprüfungen** (`pruefe-<thema>.mjs` hier ablegen) werden
   automatisch aufgenommen. Zwei Pflichten dabei: die Zeile in dieser
   Tabelle ergänzen — und die neue Prüfung **zuerst rot machen** (den
   Fehler absichtlich einbauen, anschlagen sehen, zurücknehmen). Eine
   Prüfung, die nie rot war, prüft womöglich nichts.

   ── Drei Regeln der Kette ───────────────────────────────────────────

   1. **Die Ausgabe bleibt in fester Reihenfolge.** Parallel laufende
      Prozesse schrieben sonst ineinander; jede Prüfung sammelt ihre
      Ausgabe, gedruckt wird in Listenreihenfolge.
   2. **Wer den Arbeitsbaum liest oder schreibt, läuft allein** —
      `pruefe-arbeitsweise.mjs` am Ende, sonst sähe sie die Dateien
      eines parallelen Werkzeugs als offene Änderung.
   3. Die Ausgabe eines Messlaufs gehört **außerhalb** des Projekts
      abgelegt (`> lauf.txt` im Scratchpad), sonst schlägt Regel 4 an.

   ⚠️ Diese Datei bleibt absichtlich ohne `helfer.mjs`: Sie soll auch
   dann eine lesbare Syntaxmeldung ausgeben, wenn genau der kaputt ist. */

import { spawnSync, spawn } from "node:child_process";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cpus } from "node:os";

const WURZEL = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const knoten = process.execPath;
const NACHEINANDER = process.argv.includes("--nacheinander");
const GLEICHZEITIG = NACHEINANDER ? 1 : Math.max(1, Math.min(8, cpus().length));

/* ── Syntax zuerst: schnell, und macht alles Weitere sinnlos, wenn sie
   fällt. Geprüft werden die Ordner aus `alpha-code.json` plus
   `werkzeuge/` selbst. ── */
let ordner = [".", "werkzeuge"];
let ausnahmen = ["node_modules", ".git", "vendor", "dist", "build", "daten"];
try {
  const e = JSON.parse(readFileSync(join(WURZEL, "alpha-code.json"), "utf8"));
  if (Array.isArray(e.quellordner)) ordner = [...new Set([...e.quellordner, "werkzeuge"])];
  if (Array.isArray(e.ausnahmen)) ausnahmen = e.ausnahmen;
} catch { /* ohne Einstellung: Wurzel und werkzeuge/ */ }

/* Rekursiv, mit denselben Ausnahmen wie `helfer.quellDateien()`. Vorher
   wurde nur die oberste Ebene jedes Quellordners geprüft — bei einem
   Projekt mit `apps/…/js/` lief die Syntaxprüfung dann über null Dateien
   und meldete trotzdem grün (gemessen am 03.09.2026). */
const dateien = [];
const gesperrt = (rel, name) =>
  ausnahmen.some((a) => rel === a || rel.startsWith(a + "/") || name === a);
const sammle = (rel) => {
  for (const name of readdirSync(join(WURZEL, rel))) {
    const relKind = rel === "." ? name : rel + "/" + name;
    if (gesperrt(relKind, name)) continue;
    if (statSync(join(WURZEL, relKind)).isDirectory()) sammle(relKind);
    else if (name.endsWith(".js") || name.endsWith(".mjs")) dateien.push(relKind);
  }
};
for (const o of ordner) if (existsSync(join(WURZEL, o))) sammle(o);
dateien.splice(0, dateien.length, ...new Set(dateien));
let syntaxOk = true;
process.stdout.write(`══ Syntax ${"═".repeat(52)}\n\n`);
for (const d of dateien) {
  const e = spawnSync(knoten, ["--check", d], { cwd: WURZEL });
  const gut = e.status === 0;
  if (!gut) { syntaxOk = false; process.stdout.write(String(e.stderr)); }
  console.log(`  ${gut ? "ok" : "FEHLER"}  ${d}`);
}
console.log(`\n  ${dateien.length} Dateien geprüft`);

/* ── Die Prüfungen: alle `pruefe-*.mjs` außer dieser Datei und der
   Arbeitsweise, die allein läuft (Regel 2). ── */
const PARALLEL = readdirSync(join(WURZEL, "werkzeuge"))
  .filter((d) => /^pruefe-.*\.mjs$/.test(d))
  .filter((d) => d !== "pruefe-alles.mjs" && d !== "pruefe-arbeitsweise.mjs"
    && d !== "pruefe-freigabe.mjs")
  .sort()
  .map((d) => [d.replace(/^pruefe-|\.mjs$/g, ""), ["werkzeuge/" + d]]);
const ALLEIN = [["arbeitsweise", ["werkzeuge/pruefe-arbeitsweise.mjs"]]];

const starte = (titel, argumente) => new Promise((fertig) => {
  const k = spawn(knoten, argumente, { cwd: WURZEL });
  let text = "";
  k.stdout.on("data", (d) => { text += d; });
  k.stderr.on("data", (d) => { text += d; });
  k.on("close", (code) => fertig({ titel, gut: code === 0, text }));
});

const drucke = (r) => {
  process.stdout.write(`\n══ ${r.titel} ${"═".repeat(Math.max(0, 58 - r.titel.length))}\n\n`);
  process.stdout.write(r.text);
};

async function laufeAlle(liste) {
  const raus = new Array(liste.length);
  let naechste = 0;
  const arbeiter = async () => {
    while (true) {
      const i = naechste++;
      if (i >= liste.length) return;
      raus[i] = await starte(liste[i][0], liste[i][1]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(GLEICHZEITIG, Math.max(1, liste.length)) }, arbeiter));
  return raus;
}

const t0 = Date.now();
const ergebnisse = [["Syntax", syntaxOk]];
for (const r of await laufeAlle(PARALLEL)) { drucke(r); ergebnisse.push([r.titel, r.gut]); }
for (const [titel, argumente] of ALLEIN) {
  const r = await starte(titel, argumente);
  drucke(r);
  ergebnisse.push([titel, r.gut]);
}

console.log(`\n══ Zusammenfassung ${"═".repeat(44)}\n`);
let fehler = 0;
for (const [name, gut] of ergebnisse) {
  console.log(`  ${gut ? "bestanden" : "FEHLGESCHLAGEN"}  ${name}`);
  if (!gut) fehler++;
}
console.log(`\n  ${((Date.now() - t0) / 1000).toFixed(1)} s` +
  `${NACHEINANDER ? " (nacheinander)" : `, bis zu ${GLEICHZEITIG} gleichzeitig`}`);
console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen` : "\nalles grün");
process.exit(fehler ? 1 : 0);
